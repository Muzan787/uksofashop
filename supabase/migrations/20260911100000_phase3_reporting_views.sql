-- Phase 3: private, non-PII reporting layer for controlled Sheet exports.
--
-- Supabase remains authoritative. These views are deliberately outside the
-- exposed public schema and are readable only by service_role/postgres. They
-- make every export repeatable, deduplicated by stable source keys and
-- explicit about known QA/test or historically inconsistent rows.

create schema if not exists reporting;
revoke all on schema reporting from public, anon, authenticated;
grant usage on schema reporting to service_role;

create or replace function reporting.classify_touch(parts text[])
returns text
language sql
immutable
set search_path = ''
as $function$
  select case
    when lower(array_to_string(parts, ' ')) ~ '(^|[^a-z0-9])(qa|test|debug|probe)([^a-z0-9]|$)'
      then 'qa_test'
    else 'production_real'
  end
$function$;

revoke all on function reporting.classify_touch(text[]) from public, anon, authenticated;
grant execute on function reporting.classify_touch(text[]) to service_role;

create or replace view reporting.attribution_ledger
with (security_invoker = true)
as
select
  s.session_id,
  s.visitor_id,
  s.arrival_id,
  s.created_at as first_seen_at,
  s.last_seen_at,
  s.first_touch_source,
  s.first_touch_medium,
  s.first_touch_campaign,
  s.first_touch_content,
  s.first_touch_term,
  s.last_touch_source,
  s.last_touch_medium,
  s.last_touch_campaign,
  s.last_touch_content,
  s.last_touch_term,
  s.gclid,
  s.gbraid,
  s.wbraid,
  s.fbclid,
  s.ga_client_id,
  s.meta_fbp,
  s.meta_fbc,
  s.landing_page,
  s.referrer,
  s.initial_product_id,
  s.initial_variant_id,
  count(a.id) filter (where a.action_type = 'product_view') as product_views,
  count(a.id) filter (where a.action_type = 'add_to_cart') as add_to_carts,
  count(a.id) filter (where a.action_type = 'checkout_start') as checkout_starts,
  count(a.id) filter (where a.action_type = 'whatsapp_click') as whatsapp_clicks,
  count(a.id) filter (where a.action_type = 'call_click') as call_clicks,
  count(a.id) filter (where a.action_type = 'order_placed') as orders_placed,
  reporting.classify_touch(array[
    s.first_touch_source, s.first_touch_medium, s.first_touch_campaign,
    s.first_touch_content, s.first_touch_term, s.last_touch_source,
    s.last_touch_medium, s.last_touch_campaign, s.last_touch_content,
    s.last_touch_term, s.landing_page
  ]) as data_class
from public.attribution_sessions s
left join public.attribution_actions a on a.session_id = s.session_id
group by s.id;

create or replace view reporting.whatsapp_enquiries
with (security_invoker = true)
as
select
  w.reference,
  w.created_at,
  w.visitor_id,
  w.session_id,
  w.arrival_id,
  w.page_url,
  w.page_context,
  w.product_id,
  w.variant_id,
  w.product_name,
  w.gclid,
  w.gbraid,
  w.wbraid,
  w.fbclid,
  w.utm_source,
  w.utm_medium,
  w.utm_campaign,
  w.utm_content,
  w.utm_term,
  w.ga_client_id,
  w.meta_fbp,
  w.meta_fbc,
  w.converted_order_id,
  w.converted_at,
  reporting.classify_touch(array[
    w.utm_source, w.utm_medium, w.utm_campaign, w.utm_content, w.utm_term,
    w.page_url, w.page_context
  ]) as data_class
from public.whatsapp_enquiries w;

create or replace view reporting.orders_profit
with (security_invoker = true)
as
select
  o.id as order_id,
  upper(left(o.id::text, 8)) as order_reference,
  o.created_at as placed_at,
  o.confirmed_at,
  o.delivered_at,
  o.cancelled_at,
  o.status,
  o.source,
  o.items_subtotal,
  o.delivery_total,
  o.discount_amount,
  o.discount_tier,
  o.promotion_code,
  o.offer_source,
  o.total_amount as revenue,
  o.whatsapp_reference,
  o.visitor_id,
  o.session_id,
  o.arrival_id,
  o.gclid,
  o.gbraid,
  o.wbraid,
  o.fbclid,
  o.utm_source,
  o.utm_medium,
  o.utm_campaign,
  o.utm_content,
  o.utm_term,
  o.landing_page,
  o.referrer,
  o.meta_fbp,
  o.meta_fbc,
  o.purchase_event_sent_at,
  o.delivered_event_sent_at,
  case
    when reporting.classify_touch(array[
      o.utm_source, o.utm_medium, o.utm_campaign, o.utm_content, o.utm_term,
      o.landing_page
    ]) = 'qa_test' then 'qa_test'
    when (o.purchase_event_sent_at is not null and o.confirmed_at is null)
      or (o.status = 'confirmed' and o.confirmed_at is null)
      or (o.status = 'delivered' and (o.confirmed_at is null or o.delivered_at is null))
      or (o.delivered_event_sent_at is not null and o.delivered_at is null)
      then 'legacy_uncertain'
    else 'production_real'
  end as data_class
from public.orders o;

create or replace view reporting.meta_outcome_ledger
with (security_invoker = true)
as
select
  c.id,
  c.order_id,
  upper(left(c.order_id::text, 8)) as order_reference,
  c.event_name,
  c.event_id,
  c.created_at as attempted_at,
  c.sent_at,
  c.status as send_status,
  o.status as order_status,
  o.total_amount as revenue,
  coalesce(op.data_class, 'legacy_uncertain') as data_class
from public.conversion_events c
left join public.orders o on o.id = c.order_id
left join reporting.orders_profit op on op.order_id = c.order_id
where c.platform = 'meta';

create or replace view reporting.daily_performance
with (security_invoker = true)
as
with days as (
  select created_at::date as activity_date from public.attribution_sessions
  union
  select created_at::date from public.whatsapp_enquiries
  union
  select created_at::date from public.orders
),
sessions as (
  select created_at::date activity_date, count(*) sessions
  from public.attribution_sessions
  where reporting.classify_touch(array[
    first_touch_source, first_touch_medium, first_touch_campaign,
    first_touch_content, last_touch_source, last_touch_medium,
    last_touch_campaign, last_touch_content, landing_page
  ]) <> 'qa_test'
  group by 1
),
actions as (
  select a.created_at::date activity_date,
    count(*) filter (where a.action_type = 'product_view') product_views,
    count(*) filter (where a.action_type = 'add_to_cart') add_to_carts,
    count(*) filter (where a.action_type = 'checkout_start') checkout_starts
  from public.attribution_actions a
  where coalesce(a.metadata->>'data_class', 'unclassified') <> 'qa_test'
  group by 1
),
wa as (
  select created_at::date activity_date, count(*) whatsapp_enquiries
  from reporting.whatsapp_enquiries where data_class <> 'qa_test' group by 1
),
orders as (
  select placed_at::date activity_date,
    count(*) filter (where status not in ('cancelled')) orders_placed,
    count(*) filter (where confirmed_at is not null) confirmed_orders,
    count(*) filter (where delivered_at is not null) delivered_orders,
    count(*) filter (where status = 'cancelled') cancelled_orders,
    coalesce(sum(revenue) filter (where delivered_at is not null), 0) delivered_revenue
  from reporting.orders_profit where data_class = 'production_real' group by 1
)
select
  d.activity_date,
  coalesce(s.sessions, 0) sessions,
  coalesce(a.product_views, 0) product_views,
  coalesce(a.add_to_carts, 0) add_to_carts,
  coalesce(a.checkout_starts, 0) checkout_starts,
  coalesce(w.whatsapp_enquiries, 0) whatsapp_enquiries,
  coalesce(o.orders_placed, 0) orders_placed,
  coalesce(o.confirmed_orders, 0) confirmed_orders,
  coalesce(o.delivered_orders, 0) delivered_orders,
  coalesce(o.cancelled_orders, 0) cancelled_orders,
  coalesce(o.delivered_revenue, 0) delivered_revenue
from days d
left join sessions s using (activity_date)
left join actions a using (activity_date)
left join wa w using (activity_date)
left join orders o using (activity_date)
order by d.activity_date;

revoke all on all tables in schema reporting from public, anon, authenticated;
grant select on all tables in schema reporting to service_role;

comment on schema reporting is
  'Private Phase 3 operational reporting views. Supabase is authoritative; Google Sheets receives idempotent snapshots from these views.';
comment on view reporting.orders_profit is
  'Non-PII order outcome export. Known QA and lifecycle-inconsistent historical rows are explicitly classified.';
