-- Phase 3: timestamp-level, non-PII action export for the operational Sheet.
--
-- This remains a private service-role view. It exposes only the small set of
-- commercially meaningful actions already recorded in attribution_actions;
-- raw metadata and private order UUIDs are deliberately excluded.

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
  coalesce(
    nullif(a.metadata->>'data_class', ''),
    reporting.classify_touch(array[
      s.first_touch_source, s.first_touch_medium, s.first_touch_campaign,
      s.first_touch_content, s.first_touch_term, s.last_touch_source,
      s.last_touch_medium, s.last_touch_campaign, s.last_touch_content,
      s.last_touch_term, a.page_url
    ])
  ) as data_class
from public.attribution_actions a
left join public.attribution_sessions s on s.session_id = a.session_id;

revoke all on reporting.attribution_actions from public, anon, authenticated;
grant select on reporting.attribution_actions to service_role;

comment on view reporting.attribution_actions is
  'Private, timestamp-level, non-PII action export for the Phase 3 operational Sheet.';
