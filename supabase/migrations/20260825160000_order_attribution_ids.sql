-- Attribution identifiers, captured at checkout and used later.
--
-- The Purchase conversion is reported when the order is confirmed, which is an
-- admin action minutes after the customer has closed the tab. By then their
-- browser is gone, so anything that ties the conversion back to the ad click
-- has to have been saved at the point of ordering.
--
--   ga_client_id : from the _ga cookie. Without it GA4 files the purchase as a
--                  new anonymous user and credits it to (direct)/(none)
--                  instead of the campaign that earned it.
--   meta_fbp     : Meta's browser id cookie, its main non-PII match key.
--   meta_fbc     : Meta's click id cookie, set when the visit came from a Meta
--                  ad. This is the strongest attribution signal there is - it
--                  names the specific ad click.
--
-- All three are pseudonymous advertising identifiers rather than contact
-- details, and are only populated when the visitor accepted cookies.

alter table public.orders
  add column if not exists ga_client_id text,
  add column if not exists meta_fbp text,
  add column if not exists meta_fbc text;

comment on column public.orders.ga_client_id is
  'GA4 client id from the _ga cookie, for server-side purchase attribution.';
comment on column public.orders.meta_fbp is
  'Meta _fbp browser id cookie, captured at checkout for the Conversions API.';
comment on column public.orders.meta_fbc is
  'Meta _fbc click id cookie, captured at checkout for the Conversions API.';
