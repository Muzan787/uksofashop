-- Phase 3B: keep reporting action exports one row per stable action UUID.
--
-- attribution_sessions intentionally has one row per arrival, so session_id is
-- not unique. Joining actions to sessions by session_id multiplied every action
-- by the number of arrivals in that browser session. arrival_id is unique and
-- is the authoritative touch row carried by each action.

create or replace view reporting.attribution_actions
with (security_invoker = true)
as
select
  a.id as action_id,
  a.created_at,
  a.visitor_id,
  a.session_id,
  a.arrival_id,
  a.action_type,
  a.page_url,
  a.product_id,
  a.variant_id,
  nullif(a.metadata->>'quantity', '') as quantity,
  nullif(a.metadata->>'value', '') as value,
  a.whatsapp_reference,
  case when a.order_id is not null then upper(left(a.order_id::text, 8)) end
    as order_reference,
  s.first_touch_source,
  s.first_touch_medium,
  s.first_touch_campaign,
  s.first_touch_content,
  case
    when nullif(a.metadata->>'data_class', '') is not null
      and a.metadata->>'data_class' <> 'unclassified'
      then a.metadata->>'data_class'
    else reporting.classify_touch(array[
      s.first_touch_source, s.first_touch_medium, s.first_touch_campaign,
      s.first_touch_content, s.first_touch_term, s.last_touch_source,
      s.last_touch_medium, s.last_touch_campaign, s.last_touch_content,
      s.last_touch_term, s.landing_page, a.page_url
    ])
  end as data_class
from public.attribution_actions a
left join public.attribution_sessions s on s.arrival_id = a.arrival_id;

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
left join public.attribution_actions a on a.arrival_id = s.arrival_id
group by s.id;

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
  from reporting.attribution_actions a
  where a.data_class <> 'qa_test'
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

revoke all on reporting.attribution_actions from public, anon, authenticated;
revoke all on reporting.attribution_ledger from public, anon, authenticated;
revoke all on reporting.daily_performance from public, anon, authenticated;
grant select on reporting.attribution_actions to service_role;
grant select on reporting.attribution_ledger to service_role;
grant select on reporting.daily_performance to service_role;

comment on view reporting.attribution_actions is
  'Private one-row-per-action, timestamp-level, non-PII export for the operational Sheet.';
comment on view reporting.attribution_ledger is
  'Private one-row-per-arrival attribution export with action counts scoped to that exact arrival.';

