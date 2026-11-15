-- Run 8 (15 Nov 2026): the £50 Made-To-Order offer is per SOFA, not per
-- basket line. The site says "£50 off every made-to-order sofa"; under Run 7
-- two of the same sofa on one line got £50 in total, two different sofas got
-- £100. Now each unit gets £50 (never more than the line costs), so the
-- charge matches the words. Nothing else changes: same window, same codes,
-- other collections' tier rules untouched, prices untouched.
-- made_to_order_lines now reports the number of made-to-order UNITS.

create or replace function public.calculate_order_offer(p_items jsonb, p_promotion_code text default null::text, p_offer_entitlement_token uuid default null::uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path to 'public'
as $function$
declare
  v_items_subtotal numeric := 0;
  v_normalized_code text := nullif(upper(btrim(coalesce(p_promotion_code, ''))), '');
  v_code_valid boolean := false;
  v_entitlement_valid boolean := false;
  v_discount_tier text := null;
  v_tier_amount numeric := 0;
  v_discount_amount numeric := 0;
  v_offer_source text := null;
  v_s public.shop_settings%rowtype;
  v_min_price numeric;
  v_mto uuid;
  v_mto_amount constant numeric := 50;
  v_mto_discount numeric := 0;
  v_mto_lines integer := 0;
  v_rest_subtotal numeric := 0;
  v_rest_discount numeric := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    left join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
    left join public.products p on p.id = pv.product_id
    where pv.id is null or coalesce(p.is_active, false) = false
  ) then
    raise exception 'UNAVAILABLE_ITEMS' using errcode = 'check_violation';
  end if;

  select id into v_mto from public.main_collections where slug = 'made-to-order-sofas';

  -- Every line priced once (base + variant + add-ons) x quantity, flagged made-to-order or not.
  select coalesce(sum(line_total), 0) into v_items_subtotal from (
      select p.id as product_id,
             (p.base_price + coalesce(pv.price_adjustment, 0) + (private.line_addons(pv.id, item->'addon_ids')->>'total')::numeric) as line_unit,
             (p.base_price + coalesce(pv.price_adjustment, 0) + (private.line_addons(pv.id, item->'addon_ids')->>'total')::numeric)
               * least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as line_total,
             (v_mto is not null and p.main_collection_id = v_mto) as is_mto,
             least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as qty
        from jsonb_array_elements(p_items) item
        join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
        join public.products p on p.id = pv.product_id
    ) l;

  if p_offer_entitlement_token is not null then
    select exists (
      select 1 from public.offer_entitlements oe
      where oe.token = p_offer_entitlement_token and oe.revoked_at is null and oe.expires_at > now()
    ) into v_entitlement_valid;
  end if;
  v_code_valid := v_normalized_code is not null and private.offer_code_active(v_normalized_code) and v_entitlement_valid;

  if v_entitlement_valid then
    select * into v_s from public.shop_settings limit 1;
    v_min_price := coalesce(v_s.offer_min_price, 400);

    -- Made-to-order: £50 off EACH sofa (per unit, Run 8), never more than the line.
    select coalesce(sum(least(line_total, v_mto_amount * qty)), 0), coalesce(sum(qty), 0)
      into v_mto_discount, v_mto_lines
      from (
      select p.id as product_id,
             (p.base_price + coalesce(pv.price_adjustment, 0) + (private.line_addons(pv.id, item->'addon_ids')->>'total')::numeric) as line_unit,
             (p.base_price + coalesce(pv.price_adjustment, 0) + (private.line_addons(pv.id, item->'addon_ids')->>'total')::numeric)
               * least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as line_total,
             (v_mto is not null and p.main_collection_id = v_mto) as is_mto,
             least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as qty
        from jsonb_array_elements(p_items) item
        join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
        join public.products p on p.id = pv.product_id
    ) l where is_mto;

    -- Everything else: the old rule, on the rest of the basket only.
    select coalesce(sum(line_total), 0) into v_rest_subtotal from (
      select p.id as product_id,
             (p.base_price + coalesce(pv.price_adjustment, 0) + (private.line_addons(pv.id, item->'addon_ids')->>'total')::numeric) as line_unit,
             (p.base_price + coalesce(pv.price_adjustment, 0) + (private.line_addons(pv.id, item->'addon_ids')->>'total')::numeric)
               * least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as line_total,
             (v_mto is not null and p.main_collection_id = v_mto) as is_mto,
             least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as qty
        from jsonb_array_elements(p_items) item
        join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
        join public.products p on p.id = pv.product_id
    ) l where not is_mto;
    select ranked.tier into v_discount_tier
    from (
      select distinct opt.tier,
        case opt.tier when 'ELECTRIC' then 4 when 'ROMA' then 3 when 'STANDARD' then 2 when 'EXCLUDED' then 1 else 0 end as priority
      from (
      select p.id as product_id,
             (p.base_price + coalesce(pv.price_adjustment, 0) + (private.line_addons(pv.id, item->'addon_ids')->>'total')::numeric) as line_unit,
             (p.base_price + coalesce(pv.price_adjustment, 0) + (private.line_addons(pv.id, item->'addon_ids')->>'total')::numeric)
               * least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as line_total,
             (v_mto is not null and p.main_collection_id = v_mto) as is_mto,
             least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as qty
        from jsonb_array_elements(p_items) item
        join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
        join public.products p on p.id = pv.product_id
    ) l
      join public.offer_product_tiers opt on opt.product_id = l.product_id
      where not l.is_mto
        and l.line_unit >= v_min_price
        and not exists (select 1 from public.offer_excluded_products x where x.product_id = l.product_id)
    ) ranked
    order by ranked.priority desc
    limit 1;
    v_tier_amount := case v_discount_tier
      when 'ELECTRIC' then coalesce(v_s.tier_electric, 50)
      when 'ROMA' then coalesce(v_s.tier_roma, 30)
      when 'STANDARD' then coalesce(v_s.tier_standard, 20)
      when 'EXCLUDED' then coalesce(v_s.tier_excluded, 0)
      else 0
    end;
    v_rest_discount := least(v_rest_subtotal, v_tier_amount);

    v_discount_amount := least(v_items_subtotal, v_mto_discount + v_rest_discount);
    if v_mto_lines > 0 then
      v_discount_tier := 'MADE_TO_ORDER';
    end if;
    v_offer_source := 'paid_entitlement';
  end if;

  return jsonb_build_object(
    'items_subtotal', v_items_subtotal,
    'code_valid', v_code_valid,
    'entitlement_valid', v_entitlement_valid,
    'normalized_code', case when v_code_valid then v_normalized_code else null end,
    'discount_amount', v_discount_amount,
    'discount_tier', v_discount_tier,
    'promotion_code', case when v_code_valid then v_normalized_code else null end,
    'offer_source', v_offer_source,
    'made_to_order_discount', v_mto_discount,
    'made_to_order_lines', v_mto_lines,
    'other_discount', v_rest_discount
  );
end;
$function$;
