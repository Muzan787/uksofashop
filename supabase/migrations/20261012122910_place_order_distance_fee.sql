-- place_order adds the distance delivery fee (delivery_distance_fees).
--
-- Applied separately from the table, at the moment the storefront that
-- quotes the fee goes live: the browser's expected total and this function's
-- total must agree, or the order is refused as PRICE_MISMATCH. The signature
-- is unchanged, so no overload is created.
--
-- The postcode comes from the end of p_shipping_address, where placeOrder
-- appends the normalised postcode it has just classified as mainland - the
-- server's value, never the customer's free text. The fee is recorded on the
-- order as fee_distance (with the band's name in delivery_region) and is part
-- of delivery_total.

alter table public.orders
  add column if not exists delivery_region text;

create or replace function public.place_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_special_instructions text,
  p_items jsonb,
  p_expected_total numeric,
  p_delivery_floor integer default 0,
  p_delivery_has_lift boolean default false,
  p_wants_assembly boolean default false,
  p_wants_sofa_removal boolean default false,
  p_promotion_code text default null::text,
  p_offer_entitlement_token uuid default null::uuid,
  p_sofa_removal_seats integer default null::integer,
  p_preferred_delivery_date date default null::date
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order_id uuid;
  v_bad_fabrics text;
  v_offer jsonb;
  v_items_subtotal numeric;
  v_discount_amount numeric;
  v_discount_tier text;
  v_promotion_code text;
  v_offer_source text;
  v_has_mto boolean;
  v_floor int;
  v_upstairs numeric;
  v_assembly numeric;
  v_removal_seats int;
  v_removal numeric;
  v_postcode text;
  v_distance numeric;
  v_region text;
  v_delivery numeric;
  v_total numeric;
  v_today date;
  v_delivery_date date;
begin
  -- The customer's preferred delivery day, if they chose one. Optional -
  -- null means "as soon as you can". Measured against today in the UK, not
  -- in UTC, so a customer ordering at half past midnight is not held to a
  -- day they cannot see on the calendar. The four-day lead is the shortest
  -- notice the workshop and the van need; 180 days is a sanity ceiling.
  v_today := (now() at time zone 'Europe/London')::date;
  v_delivery_date := p_preferred_delivery_date;
  if v_delivery_date is not null then
    if v_delivery_date < v_today + 4 then
      raise exception 'DELIVERY_DATE_TOO_SOON: earliest is %', v_today + 4
        using errcode = 'check_violation';
    end if;
    if v_delivery_date > v_today + 180 then
      raise exception 'DELIVERY_DATE_TOO_FAR: latest is %', v_today + 180
        using errcode = 'check_violation';
    end if;
  end if;

  -- Shared authoritative pricing + offer calculation. This also rejects an
  -- empty cart and unavailable/inactive variants.
  v_offer := public.calculate_order_offer(p_items, p_promotion_code, p_offer_entitlement_token);
  v_items_subtotal := (v_offer->>'items_subtotal')::numeric;
  v_discount_amount := coalesce((v_offer->>'discount_amount')::numeric, 0);
  v_discount_tier := nullif(v_offer->>'discount_tier', '');
  v_promotion_code := nullif(v_offer->>'promotion_code', '');
  v_offer_source := nullif(v_offer->>'offer_source', '');

  select string_agg(distinct r.fabric_id::text, ', ')
  into v_bad_fabrics
  from (
    select nullif(item->>'fabric_id', '')::uuid as fabric_id
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.fabrics f on f.id = r.fabric_id
  where r.fabric_id is not null
    and (f.id is null or f.is_active = false);

  if v_bad_fabrics is not null then
    raise exception 'UNAVAILABLE_FABRIC: %', v_bad_fabrics using errcode = 'check_violation';
  end if;

  select coalesce(bool_or(coalesce(p.custom_made, false)), false)
  into v_has_mto
  from jsonb_array_elements(p_items) item
  join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
  join public.products p on p.id = pv.product_id;

  v_floor := greatest(0, least(coalesce(p_delivery_floor, 0), 20));

  v_upstairs := case
    when v_floor <= 0 then 0
    when coalesce(p_delivery_has_lift, false) then 20
    else 20 + (v_floor - 1) * 10
  end;
  v_assembly := case when coalesce(p_wants_assembly, false) then 20 else 0 end;

  -- Removal is £10 a seat. A missing seat count with removal wanted falls back
  -- to the checkout's default of 3, and the count is clamped to the same 1-10
  -- range the checkout stepper allows. No removal means no seats recorded.
  v_removal_seats := case
    when coalesce(p_wants_sofa_removal, false)
      then greatest(1, least(coalesce(p_sofa_removal_seats, 3), 10))
    else null
  end;
  v_removal := coalesce(v_removal_seats, 0) * 10;

  -- Distance: free within 250 miles of Blackburn, £40-£100 beyond, by
  -- postcode district. Read from the postcode placeOrder appended.
  v_postcode := upper(substring(p_shipping_address from '([A-Za-z]{1,2}[0-9][0-9A-Za-z]?\s*[0-9][A-Za-z]{2})\s*$'));
  v_distance := public.delivery_distance_fee(v_postcode);
  select f.region into v_region
  from public.delivery_distance_fees f
  where f.outcode = upper(regexp_replace(btrim(coalesce(v_postcode, '')), '\s*[0-9][A-Za-z]{2}$', ''));

  v_delivery := v_upstairs + v_assembly + v_removal + v_distance;

  v_total := greatest(0, v_items_subtotal - v_discount_amount) + v_delivery;

  if round(v_total, 2) is distinct from round(coalesce(p_expected_total, -1), 2) then
    raise exception 'PRICE_MISMATCH: quoted % but current prices/offer give %',
      coalesce(p_expected_total, -1), v_total
      using errcode = 'check_violation';
  end if;

  insert into public.orders (
    customer_name, customer_email, customer_phone, shipping_address,
    special_instructions, status,
    items_subtotal, discount_amount, discount_tier, promotion_code, offer_source,
    delivery_floor, delivery_has_lift,
    fee_upstairs, wants_assembly, fee_assembly,
    wants_sofa_removal, sofa_removal_seats, fee_sofa_removal, fee_distance, delivery_region, delivery_total,
    total_amount, has_made_to_order, preferred_delivery_date
  )
  values (
    p_customer_name, p_customer_email, p_customer_phone, p_shipping_address,
    p_special_instructions, 'pending_cod',
    v_items_subtotal, v_discount_amount, v_discount_tier, v_promotion_code, v_offer_source,
    v_floor, coalesce(p_delivery_has_lift, false),
    v_upstairs, coalesce(p_wants_assembly, false), v_assembly,
    coalesce(p_wants_sofa_removal, false), v_removal_seats, v_removal, v_distance, v_region, v_delivery,
    v_total, v_has_mto, v_delivery_date
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, variant_id, quantity, price_at_time_of_purchase,
    fabric_id, fabric_code, fabric_name, fabric_collection,
    customisation
  )
  select v_order_id,
         r.variant_id,
         r.quantity,
         (p.base_price + coalesce(pv.price_adjustment, 0)),
         f.id,
         f.code,
         f.name,
         fc.name,
         r.customisation
  from (
    select (item->>'variant_id')::uuid as variant_id,
           nullif(item->>'fabric_id', '')::uuid as fabric_id,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity,
           -- Only an object is a build. A string, an array or JSON null is
           -- nothing, so a stray value cannot land as a "customisation".
           case when jsonb_typeof(item->'customisation') = 'object'
                then item->'customisation' else null end as customisation
    from jsonb_array_elements(p_items) as item
  ) r
  join public.product_variants pv on pv.id = r.variant_id
  join public.products p on p.id = pv.product_id
  left join public.fabrics f on f.id = r.fabric_id
  left join public.fabric_collections fc on fc.id = f.collection_id;

  return jsonb_build_object(
    'id', v_order_id,
    'items_subtotal', v_items_subtotal,
    'discount_amount', v_discount_amount,
    'discount_tier', v_discount_tier,
    'promotion_code', v_promotion_code,
    'offer_source', v_offer_source,
    'fee_distance', v_distance,
    'delivery_region', v_region,
    'delivery_total', v_delivery,
    'total_amount', v_total,
    'preferred_delivery_date', v_delivery_date
  );
end;
$function$;
