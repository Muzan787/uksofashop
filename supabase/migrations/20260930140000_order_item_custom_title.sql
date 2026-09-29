-- A name of our own on an order line.
--
-- Plenty of what goes out is built to order and does not exist in the
-- catalogue: a corner made to a room's measurements, a pair of chairs in a
-- customer's own fabric, a frame copied from a photo they sent. The WhatsApp
-- order form could only name such a piece by picking the nearest catalogue
-- sofa, so the order card, the invoice, the tracking page and the block Muaz
-- forwards all said "Verona 3 Seater Corner" for something that is not one.
--
-- So each line may carry a name typed when the order is taken. The variant is
-- still chosen - it is what prices the line, and what the active-product check
-- and every report read - but where a line has a custom_title, that is the
-- name every surface prints. Null on website orders, and on a WhatsApp order
-- for a catalogue sofa, where the product's own title is correct and must go
-- on being used.
--
-- A column rather than a note in special_instructions: it belongs to the line,
-- it follows the line when lines are added or removed, and a name is not an
-- instruction to the driver.
--
-- Four functions are replaced in place, all with their signatures unchanged,
-- so the grants on them stand:
--   place_manual_order    - stores it
--   update_order_details  - keeps it, and lets an edit change or clear it
--   order_for_confirmation, track_order - print it instead of p.title
-- The bodies are otherwise the production definitions as of 2026-09-30.

begin;

alter table public.order_items
  add column if not exists custom_title text;

comment on column public.order_items.custom_title is
  'A name typed when the order was taken, for something built to order that the catalogue does not name. Where it is set it replaces the product title on every surface. Null on website orders.';

-- place_manual_order ------------------------------------------------------

create or replace function public.place_manual_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_special_instructions text,
  p_items jsonb,
  p_delivery_charge numeric default 0,
  p_source text default 'whatsapp',
  p_whatsapp_reference text default null,
  p_preferred_delivery_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order_id uuid;
  v_bad_items text;
  v_bad_fabrics text;
  v_items_subtotal numeric;
  v_delivery numeric;
  v_total numeric;
  v_has_mto boolean;
  v_enquiry public.whatsapp_enquiries%rowtype;
  v_has_enquiry boolean := false;
  v_today date;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = 'insufficient_privilege';
  end if;

  if coalesce(p_source, '') <> 'whatsapp' then
    raise exception 'BAD_SOURCE: %', p_source using errcode = 'check_violation';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'check_violation';
  end if;

  -- The delivery day agreed in the chat, if one was. The admin knows the
  -- van, so the only rules are "not in the past" and "within a year" - the
  -- four-day lead the website imposes on customers does not apply to a date
  -- the shop itself has agreed.
  v_today := (now() at time zone 'Europe/London')::date;
  if p_preferred_delivery_date is not null then
    if p_preferred_delivery_date < v_today then
      raise exception 'DELIVERY_DATE_PAST: earliest is %', v_today using errcode = 'check_violation';
    end if;
    if p_preferred_delivery_date > v_today + 365 then
      raise exception 'DELIVERY_DATE_TOO_FAR: latest is %', v_today + 365 using errcode = 'check_violation';
    end if;
  end if;

  select string_agg(distinct coalesce(p.title, 'unknown item'), ', ')
  into v_bad_items
  from (
    select (item->>'variant_id')::uuid as variant_id
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.product_variants pv on pv.id = r.variant_id
  left join public.products p on p.id = pv.product_id
  where pv.id is null or coalesce(p.is_active, false) = false;

  if v_bad_items is not null then
    raise exception 'UNAVAILABLE_ITEMS: %', v_bad_items using errcode = 'check_violation';
  end if;

  select string_agg(distinct r.fabric_id::text, ', ')
  into v_bad_fabrics
  from (
    select nullif(item->>'fabric_id', '')::uuid as fabric_id
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.fabrics f on f.id = r.fabric_id
  where r.fabric_id is not null and (f.id is null or coalesce(f.is_active, true) = false);

  if v_bad_fabrics is not null then
    raise exception 'UNAVAILABLE_FABRIC: %', v_bad_fabrics using errcode = 'check_violation';
  end if;

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
    select (item->>'variant_id')::uuid as variant_id,
           nullif(item->>'fabric_id', '')::uuid as fabric_id,
           nullif(item->>'unit_price', '')::numeric as unit_price,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity
    from jsonb_array_elements(p_items) as item
  ) r
  join public.product_variants pv on pv.id = r.variant_id
  join public.products p on p.id = pv.product_id;

  v_delivery := round(least(greatest(coalesce(p_delivery_charge, 0), 0), 10000), 2);
  v_total := v_items_subtotal + v_delivery;

  if p_whatsapp_reference is not null and length(trim(p_whatsapp_reference)) > 0 then
    select * into v_enquiry
    from public.whatsapp_enquiries
    where reference = upper(trim(p_whatsapp_reference))
    limit 1;
    v_has_enquiry := found;
  end if;

  insert into public.orders (
    customer_name, customer_email, customer_phone, shipping_address,
    special_instructions, status, source,
    items_subtotal, delivery_floor, delivery_has_lift,
    fee_upstairs, wants_assembly, fee_assembly,
    wants_sofa_removal, fee_sofa_removal, delivery_total,
    total_amount, has_made_to_order,
    visitor_id, session_id, arrival_id,
    gclid, gbraid, wbraid, fbclid,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    ga_client_id, meta_fbp, meta_fbc,
    whatsapp_reference, preferred_delivery_date
  )
  values (
    p_customer_name, p_customer_email, p_customer_phone, p_shipping_address,
    p_special_instructions, 'pending_cod', p_source,
    v_items_subtotal, 0, false,
    0, false, 0,
    false, 0, v_delivery,
    v_total, coalesce(v_has_mto, false),
    case when v_has_enquiry then v_enquiry.visitor_id else null end,
    case when v_has_enquiry then v_enquiry.session_id else null end,
    case when v_has_enquiry then v_enquiry.arrival_id else null end,
    case when v_has_enquiry then v_enquiry.gclid else null end,
    case when v_has_enquiry then v_enquiry.gbraid else null end,
    case when v_has_enquiry then v_enquiry.wbraid else null end,
    case when v_has_enquiry then v_enquiry.fbclid else null end,
    case when v_has_enquiry then v_enquiry.utm_source else null end,
    case when v_has_enquiry then v_enquiry.utm_medium else null end,
    case when v_has_enquiry then v_enquiry.utm_campaign else null end,
    case when v_has_enquiry then v_enquiry.utm_content else null end,
    case when v_has_enquiry then v_enquiry.utm_term else null end,
    case when v_has_enquiry then v_enquiry.ga_client_id else null end,
    case when v_has_enquiry then v_enquiry.meta_fbp else null end,
    case when v_has_enquiry then v_enquiry.meta_fbc else null end,
    case when v_has_enquiry then v_enquiry.reference else nullif(upper(trim(coalesce(p_whatsapp_reference, ''))), '') end,
    p_preferred_delivery_date
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, variant_id, quantity, price_at_time_of_purchase,
    fabric_id, fabric_code, fabric_name, fabric_collection,
    custom_title
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
         fc.name,
         r.custom_title
  from (
    select (item->>'variant_id')::uuid as variant_id,
           nullif(item->>'fabric_id', '')::uuid as fabric_id,
           nullif(item->>'unit_price', '')::numeric as unit_price,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity,
           -- Trimmed and capped here as well as in the form: this function is
           -- reachable by any admin session, and the column has no length of
           -- its own.
           nullif(left(btrim(coalesce(item->>'custom_title', '')), 120), '') as custom_title
    from jsonb_array_elements(p_items) as item
  ) r
  join public.product_variants pv on pv.id = r.variant_id
  join public.products p on p.id = pv.product_id
  left join public.fabrics f on f.id = r.fabric_id
  left join public.fabric_collections fc on fc.id = f.collection_id;

  if v_has_enquiry then
    update public.whatsapp_enquiries
    set converted_order_id = v_order_id,
        converted_at = now()
    where id = v_enquiry.id;
  end if;

  return jsonb_build_object(
    'id', v_order_id,
    'items_subtotal', v_items_subtotal,
    'delivery_total', v_delivery,
    'total_amount', v_total,
    'preferred_delivery_date', p_preferred_delivery_date
  );
end;
$function$;

-- update_order_details ----------------------------------------------------

create or replace function public.update_order_details(
  p_order_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_special_instructions text,
  p_preferred_delivery_date date,
  p_delivery_total numeric,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order public.orders%rowtype;
  v_bad_items text;
  v_bad_fabrics text;
  v_items_subtotal numeric;
  v_has_mto boolean;
  v_delivery numeric;
  v_total numeric;
  v_delivery_changed boolean;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = 'insufficient_privilege';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'check_violation';
  end if;

  -- Every line must name a variant that exists. Inactive is allowed: a line
  -- already on the order may be a product since withdrawn, and correcting its
  -- quantity must not fail because of that.
  select string_agg(distinct r.variant_id::text, ', ')
  into v_bad_items
  from (
    select (item->>'variant_id')::uuid as variant_id
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.product_variants pv on pv.id = r.variant_id
  where pv.id is null;

  if v_bad_items is not null then
    raise exception 'UNAVAILABLE_ITEMS: %', v_bad_items using errcode = 'check_violation';
  end if;

  select string_agg(distinct r.fabric_id::text, ', ')
  into v_bad_fabrics
  from (
    select nullif(item->>'fabric_id', '')::uuid as fabric_id
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.fabrics f on f.id = r.fabric_id
  where r.fabric_id is not null and f.id is null;

  if v_bad_fabrics is not null then
    raise exception 'UNAVAILABLE_FABRIC: %', v_bad_fabrics using errcode = 'check_violation';
  end if;

  -- Keep the /build customisation, and the custom name, of any line that
  -- survives the edit. Lines are matched by their existing id, sent back as
  -- item_id.
  create temp table _kept_lines on commit drop as
    select id, customisation, custom_title from public.order_items where order_id = p_order_id;

  delete from public.order_items where order_id = p_order_id;

  insert into public.order_items (
    order_id, variant_id, quantity, price_at_time_of_purchase,
    fabric_id, fabric_code, fabric_name, fabric_collection,
    customisation, custom_title
  )
  select p_order_id,
         r.variant_id,
         r.quantity,
         r.unit_price,
         f.id,
         f.code,
         f.name,
         fc.name,
         k.customisation,
         -- A caller that sends the key decides the name, blank included, so
         -- an edit can clear one. A caller that leaves the key out keeps
         -- whatever the line already had.
         case when r.sets_title then r.custom_title else k.custom_title end
  from (
    select (item->>'variant_id')::uuid as variant_id,
           nullif(item->>'fabric_id', '')::uuid as fabric_id,
           nullif(item->>'item_id', '')::uuid as item_id,
           round(least(greatest(coalesce(nullif(item->>'unit_price', '')::numeric, 0), 0), 1000000), 2) as unit_price,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity,
           item ? 'custom_title' as sets_title,
           nullif(left(btrim(coalesce(item->>'custom_title', '')), 120), '') as custom_title
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.fabrics f on f.id = r.fabric_id
  left join public.fabric_collections fc on fc.id = f.collection_id
  left join _kept_lines k on k.id = r.item_id;

  select coalesce(sum(oi.price_at_time_of_purchase * oi.quantity), 0),
         coalesce(bool_or(oi.fabric_id is not null or oi.customisation is not null), false)
  into v_items_subtotal, v_has_mto
  from public.order_items oi
  where oi.order_id = p_order_id;

  v_delivery := round(least(greatest(coalesce(p_delivery_total, 0), 0), 10000), 2);
  v_delivery_changed := round(coalesce(v_order.delivery_total, 0), 2) is distinct from v_delivery;
  v_total := greatest(0, v_items_subtotal - coalesce(v_order.discount_amount, 0)) + v_delivery;

  update public.orders
  set customer_name = p_customer_name,
      customer_email = nullif(trim(coalesce(p_customer_email, '')), ''),
      customer_phone = p_customer_phone,
      shipping_address = p_shipping_address,
      special_instructions = coalesce(p_special_instructions, ''),
      preferred_delivery_date = p_preferred_delivery_date,
      items_subtotal = v_items_subtotal,
      delivery_total = v_delivery,
      total_amount = v_total,
      has_made_to_order = v_has_mto,
      delivery_floor = case when v_delivery_changed then 0 else delivery_floor end,
      delivery_has_lift = case when v_delivery_changed then false else delivery_has_lift end,
      fee_upstairs = case when v_delivery_changed then 0 else fee_upstairs end,
      wants_assembly = case when v_delivery_changed then false else wants_assembly end,
      fee_assembly = case when v_delivery_changed then 0 else fee_assembly end,
      wants_sofa_removal = case when v_delivery_changed then false else wants_sofa_removal end,
      sofa_removal_seats = case when v_delivery_changed then null else sofa_removal_seats end,
      fee_sofa_removal = case when v_delivery_changed then 0 else fee_sofa_removal end
  where id = p_order_id;

  return jsonb_build_object(
    'id', p_order_id,
    'items_subtotal', v_items_subtotal,
    'delivery_total', v_delivery,
    'total_amount', v_total
  );
end;
$function$;

-- order_for_confirmation --------------------------------------------------
-- The only change is the title: a custom name wins over the product's own.

create or replace function public.order_for_confirmation(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $function$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id',                      o.id,
    'status',                  o.status,
    'created_at',              o.created_at,
    'confirmed_at',            o.confirmed_at,
    'cancelled_at',            o.cancelled_at,
    'customer_name',           o.customer_name,
    'customer_email',          o.customer_email,
    'customer_phone',          o.customer_phone,
    'shipping_address',        o.shipping_address,
    'special_instructions',    o.special_instructions,
    'preferred_delivery_date', o.preferred_delivery_date,
    'has_made_to_order',       o.has_made_to_order,
    'total_amount',            o.total_amount,
    'items_subtotal',          o.items_subtotal,
    'discount_amount',         o.discount_amount,
    'discount_tier',           o.discount_tier,
    'promotion_code',          o.promotion_code,
    'delivery_total',          o.delivery_total,
    'delivery_floor',          o.delivery_floor,
    'delivery_has_lift',       o.delivery_has_lift,
    'fee_upstairs',            o.fee_upstairs,
    'wants_assembly',          o.wants_assembly,
    'fee_assembly',            o.fee_assembly,
    'wants_sofa_removal',      o.wants_sofa_removal,
    'sofa_removal_seats',      o.sofa_removal_seats,
    'fee_sofa_removal',        o.fee_sofa_removal,
    'order_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'quantity',                  oi.quantity,
        'price_at_time_of_purchase', oi.price_at_time_of_purchase,
        'fabric_code',               oi.fabric_code,
        'fabric_name',               oi.fabric_name,
        'fabric_collection',         oi.fabric_collection,
        'customisation',             oi.customisation,
        'color',                     pv.color,
        'title',                     coalesce(nullif(btrim(oi.custom_title), ''), p.title)
      ))
      from public.order_items oi
      join public.product_variants pv on pv.id = oi.variant_id
      join public.products p          on p.id  = pv.product_id
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.orders o
  where o.id = p_order_id;

  return v_result;
end;
$function$;

-- track_order -------------------------------------------------------------
-- The same change, for the page the customer checks progress on.

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
        'fabric_code',               oi.fabric_code,
        'fabric_name',               oi.fabric_name,
        'fabric_collection',         oi.fabric_collection,
        'product_variants', jsonb_build_object(
          'color',    pv.color,
          'products', jsonb_build_object(
            'title', coalesce(nullif(btrim(oi.custom_title), ''), p.title)
          )
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
