-- Editing an existing order from the admin panel.
--
-- Everything the shop might need to correct after the fact, in one atomic
-- call: who the customer is, where it goes, the notes, the agreed delivery
-- day and charge, and the lines themselves - quantities, prices, fabrics,
-- lines added or removed. The totals are recomputed here from what is saved,
-- so items_subtotal and total_amount can never disagree with the lines.
--
-- Deliberately silent. No status change, no email, no conversion event:
-- Muaz's brief (2026-09-20) was "just admin be able to edit, no need to send
-- any email or signal". Status still moves only through updateOrderStatus.
--
-- A function rather than three PostgREST calls because replacing the lines is
-- a delete followed by an insert, and a failed insert after a successful
-- delete would leave an order with no lines. Here the two are one
-- transaction, and a line that stays keeps its /build customisation.
--
-- The delivery charge: a website order arrives with itemised extras (upstairs,
-- assembly, removal) whose fees sum to delivery_total. If the admin changes
-- the figure, the itemisation no longer describes it, so the extras are
-- cleared and the order carries one agreed figure - the same shape a WhatsApp
-- order has. Leaving the figure alone leaves the extras alone.

begin;

create or replace function public.update_order_details(
  p_order_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_special_instructions text,
  p_preferred_delivery_date date,
  p_delivery_total numeric,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order public.orders%rowtype;
  v_bad_items text;
  v_bad_fabrics text;
  v_items_subtotal numeric;
  v_has_mto boolean;
  v_delivery numeric;
  v_total numeric;
  v_delivery_changed boolean;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = 'insufficient_privilege';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'check_violation';
  end if;

  -- Every line must name a variant that exists. Inactive is allowed: a line
  -- already on the order may be a product since withdrawn, and correcting its
  -- quantity must not fail because of that.
  select string_agg(distinct r.variant_id::text, ', ')
  into v_bad_items
  from (
    select (item->>'variant_id')::uuid as variant_id
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.product_variants pv on pv.id = r.variant_id
  where pv.id is null;

  if v_bad_items is not null then
    raise exception 'UNAVAILABLE_ITEMS: %', v_bad_items using errcode = 'check_violation';
  end if;

  select string_agg(distinct r.fabric_id::text, ', ')
  into v_bad_fabrics
  from (
    select nullif(item->>'fabric_id', '')::uuid as fabric_id
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.fabrics f on f.id = r.fabric_id
  where r.fabric_id is not null and f.id is null;

  if v_bad_fabrics is not null then
    raise exception 'UNAVAILABLE_FABRIC: %', v_bad_fabrics using errcode = 'check_violation';
  end if;

  -- Keep the /build customisation of any line that survives the edit. Lines
  -- are matched by their existing id, sent back as item_id.
  create temp table _kept_lines on commit drop as
    select id, customisation from public.order_items where order_id = p_order_id;

  delete from public.order_items where order_id = p_order_id;

  insert into public.order_items (
    order_id, variant_id, quantity, price_at_time_of_purchase,
    fabric_id, fabric_code, fabric_name, fabric_collection,
    customisation
  )
  select p_order_id,
         r.variant_id,
         r.quantity,
         r.unit_price,
         f.id,
         f.code,
         f.name,
         fc.name,
         k.customisation
  from (
    select (item->>'variant_id')::uuid as variant_id,
           nullif(item->>'fabric_id', '')::uuid as fabric_id,
           nullif(item->>'item_id', '')::uuid as item_id,
           round(least(greatest(coalesce(nullif(item->>'unit_price', '')::numeric, 0), 0), 1000000), 2) as unit_price,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.fabrics f on f.id = r.fabric_id
  left join public.fabric_collections fc on fc.id = f.collection_id
  left join _kept_lines k on k.id = r.item_id;

  select coalesce(sum(oi.price_at_time_of_purchase * oi.quantity), 0),
         coalesce(bool_or(oi.fabric_id is not null or oi.customisation is not null), false)
  into v_items_subtotal, v_has_mto
  from public.order_items oi
  where oi.order_id = p_order_id;

  v_delivery := round(least(greatest(coalesce(p_delivery_total, 0), 0), 10000), 2);
  v_delivery_changed := round(coalesce(v_order.delivery_total, 0), 2) is distinct from v_delivery;
  v_total := greatest(0, v_items_subtotal - coalesce(v_order.discount_amount, 0)) + v_delivery;

  update public.orders
  set customer_name = p_customer_name,
      customer_email = nullif(trim(coalesce(p_customer_email, '')), ''),
      customer_phone = p_customer_phone,
      shipping_address = p_shipping_address,
      special_instructions = coalesce(p_special_instructions, ''),
      preferred_delivery_date = p_preferred_delivery_date,
      items_subtotal = v_items_subtotal,
      delivery_total = v_delivery,
      total_amount = v_total,
      has_made_to_order = v_has_mto,
      delivery_floor = case when v_delivery_changed then 0 else delivery_floor end,
      delivery_has_lift = case when v_delivery_changed then false else delivery_has_lift end,
      fee_upstairs = case when v_delivery_changed then 0 else fee_upstairs end,
      wants_assembly = case when v_delivery_changed then false else wants_assembly end,
      fee_assembly = case when v_delivery_changed then 0 else fee_assembly end,
      wants_sofa_removal = case when v_delivery_changed then false else wants_sofa_removal end,
      sofa_removal_seats = case when v_delivery_changed then null else sofa_removal_seats end,
      fee_sofa_removal = case when v_delivery_changed then 0 else fee_sofa_removal end
  where id = p_order_id;

  return jsonb_build_object(
    'id', p_order_id,
    'items_subtotal', v_items_subtotal,
    'delivery_total', v_delivery,
    'total_amount', v_total
  );
end;
$function$;

revoke execute on function public.update_order_details(
  uuid, text, text, text, text, text, date, numeric, jsonb
) from public, anon;

grant execute on function public.update_order_details(
  uuid, text, text, text, text, text, date, numeric, jsonb
) to authenticated, service_role;

comment on function public.update_order_details(
  uuid, text, text, text, text, text, date, numeric, jsonb
) is
  'Admin edit of an existing order: customer, address, notes, delivery day and charge, and the lines. Recomputes totals. Sends nothing.';

commit;
