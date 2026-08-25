-- Real delivery pricing: free to UK Mainland ground floor, with three paid extras.
--
-- Replaces the old model, where the checkout displayed "£49 delivery under £500"
-- but never passed it to place_order - so every sub-£500 order was recorded £49
-- below the figure the customer agreed to. There is no threshold and no £49 fee.
--
-- Prices are duplicated in src/constants/delivery.ts for display. place_order
-- recomputes every fee here from these figures so the browser cannot set its own
-- prices, and raises if the client's expected total disagrees - so a drift
-- between the two files fails loudly at checkout instead of charging the wrong
-- amount silently.
--
--   Upstairs .......... £20 to the first floor, or any floor when there's a lift
--                       £10 extra per floor above the first without a lift
--   Assembly .......... £20
--   Old sofa removal .. £30 (indicative; the team confirms before delivery)

alter table public.orders
  add column if not exists items_subtotal     numeric  not null default 0,
  add column if not exists delivery_floor     smallint not null default 0,
  add column if not exists delivery_has_lift  boolean  not null default false,
  add column if not exists fee_upstairs       numeric  not null default 0,
  add column if not exists wants_assembly     boolean  not null default false,
  add column if not exists fee_assembly       numeric  not null default 0,
  add column if not exists wants_sofa_removal boolean  not null default false,
  add column if not exists fee_sofa_removal   numeric  not null default 0,
  add column if not exists delivery_total     numeric  not null default 0;

alter table public.orders
  drop constraint if exists orders_delivery_floor_check;
alter table public.orders
  add constraint orders_delivery_floor_check check (delivery_floor between 0 and 20);

-- Orders placed before this migration had no extras, so their recorded total
-- was items only.
update public.orders
set items_subtotal = total_amount
where items_subtotal = 0;

-- The signature changes (p_total_amount becomes p_items_subtotal, plus the
-- extras), so drop the old one rather than leaving a stale overload behind.
drop function if exists public.place_order(text, text, text, text, text, numeric, jsonb);

create or replace function public.place_order(
  p_customer_name           text,
  p_customer_email          text,
  p_customer_phone          text,
  p_shipping_address        text,
  p_special_instructions    text,
  p_items                   jsonb,
  p_items_subtotal          numeric,
  p_delivery_floor          int     default 0,
  p_delivery_has_lift       boolean default false,
  p_wants_assembly          boolean default false,
  p_wants_sofa_removal      boolean default false,
  p_expected_delivery_total numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order_id uuid;
  v_floor    int;
  v_upstairs numeric;
  v_assembly numeric;
  v_removal  numeric;
  v_delivery numeric;
begin
  -- Clamp rather than trust: the check constraint allows 0-20 floors.
  v_floor := greatest(0, least(coalesce(p_delivery_floor, 0), 20));

  v_upstairs := case
    when v_floor <= 0                          then 0
    when coalesce(p_delivery_has_lift, false)  then 20
    else 20 + (v_floor - 1) * 10
  end;
  v_assembly := case when coalesce(p_wants_assembly, false)     then 20 else 0 end;
  v_removal  := case when coalesce(p_wants_sofa_removal, false) then 30 else 0 end;
  v_delivery := v_upstairs + v_assembly + v_removal;

  -- The customer agreed to a figure on screen. If our own arithmetic disagrees,
  -- refuse the order rather than charging something they never saw.
  if round(v_delivery, 2) is distinct from round(coalesce(p_expected_delivery_total, -1), 2) then
    raise exception
      'Delivery total mismatch: the checkout quoted % but current prices give %.',
      coalesce(p_expected_delivery_total, -1), v_delivery
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
    coalesce(p_items_subtotal, 0), v_floor, coalesce(p_delivery_has_lift, false),
    v_upstairs, coalesce(p_wants_assembly, false), v_assembly,
    coalesce(p_wants_sofa_removal, false), v_removal, v_delivery,
    coalesce(p_items_subtotal, 0) + v_delivery
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, variant_id, quantity, price_at_time_of_purchase)
  select v_order_id,
         (item->>'variant_id')::uuid,
         (item->>'quantity')::int,
         (item->>'price')::numeric
  from jsonb_array_elements(p_items) as item;

  return v_order_id;
end;
$function$;

revoke all on function public.place_order(text, text, text, text, text, jsonb, numeric, int, boolean, boolean, boolean, numeric) from public;
grant execute on function public.place_order(text, text, text, text, text, jsonb, numeric, int, boolean, boolean, boolean, numeric) to anon, authenticated;

-- Tracking now returns the breakdown so the customer can see what they agreed to.
create or replace function public.track_order(
  p_reference text,
  p_postcode  text
)
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
    'total_amount',       o.total_amount,
    'items_subtotal',     o.items_subtotal,
    'delivery_total',     o.delivery_total,
    'delivery_floor',     o.delivery_floor,
    'delivery_has_lift',  o.delivery_has_lift,
    'fee_upstairs',       o.fee_upstairs,
    'wants_assembly',     o.wants_assembly,
    'fee_assembly',       o.fee_assembly,
    'wants_sofa_removal', o.wants_sofa_removal,
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

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
