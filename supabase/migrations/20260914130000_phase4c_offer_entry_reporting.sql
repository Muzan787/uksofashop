-- Phase 4C: trusted Meta catalogue offer entry + first-party offer funnel.
--
-- The public SOFAEXTRA code and all discount calculations remain unchanged.
-- This migration only extends issuance authority and private reporting.

alter table public.offer_entitlements
  drop constraint if exists offer_entitlements_source_check;

alter table public.offer_entitlements
  add constraint offer_entitlements_source_check
  check (source = any (array[
    'google_ads'::text,
    'meta_ads'::text,
    'meta_catalog'::text
  ]));

create or replace function public.issue_paid_offer_entitlement(
  p_visitor_id uuid,
  p_source text,
  p_arrival_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_now timestamptz := now();
  v_row public.offer_entitlements%rowtype;
begin
  if p_visitor_id is null then
    raise exception 'VISITOR_REQUIRED' using errcode = 'check_violation';
  end if;

  if p_source is null or p_source <> all (array[
    'google_ads'::text,
    'meta_ads'::text,
    'meta_catalog'::text
  ]) then
    raise exception 'INVALID_OFFER_SOURCE' using errcode = 'check_violation';
  end if;

  insert into public.offer_entitlements (
    token, visitor_id, source, qualifying_arrival_id,
    started_at, expires_at, revoked_at, updated_at
  )
  values (
    gen_random_uuid(), p_visitor_id, p_source, p_arrival_id,
    v_now, v_now + interval '7 days', null, v_now
  )
  on conflict (visitor_id) do update
  set token = case
        when offer_entitlements.revoked_at is null
         and offer_entitlements.expires_at > v_now
          then offer_entitlements.token
        else gen_random_uuid()
      end,
      source = excluded.source,
      qualifying_arrival_id = excluded.qualifying_arrival_id,
      started_at = case
        when offer_entitlements.revoked_at is null
         and offer_entitlements.expires_at > v_now
          then offer_entitlements.started_at
        else v_now
      end,
      expires_at = v_now + interval '7 days',
      revoked_at = null,
      updated_at = v_now
  returning * into v_row;

  return jsonb_build_object(
    'token', v_row.token,
    'source', v_row.source,
    'started_at', v_row.started_at,
    'expires_at', v_row.expires_at
  );
end;
$function$;

revoke execute on function public.issue_paid_offer_entitlement(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.issue_paid_offer_entitlement(uuid, text, uuid)
  to service_role;

alter table public.attribution_actions
  drop constraint if exists attribution_actions_action_type_check;

alter table public.attribution_actions
  add constraint attribution_actions_action_type_check
  check (action_type in (
    'arrival', 'product_view', 'add_to_cart', 'checkout_start',
    'whatsapp_click', 'call_click', 'order_placed',
    'offer_qualified', 'offer_prompt_shown',
    'offer_prompt_dismissed', 'offer_code_copied'
  ));

create or replace view reporting.daily_acquisition_funnel
with (security_invoker = true)
as
with action_rollup as (
  select
    arrival_id,
    max(metadata->>'source') filter (where action_type = 'offer_qualified') as offer_source,
    count(*) filter (where action_type = 'product_view') as product_views,
    count(*) filter (where action_type = 'add_to_cart') as add_to_carts,
    count(*) filter (where action_type = 'checkout_start') as checkout_starts,
    count(*) filter (where action_type = 'whatsapp_click') as whatsapp_clicks,
    count(distinct visitor_id) filter (where action_type = 'offer_qualified') as offer_qualified_visitors,
    count(distinct visitor_id) filter (where action_type = 'offer_prompt_shown') as offer_prompt_shown_visitors,
    count(distinct visitor_id) filter (where action_type = 'offer_prompt_dismissed') as offer_prompt_dismissed_visitors,
    count(distinct visitor_id) filter (where action_type = 'offer_code_copied') as offer_code_copied_visitors
  from public.attribution_actions
  group by arrival_id
),
whatsapp_rollup as (
  select arrival_id, count(*) as whatsapp_enquiries
  from public.whatsapp_enquiries
  group by arrival_id
),
order_rollup as (
  select
    arrival_id,
    count(*) as orders_placed,
    count(*) filter (where confirmed_at is not null) as confirmed_purchases,
    count(*) filter (where delivered_at is not null) as delivered_orders
  from public.orders
  group by arrival_id
),
arrival_dimensions as (
  select
    s.*,
    a.offer_source,
    coalesce(a.product_views, 0) as product_views,
    coalesce(a.add_to_carts, 0) as add_to_carts,
    coalesce(a.checkout_starts, 0) as checkout_starts,
    coalesce(a.whatsapp_clicks, 0) as whatsapp_clicks,
    coalesce(a.offer_qualified_visitors, 0) as offer_qualified_visitors,
    coalesce(a.offer_prompt_shown_visitors, 0) as offer_prompt_shown_visitors,
    coalesce(a.offer_prompt_dismissed_visitors, 0) as offer_prompt_dismissed_visitors,
    coalesce(a.offer_code_copied_visitors, 0) as offer_code_copied_visitors,
    coalesce(w.whatsapp_enquiries, 0) as whatsapp_enquiries,
    coalesce(o.orders_placed, 0) as orders_placed,
    coalesce(o.confirmed_purchases, 0) as confirmed_purchases,
    coalesce(o.delivered_orders, 0) as delivered_orders,
    coalesce(
      s.first_touch_source,
      (regexp_match(coalesce(s.landing_page, ''), '(?:[?&])utm_source=([^&#]*)'))[1]
    ) as report_utm_source,
    coalesce(
      s.first_touch_medium,
      (regexp_match(coalesce(s.landing_page, ''), '(?:[?&])utm_medium=([^&#]*)'))[1]
    ) as report_utm_medium,
    coalesce(
      s.first_touch_campaign,
      (regexp_match(coalesce(s.landing_page, ''), '(?:[?&])utm_campaign=([^&#]*)'))[1]
    ) as report_utm_campaign,
    coalesce(
      s.first_touch_content,
      (regexp_match(coalesce(s.landing_page, ''), '(?:[?&])utm_content=([^&#]*)'))[1]
    ) as report_utm_content,
    coalesce(
      s.first_touch_term,
      (regexp_match(coalesce(s.landing_page, ''), '(?:[?&])utm_term=([^&#]*)'))[1]
    ) as report_utm_term,
    (regexp_match(coalesce(s.landing_page, ''), '(?:[?&])utm_id=([^&#]*)'))[1] as campaign_id,
    (regexp_match(coalesce(s.landing_page, ''), '(?:[?&])adset_id=([^&#]*)'))[1] as adset_id,
    (regexp_match(coalesce(s.landing_page, ''), '(?:[?&])ad_id=([^&#]*)'))[1] as ad_id,
    (regexp_match(coalesce(s.landing_page, ''), '(?:[?&])placement=([^&#]*)'))[1] as placement,
    (regexp_match(coalesce(s.landing_page, ''), '(?:[?&])utm_source_platform=([^&#]*)'))[1] as source_platform
  from public.attribution_sessions s
  left join action_rollup a using (arrival_id)
  left join whatsapp_rollup w using (arrival_id)
  left join order_rollup o using (arrival_id)
),
bucketed as (
  select
    d.*,
    case
      when lower(coalesce(d.offer_source, '')) = 'meta_ads'
        or (
          lower(coalesce(d.report_utm_source, '')) in ('meta', 'facebook', 'instagram')
          and lower(coalesce(d.report_utm_medium, '')) = 'paid_social'
        ) then 'meta_paid_ads'
      when lower(coalesce(d.offer_source, '')) = 'google_ads'
        or nullif(d.gclid, '') is not null
        or nullif(d.gbraid, '') is not null
        or nullif(d.wbraid, '') is not null
        or (
          lower(coalesce(d.report_utm_source, '')) = 'google'
          and lower(coalesce(d.report_utm_medium, '')) = 'cpc'
        ) then 'google_paid'
      when lower(coalesce(d.offer_source, '')) = 'meta_catalog' then 'meta_catalog'
      when lower(coalesce(d.report_utm_source, '')) in (
        'facebook', 'instagram', 'meta', 'fb', 'ig', 'tiktok', 'pinterest'
      ) then 'organic_social'
      when nullif(d.report_utm_source, '') is null and nullif(d.referrer, '') is null
        then 'direct'
      when nullif(d.report_utm_source, '') is not null or nullif(d.referrer, '') is not null
        then 'other_referral'
      else 'unknown'
    end as source_bucket,
    reporting.classify_touch(array[
      d.report_utm_source, d.report_utm_medium, d.report_utm_campaign,
      d.report_utm_content, d.report_utm_term, d.landing_page, d.referrer
    ]) as data_class
  from arrival_dimensions d
)
select
  timezone('Asia/Karachi', created_at)::date as activity_date,
  source_bucket,
  data_class,
  report_utm_source as utm_source,
  report_utm_medium as utm_medium,
  report_utm_campaign as utm_campaign,
  report_utm_content as utm_content,
  report_utm_term as utm_term,
  campaign_id,
  adset_id,
  ad_id,
  placement,
  source_platform,
  count(distinct visitor_id) as unique_visitors,
  count(distinct session_id) as sessions,
  count(*) as arrivals,
  sum(offer_qualified_visitors) as offer_qualified_visitors,
  sum(offer_prompt_shown_visitors) as offer_prompt_shown_visitors,
  sum(offer_prompt_dismissed_visitors) as offer_prompt_dismissed_visitors,
  sum(offer_code_copied_visitors) as offer_code_copied_visitors,
  sum(product_views) as product_views,
  sum(add_to_carts) as add_to_carts,
  sum(checkout_starts) as checkout_starts,
  sum(whatsapp_clicks) as whatsapp_clicks,
  sum(whatsapp_enquiries) as whatsapp_enquiries,
  sum(orders_placed) as orders_placed,
  sum(confirmed_purchases) as confirmed_purchases,
  sum(delivered_orders) as delivered_orders
from bucketed
group by
  timezone('Asia/Karachi', created_at)::date,
  source_bucket, data_class,
  report_utm_source, report_utm_medium, report_utm_campaign,
  report_utm_content, report_utm_term,
  campaign_id, adset_id, ad_id, placement, source_platform;

revoke all on reporting.daily_acquisition_funnel from public, anon, authenticated;
grant select on reporting.daily_acquisition_funnel to service_role;

comment on view reporting.daily_acquisition_funnel is
  'Private daily acquisition and offer funnel by honest source/campaign dimensions; business date is Asia/Karachi.';
