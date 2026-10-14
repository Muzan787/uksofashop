-- Order rules in the database (admin upgrade Phase 5: F1-F5, F7, F8).
--
-- Until now the order lifecycle lived in the admin's server action: it could
-- set any status, stamped stage times only if it remembered to, and kept no
-- record of who changed what. An edit in the Supabase dashboard skipped all of
-- it. Now the database itself holds the rules, for every way in:
--
--   F1  Allowed status moves (plan decision 5), checked by a trigger on every
--       update; anything else is refused with BAD_STATUS_CHANGE.
--         Waiting to confirm -> Confirmed or Cancelled
--         Confirmed / Processing / On its way / Delivered -> any of those four,
--           or Cancelled (so mistakes can be corrected)
--         Cancelled -> Confirmed, by an admin only, with a reason
--   F2  Each stage's time is stamped the first time the order reaches it and
--       can never be changed after (STAGE_TIME_LOCKED). confirmed_by records,
--       once, whether the customer or staff confirmed it.
--   F3  order_events: every placement, status change, detail change, test-flag
--       change, source change and note, with the staff account that did it
--       (empty for the customer or the system). Filled by triggers, so nothing
--       can change an order without leaving a line. Older orders start empty.
--   F4  apply_status_change() is the one place a status changes: staff through
--       change_order_status(), customers through confirm_order().
--   F5  is_test / test_reason, backfilled for the one known test order
--       (decision 6: the offer-test campaign).
--   F7  delete_order(): any order may still be deleted (decision 9), now in
--       one database function that clears every linked row first.
--   F8  Staff functions, each checking admin rights itself.
--
-- Owner-rights functions live in the private schema; the API reaches the
-- staff ones only through the thin public wrappers at the end.
--
-- This file is self-contained so scripts/order-rules.test.cjs can replay it
-- into PGlite. The wiring into existing functions, reports and the moves of
-- older functions into the private schema is in the migration after it.

-- ── Columns ────────────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists is_test boolean not null default false,
  add column if not exists test_reason text,
  add column if not exists confirmed_by text;

alter table public.orders drop constraint if exists orders_confirmed_by_check;
alter table public.orders
  add constraint orders_confirmed_by_check
  check (confirmed_by is null or confirmed_by in ('customer', 'staff'));

comment on column public.orders.is_test is
  'A test order: never counts in reports, the weekly digest, Needs attention, or Meta/Google sends. OrderFlow still receives it (decision 7).';
comment on column public.orders.confirmed_by is
  'Who confirmed it: customer (their confirm link) or staff. Recorded once; null on orders confirmed before 15 Oct 2026.';

-- Decision 6: one existing test order, the one placed from the offer-test
-- link. Backfilled before the history triggers exist, so it leaves no event.
update public.orders
   set is_test = true,
       test_reason = 'Placed from the offer-test link'
 where utm_campaign = 'offer-test'
   and not is_test;

-- ── order_events ──────────────────────────────────────────────────────────
create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('placed', 'status_changed', 'details_changed', 'test_flag_changed', 'source_changed', 'note')),
  from_status text,
  to_status text,
  -- The admin account that did it; empty for the customer or the system.
  staff_id uuid references auth.users(id) on delete set null,
  note text
);

comment on table public.order_events is
  'What happened to each order and who did it. Written only by triggers and staff functions; admins read it.';

create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

alter table public.order_events enable row level security;
revoke all on public.order_events from anon, authenticated;
grant select on public.order_events to authenticated;

drop policy if exists "admin can read order events" on public.order_events;
create policy "admin can read order events"
  on public.order_events
  for select
  to authenticated
  using ((select public.is_admin()));

create schema if not exists private;

-- ── F1: the allowed moves ─────────────────────────────────────────────────
create or replace function private.order_move_allowed(p_from text, p_to text, p_staff boolean)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $function$
  select case
    when p_from is not distinct from p_to then true
    when p_from = 'pending_cod' then p_to in ('confirmed', 'cancelled')
    when p_from in ('confirmed', 'processing', 'shipped', 'delivered')
      then p_to in ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
    when p_from = 'cancelled' then p_staff and p_to = 'confirmed'
    else false
  end;
$function$;

-- ── F1 + F2: the guard on every insert and update ─────────────────────────
create or replace function private.orders_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_staff boolean := coalesce(public.is_admin(), false);
  v_actor text := nullif(current_setting('orders.actor', true), '');
begin
  if tg_op = 'INSERT' then
    -- An order placed already confirmed (a WhatsApp order taken by staff).
    if new.confirmed_at is not null and new.confirmed_by is null and v_staff then
      new.confirmed_by := 'staff';
    end if;
    return new;
  end if;

  -- F2: a stage time, once stamped, never moves.
  if (old.confirmed_at is not null and new.confirmed_at is distinct from old.confirmed_at)
     or (old.processing_at is not null and new.processing_at is distinct from old.processing_at)
     or (old.shipped_at is not null and new.shipped_at is distinct from old.shipped_at)
     or (old.delivered_at is not null and new.delivered_at is distinct from old.delivered_at)
     or (old.cancelled_at is not null and new.cancelled_at is distinct from old.cancelled_at)
     or (old.confirmed_by is not null and new.confirmed_by is distinct from old.confirmed_by) then
    raise exception 'STAGE_TIME_LOCKED' using detail = 'A stage time or who confirmed the order cannot be changed once recorded.';
  end if;

  -- F1: only the allowed moves.
  if new.status is distinct from old.status then
    if not private.order_move_allowed(old.status, new.status, v_staff) then
      raise exception 'BAD_STATUS_CHANGE' using detail = coalesce(old.status, 'none') || ' -> ' || coalesce(new.status, 'none');
    end if;

    -- The first time an order reaches a stage, stamp it.
    if new.status = 'confirmed' and new.confirmed_at is null then new.confirmed_at := now(); end if;
    if new.status = 'processing' and new.processing_at is null then new.processing_at := now(); end if;
    if new.status = 'shipped' and new.shipped_at is null then new.shipped_at := now(); end if;
    if new.status = 'delivered' and new.delivered_at is null then new.delivered_at := now(); end if;
    if new.status = 'cancelled' and new.cancelled_at is null then new.cancelled_at := now(); end if;
  end if;

  -- Who confirmed it, recorded once, when confirmed_at is first stamped.
  if old.confirmed_at is null and new.confirmed_at is not null and new.confirmed_by is null then
    new.confirmed_by := case
      when v_actor = 'customer' then 'customer'
      when v_actor = 'staff' or v_staff then 'staff'
      else null
    end;
  end if;

  return new;
end;
$function$;

drop trigger if exists orders_guard on public.orders;
create trigger orders_guard
  before insert or update on public.orders
  for each row execute function private.orders_guard();

-- ── F3: the history ───────────────────────────────────────────────────────
create or replace function private.orders_history()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_staff uuid := case when coalesce(public.is_admin(), false) then auth.uid() end;
  v_note text := nullif(btrim(current_setting('orders.event_note', true)), '');
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, kind, to_status, staff_id, note)
    values (new.id, 'placed', new.status, v_staff, case when new.is_test then 'Test order' end);
    return null;
  end if;

  if new.status is distinct from old.status then
    insert into public.order_events (order_id, kind, from_status, to_status, staff_id, note)
    values (new.id, 'status_changed', old.status, new.status, v_staff,
            coalesce(v_note, case when new.status = 'cancelled' then new.cancellation_reason end));
  end if;

  if new.is_test is distinct from old.is_test then
    insert into public.order_events (order_id, kind, staff_id, note)
    values (new.id, 'test_flag_changed', v_staff,
            case when new.is_test then coalesce(new.test_reason, 'Marked as a test order') else 'Marked as a real order' end);
  end if;

  if (new.manual_acquisition_source, new.manual_acquisition_note)
     is distinct from (old.manual_acquisition_source, old.manual_acquisition_note) then
    insert into public.order_events (order_id, kind, staff_id, note)
    values (new.id, 'source_changed', v_staff,
            coalesce(new.manual_acquisition_source, 'cleared') || coalesce(': ' || new.manual_acquisition_note, ''));
  end if;

  if (new.customer_name, new.customer_email, new.customer_phone, new.shipping_address,
      new.special_instructions, new.preferred_delivery_date, new.items_subtotal,
      new.delivery_total, new.total_amount)
     is distinct from
     (old.customer_name, old.customer_email, old.customer_phone, old.shipping_address,
      old.special_instructions, old.preferred_delivery_date, old.items_subtotal,
      old.delivery_total, old.total_amount) then
    insert into public.order_events (order_id, kind, staff_id)
    values (new.id, 'details_changed', v_staff);
  end if;

  return null;
end;
$function$;

drop trigger if exists orders_history on public.orders;
create trigger orders_history
  after insert or update on public.orders
  for each row execute function private.orders_history();

revoke all on function private.order_move_allowed(text, text, boolean) from public, anon, authenticated;
revoke all on function private.orders_guard() from public, anon, authenticated;
revoke all on function private.orders_history() from public, anon, authenticated;

-- ── F4: the one place a status changes ────────────────────────────────────
-- p_actor: 'staff' or 'customer'. p_note: the reason - required to reopen a
-- cancelled order; kept as the cancellation reason when cancelling.
create or replace function private.apply_status_change(p_order_id uuid, p_status text, p_actor text, p_note text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_old public.orders;
  v_new public.orders;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_status not in ('pending_cod', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') then
    raise exception 'BAD_STATUS';
  end if;

  select * into v_old from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if v_old.status = 'cancelled' and p_status <> 'cancelled' and v_note is null then
    raise exception 'REASON_REQUIRED' using detail = 'Reopening a cancelled order needs a reason.';
  end if;

  perform set_config('orders.actor', p_actor, true);
  perform set_config('orders.event_note', coalesce(v_note, ''), true);

  update public.orders o
     set status = p_status,
         cancellation_reason = case
           when p_status = 'cancelled' and v_old.status <> 'cancelled' and v_note is not null then v_note
           else o.cancellation_reason
         end
   where o.id = p_order_id
  returning * into v_new;

  perform set_config('orders.actor', '', true);
  perform set_config('orders.event_note', '', true);

  return jsonb_build_object(
    'order_id', v_new.id,
    'from', v_old.status,
    'to', v_new.status,
    'changed', v_old.status is distinct from v_new.status,
    'confirmed_now', v_old.confirmed_at is null and v_new.confirmed_at is not null,
    'customer_name', v_new.customer_name,
    'customer_email', v_new.customer_email,
    'customer_phone', v_new.customer_phone,
    'shipping_address', v_new.shipping_address
  );
end;
$function$;

revoke all on function private.apply_status_change(uuid, text, text, text) from public, anon, authenticated;

-- ── F8: staff functions ───────────────────────────────────────────────────
create or replace function private.require_admin()
 returns void
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;
end;
$function$;

create or replace function private.change_order_status(p_order_id uuid, p_status text, p_reason text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.require_admin();
  return private.apply_status_change(p_order_id, p_status, 'staff', p_reason);
end;
$function$;

create or replace function private.set_order_test_flag(p_order_id uuid, p_is_test boolean, p_reason text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.require_admin();
  update public.orders
     set is_test = p_is_test,
         test_reason = case when p_is_test then nullif(btrim(coalesce(p_reason, '')), '') end
   where id = p_order_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$function$;

create or replace function private.add_order_note(p_order_id uuid, p_note text)
 returns bigint
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_id bigint;
begin
  perform private.require_admin();
  if v_note is null or length(v_note) > 2000 then
    raise exception 'BAD_NOTE' using detail = 'A note is 1 to 2000 characters.';
  end if;
  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'NOT_FOUND';
  end if;
  insert into public.order_events (order_id, kind, staff_id, note)
  values (p_order_id, 'note', auth.uid(), v_note)
  returning id into v_id;
  return v_id;
end;
$function$;

-- Where the order came from, as staff know it (E12). The same five values the
-- column already allows: meta, google, direct, referral, other. Null clears it.
create or replace function private.set_order_source(p_order_id uuid, p_source text, p_note text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.require_admin();
  if p_source is not null and p_source not in ('meta', 'google', 'direct', 'referral', 'other') then
    raise exception 'BAD_SOURCE';
  end if;
  update public.orders
     set manual_acquisition_source = p_source,
         manual_acquisition_note = case when p_source is null then null else nullif(btrim(coalesce(p_note, '')), '') end,
         manual_acquisition_at = case when p_source is null then null else now() end
   where id = p_order_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$function$;

-- F7 / decision 9: any order may be deleted, as before. Every row that points
-- at the order without a cascade is cleared first, in one transaction, so a
-- delete either removes everything or nothing. (The old server action missed
-- the three Google tables, so deleting any order confirmed since 27 Sep
-- failed.) Reviews, checkout reminders and email log rows keep their own
-- record and lose only the link; lines, history and OrderFlow sends go with
-- the order.
create or replace function private.delete_order(p_order_id uuid)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.require_admin();
  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'NOT_FOUND';
  end if;

  delete from public.attribution_actions where order_id = p_order_id;
  delete from public.conversion_events where order_id = p_order_id;
  delete from public.google_offline_conversions where order_id = p_order_id;
  delete from public.google_conversion_outbox where order_id = p_order_id;
  delete from public.google_order_consent where order_id = p_order_id;
  delete from public.google_ga4_delivery where order_id = p_order_id;
  update public.whatsapp_enquiries set converted_order_id = null where converted_order_id = p_order_id;

  delete from public.orders where id = p_order_id;
  return true;
end;
$function$;

revoke all on function private.require_admin() from public, anon, authenticated;
revoke all on function private.change_order_status(uuid, text, text) from public, anon, authenticated;
revoke all on function private.set_order_test_flag(uuid, boolean, text) from public, anon, authenticated;
revoke all on function private.add_order_note(uuid, text) from public, anon, authenticated;
revoke all on function private.set_order_source(uuid, text, text) from public, anon, authenticated;
revoke all on function private.delete_order(uuid) from public, anon, authenticated;

grant execute on function private.change_order_status(uuid, text, text) to authenticated;
grant execute on function private.set_order_test_flag(uuid, boolean, text) to authenticated;
grant execute on function private.add_order_note(uuid, text) to authenticated;
grant execute on function private.set_order_source(uuid, text, text) to authenticated;
grant execute on function private.delete_order(uuid) to authenticated;

-- ── Public wrappers the admin calls ───────────────────────────────────────
create or replace function public.change_order_status(p_order_id uuid, p_status text, p_reason text default null)
 returns jsonb language sql security invoker set search_path to ''
as $function$ select private.change_order_status(p_order_id, p_status, p_reason); $function$;

create or replace function public.set_order_test_flag(p_order_id uuid, p_is_test boolean, p_reason text default null)
 returns void language sql security invoker set search_path to ''
as $function$ select private.set_order_test_flag(p_order_id, p_is_test, p_reason); $function$;

create or replace function public.add_order_note(p_order_id uuid, p_note text)
 returns bigint language sql security invoker set search_path to ''
as $function$ select private.add_order_note(p_order_id, p_note); $function$;

create or replace function public.set_order_source(p_order_id uuid, p_source text, p_note text default null)
 returns void language sql security invoker set search_path to ''
as $function$ select private.set_order_source(p_order_id, p_source, p_note); $function$;

create or replace function public.delete_order(p_order_id uuid)
 returns boolean language sql security invoker set search_path to ''
as $function$ select private.delete_order(p_order_id); $function$;

revoke all on function public.change_order_status(uuid, text, text) from public, anon, authenticated;
revoke all on function public.set_order_test_flag(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.add_order_note(uuid, text) from public, anon, authenticated;
revoke all on function public.set_order_source(uuid, text, text) from public, anon, authenticated;
revoke all on function public.delete_order(uuid) from public, anon, authenticated;

grant execute on function public.change_order_status(uuid, text, text) to authenticated;
grant execute on function public.set_order_test_flag(uuid, boolean, text) to authenticated;
grant execute on function public.add_order_note(uuid, text) to authenticated;
grant execute on function public.set_order_source(uuid, text, text) to authenticated;
grant execute on function public.delete_order(uuid) to authenticated;
