-- Manual business attribution without rewriting raw click evidence.
--
-- Raw utm/fbclid fields on orders remain immutable evidence from the browser.
-- This table records a separate, explicit business-side assertion when the
-- shop can verify acquisition by conversation or another off-site source.
-- Reporting should prefer the override only for source-level attribution and
-- should continue to use the raw fields for ad/creative-level proof.

create table if not exists public.order_attribution_overrides (
  order_id uuid primary key references public.orders(id) on delete cascade,
  source text not null,
  medium text,
  campaign text,
  content text,
  reason text not null,
  created_at timestamptz not null default now()
);

comment on table public.order_attribution_overrides is
  'Human-verified attribution overrides. Preserves raw tracking fields on orders and records the business assertion separately.';

alter table public.order_attribution_overrides enable row level security;

revoke all on table public.order_attribution_overrides from anon, authenticated;
grant all on table public.order_attribution_overrides to service_role;

create index if not exists order_attribution_overrides_source_idx
  on public.order_attribution_overrides (source);

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
  a.source as override_source,
  a.medium as override_medium,
  a.campaign as override_campaign,
  a.content as override_content,
  a.reason as override_reason,
  a.created_at as override_created_at,
  coalesce(a.source, o.utm_source) as effective_source,
  coalesce(a.medium, o.utm_medium) as effective_medium,
  coalesce(a.campaign, o.utm_campaign) as effective_campaign,
  coalesce(a.content, o.utm_content) as effective_content,
  case when a.order_id is not null then 'manual_business_override' else 'raw_tracking' end as attribution_basis,
  o.confirmed_at,
  o.delivered_at,
  o.cancelled_at,
  o.purchase_event_sent_at,
  o.delivered_event_sent_at
from public.orders o
left join public.order_attribution_overrides a on a.order_id = o.id;

comment on view reporting.orders_effective_attribution is
  'Order attribution with raw click evidence preserved and optional human-verified source overrides kept explicit.';
