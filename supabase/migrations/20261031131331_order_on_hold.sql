-- Order statuses: Waiting, Confirmed, On hold, Delivered, Cancelled (31 Oct 2026).
--
-- Processing and On its way were never used: the shop rings the customer,
-- agrees a day and delivers. What it did need was a way to pause a booked
-- order - the customer says something came up and they'll rearrange, date
-- unknown - without cancelling it and losing track of it. That is On hold.
--
--   Waiting to confirm -> Confirmed or Cancelled
--   Confirmed / On hold / Delivered -> any of those three, or Cancelled
--   Cancelled -> Confirmed, by an admin only, with a reason
--
-- processing_at and shipped_at stay on the table: older orders' timelines
-- still show them. The guard's stamping of them is left as it is; nothing
-- reaches those statuses any more.
--
-- OrderFlow gets 'on_hold', which its status map turns into New. While an
-- order is on hold its delivery date is not sent, so it leaves OrderFlow's
-- delivery book instead of sitting on a day that is no longer happening. The
-- date stays on the order here; a new one is set when it is rebooked.

-- ── Orders still on the retired statuses go back to Confirmed ─────────────
-- One order (29 Oct) was in Processing. The history line says why it moved.
do $$
begin
  perform set_config('orders.event_note', 'Processing and On its way were retired; moved to Confirmed', true);
  update public.orders set status = 'confirmed' where status in ('processing', 'shipped');
  perform set_config('orders.event_note', '', true);
end;
$$;

-- ── The allowed moves ─────────────────────────────────────────────────────
create or replace function private.order_move_allowed(p_from text, p_to text, p_staff boolean)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $function$
  select case
    when p_from is not distinct from p_to then true
    when p_from = 'pending_cod' then p_to in ('confirmed', 'cancelled')
    when p_from in ('confirmed', 'on_hold', 'delivered')
      then p_to in ('confirmed', 'on_hold', 'delivered', 'cancelled')
    when p_from = 'cancelled' then p_staff and p_to = 'confirmed'
    else false
  end;
$function$;

revoke all on function private.order_move_allowed(text, text, boolean) from public, anon, authenticated;

-- ── The one place a status changes: the new list of statuses ──────────────
-- Otherwise exactly as in 20261014215150_order_rules. A reason given when
-- putting an order on hold goes into its history line, as any note does.
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
  if p_status not in ('pending_cod', 'confirmed', 'on_hold', 'delivered', 'cancelled') then
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

-- ── OrderFlow: no delivery date while on hold ─────────────────────────────
-- Unchanged apart from the delivery_date line.
create or replace function orderflow.order_payload(p_order_id uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select jsonb_strip_nulls(jsonb_build_object(
    'external_id', o.id::text,

    -- TODO: when the site gains a human order number, send it here and it will
    -- show on every OrderFlow card and in both CSVs:
    --   'reference', o.order_number::text,

    'status', o.status,
    'placed_at', to_jsonb(o.created_at),
    'postcode', orderflow.uk_postcode(o.shipping_address),
    -- The date the customer picked at checkout; null on the orders where they
    -- did not, which OrderFlow expects and leaves editable. Not sent while the
    -- order is on hold: that day is off, and OrderFlow would still list it.
    'delivery_date', case when o.status <> 'on_hold' then to_char(o.preferred_delivery_date, 'YYYY-MM-DD') end,
    -- Rounded to two places: OrderFlow only accepts an amount with at most two
    -- decimals, and an unconstrained numeric can render more than that.
    'total', round(o.total_amount, 2),
    'items', coalesce((
      select jsonb_agg(
               jsonb_strip_nulls(jsonb_build_object(
                 -- products.title is already the full readable name
                 -- ("Hannah Electric 3+2 Seater"); size_label and
                 -- subgroup_label are subsets of it, so adding them would
                 -- repeat words. custom_title wins where staff set one.
                 'product_name', coalesce(nullif(btrim(oi.custom_title), ''), btrim(p.title)),
                 'sku', pv.sku,
                 -- The fabric is what distinguishes two of the same sofa.
                 -- product_variants.color is sometimes an RGB triplet, so it is
                 -- not used.
                 'variant', coalesce(nullif(btrim(oi.fabric_name), ''), nullif(btrim(pv.material), '')),
                 'quantity', oi.quantity,
                 'unit_price', round(oi.price_at_time_of_purchase, 2)
               ))
               order by p.title)
        from public.order_items oi
        join public.product_variants pv on pv.id = oi.variant_id
        join public.products p on p.id = pv.product_id
       where oi.order_id = o.id
    ), '[]'::jsonb)
  ))
  from public.orders o
 where o.id = p_order_id;
$function$;
