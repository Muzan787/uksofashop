-- Offer Phase B — server-authoritative order discount foundation.
-- Reconciled from production schema/function definitions and the explicit
-- 38-product authority map already applied under migration version 20260908172136.

alter table public.orders
  add column discount_amount numeric(10,2) not null default 0,
  add column discount_tier text,
  add column promotion_code text,
  add column offer_source text;

alter table public.orders
  add constraint orders_discount_amount_nonnegative
    check (discount_amount >= 0),
  add constraint orders_discount_tier_check
    check (discount_tier is null or discount_tier = any (array['ELECTRIC'::text, 'ROMA'::text, 'STANDARD'::text, 'EXCLUDED'::text])),
  add constraint orders_offer_source_check
    check (offer_source is null or offer_source = any (array['manual_code'::text, 'paid_entitlement'::text])),
  add constraint orders_promotion_code_normalized
    check (promotion_code is null or promotion_code = upper(btrim(promotion_code)));

create table public.offer_product_tiers (
  product_id uuid primary key references public.products(id) on delete cascade,
  tier text not null check (tier = any (array['ELECTRIC'::text, 'ROMA'::text, 'STANDARD'::text, 'EXCLUDED'::text]))
);

alter table public.offer_product_tiers enable row level security;
revoke all on table public.offer_product_tiers from anon, authenticated;
grant all on table public.offer_product_tiers to service_role;

insert into public.offer_product_tiers (product_id, tier) values
('b949d45a-2df6-4f4d-a92a-0e6ade9c67a0'::uuid, 'ELECTRIC'),
('45fc8c70-c050-4b72-ac60-3871a255454a'::uuid, 'ELECTRIC'),
('02569cde-4293-4235-831c-e7baf3c38044'::uuid, 'ELECTRIC'),
('d27a82cf-49f7-4d09-bb77-88393ced7648'::uuid, 'ELECTRIC'),
('ba659db5-791d-45f0-b28b-2271a8ebf3e0'::uuid, 'ELECTRIC'),
('43a9f607-2258-49a7-a6cf-c1576f17fdab'::uuid, 'ELECTRIC'),
('e417340c-3ee4-4951-b446-19e379d1ab75'::uuid, 'ELECTRIC'),
('e4382057-b9b0-4e12-a5c6-aff607973e16'::uuid, 'ROMA'),
('6d625b26-5fa4-4c6b-823a-a5fd2ac819fb'::uuid, 'ROMA'),
('dca5a543-4db8-40a5-95c6-d4acbef2ba51'::uuid, 'ROMA'),
('dcf6223c-9973-438b-a485-eb0c60b4d88f'::uuid, 'ROMA'),
('b2653e61-6096-4fe5-9029-ebb35b580c61'::uuid, 'ROMA'),
('2360afa3-9817-4bc8-96ef-9e5e688cdf0b'::uuid, 'STANDARD'),
('5a2d01ab-4c6e-48e8-b4b1-3f37c200399a'::uuid, 'STANDARD'),
('a3952a61-ca29-41cb-b448-b7488a6c8973'::uuid, 'STANDARD'),
('a585764d-0051-4b2c-8f4d-57122ad59d72'::uuid, 'STANDARD'),
('0fc8ff1a-4b18-4168-a537-e04fa7545240'::uuid, 'STANDARD'),
('701f8767-8e60-4083-af49-6cb67cf36a4b'::uuid, 'STANDARD'),
('701ed71f-a187-4cb6-95ee-062083bcec1c'::uuid, 'STANDARD'),
('1edcca37-8f7e-4720-bb50-82f2e2904075'::uuid, 'STANDARD'),
('bbdad4c6-fa20-4623-ac63-036ae12bfec0'::uuid, 'STANDARD'),
('24434305-fc5c-4d49-a653-4b1879a9bf59'::uuid, 'STANDARD'),
('973aa493-e161-4875-a6a2-9e2438f1c927'::uuid, 'STANDARD'),
('e7a1c2f9-7ef3-4b4e-8775-bf3e4f61ac40'::uuid, 'EXCLUDED'),
('ff2c0e1d-2264-413c-b9c2-7d01d4c64ef2'::uuid, 'EXCLUDED'),
('ca0ff872-776e-4d67-84ca-96ad0e5880d7'::uuid, 'EXCLUDED'),
('ce0bc8fd-6246-4653-acd2-7ab7e08e85d8'::uuid, 'EXCLUDED'),
('d73e2267-a0fb-48bc-981d-282af52df7d0'::uuid, 'EXCLUDED'),
('40f2b595-548d-4764-89fc-e8b944dd4934'::uuid, 'EXCLUDED'),
('a0bc19fc-a578-402c-9c39-ab8ed4dd7bf6'::uuid, 'EXCLUDED'),
('deb8c49a-483b-4cbb-b021-d933c1d9e347'::uuid, 'EXCLUDED'),
('72dd4aeb-990b-4ea7-8147-9a2e616c8c37'::uuid, 'EXCLUDED'),
('bfa8d355-fdf4-417c-afa2-e280a76bbc93'::uuid, 'EXCLUDED'),
('265c2267-6c24-4cf7-bf1b-4171fd240627'::uuid, 'EXCLUDED'),
('64079765-87bc-4d8e-b106-bc12704f7bf9'::uuid, 'EXCLUDED'),
('1cb41ad6-f380-489b-9d04-caedb46e917b'::uuid, 'EXCLUDED'),
('82c5658b-cfa2-4f8b-9b7f-814ac0ba005a'::uuid, 'EXCLUDED'),
('cd3a3b61-e91c-4ffb-8ff0-6a4202d84fa7'::uuid, 'EXCLUDED');

-- Fail a replay loudly if the catalogue at this historical migration point
-- does not match the owner-approved authority map.
do $$
declare
  v_active int;
  v_mapped int;
  v_electric int;
  v_roma int;
  v_standard int;
  v_excluded int;
begin
  select count(*) into v_active from public.products where coalesce(is_active, false);
  select count(*),
         count(*) filter (where tier = 'ELECTRIC'),
         count(*) filter (where tier = 'ROMA'),
         count(*) filter (where tier = 'STANDARD'),
         count(*) filter (where tier = 'EXCLUDED')
    into v_mapped, v_electric, v_roma, v_standard, v_excluded
  from public.offer_product_tiers;

  if v_active <> 38 or v_mapped <> 38 or v_electric <> 7 or v_roma <> 5 or v_standard <> 11 or v_excluded <> 15 then
    raise exception 'OFFER_PRODUCT_MAP_MISMATCH active=% mapped=% electric=% roma=% standard=% excluded=%',
      v_active, v_mapped, v_electric, v_roma, v_standard, v_excluded;
  end if;
end $$;

create or replace function public.calculate_order_offer(
  p_items jsonb,
  p_promotion_code text default null,
  p_offer_entitlement_token uuid default null
)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_items_subtotal numeric := 0;
  v_normalized_code text := nullif(upper(btrim(coalesce(p_promotion_code, ''))), '');
  v_code_valid boolean := false;
  v_discount_tier text := null;
  v_tier_amount numeric := 0;
  v_discount_amount numeric := 0;
  v_offer_source text := null;
begin
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'check_violation';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    left join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
    left join public.products p on p.id = pv.product_id
    where pv.id is null or coalesce(p.is_active, false) = false
  ) then
    raise exception 'UNAVAILABLE_ITEMS' using errcode = 'check_violation';
  end if;

  select coalesce(sum((p.base_price + coalesce(pv.price_adjustment, 0)) *
                      least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99)), 0)
  into v_items_subtotal
  from jsonb_array_elements(p_items) item
  join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
  join public.products p on p.id = pv.product_id;

  -- This was the originally-applied Phase B expression. The following
  -- migration 20260908172251 makes empty/no-code deterministic FALSE.
  v_code_valid := v_normalized_code = 'SOFAEXTRA';

  if v_code_valid then
    select ranked.tier
    into v_discount_tier
    from (
      select distinct opt.tier,
        case opt.tier
          when 'ELECTRIC' then 4
          when 'ROMA' then 3
          when 'STANDARD' then 2
          when 'EXCLUDED' then 1
          else 0
        end as priority
      from jsonb_array_elements(p_items) item
      join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
      join public.offer_product_tiers opt on opt.product_id = pv.product_id
    ) ranked
    order by ranked.priority desc
    limit 1;

    v_tier_amount := case v_discount_tier
      when 'ELECTRIC' then 50
      when 'ROMA' then 30
      when 'STANDARD' then 20
      else 0
    end;

    v_discount_amount := least(v_items_subtotal, v_tier_amount);
    v_offer_source := 'manual_code';
  end if;

  -- Phase C input contract only. Supplying a token grants nothing in Phase B.
  perform p_offer_entitlement_token;

  return jsonb_build_object(
    'items_subtotal', v_items_subtotal,
    'code_valid', v_code_valid,
    'normalized_code', v_normalized_code,
    'discount_amount', v_discount_amount,
    'discount_tier', v_discount_tier,
    'promotion_code', case when v_code_valid then 'SOFAEXTRA' else null end,
    'offer_source', v_offer_source
  );
end;
$function$;

revoke execute on function public.calculate_order_offer(jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.calculate_order_offer(jsonb, text, uuid) to service_role;

-- Input-argument changes create a distinct PostgreSQL function signature, so
-- remove the pre-Phase-B overload before creating the extended boundary.
drop function if exists public.place_order(text, text, text, text, text, jsonb, numeric, integer, boolean, boolean, boolean);

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
  p_offer_entitlement_token uuid default null
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
  v_removal numeric;
  v_delivery numeric;
  v_total numeric;
begin
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
  v_removal := case when coalesce(p_wants_sofa_removal, false) then 30 else 0 end;
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
    wants_sofa_removal, fee_sofa_removal, delivery_total,
    total_amount, has_made_to_order
  )
  values (
    p_customer_name, p_customer_email, p_customer_phone, p_shipping_address,
    p_special_instructions, 'pending_cod',
    v_items_subtotal, v_discount_amount, v_discount_tier, v_promotion_code, v_offer_source,
    v_floor, coalesce(p_delivery_has_lift, false),
    v_upstairs, coalesce(p_wants_assembly, false), v_assembly,
    coalesce(p_wants_sofa_removal, false), v_removal, v_delivery,
    v_total, v_has_mto
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, variant_id, quantity, price_at_time_of_purchase,
    fabric_id, fabric_code, fabric_name, fabric_collection
  )
  select v_order_id,
         r.variant_id,
         r.quantity,
         (p.base_price + coalesce(pv.price_adjustment, 0)),
         f.id,
         f.code,
         f.name,
         fc.name
  from (
    select (item->>'variant_id')::uuid as variant_id,
           nullif(item->>'fabric_id', '')::uuid as fabric_id,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity
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
    'total_amount', v_total
  );
end;
$function$;

revoke execute on function public.place_order(text, text, text, text, text, jsonb, numeric, integer, boolean, boolean, boolean, text, uuid) from public;
grant execute on function public.place_order(text, text, text, text, text, jsonb, numeric, integer, boolean, boolean, boolean, text, uuid) to anon, authenticated, service_role;
