-- The offer's price floor and its excluded products, and old sofa removal
-- priced in one band (2026-10-24).
--
-- Muaz, three rules:
--   1. No sofa under £400 gets the visitor offer. The Roma tier included -
--      it used to take £30 off whatever the sofa cost.
--   2. Settings needs a list of products the offer never applies to, whatever
--      tier they are in and whatever they cost.
--   3. Old sofa removal is £50 for one to five seats, and £10 for each seat
--      above five. It was £10 a seat all the way, so a 3-seater was £30.
--
-- Three figures on shop_settings and one small table:
--   * offer_min_price (400) - the cheapest an item can be and still count.
--     An item under it is not looked at when the basket's tier is chosen, so
--     a basket of nothing but cheap sofas gets no discount at all rather than
--     the tier of its dearest line.
--   * removal_base_fee (50) and removal_included_seats (5) - the band.
--     removal_per_seat (10, unchanged) now prices only the seats above it.
--   * offer_excluded_products - the product ids the offer never applies to.
--     Its own table rather than a fourth tier, so excluding a sofa and
--     putting it back does not lose the tier it was in; and unlike the
--     EXCLUDED tier, which only means "worth £0", an excluded product cannot
--     be the tier a mixed basket is priced at either.
--
-- calculate_order_offer and place_order read all of it; save_shop_settings
-- checks and saves the three figures. place_manual_order is untouched: the
-- delivery charge on a WhatsApp order is one figure agreed in the chat.

-- ── The three figures ────────────────────────────────────────────────────
alter table public.shop_settings
  add column if not exists offer_min_price numeric not null default 400,
  add column if not exists removal_base_fee numeric not null default 50,
  add column if not exists removal_included_seats integer not null default 5;

alter table public.shop_settings drop constraint if exists shop_settings_offer_floor;
alter table public.shop_settings add constraint shop_settings_offer_floor check (
  offer_min_price between 0 and 9999);

alter table public.shop_settings drop constraint if exists shop_settings_removal_band;
alter table public.shop_settings add constraint shop_settings_removal_band check (
  removal_base_fee between 0 and 1000 and removal_included_seats between 1 and 30);

-- ── The excluded products ────────────────────────────────────────────────
create table if not exists public.offer_excluded_products (
  product_id uuid primary key references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Who took it off, for the record. auth.uid() is null when the service role
  -- or a migration does it, which is allowed.
  created_by uuid default auth.uid()
);

comment on table public.offer_excluded_products is
  'Products the visitor offer never applies to (2026-10-24), whatever tier they are in and whatever they cost. Read by calculate_order_offer; the list is managed in Admin -> Settings.';

alter table public.offer_excluded_products enable row level security;
revoke all on table public.offer_excluded_products from public, anon, authenticated;
grant all on table public.offer_excluded_products to service_role;
grant select, insert, update, delete on table public.offer_excluded_products to authenticated;
drop policy if exists "admins manage the excluded products" on public.offer_excluded_products;
create policy "admins manage the excluded products" on public.offer_excluded_products for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ── calculate_order_offer: only items that can carry the offer ───────────
--
-- Unchanged apart from which items are allowed to decide the tier: an item
-- under offer_min_price, or one whose product is on the excluded list, is
-- skipped. Everything else - the subtotal, the code, the window, the
-- never-more-than-the-basket cap - is exactly as it was.
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

  if p_offer_entitlement_token is not null then
    select exists (
      select 1
      from public.offer_entitlements oe
      where oe.token = p_offer_entitlement_token
        and oe.revoked_at is null
        and oe.expires_at > now()
    ) into v_entitlement_valid;
  end if;

  -- A live code from Admin -> Settings (SOFAEXTRA until others are added),
  -- and only inside the visitor's offer window, as always.
  v_code_valid := v_normalized_code is not null and private.offer_code_active(v_normalized_code) and v_entitlement_valid;

  if v_entitlement_valid then
    -- The figures from Admin -> Settings; today's if the row is missing.
    select * into v_s from public.shop_settings limit 1;
    v_min_price := coalesce(v_s.offer_min_price, 400);

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
      join public.products p on p.id = pv.product_id
      join public.offer_product_tiers opt on opt.product_id = pv.product_id
      where (p.base_price + coalesce(pv.price_adjustment, 0)) >= v_min_price
        and not exists (
          select 1 from public.offer_excluded_products x where x.product_id = pv.product_id
        )
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

    v_discount_amount := least(v_items_subtotal, v_tier_amount);
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
    'offer_source', v_offer_source
  );
end;
$function$;

-- ── place_order: removal in one band ─────────────────────────────────────
--
-- Identical to the version the delivery-day rules left (20261017190729)
-- apart from v_removal, which is now the base fee plus the seats above the
-- band rather than every seat at the per-seat rate.
create or replace function public.place_order(p_customer_name text, p_customer_email text, p_customer_phone text, p_shipping_address text, p_special_instructions text, p_items jsonb, p_expected_total numeric, p_delivery_floor integer default 0, p_delivery_has_lift boolean default false, p_wants_assembly boolean default false, p_wants_sofa_removal boolean default false, p_promotion_code text default null::text, p_offer_entitlement_token uuid default null::uuid, p_sofa_removal_seats integer default null::integer, p_preferred_delivery_date date default null::date)
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
  v_s public.shop_settings%rowtype;
  v_earliest int;
  v_latest int;
  v_far_to int;
  v_min date;
begin
  -- The figures from Admin -> Settings; each falls back to today's.
  select * into v_s from public.shop_settings limit 1;
  v_earliest := coalesce(v_s.preferred_earliest_days, 4);
  v_latest := coalesce(v_s.preferred_latest_days, 180);
  v_far_to := coalesce(v_s.far_window_to_days, 7);

  v_today := (now() at time zone 'Europe/London')::date;
  v_delivery_date := p_preferred_delivery_date;

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

  v_floor := greatest(0, least(coalesce(p_delivery_floor, 0), coalesce(v_s.max_floor, 20)));

  v_upstairs := case
    when v_floor <= 0 then 0
    when coalesce(p_delivery_has_lift, false) then coalesce(v_s.upstairs_first_floor, 20)
    else coalesce(v_s.upstairs_first_floor, 20) + (v_floor - 1) * coalesce(v_s.upstairs_per_extra_floor, 10)
  end;
  v_assembly := case when coalesce(p_wants_assembly, false) then coalesce(v_s.assembly_fee, 20) else 0 end;

  v_removal_seats := case
    when coalesce(p_wants_sofa_removal, false)
      then greatest(coalesce(v_s.removal_min_seats, 1),
                    least(coalesce(p_sofa_removal_seats, coalesce(v_s.removal_default_seats, 3)), coalesce(v_s.removal_max_seats, 10)))
    else null
  end;
  -- One fee up to the seats the band includes, then the per-seat rate above it.
  v_removal := case
    when v_removal_seats is null then 0
    else coalesce(v_s.removal_base_fee, 50)
         + greatest(0, v_removal_seats - coalesce(v_s.removal_included_seats, 5))
           * coalesce(v_s.removal_per_seat, 10)
  end;

  v_postcode := upper(substring(p_shipping_address from '([A-Za-z]{1,2}[0-9][0-9A-Za-z]?\s*[0-9][A-Za-z]{2})\s*$'));
  v_distance := public.delivery_distance_fee(v_postcode);
  select f.region into v_region
  from public.delivery_distance_fees f
  where f.outcode = upper(regexp_replace(btrim(coalesce(v_postcode, '')), '\s*[0-9][A-Za-z]{2}$', ''));

  -- The day the customer asked for. Checked here, once the postcode's charge
  -- is known: an area that pays one takes 5-7 days, so the first day anyone
  -- there may choose is the end of that window rather than the usual four
  -- days. No day is ever a Monday - the vans do not go out on Mondays - and a
  -- first day that falls on one moves to the Tuesday.
  if v_delivery_date is not null then
    v_min := v_today + case when v_distance > 0 then greatest(v_earliest, v_far_to) else v_earliest end;
    if extract(isodow from v_min) = 1 then v_min := v_min + 1; end if;
    if v_delivery_date < v_min then
      raise exception 'DELIVERY_DATE_TOO_SOON: earliest is %', v_min
        using errcode = 'check_violation';
    end if;
    if extract(isodow from v_delivery_date) = 1 then
      raise exception 'DELIVERY_DATE_MONDAY: % is a Monday', v_delivery_date
        using errcode = 'check_violation';
    end if;
    if v_delivery_date > v_today + v_latest then
      raise exception 'DELIVERY_DATE_TOO_FAR: latest is %', v_today + v_latest
        using errcode = 'check_violation';
    end if;
  end if;

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

-- ── save_shop_settings: the three new figures ────────────────────────────
create or replace function private.save_shop_settings(p jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v public.shop_settings%rowtype;
  v_key text;
  v_connected boolean;
begin
  perform private.require_admin();
  select * into v from public.shop_settings limit 1;
  if not found then
    insert into public.shop_settings (id) values (true) returning * into v;
  end if;

  -- Every figure must be a number; whole numbers where they count days, seats or floors.
  foreach v_key in array array['upstairs_first_floor', 'upstairs_per_extra_floor', 'assembly_fee',
                                'removal_base_fee', 'removal_per_seat', 'offer_min_price',
                                'tier_electric', 'tier_roma', 'tier_standard', 'tier_excluded'] loop
    if p ? v_key and (jsonb_typeof(p -> v_key) <> 'number' or (p ->> v_key)::numeric < 0) then
      raise exception 'BAD_NUMBER' using detail = v_key;
    end if;
  end loop;
  foreach v_key in array array['max_floor', 'removal_min_seats', 'removal_default_seats', 'removal_max_seats',
                                'removal_included_seats',
                                'delivery_window_from_days', 'delivery_window_to_days',
                                'far_window_from_days', 'far_window_to_days', 'preferred_earliest_days',
                                'preferred_latest_days', 'offer_window_hours', 'sample_limit'] loop
    if p ? v_key and (jsonb_typeof(p -> v_key) <> 'number' or (p ->> v_key)::numeric <> trunc((p ->> v_key)::numeric) or (p ->> v_key)::numeric < 0) then
      raise exception 'BAD_WHOLE_NUMBER' using detail = v_key;
    end if;
  end loop;

  v.upstairs_first_floor := coalesce((p ->> 'upstairs_first_floor')::numeric, v.upstairs_first_floor);
  v.upstairs_per_extra_floor := coalesce((p ->> 'upstairs_per_extra_floor')::numeric, v.upstairs_per_extra_floor);
  v.max_floor := coalesce((p ->> 'max_floor')::integer, v.max_floor);
  v.assembly_fee := coalesce((p ->> 'assembly_fee')::numeric, v.assembly_fee);
  v.removal_base_fee := coalesce((p ->> 'removal_base_fee')::numeric, v.removal_base_fee);
  v.removal_included_seats := coalesce((p ->> 'removal_included_seats')::integer, v.removal_included_seats);
  v.removal_per_seat := coalesce((p ->> 'removal_per_seat')::numeric, v.removal_per_seat);
  v.removal_min_seats := coalesce((p ->> 'removal_min_seats')::integer, v.removal_min_seats);
  v.removal_default_seats := coalesce((p ->> 'removal_default_seats')::integer, v.removal_default_seats);
  v.removal_max_seats := coalesce((p ->> 'removal_max_seats')::integer, v.removal_max_seats);
  v.delivery_window_from_days := coalesce((p ->> 'delivery_window_from_days')::integer, v.delivery_window_from_days);
  v.delivery_window_to_days := coalesce((p ->> 'delivery_window_to_days')::integer, v.delivery_window_to_days);
  v.far_window_from_days := coalesce((p ->> 'far_window_from_days')::integer, v.far_window_from_days);
  v.far_window_to_days := coalesce((p ->> 'far_window_to_days')::integer, v.far_window_to_days);
  v.preferred_earliest_days := coalesce((p ->> 'preferred_earliest_days')::integer, v.preferred_earliest_days);
  v.preferred_latest_days := coalesce((p ->> 'preferred_latest_days')::integer, v.preferred_latest_days);
  v.tier_electric := coalesce((p ->> 'tier_electric')::numeric, v.tier_electric);
  v.tier_roma := coalesce((p ->> 'tier_roma')::numeric, v.tier_roma);
  v.tier_standard := coalesce((p ->> 'tier_standard')::numeric, v.tier_standard);
  v.tier_excluded := coalesce((p ->> 'tier_excluded')::numeric, v.tier_excluded);
  v.offer_min_price := coalesce((p ->> 'offer_min_price')::numeric, v.offer_min_price);
  v.offer_window_hours := coalesce((p ->> 'offer_window_hours')::integer, v.offer_window_hours);
  v.offer_enabled := coalesce((p ->> 'offer_enabled')::boolean, v.offer_enabled);
  v.sample_limit := coalesce((p ->> 'sample_limit')::integer, v.sample_limit);
  v.orderflow_enabled := coalesce((p ->> 'orderflow_enabled')::boolean, v.orderflow_enabled);

  -- The rules, as codes the admin turns into sentences.
  if v.delivery_window_to_days < v.delivery_window_from_days then raise exception 'WINDOW_ORDER'; end if;
  if v.far_window_to_days < v.far_window_from_days then raise exception 'WINDOW_ORDER'; end if;
  if v.preferred_latest_days <= v.preferred_earliest_days then raise exception 'DATES_ORDER'; end if;
  if not (v.tier_electric >= v.tier_roma and v.tier_roma >= v.tier_standard and v.tier_standard >= v.tier_excluded) then
    raise exception 'TIERS_ORDER';
  end if;
  if not (v.removal_min_seats >= 1 and v.removal_min_seats <= v.removal_default_seats and v.removal_default_seats <= v.removal_max_seats) then
    raise exception 'SEATS_ORDER';
  end if;
  -- The band has to sit inside the seat counts a customer can pick, or the
  -- fee the checkout shows is for a number of seats nobody can choose.
  if not (v.removal_included_seats >= v.removal_min_seats and v.removal_included_seats <= v.removal_max_seats) then
    raise exception 'BAND_SEATS';
  end if;
  if v.orderflow_enabled and not coalesce((select s.orderflow_enabled from public.shop_settings s limit 1), true) then
    select count(*) = 2 into v_connected from vault.secrets where name in ('orderflow_ingest_url', 'orderflow_ingest_key');
    if not v_connected then raise exception 'ORDERFLOW_NOT_CONNECTED'; end if;
  end if;

  update public.shop_settings set
    upstairs_first_floor = v.upstairs_first_floor, upstairs_per_extra_floor = v.upstairs_per_extra_floor,
    max_floor = v.max_floor, assembly_fee = v.assembly_fee,
    removal_base_fee = v.removal_base_fee, removal_included_seats = v.removal_included_seats,
    removal_per_seat = v.removal_per_seat,
    removal_min_seats = v.removal_min_seats, removal_default_seats = v.removal_default_seats, removal_max_seats = v.removal_max_seats,
    delivery_window_from_days = v.delivery_window_from_days, delivery_window_to_days = v.delivery_window_to_days,
    far_window_from_days = v.far_window_from_days, far_window_to_days = v.far_window_to_days,
    preferred_earliest_days = v.preferred_earliest_days, preferred_latest_days = v.preferred_latest_days,
    tier_electric = v.tier_electric, tier_roma = v.tier_roma, tier_standard = v.tier_standard, tier_excluded = v.tier_excluded,
    offer_min_price = v.offer_min_price,
    offer_window_hours = v.offer_window_hours, offer_enabled = v.offer_enabled, sample_limit = v.sample_limit,
    orderflow_enabled = v.orderflow_enabled, updated_at = now(), updated_by = auth.uid()
  where id;
exception
  when check_violation then
    raise exception 'OUT_OF_RANGE' using detail = sqlerrm;
end;
$function$;
