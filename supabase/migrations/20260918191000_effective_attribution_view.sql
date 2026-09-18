-- Consolidate effective attribution onto the auditable manual labels that
-- already live on orders. Raw UTM/click evidence is never overwritten.

drop view if exists reporting.orders_effective_attribution;

drop table if exists public.order_attribution_overrides;

create or replace view reporting.orders_effective_attribution
with (security_invoker = true)
as
select
  o.id as order_id,
  o.created_at,
  o.status,
  o.source as order_source,
  o.total_amount,
  o.utm_source as raw_source,
  o.utm_medium as raw_medium,
  o.utm_campaign as raw_campaign,
  o.utm_content as raw_content,
  o.manual_acquisition_source,
  o.manual_acquisition_note,
  o.manual_acquisition_at,
  coalesce(o.manual_acquisition_source, o.utm_source) as effective_source,
  case
    when o.manual_acquisition_source is not null then 'manual_business_confirmation'
    else 'raw_tracking'
  end as attribution_basis,
  o.confirmed_at,
  o.delivered_at,
  o.cancelled_at,
  o.purchase_event_sent_at,
  o.delivered_event_sent_at
from public.orders o;

comment on view reporting.orders_effective_attribution is
  'Raw order attribution plus explicit staff-confirmed source labels. Manual source never rewrites UTM/fbclid evidence.';
