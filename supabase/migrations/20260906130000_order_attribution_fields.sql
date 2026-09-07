-- Order-level attribution fields, plus genuine business-state timestamps.
--
-- ADDITIVE ONLY. Every column is nullable or has a safe default; nothing
-- existing is renamed, dropped, or backfilled with invented data. Historical
-- orders simply have nulls here, exactly as they already do for
-- ga_client_id/meta_fbp/meta_fbc since 20260825160000.
--
-- CONFIRMED_AT / CANCELLED_AT are stamped from application code (see
-- src/app/actions/orders.ts), not a trigger, so they follow the same pattern
-- delivered_at already uses - "first time only" is enforced by checking the
-- existing value before writing, not by database machinery.
--
-- LAST-TOUCH, NOT FIRST-TOUCH, ON THE ORDER ITSELF. attribution_sessions (see
-- 20260906100000) keeps both first and last touch for full-funnel analysis;
-- what lands on the order is the touch responsible for the visit that
-- actually converted - see checkout.ts for where these are populated, exactly
-- the same way ga_client_id/meta_fbp/meta_fbc already are.

alter table public.orders
  add column if not exists visitor_id  uuid,
  add column if not exists session_id  uuid,
  add column if not exists arrival_id  uuid,

  add column if not exists gclid       text,
  add column if not exists gbraid      text,
  add column if not exists wbraid      text,
  add column if not exists fbclid      text,

  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content  text,
  add column if not exists utm_term     text,

  add column if not exists landing_page text,
  add column if not exists referrer     text,

  add column if not exists whatsapp_reference text,

  add column if not exists confirmed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text;

create index if not exists orders_visitor_id_idx on public.orders (visitor_id) where visitor_id is not null;
create index if not exists orders_session_id_idx on public.orders (session_id) where session_id is not null;
create index if not exists orders_gclid_idx on public.orders (gclid) where gclid is not null;
create index if not exists orders_whatsapp_reference_idx on public.orders (whatsapp_reference) where whatsapp_reference is not null;

comment on column public.orders.confirmed_at is
  'Stamped once, the first time an order reaches ''confirmed''. Not the same '
  'as purchase_event_sent_at, which guards conversion reporting rather than '
  'recording the business event itself.';
comment on column public.orders.cancelled_at is
  'Stamped once, the first time an order reaches ''cancelled''.';
comment on column public.orders.whatsapp_reference is
  'The UKSS-WA-... reference a customer quoted, if their WhatsApp conversation '
  'became this order - see place_manual_order and whatsapp_enquiries.';
