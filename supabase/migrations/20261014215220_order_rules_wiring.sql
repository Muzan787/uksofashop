-- Wiring the order rules into what already exists (admin upgrade Phase 5:
-- F4, F5, A5). Follows 'order_rules', which created the rules themselves.
--
--   * confirm_order(), the customer's confirm link, now changes the status
--     through private.apply_status_change() like staff do, so it is checked
--     by the same rules and records confirmed_by = 'customer'.
--   * A5: the seven owner-rights functions the API could call move into the
--     private schema, each behind a public wrapper with the same name,
--     arguments, defaults, result and grants. The wrappers run with the
--     caller's rights; only the private function has the owner's. The app
--     calls exactly what it called before.
--       is_admin, confirm_order, order_for_confirmation, request_swatches,
--       track_order (all callable signed out, as before),
--       place_manual_order, update_order_details (signed in; both already
--       refuse anyone who is not an admin).
--     Every RLS policy that calls is_admin() refers to the function itself,
--     not its name, so all of them keep working unchanged.
--   * F5: test orders stop counting wherever the campaign name was the test:
--     Google's offline staging, the reporting views and the Status snapshot.
--     OrderFlow is untouched (decision 7).
--   * The ten tables only the server uses get an explicit "service role only"
--     policy. Nothing about who can read them changes - they had no policy,
--     which already meant no access - but now that is stated, and the
--     security advisor has nothing left to flag but the leaked-password
--     toggle.

grant usage on schema private to anon, authenticated, service_role;

-- ── confirm_order: through the one status function ────────────────────────
alter function public.confirm_order(uuid) set schema private;

create or replace function private.confirm_order(p_order_id uuid)
 returns table(id uuid, status text, customer_name text, total_amount numeric, shipping_address text, created_at timestamp with time zone)
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  -- Only an order still waiting is confirmed; opening the link again later,
  -- or after staff have moved the order on, changes nothing.
  if exists (select 1 from public.orders o where o.id = p_order_id and o.status = 'pending_cod') then
    perform private.apply_status_change(p_order_id, 'confirmed', 'customer', null);
  end if;

  return query
  select o.id, o.status, o.customer_name, o.total_amount, o.shipping_address, o.created_at
    from public.orders o
   where o.id = p_order_id;
end;
$function$;

create or replace function public.confirm_order(p_order_id uuid)
 returns table(id uuid, status text, customer_name text, total_amount numeric, shipping_address text, created_at timestamp with time zone)
 language sql security invoker set search_path to ''
as $function$ select * from private.confirm_order(p_order_id); $function$;

-- ── A5: the other six, moved as they are ──────────────────────────────────
alter function public.is_admin() set schema private;
create or replace function public.is_admin()
 returns boolean language sql stable security invoker set search_path to ''
as $function$ select private.is_admin(); $function$;

alter function public.order_for_confirmation(uuid) set schema private;
create or replace function public.order_for_confirmation(p_order_id uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$ select private.order_for_confirmation(p_order_id); $function$;

alter function public.request_swatches(text, text, text, text, text, uuid[], text, text) set schema private;
create or replace function public.request_swatches(
  p_customer_name text, p_customer_email text, p_customer_phone text, p_postcode text,
  p_shipping_address text, p_fabric_ids uuid[], p_ip text default null, p_user_agent text default null)
 returns jsonb language sql security invoker set search_path to ''
as $function$
  select private.request_swatches(p_customer_name, p_customer_email, p_customer_phone, p_postcode,
                                  p_shipping_address, p_fabric_ids, p_ip, p_user_agent);
$function$;

alter function public.track_order(text, text) set schema private;
create or replace function public.track_order(p_reference text, p_postcode text)
 returns jsonb language sql security invoker set search_path to ''
as $function$ select private.track_order(p_reference, p_postcode); $function$;

alter function public.place_manual_order(text, text, text, text, text, jsonb, numeric, text, text, date, text) set schema private;
create or replace function public.place_manual_order(
  p_customer_name text, p_customer_email text, p_customer_phone text, p_shipping_address text,
  p_special_instructions text, p_items jsonb, p_delivery_charge numeric default 0,
  p_source text default 'whatsapp', p_whatsapp_reference text default null,
  p_preferred_delivery_date date default null, p_lead_reference text default null)
 returns jsonb language sql security invoker set search_path to ''
as $function$
  select private.place_manual_order(p_customer_name, p_customer_email, p_customer_phone, p_shipping_address,
                                    p_special_instructions, p_items, p_delivery_charge, p_source,
                                    p_whatsapp_reference, p_preferred_delivery_date, p_lead_reference);
$function$;

alter function public.update_order_details(uuid, text, text, text, text, text, date, numeric, jsonb) set schema private;
create or replace function public.update_order_details(
  p_order_id uuid, p_customer_name text, p_customer_email text, p_customer_phone text,
  p_shipping_address text, p_special_instructions text, p_preferred_delivery_date date,
  p_delivery_total numeric, p_items jsonb)
 returns jsonb language sql security invoker set search_path to ''
as $function$
  select private.update_order_details(p_order_id, p_customer_name, p_customer_email, p_customer_phone,
                                      p_shipping_address, p_special_instructions, p_preferred_delivery_date,
                                      p_delivery_total, p_items);
$function$;

-- Grants: the wrappers get exactly what the functions had; the private
-- functions are reachable only through them (the private schema is not
-- exposed by the API) and by RLS policies, which call private.is_admin().
revoke all on function public.is_admin() from public, anon, authenticated, service_role;
revoke all on function public.confirm_order(uuid) from public, anon, authenticated, service_role;
revoke all on function public.order_for_confirmation(uuid) from public, anon, authenticated, service_role;
revoke all on function public.request_swatches(text, text, text, text, text, uuid[], text, text) from public, anon, authenticated, service_role;
revoke all on function public.track_order(text, text) from public, anon, authenticated, service_role;
revoke all on function public.place_manual_order(text, text, text, text, text, jsonb, numeric, text, text, date, text) from public, anon, authenticated, service_role;
revoke all on function public.update_order_details(uuid, text, text, text, text, text, date, numeric, jsonb) from public, anon, authenticated, service_role;

grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.confirm_order(uuid) to anon, authenticated, service_role;
grant execute on function public.order_for_confirmation(uuid) to anon, authenticated, service_role;
grant execute on function public.request_swatches(text, text, text, text, text, uuid[], text, text) to anon, authenticated, service_role;
grant execute on function public.track_order(text, text) to anon, authenticated, service_role;
grant execute on function public.place_manual_order(text, text, text, text, text, jsonb, numeric, text, text, date, text) to authenticated, service_role;
grant execute on function public.update_order_details(uuid, text, text, text, text, text, date, numeric, jsonb) to authenticated, service_role;

revoke all on function private.is_admin() from public;
revoke all on function private.confirm_order(uuid) from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.confirm_order(uuid) to anon, authenticated, service_role;

-- ── F5: test orders out of Google's offline staging ───────────────────────
do $migration$
declare
  d text;
  n text;
begin
  d := pg_get_functiondef('public.google_phase2b_stage(uuid)'::regprocedure);
  n := replace(d, 'o.utm_campaign=''offer-test'' or', 'o.utm_campaign=''offer-test'' or o.is_test or');
  if n = d then
    raise exception 'google_phase2b_stage: the test-order exclusion was not found';
  end if;
  execute n;
end;
$migration$;

-- ── F5: test orders out of the Status snapshot's order counts ─────────────
do $migration$
declare
  d text;
  n text;
begin
  d := pg_get_functiondef('private.admin_status_snapshot()'::regprocedure);
  n := replace(d, 'coalesce(o.utm_campaign, '''') <> ''offer-test''', 'not o.is_test');
  n := replace(n, 'o.utm_campaign = ''offer-test''', 'o.is_test');
  if n = d or n like '%offer-test%' then
    raise exception 'admin_status_snapshot: the test-order expressions were not all replaced';
  end if;
  execute n;
end;
$migration$;

-- ── F5: test orders out of the reporting views ────────────────────────────
do $migration$
declare
  d text;
  n text;
begin
  -- orders_profit: a test order is classed qa_test, like a QA campaign, so
  -- every view built on it (daily_performance, meta_outcome_ledger) drops it.
  d := pg_get_viewdef('reporting.orders_profit'::regclass);
  n := regexp_replace(d, 'CASE\s+WHEN \(reporting\.classify_touch', 'CASE WHEN o.is_test THEN ''qa_test''::text WHEN (reporting.classify_touch');
  if n = d then raise exception 'orders_profit: data_class CASE not found'; end if;
  execute 'create or replace view reporting.orders_profit with (security_invoker = true) as ' || rtrim(btrim(n), ';');

  d := pg_get_viewdef('reporting.orders_effective_attribution'::regclass);
  n := regexp_replace(btrim(d), 'FROM orders o;?$', 'FROM orders o WHERE NOT o.is_test');
  if n = btrim(d) then raise exception 'orders_effective_attribution: FROM clause not found'; end if;
  execute 'create or replace view reporting.orders_effective_attribution with (security_invoker = true) as ' || n;

  d := pg_get_viewdef('public.journey_session_funnel_v1'::regclass);
  n := regexp_replace(d, 'FROM orders o\s+WHERE \(', 'FROM orders o WHERE (NOT o.is_test) AND (', 'g');
  if regexp_count(n, 'NOT o\.is_test') <> 3 then raise exception 'journey_session_funnel_v1: expected three order lookups'; end if;
  execute 'create or replace view public.journey_session_funnel_v1 with (security_invoker = true) as ' || rtrim(btrim(n), ';');
end;
$migration$;

-- ── Server-only tables: say so ────────────────────────────────────────────
do $migration$
declare
  t text;
begin
  foreach t in array array[
    'attribution_actions', 'attribution_sessions', 'delivery_distance_fees',
    'google_consent_receipts', 'google_conversion_outbox', 'google_ga4_delivery',
    'google_order_consent', 'google_phase2b_config', 'google_sheet_sync_runs',
    'whatsapp_enquiries'
  ] loop
    execute format('drop policy if exists "service role only" on public.%I', t);
    execute format('create policy "service role only" on public.%I for all to anon, authenticated using (false) with check (false)', t);
  end loop;
end;
$migration$;
