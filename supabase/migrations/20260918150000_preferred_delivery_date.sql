-- A preferred delivery date, chosen by the customer at checkout.
--
-- Optional: null means "as soon as you can", which is what every order was
-- before this. When a date is given it is a request, not a booking - the
-- team still rings to agree the slot - but it tells them which week to aim
-- for and stops a sofa turning up while the customer is away.
--
-- The rules live in place_order rather than in a CHECK constraint, because
-- a constraint comparing against today would make an old order impossible
-- to update once its date had passed. Earliest is four days from today in
-- the UK; latest is 180 days. The Server Action applies the same two rules
-- before calling, so the customer sees a sentence rather than an exception.
--
-- Adding a defaulted parameter to place_order changes its signature, so the
-- old one is dropped first - two overloads differing only by a defaulted
-- trailing argument make every call ambiguous - and the Offer Phase D grants
-- are re-applied to the new one.

begin;

alter table public.orders
  add column if not exists preferred_delivery_date date;

comment on column public.orders.preferred_delivery_date is
  'The delivery day the customer asked for at checkout, or null for as soon as possible. A request the team confirms by phone, not a booking.';

drop function if exists public.place_order(
  text, text, text, text, text, jsonb, numeric,
  integer, boolean, boolean, boolean, text, uuid, integer
);

create function public.place_order(
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
  p_promotion_code text default null,
  p_offer_entitlement_token uuid default null,
  p_sofa_removal_seats integer default null,
  p_preferred_delivery_date date default null
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
  v_delivery := v_upstairs + v_assembly + v_removal;

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
    wants_sofa_removal, sofa_removal_seats, fee_sofa_removal, delivery_total,
    total_amount, has_made_to_order, preferred_delivery_date
  )
  values (
    p_customer_name, p_customer_email, p_customer_phone, p_shipping_address,
    p_special_instructions, 'pending_cod',
    v_items_subtotal, v_discount_amount, v_discount_tier, v_promotion_code, v_offer_source,
    v_floor, coalesce(p_delivery_has_lift, false),
    v_upstairs, coalesce(p_wants_assembly, false), v_assembly,
    coalesce(p_wants_sofa_removal, false), v_removal_seats, v_removal, v_delivery,
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
    'delivery_total', v_delivery,
    'total_amount', v_total,
    'preferred_delivery_date', v_delivery_date
  );
end;
$function$;

-- Offer Phase D ACL, carried over to the new signature: the Server Action
-- resolves the postcode and calls this with the service role; never the browser.
revoke execute on function public.place_order(
  text, text, text, text, text, jsonb, numeric,
  integer, boolean, boolean, boolean, text, uuid, integer, date
) from public, anon, authenticated;

grant execute on function public.place_order(
  text, text, text, text, text, jsonb, numeric,
  integer, boolean, boolean, boolean, text, uuid, integer, date
) to service_role;

comment on function public.place_order(
  text, text, text, text, text, jsonb, numeric,
  integer, boolean, boolean, boolean, text, uuid, integer, date
) is
  'Public website order monetary authority. Offer Phase D: executable only by service_role after server-side postcode delivery validation; never call directly from the browser.';

-- The tracking page shows the requested day beside the status.
create or replace function public.track_order(p_reference text, p_postcode text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ref      text;
  v_postcode text;
  v_min      uuid;
  v_max      uuid;
  v_result   jsonb;
begin
  v_ref := lower(regexp_replace(coalesce(p_reference, ''), '[^0-9a-fA-F]', '', 'g'));
  if v_ref !~ '^[0-9a-f]{8}$' then
    return null;
  end if;

  v_postcode := upper(regexp_replace(coalesce(p_postcode, ''), '[^a-zA-Z0-9]', '', 'g'));
  if length(v_postcode) < 5 or length(v_postcode) > 8 then
    return null;
  end if;

  v_min := (v_ref || '-0000-0000-0000-000000000000')::uuid;
  v_max := (v_ref || '-ffff-ffff-ffff-ffffffffffff')::uuid;

  select jsonb_build_object(
    'id',                 o.id,
    'status',             o.status,
    'created_at',         o.created_at,
    'preferred_delivery_date', o.preferred_delivery_date,
    'total_amount',       o.total_amount,
    'items_subtotal',     o.items_subtotal,
    'discount_amount',    o.discount_amount,
    'discount_tier',      o.discount_tier,
    'promotion_code',     o.promotion_code,
    'offer_source',       o.offer_source,
    'delivery_total',     o.delivery_total,
    'delivery_floor',     o.delivery_floor,
    'delivery_has_lift',  o.delivery_has_lift,
    'fee_upstairs',       o.fee_upstairs,
    'wants_assembly',     o.wants_assembly,
    'fee_assembly',       o.fee_assembly,
    'wants_sofa_removal', o.wants_sofa_removal,
    'sofa_removal_seats', o.sofa_removal_seats,
    'fee_sofa_removal',   o.fee_sofa_removal,
    'order_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'quantity',                  oi.quantity,
        'price_at_time_of_purchase', oi.price_at_time_of_purchase,
        'product_variants', jsonb_build_object(
          'color',    pv.color,
          'products', jsonb_build_object('title', p.title)
        )
      ))
      from public.order_items oi
      join public.product_variants pv on pv.id = oi.variant_id
      join public.products p          on p.id  = pv.product_id
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.orders o
  where o.id between v_min and v_max
    and upper(regexp_replace(o.shipping_address, '[^a-zA-Z0-9]', '', 'g'))
        like '%' || v_postcode
  limit 1;

  return v_result;
end;
$function$;

commit;
