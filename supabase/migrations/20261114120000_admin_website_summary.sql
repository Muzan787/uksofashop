-- Admin -> Website: one read-only summary of the first-party journey data for
-- a period, computed in the database (14 Nov 2026, Run 4).
--
-- Why a function: the existing Journeys report fetches raw events and stops at
-- 5,000 rows, so any 7- or 30-day total built from it would be silently
-- truncated. This aggregates every row in the period instead.
--
-- What it counts: DISTINCT SESSIONS for each stage (session_key, a masked
-- session id), never events, and never "visitors". Each stage is "this session
-- did X at least once in the period"; stages are reported side by side and the
-- same-session progression pairs (cart -> delivery, delivery -> place order)
-- are counted on one denominator each. Only sessions the first-party tracker
-- observed are included: this is not total site traffic.
--
-- Security: SECURITY INVOKER, executable by service_role only (the admin page
-- calls it server-side after requireAdmin()). No customer identity, order id or
-- free text leaves the function; product titles and page paths only.

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
  with ev as (
    select j.*
    from public.journey_events_v1 j
    where j.created_at >= p_from and j.created_at < p_to
      and p_to > p_from and p_to - p_from <= interval '92 days'
      and (p_device is null or j.device = p_device)
      and (p_source is null or j.source = p_source)
  ),
  s as (
    select
      session_key,
      max(device) as device,
      max(source) as source,
      count(distinct page_view_key) as pages,
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
    from ev group by session_key
  ),
  o as (
    -- Orders linked to an observed session, by the same masked id the
    -- journey views use. Confirmation is a business fact, not an event.
    select substr(md5(session_id::text), 1, 12) as session_key,
           bool_or(true) as linked,
           bool_or(confirmed_at is not null) as confirmed
    from public.orders
    where session_id is not null and is_test is not true
    group by 1
  ),
  so as (select s.*, coalesce(o.linked, false) as linked, coalesce(o.confirmed, false) as confirmed
         from s left join o using (session_key)),
  stage_counts as (
    select
      count(*) as sessions,
      sum(pages) as page_views,
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
      select p.title, p.slug, count(distinct e.session_key) as viewed,
             count(distinct e.session_key) filter (where e.event = 'cart_updated') as added,
             count(distinct e.session_key) filter (where e.event = 'whatsapp_outbound') as whatsapp
      from ev e join public.products p on p.id = e.product_id
      group by p.title, p.slug
      order by count(distinct e.session_key) desc limit 12) x
  ),
  landing as (
    select coalesce(jsonb_agg(x order by x.sessions desc), '[]'::jsonb) as rows from (
      select split_part(first_path, '?', 1) as path, count(*) as sessions from (
        select distinct on (session_key) session_key, page_path as first_path
        from ev order by session_key, created_at, sequence) f
      group by 1 order by 2 desc limit 10) x
  ),
  span as (select min(created_at) as first_at, max(created_at) as last_at from ev),
  coverage as (select min(created_at) as tracking_since from public.journey_events_v1)
  select jsonb_build_object(
    'totals', to_jsonb(stage_counts.*),
    'by_device', by_device.rows,
    'by_source', by_source.rows,
    'products', products.rows,
    'landing', landing.rows,
    'first_event_at', span.first_at,
    'last_event_at', span.last_at,
    'tracking_since', coverage.tracking_since
  )
  from stage_counts, by_device, by_source, products, landing, span, coverage;
$$;

revoke all on function public.admin_website_summary(timestamptz, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.admin_website_summary(timestamptz, timestamptz, text, text) to service_role;
