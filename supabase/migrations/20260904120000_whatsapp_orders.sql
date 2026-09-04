-- Orders taken over WhatsApp, and a place to record what was actually agreed.
--
-- WHY THIS IS NOT place_order WITH AN EXTRA ARGUMENT
--
-- place_order is executable by `anon`. The whole point of
-- 20260824160000_server_authoritative_pricing.sql is that it prices the basket
-- itself and refuses anything else, because a function that accepts a price and
-- can be called by a stranger is a function that sells an £1,800 sofa for £1 -
-- and on cash on delivery that means a driver arriving to collect the wrong
-- money. Adding a price override to it would hand that back.
--
-- A negotiated price is still a real requirement: sales agreed in a WhatsApp
-- conversation are not always at the catalogue figure. So the override lives in
-- a SEPARATE function that begins by refusing anyone who is not an admin. The
-- price is trusted here for one reason only - the caller is the shop.
--
-- WHAT IT IS FOR, BEYOND THE ORDER ITSELF
--
-- Click-to-WhatsApp campaigns send people into a conversation, and Meta counts
-- the conversation. It has never been told which conversations became sales, so
-- it has been optimising for people who message rather than people who buy -
-- the same error, one channel over, that utils/orderConversions.ts exists to fix
-- for the website.
--
-- `source` is what lets that be reported honestly. A WhatsApp order carries no
-- _fbp, no _fbc, no browser and no page, so it cannot be sent to Meta as a
-- website event; it goes as action_source 'chat', matched on the customer's
-- hashed WhatsApp number. See utils/orderConversions.ts.


-- ─────────────────────────────────────────────────────────────────────────────
--  WHERE THE ORDER CAME FROM
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.orders
  add column if not exists source text not null default 'website';

-- Every order that existed before this column was a website checkout, which is
-- exactly what the default backfilled them as, so no data migration is needed.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_source_check'
  ) then
    alter table public.orders
      add constraint orders_source_check check (source in ('website', 'whatsapp'));
  end if;
end $$;

comment on column public.orders.source is
  'How the order was taken. Governs the action_source of its Meta conversion: '
  '''website'' events carry _fbp/_fbc and a page URL, ''whatsapp'' events carry '
  'neither and are matched on the hashed phone number alone.';


-- ─────────────────────────────────────────────────────────────────────────────
--  TAKING AN ORDER BY HAND
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.place_manual_order(
  p_customer_name        text,
  p_customer_email       text,
  p_customer_phone       text,
  p_shipping_address     text,
  p_special_instructions text,
  -- [{ variant_id, quantity, unit_price?, fabric_id? }]
  --
  -- unit_price is the AGREED per-unit price. Omit it - or send null - and the
  -- catalogue price is used instead, so the common case of "no discount" does
  -- not require the admin to retype a number the database already knows.
  p_items                jsonb,
  -- Whatever delivery was agreed at, as one figure. The website's extras matrix
  -- (floor, lift, assembly, removal) is a self-service pricing tool; on a call
  -- these are simply negotiated, so recording a fabricated breakdown would be
  -- inventing detail that was never discussed.
  p_delivery_charge      numeric default 0,
  p_source               text    default 'whatsapp'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order_id       uuid;
  v_bad_items      text;
  v_bad_fabrics    text;
  v_items_subtotal numeric;
  v_delivery       numeric;
  v_total          numeric;
  v_has_mto        boolean;
begin
  -- FIRST, and before anything is read or written. This function trusts the
  -- prices in its argument, so being an admin is the only thing standing
  -- between it and an order at any price at all.
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = 'insufficient_privilege';
  end if;

  -- 'website' is not accepted here. An order claiming to be a website checkout
  -- would be reported to Meta as one, with browser identifiers it does not
  -- have, and would sit in the reports next to real ones.
  if coalesce(p_source, '') <> 'whatsapp' then
    raise exception 'BAD_SOURCE: %', p_source using errcode = 'check_violation';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'check_violation';
  end if;

  -- 1. Every variant must exist and belong to an active product. Same rule as
  --    place_order: what can be sold by hand is what can be sold at all.
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

  -- 2. A fabric that has been withdrawn.
  select string_agg(distinct r.fabric_id::text, ', ')
  into v_bad_fabrics
  from (
    select nullif(item->>'fabric_id', '')::uuid as fabric_id
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.fabrics f on f.id = r.fabric_id
  where r.fabric_id is not null
    and (f.id is null or coalesce(f.is_active, true) = false);

  if v_bad_fabrics is not null then
    raise exception 'UNAVAILABLE_FABRIC: %', v_bad_fabrics using errcode = 'check_violation';
  end if;

  -- 3. Price the basket from what was AGREED, falling back to the catalogue.
  --
  --    Bounded rather than unbounded: a negotiated price is a judgement, but a
  --    negative one or a nine-figure one is a typo, and a typo here becomes a
  --    driver collecting the wrong money and a false revenue figure in the ad
  --    account.
  select coalesce(sum(
           round(
             least(greatest(
               coalesce(r.unit_price, p.base_price + coalesce(pv.price_adjustment, 0)),
               0), 1000000)
           , 2) * r.quantity
         ), 0),
         bool_or(r.fabric_id is not null)
  into v_items_subtotal, v_has_mto
  from (
    select (item->>'variant_id')::uuid                                  as variant_id,
           nullif(item->>'fabric_id', '')::uuid                          as fabric_id,
           nullif(item->>'unit_price', '')::numeric                      as unit_price,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity
    from jsonb_array_elements(p_items) as item
  ) r
  join public.product_variants pv on pv.id = r.variant_id
  join public.products p          on p.id  = pv.product_id;

  v_delivery := round(least(greatest(coalesce(p_delivery_charge, 0), 0), 10000), 2);
  v_total    := v_items_subtotal + v_delivery;

  -- No p_expected_total check, and deliberately so. On the website that guard
  -- exists because the screen and the database must agree before a customer is
  -- committed to a price. Here the admin IS the authority on the price - there
  -- is no second figure for this to disagree with.
  insert into public.orders (
    customer_name, customer_email, customer_phone, shipping_address,
    special_instructions, status, source,
    items_subtotal, delivery_floor, delivery_has_lift,
    fee_upstairs, wants_assembly, fee_assembly,
    wants_sofa_removal, fee_sofa_removal, delivery_total,
    total_amount, has_made_to_order
  )
  values (
    p_customer_name, p_customer_email, p_customer_phone, p_shipping_address,
    p_special_instructions, 'pending_cod', p_source,
    v_items_subtotal, 0, false,
    0, false, 0,
    false, 0, v_delivery,
    v_total, coalesce(v_has_mto, false)
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, variant_id, quantity, price_at_time_of_purchase,
    fabric_id, fabric_code, fabric_name, fabric_collection
  )
  select v_order_id,
         r.variant_id,
         r.quantity,
         round(
           least(greatest(
             coalesce(r.unit_price, p.base_price + coalesce(pv.price_adjustment, 0)),
             0), 1000000)
         , 2),
         f.id,
         f.code,
         f.name,
         fc.name
  from (
    select (item->>'variant_id')::uuid                                  as variant_id,
           nullif(item->>'fabric_id', '')::uuid                          as fabric_id,
           nullif(item->>'unit_price', '')::numeric                      as unit_price,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity
    from jsonb_array_elements(p_items) as item
  ) r
  join public.product_variants pv        on pv.id = r.variant_id
  join public.products p                 on p.id  = pv.product_id
  left join public.fabrics f             on f.id  = r.fabric_id
  left join public.fabric_collections fc on fc.id = f.collection_id;

  return jsonb_build_object(
    'id',             v_order_id,
    'items_subtotal', v_items_subtotal,
    'delivery_total', v_delivery,
    'total_amount',   v_total
  );
end;
$function$;

-- anon must never reach this. The is_admin() check above is the real gate, but
-- there is no reason for the function to be callable by a signed-out visitor at
-- all - a rejection it can trigger is a rejection it can time.
revoke all on function public.place_manual_order(text, text, text, text, text, jsonb, numeric, text) from public;
revoke all on function public.place_manual_order(text, text, text, text, text, jsonb, numeric, text) from anon;
grant execute on function public.place_manual_order(text, text, text, text, text, jsonb, numeric, text) to authenticated;
