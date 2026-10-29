-- Beds and mattresses (2026-10-30), and the two things the catalogue needed
-- before it could sell anything but a sofa.
--
-- Muaz's brief: six bed designs (Arizona, Cube, Hilton, Florida - also sold
-- as the Monaco - Panel, Sleigh) in five sizes, each bought as the frame alone
-- or as a set with a mattress, with paid extras and mattress upgrades; and
-- eight mattresses sold on their own. Dining and other furniture will follow,
-- so nothing here is bed-shaped where it does not have to be.
--
-- 1. products.product_type - 'sofa' for everything that was here before.
--    The storefront picks the product page by it, /build keeps to sofas by
--    it, and the menu groups by the department on the category.
--
-- 2. product_variants.options - what a variant IS when it is not a
--    colourway. A bed's ten variants are {"size":"4ft6","build":"set"} and
--    so on; each still carries its own exact price (base_price +
--    price_adjustment), so the database prices a bed exactly the way it has
--    always priced a sofa. The codes are turned into words in one place in
--    the code (src/utils/productOptions.ts).
--
-- 3. Add-ons - a priced choice on top of a variant. addon_groups ("Mattress
--    upgrade", "Extras") hold addons ("2000 Pocket", "Gas lift"), and
--    product_addon_groups says which products offer which groups. A group
--    can be pick-one or pick-any, and can be limited to variants whose
--    options match `only_when` - the mattress upgrade is only offered on a
--    bed set. The browser sends addon ids, never prices: line_addons prices
--    them, and refuses an id that is inactive, not offered on that product,
--    not offered on that variant, or a second pick in a pick-one group.
--
-- calculate_order_offer and place_order add the add-ons to each line, and
-- place_order snapshots the variant's options and the add-ons' names and
-- prices onto order_items.customisation as {"kind":"options", ...}, so the
-- admin panel, the delivery note and the WhatsApp copy read what was bought
-- even after the catalogue changes. A /build sofa's customisation has no
-- `kind`; that is how the two are told apart.
--
-- Choosing a size, a set or an extra is choosing between standard versions
-- of a product, not personalising it, so none of this affects the 14-day
-- right - only a fabric from the library does, as on a sofa.

-- ── 1. Product type ──────────────────────────────────────────────────────
alter table public.products
  add column if not exists product_type text not null default 'sofa';

alter table public.products drop constraint if exists products_product_type_check;
alter table public.products add constraint products_product_type_check
  check (product_type ~ '^[a-z]{3,20}$');

create index if not exists products_product_type_idx on public.products (product_type);

comment on column public.products.product_type is
  'What kind of thing this is: sofa, bed, mattress (2026-10-30). Picks the product page and keeps /build to sofas.';

-- Which part of the shop a category belongs to, for the menu.
alter table public.categories
  add column if not exists department text not null default 'sofas';

alter table public.categories drop constraint if exists categories_department_check;
alter table public.categories add constraint categories_department_check
  check (department ~ '^[a-z]{3,20}$');

comment on column public.categories.department is
  'The menu section the category is listed under: sofas, beds (2026-10-30).';

-- ── 2. Variant options ───────────────────────────────────────────────────
alter table public.product_variants
  add column if not exists options jsonb not null default '{}'::jsonb;

alter table public.product_variants drop constraint if exists product_variants_options_object;
alter table public.product_variants add constraint product_variants_options_object
  check (jsonb_typeof(options) = 'object');

comment on column public.product_variants.options is
  'What the variant is when it is not a colourway, as codes: {"size":"4ft6","build":"set"}. Empty on sofas.';

-- ── 3. Add-ons ───────────────────────────────────────────────────────────
create table if not exists public.addon_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 2 and 60),
  description text,
  selection text not null default 'many' check (selection in ('one', 'many')),
  -- Offered only on variants whose options contain this, e.g. {"build":"set"}.
  only_when jsonb not null default '{}'::jsonb check (jsonb_typeof(only_when) = 'object'),
  sort integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.addon_groups(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 2 and 80),
  description text,
  price numeric(10, 2) not null check (price >= 0 and price <= 10000),
  sort integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (group_id, slug)
);

create table if not exists public.product_addon_groups (
  product_id uuid not null references public.products(id) on delete cascade,
  group_id uuid not null references public.addon_groups(id) on delete cascade,
  sort integer not null default 0,
  primary key (product_id, group_id)
);

create index if not exists product_addon_groups_group_idx on public.product_addon_groups (group_id);

comment on table public.addon_groups is
  'A set of priced choices on top of a variant - "Mattress upgrade", "Extras" (2026-10-30). Priced by private.line_addons.';
comment on table public.addons is 'One priced choice in an addon group.';
comment on table public.product_addon_groups is 'Which products offer which addon groups.';

alter table public.addon_groups enable row level security;
alter table public.addons enable row level security;
alter table public.product_addon_groups enable row level security;

grant select on public.addon_groups, public.addons, public.product_addon_groups to anon, authenticated;
grant select, insert, update, delete on public.addon_groups, public.addons, public.product_addon_groups to authenticated;
grant all on public.addon_groups, public.addons, public.product_addon_groups to service_role;

drop policy if exists "public read addon_groups" on public.addon_groups;
create policy "public read addon_groups" on public.addon_groups for select to public using (true);
drop policy if exists "admin write addon_groups" on public.addon_groups;
create policy "admin write addon_groups" on public.addon_groups for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "public read addons" on public.addons;
create policy "public read addons" on public.addons for select to public using (true);
drop policy if exists "admin write addons" on public.addons;
create policy "admin write addons" on public.addons for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "public read product_addon_groups" on public.product_addon_groups;
create policy "public read product_addon_groups" on public.product_addon_groups for select to public using (true);
drop policy if exists "admin write product_addon_groups" on public.product_addon_groups;
create policy "admin write product_addon_groups" on public.product_addon_groups for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ── line_addons: price a line's add-ons, or refuse them ──────────────────
--
-- Returns {"total": 150, "items": [{"id", "group", "name", "price"}, ...]}
-- in the order the page lists them. No ids is {"total": 0, "items": []}.
-- Anything wrong raises UNAVAILABLE_ADDON, which the checkout turns into
-- "one of the options on an item has changed".
create or replace function private.line_addons(p_variant_id uuid, p_addon_ids jsonb)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_ids uuid[];
  v_found integer;
  v_result jsonb;
begin
  if p_addon_ids is null or jsonb_typeof(p_addon_ids) = 'null' then
    return jsonb_build_object('total', 0, 'items', '[]'::jsonb);
  end if;
  if jsonb_typeof(p_addon_ids) <> 'array' or jsonb_array_length(p_addon_ids) > 20 then
    raise exception 'UNAVAILABLE_ADDON' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(p_addon_ids) = 0 then
    return jsonb_build_object('total', 0, 'items', '[]'::jsonb);
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_addon_ids) e
    where jsonb_typeof(e) <> 'string'
       or (e #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    raise exception 'UNAVAILABLE_ADDON' using errcode = 'check_violation';
  end if;

  select array_agg(distinct (e #>> '{}')::uuid) into v_ids
  from jsonb_array_elements(p_addon_ids) e;

  -- Every id must be an active add-on, in an active group the product offers,
  -- on a variant the group is offered on.
  select count(*) into v_found
  from public.addons a
  join public.addon_groups g on g.id = a.group_id
  join public.product_variants pv on pv.id = p_variant_id
  join public.product_addon_groups pag on pag.group_id = g.id and pag.product_id = pv.product_id
  where a.id = any(v_ids)
    and a.is_active and g.is_active
    and pv.options @> g.only_when;

  if v_found <> cardinality(v_ids) then
    raise exception 'UNAVAILABLE_ADDON' using errcode = 'check_violation';
  end if;

  -- One pick at most in a pick-one group.
  if exists (
    select 1
    from public.addons a
    join public.addon_groups g on g.id = a.group_id
    where a.id = any(v_ids) and g.selection = 'one'
    group by g.id
    having count(*) > 1
  ) then
    raise exception 'UNAVAILABLE_ADDON' using errcode = 'check_violation';
  end if;

  select jsonb_build_object(
    'total', coalesce(sum(a.price), 0),
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'group', g.name, 'name', a.name, 'price', a.price
    ) order by g.sort, a.sort), '[]'::jsonb)
  )
  into v_result
  from public.addons a
  join public.addon_groups g on g.id = a.group_id
  where a.id = any(v_ids);

  return v_result;
end;
$function$;

revoke all on function private.line_addons(uuid, jsonb) from public;
grant execute on function private.line_addons(uuid, jsonb) to anon, authenticated, service_role;

-- ── calculate_order_offer: lines include their add-ons ───────────────────
--
-- As 20261023200444 left it, except that a line is base + variant + its
-- add-ons, in the subtotal and in the price-floor test.
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

  select coalesce(sum((p.base_price + coalesce(pv.price_adjustment, 0)
                       + (private.line_addons(pv.id, item->'addon_ids')->>'total')::numeric) *
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

  v_code_valid := v_normalized_code is not null and private.offer_code_active(v_normalized_code) and v_entitlement_valid;

  if v_entitlement_valid then
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
      where (p.base_price + coalesce(pv.price_adjustment, 0)
             + (private.line_addons(pv.id, item->'addon_ids')->>'total')::numeric) >= v_min_price
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

-- ── place_order: add-ons priced and snapshotted ──────────────────────────
--
-- As 20261023200444 left it, except the order_items insert: the line price
-- includes its add-ons, and a variant with options gets the options snapshot
-- as its customisation instead of whatever the browser sent.
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
         (p.base_price + coalesce(pv.price_adjustment, 0) + (r.addons->>'total')::numeric),
         f.id,
         f.code,
         f.name,
         fc.name,
         case
           when pv.options <> '{}'::jsonb or jsonb_array_length(r.addons->'items') > 0
             then jsonb_build_object(
               'kind', 'options',
               'product_type', p.product_type,
               'options', pv.options,
               'addons', r.addons->'items'
             )
           else r.customisation
         end
  from (
    select x.*, private.line_addons(x.variant_id, x.addon_ids) as addons
    from (
      select (item->>'variant_id')::uuid as variant_id,
             nullif(item->>'fabric_id', '')::uuid as fabric_id,
             least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity,
             item->'addon_ids' as addon_ids,
             case when jsonb_typeof(item->'customisation') = 'object'
                  then item->'customisation' else null end as customisation
      from jsonb_array_elements(p_items) as item
    ) x
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

-- ── The departments and their categories ─────────────────────────────────
--
-- Everything from here down goes in HIDDEN (is_active false): the site that
-- was live when this ran drew every product as a sofa. The categories and
-- products are switched on once the bed and mattress pages are deployed.
insert into public.categories (name, slug, department, sort, is_active, image_url, intro, search_words)
values
  ('Beds', 'beds', 'beds', 100, false,
   'https://res.cloudinary.com/dmlna04yk/image/upload/arizona-bed-cream-velvet-1_qk4r53.jpg',
   'Upholstered bed frames in five sizes, from a 3ft single to a 6ft super king. Buy the frame on its own or as a set with a mattress, add drawers, a gas lift or an ottoman box, and have it made in any of our 70 fabrics.',
   'bed beds bed frame upholstered bed double bed king size bed super king single bed ottoman bed storage bed sleigh bed velvet bed'),
  ('Mattresses', 'mattresses', 'beds', 101, false,
   'https://res.cloudinary.com/dmlna04yk/image/upload/mattress-2000-pocket.png',
   'Eight mattresses in every UK size, from an 8-inch eco spring to a 5000 pocket sprung luxury mattress. Delivered free with the rest of your order.',
   'mattress mattresses memory foam orthopaedic pocket sprung pillow top single double king size super king')
on conflict (slug) do nothing;

-- ── The add-on groups and add-ons ────────────────────────────────────────
insert into public.addon_groups (slug, name, description, selection, only_when, sort)
values
  ('bed-mattress-upgrade', 'Mattress upgrade',
   'A bed set comes with our Standard mattress: an 8-9 inch hybrid spring mattress with a layer of foam. Upgrade it here.',
   'one', '{"build":"set"}', 10),
  ('bed-extras', 'Extras', 'Add any of these to the frame.', 'many', '{}', 20)
on conflict (slug) do nothing;

insert into public.addons (group_id, slug, name, description, price, sort)
select g.id, a.slug, a.name, a.description, a.price, a.sort
from (values
  ('bed-mattress-upgrade', 'memory-foam', 'Full memory foam', 'Memory foam all the way through; moulds to you and takes the pressure off hips and shoulders.', 20, 10),
  ('bed-mattress-upgrade', 'orthopaedic', 'Full orthopaedic', 'A firm orthopaedic foam mattress for a supportive, even feel.', 20, 20),
  ('bed-mattress-upgrade', 'pocket-1000', '1000 pocket sprung', '1,000 individually pocketed springs, each moving on its own.', 30, 30),
  ('bed-mattress-upgrade', 'pocket-2000', '2000 pocket sprung', '2,000 pocketed springs for closer support and less roll-together.', 40, 40),
  ('bed-mattress-upgrade', 'pillow-top', 'Pillow top 12" luxury', 'A 12-inch pocket sprung mattress with a soft pillow-top layer sewn on.', 90, 50),
  ('bed-mattress-upgrade', 'emperor-3000', 'Emperor 3000 pocket luxury', '3,000 pocketed springs under deep luxury fillings.', 90, 60),
  ('bed-mattress-upgrade', 'royal-5000', 'Royal 5000 pocket luxury', '5,000 pocketed springs - our most supportive mattress.', 100, 70),
  ('bed-extras', 'drawers', 'Storage drawers', 'Pull-out drawers built into the base.', 20, 10),
  ('bed-extras', 'gas-lift', 'Gas lift storage', 'The base lifts on gas struts to open up the whole space underneath.', 110, 20),
  ('bed-extras', 'ottoman-box', 'Ottoman box', 'An upholstered ottoman storage box, made in the same fabric as the bed.', 75, 30),
  ('bed-extras', 'solid-base', 'Solid base', 'A solid board base under the mattress instead of slats.', 35, 40)
) as a(group_slug, slug, name, description, price, sort)
join public.addon_groups g on g.slug = a.group_slug
on conflict (group_id, slug) do nothing;

-- ── The six beds ─────────────────────────────────────────────────────────
--
-- Muaz's price sheet plus £100 on every frame and every set. Each bed is one
-- product; its ten variants are the five sizes, frame or set. base_price is
-- the 3ft frame, and each variant's adjustment brings it to its own price.
do $beds$
declare
  v_beds_cat uuid;
  v_bed record;
  v_product uuid;
  v_sizes text[] := array['3ft', '4ft', '4ft6', '5ft', '6ft'];
  v_size_sku text[] := array['3', '4', '46', '5', '6'];
  v_i int;
  v_priority int;
begin
  select id into v_beds_cat from public.categories where slug = 'beds';

  for v_bed in
    select * from (values
      ('Arizona Bed', 'arizona-bed', 'ARZ', 'Cream', '#e9e1d1', 'Plush Velvet',
       'arizona-bed-cream-velvet-1_qk4r53', 'arizona-bed-cream-velvet-2_jbwqix',
       array[270, 310, 310, 330, 360], array[310, 350, 350, 380, 430],
       'The Arizona has a tall, scalloped headboard and a matching footboard, both channel-stitched in deep vertical panels, on a fully upholstered base. Shown in cream plush velvet and made to order in any of our 70 fabrics.' ||
       E'\n\nChoose the frame on its own, or a bed set with our Standard mattress (an 8-9 inch hybrid spring mattress with a layer of foam) that you can upgrade to memory foam, orthopaedic or pocket sprung. Storage drawers, gas lift storage, an ottoman box and a solid base can all be added.',
       'Channel-stitched scalloped headboard and footboard'),
      ('Cube Bed', 'cube-bed', 'CUB', 'Black', '#26252a', 'Velvet',
       'cube-bed-black-velvet-1_psjj8s', 'cube-bed-black-velvet-2_gbmolv',
       array[250, 270, 270, 280, 340], array[280, 310, 310, 330, 410],
       'The Cube is padded in rows of deep square cushions on the headboard and footboard, each finished with a crystal button, on a fully upholstered base with chrome feet. Shown in black velvet and made to order in any of our 70 fabrics.' ||
       E'\n\nChoose the frame on its own, or a bed set with our Standard mattress (an 8-9 inch hybrid spring mattress with a layer of foam) that you can upgrade to memory foam, orthopaedic or pocket sprung. Storage drawers, gas lift storage, an ottoman box and a solid base can all be added.',
       'Cube-padded headboard and footboard with crystal buttons'),
      ('Hilton Bed', 'hilton-bed', 'HIL', 'Silver Grey', '#bdb8b0', 'Velvet',
       'hilton-bed-silver-grey-velvet-1_l6y5xe', 'hilton-bed-silver-grey-velvet-2_tt5l2a',
       array[260, 280, 280, 290, 350], array[290, 320, 320, 340, 420],
       'The Hilton is deep diamond-buttoned in the Chesterfield way, framed by a plain upholstered border on the headboard and footboard. Shown in silver grey velvet and made to order in any of our 70 fabrics.' ||
       E'\n\nChoose the frame on its own, or a bed set with our Standard mattress (an 8-9 inch hybrid spring mattress with a layer of foam) that you can upgrade to memory foam, orthopaedic or pocket sprung. Storage drawers, gas lift storage, an ottoman box and a solid base can all be added.',
       'Framed, deep diamond-buttoned headboard and footboard'),
      ('Florida Bed', 'florida-bed', 'FLA', 'Silver', '#c9c9cb', 'Crushed Velvet',
       'monaco-florida-bed-silver-crushed-velvet-1_plwkgi', 'monaco-florida-bed-silver-crushed-velvet-2_bwzkpz',
       array[250, 270, 270, 280, 340], array[280, 310, 310, 330, 410],
       'The Florida - also known as the Monaco - has a tall diamond-buttoned headboard and footboard set with crystal buttons, on a fully upholstered base with chrome feet. Shown in silver crushed velvet and made to order in any of our 70 fabrics.' ||
       E'\n\nChoose the frame on its own, or a bed set with our Standard mattress (an 8-9 inch hybrid spring mattress with a layer of foam) that you can upgrade to memory foam, orthopaedic or pocket sprung. Storage drawers, gas lift storage, an ottoman box and a solid base can all be added.',
       'Tall diamond-buttoned headboard with crystal buttons'),
      ('Panel Bed', 'panel-bed', 'PNL', 'Grey', '#55575a', 'Velvet',
       'panel-bed-grey-velvet-1_arc9y6', 'panel-bed-grey-velvet-2_tj2pc6',
       array[250, 270, 270, 280, 340], array[280, 310, 310, 330, 410],
       'The Panel is clean-lined and modern: a tall headboard and a footboard in wide vertical upholstered panels, on a fully upholstered base. Shown in grey velvet and made to order in any of our 70 fabrics.' ||
       E'\n\nChoose the frame on its own, or a bed set with our Standard mattress (an 8-9 inch hybrid spring mattress with a layer of foam) that you can upgrade to memory foam, orthopaedic or pocket sprung. Storage drawers, gas lift storage, an ottoman box and a solid base can all be added.',
       'Vertical panelled headboard and footboard'),
      ('Sleigh Bed', 'sleigh-bed', 'SLG', 'Black', '#232226', 'Crushed Velvet',
       'sleigh-bed-black-crushed-velvet-1_auhveg', 'sleigh-bed-black-crushed-velvet-2_yxshq3',
       array[270, 310, 310, 330, 360], array[310, 350, 350, 380, 430],
       'The Sleigh rolls over at the head and the foot in deep buttoned curves set with crystal buttons, on turned wooden feet. Shown in black crushed velvet and made to order in any of our 70 fabrics.' ||
       E'\n\nChoose the frame on its own, or a bed set with our Standard mattress (an 8-9 inch hybrid spring mattress with a layer of foam) that you can upgrade to memory foam, orthopaedic or pocket sprung. Storage drawers, gas lift storage, an ottoman box and a solid base can all be added.',
       'Scroll-ended, buttoned sleigh headboard and footboard')
    ) as b(title, slug, sku, colour, hex, material, img1, img2, frames, sets, description, style)
  loop
    if exists (select 1 from public.products where slug = v_bed.slug) then continue; end if;

    insert into public.products (
      title, slug, base_price, description, specifications, gallery_images, origin,
      custom_made, is_active, is_featured, product_type, category_id
    ) values (
      v_bed.title, v_bed.slug, v_bed.frames[1], v_bed.description,
      jsonb_build_object(
        'Style', v_bed.style,
        'Material', 'Fabric',
        'Sizes', 'Single 3ft, Small Double 4ft, Double 4ft 6in, King 5ft, Super King 6ft',
        'Fabrics', 'Any of our 70 fabrics',
        'Base', 'Slatted as standard; solid base optional'
      ),
      array['https://res.cloudinary.com/dmlna04yk/image/upload/' || v_bed.img2 || '.jpg'],
      'uk', true, false, false, 'bed', v_beds_cat
    )
    returning id into v_product;

    insert into public.product_categories (product_id, category_id) values (v_product, v_beds_cat);

    v_priority := 0;
    for v_i in 1..5 loop
      v_priority := v_priority + 1;
      insert into public.product_variants (product_id, sku, color, color_hex, material, price_adjustment, image_url, priority, options)
      values (v_product, v_bed.sku || '-' || v_size_sku[v_i] || '-F', v_bed.colour, v_bed.hex, v_bed.material,
              v_bed.frames[v_i] - v_bed.frames[1],
              'https://res.cloudinary.com/dmlna04yk/image/upload/' || v_bed.img1 || '.jpg',
              v_priority, jsonb_build_object('size', v_sizes[v_i], 'build', 'frame'));
      v_priority := v_priority + 1;
      insert into public.product_variants (product_id, sku, color, color_hex, material, price_adjustment, image_url, priority, options)
      values (v_product, v_bed.sku || '-' || v_size_sku[v_i] || '-S', v_bed.colour, v_bed.hex, v_bed.material,
              v_bed.sets[v_i] - v_bed.frames[1],
              'https://res.cloudinary.com/dmlna04yk/image/upload/' || v_bed.img1 || '.jpg',
              v_priority, jsonb_build_object('size', v_sizes[v_i], 'build', 'set'));
    end loop;

    insert into public.product_addon_groups (product_id, group_id, sort)
    select v_product, g.id, g.sort from public.addon_groups g
    where g.slug in ('bed-mattress-upgrade', 'bed-extras');
  end loop;
end
$beds$;

-- ── The eight mattresses ─────────────────────────────────────────────────
--
-- Muaz's mattress price list plus £30 on every size. There are no
-- photographs yet, so each is shown as a drawn cut-away (Cloudinary,
-- Products/Mattresses, uploaded as SVG and delivered as PNG). Replace the
-- variant image_url with a photograph when there is one.
do $mattresses$
declare
  v_cat uuid;
  v_m record;
  v_product uuid;
  v_sizes text[] := array['3ft', '4ft', '4ft6', '5ft', '6ft'];
  v_size_sku text[] := array['3', '4', '46', '5', '6'];
  v_i int;
begin
  select id into v_cat from public.categories where slug = 'mattresses';

  for v_m in
    select * from (values
      ('Eco Spring Mattress', 'eco-spring-mattress', 'MEC', '8 inches', 'Open coil spring with a foam layer', 'Medium',
       array[99, 109, 109, 129, 159],
       'Our everyday mattress, and the one that comes with a bed set: an 8-inch open spring mattress with a comfortable layer of foam on top. A sound, supportive choice for a guest room, a child''s room or a first home.'),
      ('Memory Foam Mattress', 'memory-foam-mattress', 'MMF', '10 inches', 'Full memory foam', 'Medium-soft',
       array[109, 119, 119, 139, 169],
       'Ten inches of memory foam all the way through. It warms to your shape and spreads your weight, taking the pressure off hips and shoulders, and there are no springs to feel or hear.'),
      ('Orthopaedic Firm Mattress', 'orthopaedic-firm-mattress', 'MOR', '11 inches', 'Orthopaedic foam', 'Firm',
       array[109, 119, 119, 139, 169],
       'An 11-inch orthopaedic foam mattress with a firm, even feel that keeps the spine straight. For anyone who likes a mattress that holds them up rather than letting them sink.'),
      ('1000 Pocket Mattress', '1000-pocket-mattress', 'MP1', '11 inches', '1,000 pocket springs', 'Medium',
       array[130, 145, 145, 165, 195],
       'An 11-inch mattress built on 1,000 individually pocketed springs. Each one moves on its own, so the mattress follows your shape and you feel less of a partner turning over.'),
      ('2000 Pocket Mattress', '2000-pocket-mattress', 'MP2', '12 inches', '2,000 pocket springs', 'Medium-firm',
       array[140, 155, 155, 175, 205],
       'Twelve inches deep with 2,000 pocketed springs: twice the springs, closer support, and less of the roll-together you get on a cheaper mattress.'),
      ('Pillow Top Pocket Luxury Mattress', 'pillow-top-pocket-mattress', 'MPT', '12 inches', 'Pocket springs with a pillow top', 'Soft',
       array[169, 190, 190, 230, 290],
       'A 12-inch pocket sprung mattress with a deep pillow top sewn on - the soft, sink-in comfort of a hotel bed over the support of individually pocketed springs.'),
      ('Emperor 3000 Pocket Mattress', 'emperor-3000-pocket-mattress', 'MP3', 'Luxury depth', '3,000 pocket springs', 'Medium-firm',
       array[170, 190, 190, 210, 240],
       'Our Emperor mattress: 3,000 pocketed springs under deep luxury fillings, for close, responsive support right across the bed.'),
      ('Royal 5000 Pocket Mattress', 'royal-5000-pocket-mattress', 'MP5', 'Luxury depth', '5,000 pocket springs', 'Medium-firm',
       array[190, 210, 210, 230, 290],
       'The Royal is our finest mattress: 5,000 individually pocketed springs, each one answering to the weight above it, under generous luxury fillings.')
    ) as m(title, slug, sku, depth, build, feel, prices, description)
  loop
    if exists (select 1 from public.products where slug = v_m.slug) then continue; end if;

    insert into public.products (
      title, slug, base_price, description, specifications, gallery_images, origin,
      custom_made, is_active, is_featured, product_type, category_id
    ) values (
      v_m.title, v_m.slug, v_m.prices[1], v_m.description,
      jsonb_build_object(
        'Depth', v_m.depth,
        'Construction', v_m.build,
        'Feel', v_m.feel,
        'Sizes', 'Single 3ft, Small Double 4ft, Double 4ft 6in, King 5ft, Super King 6ft'
      ),
      '{}', 'unspecified', false, false, false, 'mattress', v_cat
    )
    returning id into v_product;

    insert into public.product_categories (product_id, category_id) values (v_product, v_cat);

    for v_i in 1..5 loop
      insert into public.product_variants (product_id, sku, color, material, price_adjustment, image_url, priority, options)
      values (v_product, v_m.sku || '-' || v_size_sku[v_i], 'White', null,
              v_m.prices[v_i] - v_m.prices[1],
              'https://res.cloudinary.com/dmlna04yk/image/upload/mattress-' || replace(v_m.slug, '-mattress', '') || '.png', v_i,
              jsonb_build_object('size', v_sizes[v_i]));
    end loop;
  end loop;
end
$mattresses$;

-- ── update_order_details: an options snapshot is not a made-to-order build ─
--
-- Unchanged apart from the made-to-order test after the lines are rewritten:
-- a bed or mattress line's {"kind":"options"} snapshot describes a standard
-- product and does not, on its own, make the order made to order.
do $patch$
declare
  v_def text;
begin
  if to_regprocedure('private.update_order_details(uuid, text, text, text, text, text, date, numeric, jsonb)') is null then
    return;
  end if;
  select pg_get_functiondef('private.update_order_details(uuid, text, text, text, text, text, date, numeric, jsonb)'::regprocedure)
  into v_def;
  if position('(oi.customisation->>''kind''' in v_def) > 0 then
    return; -- already patched
  end if;
  if position('oi.customisation is not null), false)' in v_def) = 0 then
    raise exception 'update_order_details has changed; patch it by hand';
  end if;
  v_def := replace(v_def,
    'coalesce(bool_or(oi.fabric_id is not null or oi.customisation is not null), false)',
    'coalesce(bool_or(oi.fabric_id is not null or (oi.customisation is not null and coalesce(oi.customisation->>''kind'', '''') <> ''options'')), false)');
  execute v_def;
end
$patch$;
