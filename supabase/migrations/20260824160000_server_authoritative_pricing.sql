-- Make place_order the sole authority on what an order costs.
--
-- Until now the browser sent both each item's price and the order total, and
-- place_order inserted them verbatim. The function is executable by `anon`, so
-- a direct POST to /rest/v1/rpc/place_order could create a £1 order for an
-- £1,800 sofa - and on cash on delivery that means a driver arriving to collect
-- the wrong money.
--
-- Now the client sends only WHAT was ordered (variant ids, quantities, and
-- which delivery extras were ticked) plus the total it displayed. Every price
-- is looked up or derived here:
--
--   line price   = products.base_price + product_variants.price_adjustment
--   extras       = the fixed price list below, mirrored in src/constants/delivery.ts
--   total        = sum(line price x quantity) + extras
--
-- p_expected_total is the figure the customer agreed to on screen. If our own
-- arithmetic disagrees - a stale cart, a price changed mid-session, a tampered
-- request - the order is refused rather than quietly transacted at a different
-- price.
--
-- Returns jsonb rather than a uuid so the caller gets the authoritative totals
-- back for the confirmation emails, instead of re-using the client's figures.

drop function if exists public.place_order(text, text, text, text, text, jsonb, numeric, int, boolean, boolean, boolean, numeric);

create or replace function public.place_order(
  p_customer_name        text,
  p_customer_email       text,
  p_customer_phone       text,
  p_shipping_address     text,
  p_special_instructions text,
  p_items                jsonb,
  p_expected_total       numeric,
  p_delivery_floor       int     default 0,
  p_delivery_has_lift    boolean default false,
  p_wants_assembly       boolean default false,
  p_wants_sofa_removal   boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order_id       uuid;
  v_bad_items      text;
  v_items_subtotal numeric;
  v_floor          int;
  v_upstairs       numeric;
  v_assembly       numeric;
  v_removal        numeric;
  v_delivery       numeric;
  v_total          numeric;
begin
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'check_violation';
  end if;

  -- 1. Every requested variant must exist and belong to an active product.
  select string_agg(distinct coalesce(p.title, 'unknown item'), ', ')
  into v_bad_items
  from (
    select (item->>'variant_id')::uuid as variant_id
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.product_variants pv on pv.id = r.variant_id
  left join public.products p          on p.id  = pv.product_id
  where pv.id is null or coalesce(p.is_active, false) = false;

  if v_bad_items is not null then
    raise exception 'UNAVAILABLE_ITEMS: %', v_bad_items using errcode = 'check_violation';
  end if;

  -- 2. Price the basket from live database values, never from the request.
  select coalesce(sum((p.base_price + coalesce(pv.price_adjustment, 0)) * r.quantity), 0)
  into v_items_subtotal
  from (
    select (item->>'variant_id')::uuid                             as variant_id,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity
    from jsonb_array_elements(p_items) as item
  ) r
  join public.product_variants pv on pv.id = r.variant_id
  join public.products p          on p.id  = pv.product_id;

  -- 3. Price the delivery extras from the fixed list.
  v_floor := greatest(0, least(coalesce(p_delivery_floor, 0), 20));

  v_upstairs := case
    when v_floor <= 0                          then 0
    when coalesce(p_delivery_has_lift, false)  then 20
    else 20 + (v_floor - 1) * 10
  end;
  v_assembly := case when coalesce(p_wants_assembly, false)     then 20 else 0 end;
  v_removal  := case when coalesce(p_wants_sofa_removal, false) then 30 else 0 end;
  v_delivery := v_upstairs + v_assembly + v_removal;

  v_total := v_items_subtotal + v_delivery;

  -- 4. The screen and the database must agree before any money is committed to.
  if round(v_total, 2) is distinct from round(coalesce(p_expected_total, -1), 2) then
    raise exception 'PRICE_MISMATCH: quoted % but current prices give %',
      coalesce(p_expected_total, -1), v_total
      using errcode = 'check_violation';
  end if;

  insert into public.orders (
    customer_name, customer_email, customer_phone, shipping_address,
    special_instructions, status,
    items_subtotal, delivery_floor, delivery_has_lift,
    fee_upstairs, wants_assembly, fee_assembly,
    wants_sofa_removal, fee_sofa_removal, delivery_total,
    total_amount
  )
  values (
    p_customer_name, p_customer_email, p_customer_phone, p_shipping_address,
    p_special_instructions, 'pending_cod',
    v_items_subtotal, v_floor, coalesce(p_delivery_has_lift, false),
    v_upstairs, coalesce(p_wants_assembly, false), v_assembly,
    coalesce(p_wants_sofa_removal, false), v_removal, v_delivery,
    v_total
  )
  returning id into v_order_id;

  -- price_at_time_of_purchase is the per-unit price, computed here rather than
  -- taken from the request, so the order line is a true record of what was sold.
  insert into public.order_items (order_id, variant_id, quantity, price_at_time_of_purchase)
  select v_order_id,
         r.variant_id,
         r.quantity,
         (p.base_price + coalesce(pv.price_adjustment, 0))
  from (
    select (item->>'variant_id')::uuid                             as variant_id,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity
    from jsonb_array_elements(p_items) as item
  ) r
  join public.product_variants pv on pv.id = r.variant_id
  join public.products p          on p.id  = pv.product_id;

  return jsonb_build_object(
    'id',             v_order_id,
    'items_subtotal', v_items_subtotal,
    'delivery_total', v_delivery,
    'total_amount',   v_total
  );
end;
$function$;

revoke all on function public.place_order(text, text, text, text, text, jsonb, numeric, int, boolean, boolean, boolean) from public;
grant execute on function public.place_order(text, text, text, text, text, jsonb, numeric, int, boolean, boolean, boolean) to anon, authenticated;
