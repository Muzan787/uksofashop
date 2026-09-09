-- Offer Phase D — UK Mainland checkout authority
--
-- The public website Server Action now resolves the actual shipping postcode
-- server-side before it calls place_order. Keeping this RPC executable by anon
-- would leave a second, weaker checkout path: a browser could bypass React and
-- the Server Action entirely and call the database function directly.
--
-- Do not add a browser-supplied is_mainland/delivery_zone argument here. The
-- public boundary accepts only the postcode and makes the delivery decision on
-- the server. place_order remains the monetary authority for catalogue price,
-- Offer Phase B/C discount, extras and final total.
--
-- The privileged WhatsApp/manual flow uses place_manual_order and is untouched.

begin;

revoke execute on function public.place_order(
  text, text, text, text, text, jsonb, numeric,
  integer, boolean, boolean, boolean, text, uuid
) from public, anon, authenticated;

grant execute on function public.place_order(
  text, text, text, text, text, jsonb, numeric,
  integer, boolean, boolean, boolean, text, uuid
) to service_role;

comment on function public.place_order(
  text, text, text, text, text, jsonb, numeric,
  integer, boolean, boolean, boolean, text, uuid
) is
  'Public website order monetary authority. Offer Phase D: executable only by service_role after server-side postcode delivery validation; never call directly from the browser.';

commit;
