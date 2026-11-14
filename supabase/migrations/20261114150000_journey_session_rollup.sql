-- Admin -> Website: a per-session rollup of the consented journey events,
-- refreshed every 15 minutes (14 Nov 2026, Run 4).
--
-- Why: reading 30 days of raw journey events (about 180,000 rows of JSON)
-- takes 6-18 s, past the API's 8 s statement timeout, so the live Website page
-- could not load its figures. The rollup holds one row per session (and one
-- per session and product), so the page reads a few thousand rows instead.
--
-- Definitions are exactly those of the first summary function: the same rows
-- (action_type 'journey_event', data_class 'consented_journey'), the same
-- stage flags, and the same source rule as journey_events_v1, taken from the
-- session's FIRST arrival. A session belongs to the UK day it started on.
--
-- Access: service_role only. No customer identity or free text; product ids,
-- page paths and booleans.

drop materialized view if exists public.journey_session_products;
drop materialized view if exists public.journey_session_rollup;

create materialized view public.journey_session_rollup as
with ev as (
  select a.session_id, a.arrival_id, a.created_at, a.page_url,
         a.metadata->>'kind' as event,
         a.metadata->>'page_type' as page_type,
         a.metadata->>'device' as device,
         a.metadata->>'step' as step,
         a.metadata->>'navigation_id' as nav
  from public.attribution_actions a
  where a.action_type = 'journey_event'
    and a.metadata->>'data_class' = 'consented_journey'
    and a.created_at >= now() - interval '92 days'
    and a.session_id is not null
),
s0 as (
  select
    session_id,
    min(created_at) as first_event_at,
    max(created_at) as last_event_at,
    max(device) as device,
    (array_agg(arrival_id order by created_at))[1] as first_arrival,
    split_part((array_agg(page_url order by created_at))[1], '?', 1) as first_path,
    count(distinct nav) as pages,
    bool_or(page_type = 'product') as product,
    bool_or(page_type = 'collection') as collection,
    bool_or(event = 'cart_updated') as added,
    bool_or(event = 'checkout_step_viewed' and step = 'cart') as cart,
    bool_or(event = 'checkout_step_viewed' and step = 'delivery') as delivery,
    bool_or(event = 'checkout_field_started') as typed,
    bool_or(event = 'place_order_clicked') as place,
    bool_or(event = 'order_saved') as saved,
    bool_or(event = 'whatsapp_outbound') as whatsapp,
    bool_or(event = 'whatsapp_outbound' and page_type = 'checkout') as checkout_whatsapp,
    bool_or(event = 'checkout_validation_error') as validation_error
  from ev group by session_id
)
select s0.*,
  case
    when x.gclid is not null or x.gbraid is not null or x.wbraid is not null or lower(x.last_touch_source) in ('google', 'google_ads') then 'google'
    when x.fbclid is not null or lower(x.last_touch_source) in ('facebook', 'instagram', 'meta', 'fb', 'ig') then 'meta'
    when nullif(x.last_touch_source, '') is null then 'direct_or_unattributed'
    else 'other'
  end as source
from s0 left join public.attribution_sessions x on x.arrival_id = s0.first_arrival;

create unique index journey_session_rollup_session_idx on public.journey_session_rollup (session_id);
create index journey_session_rollup_first_idx on public.journey_session_rollup (first_event_at);

create materialized view public.journey_session_products as
select a.session_id, a.product_id,
       bool_or(a.metadata->>'kind' = 'cart_updated') as added,
       bool_or(a.metadata->>'kind' = 'whatsapp_outbound') as whatsapp
from public.attribution_actions a
where a.action_type = 'journey_event'
  and a.metadata->>'data_class' = 'consented_journey'
  and a.created_at >= now() - interval '92 days'
  and a.session_id is not null and a.product_id is not null
group by a.session_id, a.product_id;

create unique index journey_session_products_idx on public.journey_session_products (session_id, product_id);

revoke all on public.journey_session_rollup from public, anon, authenticated;
revoke all on public.journey_session_products from public, anon, authenticated;
grant select on public.journey_session_rollup to service_role;
grant select on public.journey_session_products to service_role;

create or replace function public.admin_website_summary(
  p_from timestamptz,
  p_to timestamptz,
  p_device text default null,
  p_source text default null
) returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with so as (
    select r.*, (o.session_id is not null) as linked, coalesce(o.confirmed, false) as confirmed
    from public.journey_session_rollup r
    left join (
      select session_id, bool_or(confirmed_at is not null) as confirmed
      from public.orders where session_id is not null and is_test is not true
      group by session_id
    ) o on o.session_id = r.session_id
    where r.first_event_at >= p_from and r.first_event_at < p_to
      and p_to > p_from and p_to - p_from <= interval '92 days'
      and (p_device is null or r.device = p_device)
      and (p_source is null or r.source = p_source)
  ),
  stage_counts as (
    select
      count(*) as sessions,
      coalesce(sum(pages), 0) as page_views,
      count(*) filter (where product) as product_sessions,
      count(*) filter (where collection) as collection_sessions,
      count(*) filter (where added) as added_sessions,
      count(*) filter (where cart) as cart_sessions,
      count(*) filter (where delivery) as delivery_sessions,
      count(*) filter (where cart and delivery) as cart_then_delivery,
      count(*) filter (where delivery and typed) as delivery_typed,
      count(*) filter (where delivery and place) as delivery_then_place,
      count(*) filter (where saved) as order_saved_sessions,
      count(*) filter (where whatsapp) as whatsapp_sessions,
      count(*) filter (where checkout_whatsapp) as checkout_whatsapp_sessions,
      count(*) filter (where delivery and not place and not typed and not whatsapp) as delivery_left_untouched,
      count(*) filter (where validation_error) as validation_error_sessions,
      count(*) filter (where linked) as order_linked_sessions,
      count(*) filter (where confirmed) as order_confirmed_sessions,
      count(*) filter (where whatsapp and confirmed) as whatsapp_then_confirmed
    from so
  ),
  by_device as (
    select coalesce(jsonb_agg(x order by x.sessions desc), '[]'::jsonb) as rows from (
      select device as label, count(*) as sessions,
             count(*) filter (where cart) as cart, count(*) filter (where delivery) as delivery,
             count(*) filter (where cart and delivery) as cart_then_delivery,
             count(*) filter (where place) as place, count(*) filter (where whatsapp) as whatsapp,
             count(*) filter (where confirmed) as confirmed
      from so group by device) x
  ),
  by_source as (
    select coalesce(jsonb_agg(x order by x.sessions desc), '[]'::jsonb) as rows from (
      select source as label, count(*) as sessions,
             count(*) filter (where cart) as cart, count(*) filter (where delivery) as delivery,
             count(*) filter (where cart and delivery) as cart_then_delivery,
             count(*) filter (where place) as place, count(*) filter (where whatsapp) as whatsapp,
             count(*) filter (where confirmed) as confirmed
      from so group by source) x
  ),
  products as (
    select coalesce(jsonb_agg(x order by x.viewed desc), '[]'::jsonb) as rows from (
      select p.title, p.slug, count(*) as viewed,
             count(*) filter (where sp.added) as added,
             count(*) filter (where sp.whatsapp) as whatsapp
      from public.journey_session_products sp
      join so on so.session_id = sp.session_id
      join public.products p on p.id = sp.product_id
      group by p.title, p.slug
      order by count(*) desc limit 12) x
  ),
  landing as (
    select coalesce(jsonb_agg(x order by x.sessions desc), '[]'::jsonb) as rows from (
      select first_path as path, count(*) as sessions
      from so group by 1 order by 2 desc limit 10) x
  ),
  span as (select min(first_event_at) as first_at, max(last_event_at) as last_at from so),
  coverage as (
    select min(first_event_at) as tracking_since, max(last_event_at) as rollup_latest
    from public.journey_session_rollup
  )
  select jsonb_build_object(
    'totals', to_jsonb(stage_counts.*),
    'by_device', by_device.rows,
    'by_source', by_source.rows,
    'products', products.rows,
    'landing', landing.rows,
    'first_event_at', span.first_at,
    'last_event_at', span.last_at,
    'tracking_since', coverage.tracking_since,
    'rollup_latest', coverage.rollup_latest
  )
  from stage_counts, by_device, by_source, products, landing, span, coverage;
$$;

revoke all on function public.admin_website_summary(timestamptz, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.admin_website_summary(timestamptz, timestamptz, text, text) to service_role;

-- Refresh every 15 minutes, without locking readers.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'ukss-journey-rollup-refresh';
    perform cron.schedule(
      'ukss-journey-rollup-refresh',
      '*/15 * * * *',
      'refresh materialized view concurrently public.journey_session_rollup; refresh materialized view concurrently public.journey_session_products;'
    );
  end if;
end $$;
