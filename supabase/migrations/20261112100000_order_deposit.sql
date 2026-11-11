-- Recording a deposit on an order (Muaz, 2026-11-12).
--
-- Some orders carry a small deposit, agreed and taken on the call that
-- confirms them (see src/constants/deposit.ts). The database never recorded it,
-- so the order page, the driver's delivery note and the customer's receipt all
-- said the full total was still to collect. This records what was paid.
--
--   * orders.deposit_paid     - pounds received so far. 0 = none. Part of the
--                               price, not an extra: the balance is
--                               total_amount - deposit_paid.
--   * orders.deposit_paid_at  - when it was first recorded; kept when the
--                               figure is corrected, cleared when it goes to 0.
--   * set_order_deposit()     - the one way staff change it. Admin only, and
--                               never more than the order total. Leaves a line
--                               in the order's history.
--   * order_deposit()         - read what was paid, for the customer's
--                               confirmation and tracking pages. The full order
--                               id is the access token, exactly as for
--                               order_for_confirmation; it returns the amount
--                               and the day only.
--
-- place_manual_order, update_order_details, order_for_confirmation and
-- track_order are NOT changed: the figure is written by a call of its own after
-- the order exists (as the channel and test flag are), and read by one of its
-- own. So nothing that already works can be broken by this migration.

alter table public.orders
  add column if not exists deposit_paid numeric(10,2) not null default 0,
  add column if not exists deposit_paid_at timestamptz;

alter table public.orders drop constraint if exists orders_deposit_paid_check;
alter table public.orders
  add constraint orders_deposit_paid_check check (deposit_paid >= 0);

comment on column public.orders.deposit_paid is
  'Pounds received as a deposit before delivery. Part of total_amount; the balance due on delivery is total_amount - deposit_paid.';
comment on column public.orders.deposit_paid_at is
  'When a deposit was first recorded. Null while deposit_paid is 0.';

-- ── Staff: record or correct the deposit ──────────────────────────────────
create or replace function private.set_order_deposit(p_order_id uuid, p_amount numeric)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_total numeric;
  v_old   numeric;
  v_amt   numeric := round(coalesce(p_amount, 0), 2);
begin
  perform private.require_admin();

  select o.total_amount, o.deposit_paid into v_total, v_old
    from public.orders o
   where o.id = p_order_id
   for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if v_amt < 0 then
    raise exception 'BAD_DEPOSIT';
  end if;
  if v_amt > v_total then
    raise exception 'DEPOSIT_TOO_HIGH';
  end if;

  if v_amt = v_old then
    return;
  end if;

  update public.orders
     set deposit_paid    = v_amt,
         deposit_paid_at = case when v_amt > 0 then coalesce(deposit_paid_at, now()) else null end
   where id = p_order_id;

  insert into public.order_events (order_id, kind, staff_id, note)
  values (
    p_order_id, 'note', auth.uid(),
    case
      when v_amt = 0 then 'Deposit removed (was £' || to_char(v_old, 'FM999990.00') || ')'
      when v_old = 0 then 'Deposit of £' || to_char(v_amt, 'FM999990.00') || ' recorded as paid'
      else 'Deposit changed from £' || to_char(v_old, 'FM999990.00') || ' to £' || to_char(v_amt, 'FM999990.00')
    end
  );
end;
$function$;

-- ── Customer pages: read what was paid ────────────────────────────────────
create or replace function private.order_deposit(p_order_id uuid)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select jsonb_build_object('deposit_paid', o.deposit_paid, 'deposit_paid_at', o.deposit_paid_at)
    from public.orders o
   where o.id = p_order_id;
$function$;

create or replace function public.set_order_deposit(p_order_id uuid, p_amount numeric)
 returns void language sql security invoker set search_path to ''
as $function$ select private.set_order_deposit(p_order_id, p_amount); $function$;

create or replace function public.order_deposit(p_order_id uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$ select private.order_deposit(p_order_id); $function$;

revoke all on function private.set_order_deposit(uuid, numeric) from public, anon, authenticated, service_role;
revoke all on function private.order_deposit(uuid) from public, anon, authenticated, service_role;
grant execute on function private.set_order_deposit(uuid, numeric) to authenticated, service_role;
grant execute on function private.order_deposit(uuid) to anon, authenticated, service_role;

revoke all on function public.set_order_deposit(uuid, numeric) from public, anon, authenticated, service_role;
revoke all on function public.order_deposit(uuid) from public, anon, authenticated, service_role;
grant execute on function public.set_order_deposit(uuid, numeric) to authenticated, service_role;
grant execute on function public.order_deposit(uuid) to anon, authenticated, service_role;
