-- Admin upgrade Phase 9: the catalogue (K1-K6). Decision 16: the tables we
-- have, with columns added, nothing renamed or dropped.
--
--   * product_variants.is_active - a colourway can be hidden. The shop's read
--     rule now shows only shown colourways; admins see all of them, and a
--     signed-in customer still sees one they ordered, in their order history.
--     Every colourway is shown today, so nothing in the shop changes.
--   * products.seo_title, seo_description - the search title and description
--     (K2). Empty means the page keeps the title and description it has now.
--   * categories.sort, is_active, intro, search_words (K5). The defaults are
--     today's shop: every category shown, in name order, no introduction.
--     A trigger stops a category ending up inside itself.
--   * save_product() - the product, its categories, offer tier and colourways
--     in one transaction (K3). A colourway removed from the form is deleted,
--     or hidden instead if it has ever been ordered. Each refusal is a short
--     code the admin turns into a sentence by the field.
--   * delete_product, delete_category, delete_variant_group, delete_fabric,
--     delete_fabric_collection - each refuses, with the reason, while
--     anything still uses the item.

-- ── Columns ──────────────────────────────────────────────────────────────
alter table public.product_variants
  add column if not exists is_active boolean not null default true;
comment on column public.product_variants.is_active is
  'Shown in the shop. A colourway that has been ordered is hidden rather than deleted when it is taken off a product.';

alter table public.products
  add column if not exists seo_title text,
  add column if not exists seo_description text;
alter table public.products drop constraint if exists products_seo_title_length;
alter table public.products add constraint products_seo_title_length check (seo_title is null or length(seo_title) <= 120);
alter table public.products drop constraint if exists products_seo_description_length;
alter table public.products add constraint products_seo_description_length check (seo_description is null or length(seo_description) <= 320);

alter table public.categories
  add column if not exists sort integer not null default 99,
  add column if not exists is_active boolean not null default true,
  add column if not exists intro text,
  add column if not exists search_words text;
comment on column public.categories.is_active is
  'Listed in the menu, the home page and the sitemap. A hidden category''s page and products still open from a link.';

-- ── A category can't end up inside itself ────────────────────────────────
create or replace function private.categories_no_loop()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
declare
  v_parent uuid := new.parent_id;
  v_steps integer := 0;
begin
  while v_parent is not null loop
    if v_parent = new.id then
      raise exception 'CATEGORY_LOOP' using detail = 'A category can''t sit inside itself, or inside one of its own sub-categories.';
    end if;
    v_steps := v_steps + 1;
    exit when v_steps > 50;
    select c.parent_id into v_parent from public.categories c where c.id = v_parent;
  end loop;
  return new;
end;
$function$;

drop trigger if exists categories_no_loop on public.categories;
create trigger categories_no_loop
  before insert or update of parent_id on public.categories
  for each row execute function private.categories_no_loop();

-- ── Colourways: the shop sees the shown ones ─────────────────────────────
drop policy if exists "public read product_variants" on public.product_variants;
drop policy if exists "shop reads shown colourways" on public.product_variants;
create policy "shop reads shown colourways" on public.product_variants
  for select to public using (is_active);
drop policy if exists "customers read colourways they ordered" on public.product_variants;
create policy "customers read colourways they ordered" on public.product_variants
  for select to authenticated using (
    not is_active
    and exists (
      select 1
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
       where oi.variant_id = product_variants.id
         and o.customer_email = (select auth.jwt() ->> 'email')
    )
  );

-- ── save_product ─────────────────────────────────────────────────────────
create or replace function private.save_product(
  p_id uuid,
  p_product jsonb,
  p_category_ids uuid[],
  p_canonical_category_id uuid,
  p_tier text,
  p_variants jsonb
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_id uuid := p_id;
  v_title text := btrim(coalesce(p_product ->> 'title', ''));
  v_slug text := btrim(coalesce(p_product ->> 'slug', ''));
  v_price numeric;
  v_was numeric;
  v_description text := btrim(coalesce(p_product ->> 'description', ''));
  v_origin text := coalesce(nullif(p_product ->> 'origin', ''), 'unspecified');
  v_group uuid := nullif(p_product ->> 'variant_group_id', '')::uuid;
  v_size text := nullif(btrim(coalesce(p_product ->> 'size_label', '')), '');
  v_subgroup text := nullif(btrim(coalesce(p_product ->> 'subgroup_label', '')), '');
  v_collection uuid := nullif(p_product ->> 'main_collection_id', '')::uuid;
  v_active boolean := coalesce((p_product ->> 'is_active')::boolean, true);
  v_seo_title text := nullif(btrim(coalesce(p_product ->> 'seo_title', '')), '');
  v_seo_description text := nullif(btrim(coalesce(p_product ->> 'seo_description', '')), '');
  v_gallery text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_product -> 'gallery_images', '[]'::jsonb))), '{}');
  v_specs jsonb := coalesce(p_product -> 'specifications', '{}'::jsonb);
  v_canonical uuid;
  v_variant jsonb;
  v_sku text;
  v_hex text;
  v_keep uuid[] := '{}';
  v_skus text[] := '{}';
  v_removed record;
  v_hidden integer := 0;
  v_deleted integer := 0;
  v_shown integer := 0;
  v_index integer := 0;
begin
  perform private.require_admin();

  -- The product itself.
  if length(v_title) < 3 then raise exception 'TITLE_SHORT'; end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'SLUG_INVALID'; end if;
  if exists (select 1 from public.products where slug = v_slug and id is distinct from p_id) then
    raise exception 'SLUG_TAKEN';
  end if;
  begin
    v_price := (p_product ->> 'base_price')::numeric;
    v_was := nullif(p_product ->> 'was_price', '')::numeric;
  exception when others then
    raise exception 'PRICE_INVALID';
  end;
  if v_price is null or v_price <= 0 then raise exception 'PRICE_INVALID'; end if;
  if v_was is not null and v_was <= v_price then raise exception 'WAS_PRICE_LOW'; end if;
  if v_description = '' then raise exception 'DESCRIPTION_REQUIRED'; end if;
  if v_origin not in ('uk', 'imported', 'unspecified') then raise exception 'ORIGIN_INVALID'; end if;
  if v_group is not null and not exists (select 1 from public.variant_groups where id = v_group) then
    raise exception 'GROUP_UNKNOWN';
  end if;
  if v_group is not null and v_size is null then raise exception 'SIZE_LABEL_REQUIRED'; end if;
  if v_collection is not null and not exists (select 1 from public.main_collections where id = v_collection) then
    raise exception 'COLLECTION_UNKNOWN';
  end if;
  if v_seo_title is not null and length(v_seo_title) > 120 then raise exception 'SEO_TITLE_LONG'; end if;
  if v_seo_description is not null and length(v_seo_description) > 320 then raise exception 'SEO_DESCRIPTION_LONG'; end if;
  if jsonb_typeof(v_specs) <> 'object' then raise exception 'SPECIFICATIONS_INVALID'; end if;

  -- Where it appears.
  if p_category_ids is null or cardinality(p_category_ids) = 0 then raise exception 'NO_CATEGORY'; end if;
  if (select count(*) from public.categories where id = any(p_category_ids)) <> cardinality(array(select distinct unnest(p_category_ids))) then
    raise exception 'CATEGORY_UNKNOWN';
  end if;
  v_canonical := case when p_canonical_category_id = any(p_category_ids) then p_canonical_category_id else p_category_ids[1] end;

  if p_tier is not null and p_tier not in ('ELECTRIC', 'ROMA', 'STANDARD', 'EXCLUDED') then
    raise exception 'TIER_INVALID';
  end if;

  -- The colourways, all checked before anything is written.
  if p_variants is null or jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) = 0 then
    raise exception 'NO_COLOURWAYS';
  end if;
  for v_variant in select value from jsonb_array_elements(p_variants) loop
    v_index := v_index + 1;
    v_sku := btrim(coalesce(v_variant ->> 'sku', ''));
    if v_sku = '' then raise exception 'SKU_REQUIRED' using detail = v_index::text; end if;
    if v_sku = any(v_skus) then raise exception 'SKU_DUPLICATE' using detail = v_sku; end if;
    v_skus := v_skus || v_sku;
    if btrim(coalesce(v_variant ->> 'color', '')) = '' then raise exception 'COLOUR_NAME_REQUIRED' using detail = v_sku; end if;
    v_hex := nullif(btrim(coalesce(v_variant ->> 'color_hex', '')), '');
    if v_hex is not null and v_hex !~* '^#[0-9a-f]{6}$' then raise exception 'BAD_COLOUR' using detail = v_sku; end if;
    begin
      perform coalesce(nullif(v_variant ->> 'price_adjustment', ''), '0')::numeric;
    exception when others then
      raise exception 'PRICE_DIFFERENCE_INVALID' using detail = v_sku;
    end;
    if exists (
      select 1 from public.product_variants pv
       where pv.sku = v_sku
         and pv.id is distinct from nullif(v_variant ->> 'id', '')::uuid
    ) then
      raise exception 'SKU_TAKEN' using detail = v_sku;
    end if;
    if nullif(v_variant ->> 'id', '') is not null then
      if p_id is null or not exists (
        select 1 from public.product_variants where id = (v_variant ->> 'id')::uuid and product_id = p_id
      ) then
        raise exception 'VARIANT_UNKNOWN' using detail = v_sku;
      end if;
      v_keep := v_keep || (v_variant ->> 'id')::uuid;
    end if;
    if coalesce((v_variant ->> 'is_active')::boolean, true) then v_shown := v_shown + 1; end if;
  end loop;
  if v_active and v_shown = 0 then raise exception 'NO_SHOWN_COLOURWAYS'; end if;

  -- Write it all.
  if v_id is null then
    insert into public.products (
      title, slug, base_price, was_price, description, specifications, variant_group_id, size_label,
      subgroup_label, gallery_images, origin, custom_made, is_featured, is_active, main_collection_id,
      seo_title, seo_description, category_id
    ) values (
      v_title, v_slug, v_price, v_was, v_description, v_specs, v_group, case when v_group is null then null else v_size end,
      case when v_group is null then null else v_subgroup end, v_gallery, v_origin,
      coalesce((p_product ->> 'custom_made')::boolean, false), coalesce((p_product ->> 'is_featured')::boolean, false),
      v_active, v_collection, v_seo_title, v_seo_description, v_canonical
    )
    returning id into v_id;
  else
    update public.products set
      title = v_title, slug = v_slug, base_price = v_price, was_price = v_was, description = v_description,
      specifications = v_specs, variant_group_id = v_group,
      size_label = case when v_group is null then null else v_size end,
      subgroup_label = case when v_group is null then null else v_subgroup end,
      gallery_images = v_gallery, origin = v_origin,
      custom_made = coalesce((p_product ->> 'custom_made')::boolean, false),
      is_featured = coalesce((p_product ->> 'is_featured')::boolean, false),
      is_active = v_active, main_collection_id = v_collection,
      seo_title = v_seo_title, seo_description = v_seo_description, category_id = v_canonical
    where id = v_id;
    if not found then raise exception 'NOT_FOUND'; end if;
  end if;

  delete from public.product_categories where product_id = v_id and category_id <> all(p_category_ids);
  insert into public.product_categories (product_id, category_id)
  select v_id, c from (select distinct unnest(p_category_ids) as c) cats
   where not exists (select 1 from public.product_categories pc where pc.product_id = v_id and pc.category_id = cats.c);

  delete from public.offer_product_tiers where product_id = v_id;
  if p_tier is not null then
    insert into public.offer_product_tiers (product_id, tier) values (v_id, p_tier);
  end if;

  -- Colourways taken off the form: deleted, or hidden if ever ordered.
  for v_removed in
    select pv.id from public.product_variants pv where pv.product_id = v_id and pv.id <> all(v_keep)
  loop
    if exists (select 1 from public.order_items where variant_id = v_removed.id) then
      update public.product_variants set is_active = false where id = v_removed.id;
      v_hidden := v_hidden + 1;
    else
      delete from public.product_variants where id = v_removed.id;
      v_deleted := v_deleted + 1;
    end if;
  end loop;

  for v_variant in select value from jsonb_array_elements(p_variants) loop
    if nullif(v_variant ->> 'id', '') is not null then
      update public.product_variants set
        sku = btrim(v_variant ->> 'sku'),
        color = btrim(v_variant ->> 'color'),
        color_hex = nullif(btrim(coalesce(v_variant ->> 'color_hex', '')), ''),
        material = nullif(btrim(coalesce(v_variant ->> 'material', '')), ''),
        price_adjustment = coalesce(nullif(v_variant ->> 'price_adjustment', ''), '0')::numeric,
        image_url = nullif(btrim(coalesce(v_variant ->> 'image_url', '')), ''),
        is_active = coalesce((v_variant ->> 'is_active')::boolean, true),
        priority = coalesce(nullif(v_variant ->> 'priority', '')::integer, priority)
      where id = (v_variant ->> 'id')::uuid;
    else
      insert into public.product_variants (product_id, sku, color, color_hex, material, price_adjustment, image_url, is_active, priority)
      values (
        v_id, btrim(v_variant ->> 'sku'), btrim(v_variant ->> 'color'),
        nullif(btrim(coalesce(v_variant ->> 'color_hex', '')), ''),
        nullif(btrim(coalesce(v_variant ->> 'material', '')), ''),
        coalesce(nullif(v_variant ->> 'price_adjustment', ''), '0')::numeric,
        nullif(btrim(coalesce(v_variant ->> 'image_url', '')), ''),
        coalesce((v_variant ->> 'is_active')::boolean, true),
        coalesce(nullif(v_variant ->> 'priority', '')::integer, 99)
      );
    end if;
  end loop;

  return jsonb_build_object('id', v_id, 'hidden', v_hidden, 'deleted', v_deleted);
exception
  when unique_violation then
    raise exception 'SKU_TAKEN' using detail = coalesce(v_sku, '');
end;
$function$;

-- ── Deleting: refused while anything uses the item ───────────────────────
create or replace function private.delete_product(p_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_reviews integer;
begin
  perform private.require_admin();
  if not exists (select 1 from public.products where id = p_id) then raise exception 'NOT_FOUND'; end if;
  if exists (
    select 1 from public.order_items oi join public.product_variants pv on pv.id = oi.variant_id where pv.product_id = p_id
  ) then
    raise exception 'PRODUCT_ORDERED';
  end if;
  select count(*) into v_reviews from public.reviews where product_id = p_id;
  if v_reviews > 0 then raise exception 'PRODUCT_HAS_REVIEWS' using detail = v_reviews::text; end if;
  delete from public.products where id = p_id;
end;
$function$;

create or replace function private.delete_category(p_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_products integer;
  v_children integer;
begin
  perform private.require_admin();
  if not exists (select 1 from public.categories where id = p_id) then raise exception 'NOT_FOUND'; end if;
  select count(distinct p.id) into v_products
    from public.products p
   where p.category_id = p_id or exists (select 1 from public.product_categories pc where pc.product_id = p.id and pc.category_id = p_id);
  if v_products > 0 then raise exception 'IN_USE' using detail = v_products::text || ' product' || case when v_products = 1 then '' else 's' end; end if;
  select count(*) into v_children from public.categories where parent_id = p_id;
  if v_children > 0 then raise exception 'IN_USE' using detail = v_children::text || ' sub-categor' || case when v_children = 1 then 'y' else 'ies' end; end if;
  delete from public.categories where id = p_id;
end;
$function$;

create or replace function private.delete_variant_group(p_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_products integer;
begin
  perform private.require_admin();
  if not exists (select 1 from public.variant_groups where id = p_id) then raise exception 'NOT_FOUND'; end if;
  select count(*) into v_products from public.products where variant_group_id = p_id;
  if v_products > 0 then raise exception 'IN_USE' using detail = v_products::text || ' product' || case when v_products = 1 then '' else 's' end; end if;
  delete from public.variant_groups where id = p_id;
end;
$function$;

create or replace function private.delete_fabric(p_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_orders integer;
  v_samples integer;
begin
  perform private.require_admin();
  if not exists (select 1 from public.fabrics where id = p_id) then raise exception 'NOT_FOUND'; end if;
  select count(*) into v_orders from public.order_items where fabric_id = p_id;
  if v_orders > 0 then raise exception 'IN_USE' using detail = v_orders::text || ' order line' || case when v_orders = 1 then '' else 's' end; end if;
  select count(*) into v_samples from public.swatch_request_items where fabric_id = p_id;
  if v_samples > 0 then raise exception 'IN_USE' using detail = v_samples::text || ' sample request' || case when v_samples = 1 then '' else 's' end; end if;
  delete from public.fabrics where id = p_id;
end;
$function$;

create or replace function private.delete_fabric_collection(p_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_fabrics integer;
begin
  perform private.require_admin();
  if not exists (select 1 from public.fabric_collections where id = p_id) then raise exception 'NOT_FOUND'; end if;
  select count(*) into v_fabrics from public.fabrics where collection_id = p_id;
  if v_fabrics > 0 then raise exception 'IN_USE' using detail = v_fabrics::text || ' fabric' || case when v_fabrics = 1 then '' else 's' end; end if;
  delete from public.fabric_collections where id = p_id;
end;
$function$;

-- ── Grants and wrappers ──────────────────────────────────────────────────
revoke all on function private.categories_no_loop() from public, anon, authenticated;
revoke all on function private.save_product(uuid, jsonb, uuid[], uuid, text, jsonb) from public, anon, authenticated;
revoke all on function private.delete_product(uuid) from public, anon, authenticated;
revoke all on function private.delete_category(uuid) from public, anon, authenticated;
revoke all on function private.delete_variant_group(uuid) from public, anon, authenticated;
revoke all on function private.delete_fabric(uuid) from public, anon, authenticated;
revoke all on function private.delete_fabric_collection(uuid) from public, anon, authenticated;
grant execute on function private.save_product(uuid, jsonb, uuid[], uuid, text, jsonb) to authenticated;
grant execute on function private.delete_product(uuid) to authenticated;
grant execute on function private.delete_category(uuid) to authenticated;
grant execute on function private.delete_variant_group(uuid) to authenticated;
grant execute on function private.delete_fabric(uuid) to authenticated;
grant execute on function private.delete_fabric_collection(uuid) to authenticated;

create or replace function public.save_product(
  p_id uuid, p_product jsonb, p_category_ids uuid[], p_canonical_category_id uuid, p_tier text, p_variants jsonb
)
 returns jsonb language sql security invoker set search_path to ''
as $function$ select private.save_product(p_id, p_product, p_category_ids, p_canonical_category_id, p_tier, p_variants); $function$;

create or replace function public.delete_product(p_id uuid)
 returns void language sql security invoker set search_path to ''
as $function$ select private.delete_product(p_id); $function$;

create or replace function public.delete_category(p_id uuid)
 returns void language sql security invoker set search_path to ''
as $function$ select private.delete_category(p_id); $function$;

create or replace function public.delete_variant_group(p_id uuid)
 returns void language sql security invoker set search_path to ''
as $function$ select private.delete_variant_group(p_id); $function$;

create or replace function public.delete_fabric(p_id uuid)
 returns void language sql security invoker set search_path to ''
as $function$ select private.delete_fabric(p_id); $function$;

create or replace function public.delete_fabric_collection(p_id uuid)
 returns void language sql security invoker set search_path to ''
as $function$ select private.delete_fabric_collection(p_id); $function$;

revoke all on function public.save_product(uuid, jsonb, uuid[], uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.delete_product(uuid) from public, anon, authenticated;
revoke all on function public.delete_category(uuid) from public, anon, authenticated;
revoke all on function public.delete_variant_group(uuid) from public, anon, authenticated;
revoke all on function public.delete_fabric(uuid) from public, anon, authenticated;
revoke all on function public.delete_fabric_collection(uuid) from public, anon, authenticated;
grant execute on function public.save_product(uuid, jsonb, uuid[], uuid, text, jsonb) to authenticated;
grant execute on function public.delete_product(uuid) to authenticated;
grant execute on function public.delete_category(uuid) to authenticated;
grant execute on function public.delete_variant_group(uuid) to authenticated;
grant execute on function public.delete_fabric(uuid) to authenticated;
grant execute on function public.delete_fabric_collection(uuid) to authenticated;
