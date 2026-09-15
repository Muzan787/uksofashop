-- Privacy-safe checkout friction telemetry.
-- No form values or customer PII are stored in attribution_actions metadata.

alter table public.attribution_actions
  drop constraint if exists attribution_actions_action_type_check;

alter table public.attribution_actions
  add constraint attribution_actions_action_type_check
  check (action_type in (
    'arrival', 'product_view', 'add_to_cart', 'checkout_start',
    'whatsapp_click', 'call_click', 'order_placed',
    'offer_qualified', 'offer_prompt_shown', 'offer_prompt_dismissed', 'offer_code_copied',
    'checkout_step_viewed', 'checkout_field_started', 'checkout_field_completed',
    'checkout_validation_error', 'postcode_lookup_attempt', 'postcode_lookup_result',
    'address_results_returned', 'address_selected', 'delivery_extra_toggled',
    'offer_code_attempt', 'offer_code_result', 'place_order_clicked', 'place_order_failed',
    'checkout_back_to_cart', 'checkout_quote_whatsapp_click', 'checkout_exit'
  ));

create index if not exists attribution_actions_checkout_friction_idx
  on public.attribution_actions (created_at, action_type, session_id)
  where action_type in (
    'checkout_start', 'checkout_step_viewed', 'checkout_field_started',
    'checkout_field_completed', 'checkout_validation_error', 'postcode_lookup_attempt',
    'postcode_lookup_result', 'address_results_returned', 'address_selected',
    'delivery_extra_toggled', 'offer_code_attempt', 'offer_code_result',
    'place_order_clicked', 'place_order_failed', 'checkout_back_to_cart',
    'checkout_quote_whatsapp_click', 'checkout_exit', 'order_placed'
  );

create or replace view reporting.checkout_friction_daily
with (security_invoker = true)
as
with event_rows as (
  select
    a.created_at,
    a.visitor_id,
    a.session_id,
    a.action_type,
    a.metadata,
    coalesce(s.first_touch_source, s.last_touch_source) as utm_source,
    coalesce(s.first_touch_medium, s.last_touch_medium) as utm_medium,
    coalesce(s.first_touch_campaign, s.last_touch_campaign) as utm_campaign,
    coalesce(s.first_touch_content, s.last_touch_content) as utm_content,
    entitlement.source as entitlement_source
  from public.attribution_actions a
  left join public.attribution_sessions s on s.arrival_id = a.arrival_id
  left join lateral (
    select oe.source
    from public.offer_entitlements oe
    where oe.visitor_id = a.visitor_id
      and oe.started_at <= a.created_at
      and (oe.revoked_at is null or oe.revoked_at > a.created_at)
    order by oe.updated_at desc
    limit 1
  ) entitlement on true
  where a.action_type in (
    'checkout_start', 'checkout_step_viewed', 'checkout_field_started',
    'checkout_field_completed', 'checkout_validation_error', 'postcode_lookup_attempt',
    'postcode_lookup_result', 'address_results_returned', 'address_selected',
    'delivery_extra_toggled', 'offer_code_attempt', 'offer_code_result',
    'place_order_clicked', 'place_order_failed', 'checkout_back_to_cart',
    'checkout_quote_whatsapp_click', 'checkout_exit', 'order_placed'
  )
    and coalesce(a.metadata ->> 'data_class', 'unclassified') <> 'qa_test'
), bucketed as (
  select
    *,
    case
      when lower(coalesce(entitlement_source, '')) = 'meta_ads'
        or (lower(coalesce(utm_source, '')) in ('meta','facebook','instagram') and lower(coalesce(utm_medium, '')) = 'paid_social')
        then 'meta_paid_ads'
      when lower(coalesce(entitlement_source, '')) = 'meta_catalog' then 'meta_catalog'
      when lower(coalesce(entitlement_source, '')) = 'google_ads'
        or (lower(coalesce(utm_source, '')) = 'google' and lower(coalesce(utm_medium, '')) = 'cpc')
        then 'google_paid'
      when lower(coalesce(utm_source, '')) in ('facebook','instagram','meta','fb','ig','tiktok','pinterest') then 'organic_social'
      when nullif(utm_source, '') is null then 'direct'
      else 'other_referral'
    end as source_bucket
  from event_rows
)
select
  timezone('Asia/Karachi', created_at)::date as activity_date,
  source_bucket,
  utm_campaign,
  utm_content,
  action_type,
  metadata ->> 'step' as step,
  metadata ->> 'field' as field,
  metadata ->> 'outcome' as outcome,
  metadata ->> 'extra' as extra,
  metadata ->> 'error_code' as error_code,
  count(*) as events,
  count(distinct visitor_id) as unique_visitors,
  count(distinct session_id) as sessions
from bucketed
group by 1,2,3,4,5,6,7,8,9,10;

create or replace view reporting.checkout_session_funnel
with (security_invoker = true)
as
with checkout_actions as (
  select
    a.visitor_id,
    a.session_id,
    a.created_at,
    a.action_type,
    a.metadata,
    coalesce(s.first_touch_source, s.last_touch_source) as utm_source,
    coalesce(s.first_touch_medium, s.last_touch_medium) as utm_medium,
    coalesce(s.first_touch_campaign, s.last_touch_campaign) as utm_campaign,
    coalesce(s.first_touch_content, s.last_touch_content) as utm_content
  from public.attribution_actions a
  left join public.attribution_sessions s on s.arrival_id = a.arrival_id
  where a.action_type in (
    'checkout_start', 'checkout_step_viewed', 'checkout_field_started',
    'checkout_field_completed', 'checkout_validation_error', 'postcode_lookup_attempt',
    'postcode_lookup_result', 'address_results_returned', 'address_selected',
    'delivery_extra_toggled', 'offer_code_attempt', 'offer_code_result',
    'place_order_clicked', 'place_order_failed', 'checkout_back_to_cart',
    'checkout_quote_whatsapp_click', 'checkout_exit', 'order_placed'
  )
    and coalesce(a.metadata ->> 'data_class', 'unclassified') <> 'qa_test'
), rolled as (
  select
    visitor_id,
    session_id,
    min(created_at) filter (where action_type = 'checkout_start') as checkout_started_at,
    min(created_at) filter (where action_type = 'checkout_step_viewed' and metadata ->> 'step' = 'delivery') as delivery_step_at,
    min(created_at) filter (where action_type = 'postcode_lookup_result' and metadata ->> 'outcome' = 'mainland_success') as postcode_success_at,
    min(created_at) filter (where action_type = 'address_selected') as address_selected_at,
    min(created_at) filter (where action_type = 'place_order_clicked') as place_order_clicked_at,
    min(created_at) filter (where action_type = 'order_placed') as order_placed_at,
    max(created_at) as last_checkout_action_at,
    count(*) filter (where action_type = 'postcode_lookup_attempt') as postcode_attempts,
    count(*) filter (where action_type = 'checkout_validation_error') as validation_errors,
    count(*) filter (where action_type = 'place_order_failed') as place_order_failures,
    max(utm_source) as utm_source,
    max(utm_medium) as utm_medium,
    max(utm_campaign) as utm_campaign,
    max(utm_content) as utm_content
  from checkout_actions
  group by visitor_id, session_id
)
select
  *,
  case
    when order_placed_at is not null then 'order_placed'
    when place_order_clicked_at is not null then 'place_order_clicked'
    when address_selected_at is not null then 'address_selected'
    when postcode_success_at is not null then 'postcode_confirmed'
    when delivery_step_at is not null then 'delivery_details'
    when checkout_started_at is not null then 'checkout_started'
    else 'checkout_observed'
  end as furthest_stage,
  (
    checkout_started_at is not null
    and checkout_started_at < now() - interval '60 minutes'
    and order_placed_at is null
  ) as abandoned_after_60m
from rolled;

revoke all on reporting.checkout_friction_daily from anon, authenticated;
revoke all on reporting.checkout_session_funnel from anon, authenticated;
grant select on reporting.checkout_friction_daily to service_role;
grant select on reporting.checkout_session_funnel to service_role;

comment on view reporting.checkout_friction_daily is
  'Privacy-safe checkout interaction counts. Metadata contains only allowlisted enums/counters/booleans; never customer-entered values.';
comment on view reporting.checkout_session_funnel is
  'Anonymous checkout session funnel with a derived 60-minute abandonment flag; no customer PII.';
