-- The fabric library, and the free-swatch service that goes with it.
--
-- WHY THIS IS NOT product_variants
--
-- A variant is a photographed, priced, stocked SKU of one product. A fabric is
-- a choice offered across every made-to-order frame we sell. Modelling the
-- fabric range as variants would mean 14 Verona frames x 69 fabrics = 966 rows,
-- each carrying a SKU and a stock_quantity that means nothing for something we
-- build to order, and it would multiply again with every frame we add.
--
-- So the two live side by side and answer different questions:
--
--   product_variants  "we have a photograph of this sofa in this fabric"
--   fabrics           "you can order this sofa in this fabric"
--
-- The variants are a small photographed subset of the library. The product page
-- shows them as the swatch row (picking one changes the picture), with the rest
-- of the library behind a "see all fabrics" dialog (picking one sets the order
-- spec, and the gallery honestly keeps showing the fabric it was shot in).
--
-- WHY WE DO NOT DISPLAY THE SUPPLIER'S OWN NAMES
--
-- R&S name their products three different ways across the six collections we
-- buy - "CH01 Chenille Cream", "Crushed Velvet CV01 White", "PVC 01 White" -
-- and inconsistently within a collection ("PL08 Plush Soft Velvet Torqouise"
-- next to "PL09 Soft Plush Velvet Blue"). Their catalogue also carries at least
-- two spelling mistakes, "Torqouise" and "Mocca". So we keep their title
-- verbatim in supplier_title as the buying reference, and show a colour name we
-- control. Their code is the durable key: it is what goes on a purchase order
-- and on the swatch picking list.
--
-- Codes are stored, never generated. CV02, CV03, CV12 and PL04 do not exist -
-- they are discontinued lines - so the sequence has holes in it.


-- ─────────────────────────────────────────────────────────────────────────────
--  COLLECTIONS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fabric_collections (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  description     text,
  supplier        text not null default 'R&S Components',
  -- Stored, never derived from the name. Their handles do not match their
  -- titles: Marble Fabric lives at /collections/fabrics, Plush Soft Velvet at
  -- /collections/velvet-fabric, Semi PU at /collections/leather-fabric.
  supplier_handle text,
  sort            integer not null default 99,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

comment on column public.fabric_collections.supplier_handle is
  'The supplier''s own URL handle. Stored rather than derived - their handles do not match their collection names.';


-- ─────────────────────────────────────────────────────────────────────────────
--  FABRICS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fabrics (
  id             uuid primary key default gen_random_uuid(),
  collection_id  uuid not null references public.fabric_collections(id) on delete cascade,
  code           text not null,
  -- Ours, shown to customers. "Turquoise", not "PL08 Plush Soft Velvet Torqouise".
  name           text not null,
  -- Theirs, verbatim, for purchase orders and for matching their catalogue.
  supplier_title text,
  -- An approximation, only ever used as a fallback tile before the swatch
  -- photograph loads. The photograph is the truth, and the posted sample is the
  -- only thing a customer should judge a colour by.
  hex            text,
  image_url      text,
  sort           integer not null default 99,
  is_active      boolean not null default true,
  is_swatchable  boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (collection_id, code)
);

comment on column public.fabrics.hex is
  'Approximate, for the placeholder tile only. Never presented as the true colour - that is what the free sample is for.';

create index if not exists fabrics_collection_sort_idx
  on public.fabrics (collection_id, sort, code);


-- ─────────────────────────────────────────────────────────────────────────────
--  RLS - the same shape as products and product_variants
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.fabric_collections enable row level security;
alter table public.fabrics            enable row level security;

drop policy if exists "public read fabric_collections" on public.fabric_collections;
create policy "public read fabric_collections"
  on public.fabric_collections for select to public using (true);

drop policy if exists "admin write fabric_collections" on public.fabric_collections;
create policy "admin write fabric_collections"
  on public.fabric_collections for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "public read fabrics" on public.fabrics;
create policy "public read fabrics"
  on public.fabrics for select to public using (true);

drop policy if exists "admin write fabrics" on public.fabrics;
create policy "admin write fabrics"
  on public.fabrics for all to authenticated
  using (is_admin()) with check (is_admin());


-- ─────────────────────────────────────────────────────────────────────────────
--  THE CHOICE, CARRIED ONTO THE ORDER
-- ─────────────────────────────────────────────────────────────────────────────
--
-- fabric_id plus a frozen copy of what it was called. The reference is for
-- joining while the fabric still exists; the snapshot is so an order placed
-- today still reads correctly in two years, after R&S have discontinued the
-- line and the row has been deactivated or deleted.

alter table public.order_items
  add column if not exists fabric_id       uuid references public.fabrics(id) on delete set null,
  add column if not exists fabric_code     text,
  add column if not exists fabric_name     text,
  add column if not exists fabric_collection text;

comment on column public.order_items.fabric_code is
  'Frozen at the moment of ordering. The supplier code to put on the purchase order, even if the fabric is later withdrawn.';

-- Which orders need the confirmation call.
--
-- Deliberately a flag rather than a new order status. The status machine
-- (pending_cod -> confirmed -> processing -> shipped -> delivered) is wired
-- into the admin list, the dashboard counts, the account page, the customer's
-- own confirm-by-email link and the conversion reporting. Adding a sixth state
-- to all of that to express "ring this customer" would be a lot of moving parts
-- for a badge. Fabric does not change the price, so nothing about the money
-- needs to wait for the call either.
alter table public.orders
  add column if not exists has_made_to_order boolean not null default false;

comment on column public.orders.has_made_to_order is
  'True when the basket contained a made-to-order product. Drives the "needs a fabric call" badge in the admin order list.';


-- ─────────────────────────────────────────────────────────────────────────────
--  place_order, extended
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Same signature, so the existing grants and the calling server action are
-- untouched. The only change is that each element of p_items may now carry an
-- optional "fabric_id", which is validated, recorded, and snapshotted.
--
-- Pricing is deliberately NOT touched: every fabric costs the same, so the
-- customer's choice cannot alter the total. That also means an order can be
-- taken and reported as revenue before the fabric call happens.
--
-- fabric_id is optional for now. It becomes required for custom_made products
-- in a follow-up migration, once the product page that sends it has shipped -
-- tightening it first would reject every made-to-order sale in the window
-- between this migration running and that deploy going out.

create or replace function public.place_order(
  p_customer_name        text,
  p_customer_email       text,
  p_customer_phone       text,
  p_shipping_address     text,
  p_special_instructions text,
  p_items                jsonb,
  p_expected_total       numeric,
  p_delivery_floor       integer default 0,
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
  v_bad_fabrics    text;
  v_items_subtotal numeric;
  v_has_mto        boolean;
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

  -- A fabric that has been withdrawn since the basket was filled.
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

  select coalesce(sum((p.base_price + coalesce(pv.price_adjustment, 0)) * r.quantity), 0),
         coalesce(bool_or(coalesce(p.custom_made, false)), false)
  into v_items_subtotal, v_has_mto
  from (
    select (item->>'variant_id')::uuid                                  as variant_id,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity
    from jsonb_array_elements(p_items) as item
  ) r
  join public.product_variants pv on pv.id = r.variant_id
  join public.products p          on p.id  = pv.product_id;

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
    total_amount, has_made_to_order
  )
  values (
    p_customer_name, p_customer_email, p_customer_phone, p_shipping_address,
    p_special_instructions, 'pending_cod',
    v_items_subtotal, v_floor, coalesce(p_delivery_has_lift, false),
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
    select (item->>'variant_id')::uuid                                  as variant_id,
           nullif(item->>'fabric_id', '')::uuid                          as fabric_id,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity
    from jsonb_array_elements(p_items) as item
  ) r
  join public.product_variants pv       on pv.id = r.variant_id
  join public.products p                on p.id  = pv.product_id
  left join public.fabrics f            on f.id  = r.fabric_id
  left join public.fabric_collections fc on fc.id = f.collection_id;

  return jsonb_build_object(
    'id',             v_order_id,
    'items_subtotal', v_items_subtotal,
    'delivery_total', v_delivery,
    'total_amount',   v_total
  );
end;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
--  FREE SWATCHES
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Three samples, posted free anywhere on the UK mainland. No automatic abuse
-- cap: every request gets a phone call before anything is posted, so a human
-- sees each one. The IP and user agent are recorded anyway - they cost nothing
-- and are the only evidence available if this ever does start being farmed.

create table if not exists public.swatch_requests (
  id                  uuid primary key default gen_random_uuid(),
  customer_name       text not null,
  customer_email      text not null,
  customer_phone      text,
  postcode            text not null,
  shipping_address    text not null,
  status              text not null default 'pending'
                      check (status in ('pending', 'posted', 'cancelled')),
  created_at          timestamptz not null default now(),
  posted_at           timestamptz,
  customer_ip         text,
  customer_user_agent text
);

create index if not exists swatch_requests_status_idx
  on public.swatch_requests (status, created_at desc);

create table if not exists public.swatch_request_items (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid not null references public.swatch_requests(id) on delete cascade,
  fabric_id         uuid references public.fabrics(id) on delete set null,
  -- Snapshotted for the same reason as on order_items: the picking list has to
  -- stay readable after a line is withdrawn.
  fabric_code       text not null,
  fabric_name       text not null,
  fabric_collection text not null,
  unique (request_id, fabric_code)
);

-- Three, enforced where it cannot be talked out of. A constraint trigger rather
-- than a check, because the rule is about the number of sibling rows and a
-- check constraint can only see the row in front of it.
create or replace function public.enforce_swatch_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if (select count(*) from public.swatch_request_items
      where request_id = new.request_id) > 3 then
    raise exception 'SWATCH_LIMIT: at most 3 swatches per request'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;

drop trigger if exists swatch_limit on public.swatch_request_items;
create constraint trigger swatch_limit
  after insert on public.swatch_request_items
  deferrable initially immediate
  for each row execute function public.enforce_swatch_limit();

alter table public.swatch_requests      enable row level security;
alter table public.swatch_request_items enable row level security;

-- No public insert policy, exactly as orders has none: rows arrive only through
-- request_swatches() below, so the three-swatch rule and the name snapshots
-- cannot be bypassed by posting straight at the REST API.
drop policy if exists "admin can view swatch_requests" on public.swatch_requests;
create policy "admin can view swatch_requests"
  on public.swatch_requests for select to authenticated using (is_admin());

drop policy if exists "admin can update swatch_requests" on public.swatch_requests;
create policy "admin can update swatch_requests"
  on public.swatch_requests for update to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "admin can view swatch_request_items" on public.swatch_request_items;
create policy "admin can view swatch_request_items"
  on public.swatch_request_items for select to authenticated using (is_admin());


-- One call, one request, with the fabric names frozen into it.
create or replace function public.request_swatches(
  p_customer_name    text,
  p_customer_email   text,
  p_customer_phone   text,
  p_postcode         text,
  p_shipping_address text,
  p_fabric_ids       uuid[],
  p_ip               text default null,
  p_user_agent       text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id      uuid;
  v_ids     uuid[];
  v_found   int;
begin
  -- Duplicates collapse rather than counting towards the three.
  select array_agg(distinct x) into v_ids from unnest(coalesce(p_fabric_ids, '{}'::uuid[])) as x;

  if v_ids is null or array_length(v_ids, 1) is null then
    raise exception 'NO_SWATCHES' using errcode = 'check_violation';
  end if;

  if array_length(v_ids, 1) > 3 then
    raise exception 'SWATCH_LIMIT: at most 3 swatches per request' using errcode = 'check_violation';
  end if;

  select count(*) into v_found
  from public.fabrics f
  where f.id = any(v_ids) and f.is_active and f.is_swatchable;

  if v_found <> array_length(v_ids, 1) then
    raise exception 'UNAVAILABLE_FABRIC' using errcode = 'check_violation';
  end if;

  insert into public.swatch_requests (
    customer_name, customer_email, customer_phone,
    postcode, shipping_address, customer_ip, customer_user_agent
  )
  values (
    p_customer_name, p_customer_email, p_customer_phone,
    upper(trim(p_postcode)), p_shipping_address, p_ip, p_user_agent
  )
  returning id into v_id;

  insert into public.swatch_request_items (
    request_id, fabric_id, fabric_code, fabric_name, fabric_collection
  )
  select v_id, f.id, f.code, f.name, fc.name
  from public.fabrics f
  join public.fabric_collections fc on fc.id = f.collection_id
  where f.id = any(v_ids);

  return jsonb_build_object('id', v_id);
end;
$function$;

revoke all on function public.request_swatches(text, text, text, text, text, uuid[], text, text) from public;
grant execute on function public.request_swatches(text, text, text, text, text, uuid[], text, text) to anon, authenticated;
