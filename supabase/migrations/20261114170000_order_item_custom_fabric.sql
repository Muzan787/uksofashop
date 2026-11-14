-- A fabric typed by hand on an order line (Muaz, 2026-11-14).
--
-- An order taken on WhatsApp or the phone can be built in something the fabric
-- library does not hold - a leather, a supplier's own range. Until now the only
-- way to say so was the notes, or editing the row in the database (one line
-- already carries "Rust Leather" that way). This lets staff type it, beside the
-- library picker, just as a line can carry a custom product name.
--
-- No new column. A typed fabric is stored in order_items.fabric_name with
-- fabric_id, fabric_code and fabric_collection left empty. That is the column
-- every reader already prints - OrderFlow's payload, the customer's tracking
-- and confirmation pages, the receipt - so they all carry it without being
-- changed. The app reads "a fabric name with no library fabric" as a typed one
-- (src/utils/orderFinish.ts).
--
-- Each line in p_items may now carry "custom_fabric" (up to 120 characters).
-- It is used only when the line has no library fabric_id. In
-- update_order_details, as with custom_title, leaving the key out keeps the
-- line's typed fabric as it was, so an older caller cannot wipe it.
--
-- A line with a typed fabric is made to order, so it sets has_made_to_order
-- like a library fabric does.
--
-- Everything else in both functions is exactly as it was in production on
-- 2026-11-14 (read back with pg_get_functiondef before this was written).

create or replace function private.place_manual_order(p_customer_name text, p_customer_email text, p_customer_phone text, p_shipping_address text, p_special_instructions text, p_items jsonb, p_delivery_charge numeric DEFAULT 0, p_source text DEFAULT 'whatsapp'::text, p_whatsapp_reference text DEFAULT NULL::text, p_preferred_delivery_date date DEFAULT NULL::date, p_lead_reference text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_lead public.checkout_recovery_leads%rowtype;
  v_has_lead boolean := false;
  v_attr public.attribution_sessions%rowtype;
  v_today date;
  -- Attribution resolved from whichever source matched, so the INSERT below
  -- stays readable instead of carrying two nested cases per column.
  v_visitor_id uuid;
  v_session_id uuid;
  v_arrival_id uuid;
  v_gclid text;
  v_gbraid text;
  v_wbraid text;
  v_fbclid text;
  v_utm_source text;
  v_utm_medium text;
  v_utm_campaign text;
  v_utm_content text;
  v_utm_term text;
  v_ga_client_id text;
  v_meta_fbp text;
  v_meta_fbc text;
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
         bool_or(r.fabric_id is not null or r.custom_fabric is not null)
  into v_items_subtotal, v_has_mto
  from (
    select (item->>'variant_id')::uuid as variant_id,
           nullif(item->>'fabric_id', '')::uuid as fabric_id,
           nullif(item->>'unit_price', '')::numeric as unit_price,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity,
           nullif(left(btrim(coalesce(item->>'custom_fabric', '')), 120), '') as custom_fabric
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
      and converted_order_id is null
    limit 1 for update;
    v_has_enquiry := found;
  end if;

  if p_lead_reference is not null and length(trim(p_lead_reference)) > 0 then
    select * into v_lead
    from public.checkout_recovery_leads
    where reference = upper(trim(p_lead_reference))
      and converted_order_id is null
    limit 1 for update;
    v_has_lead := found;
  end if;

  if v_has_enquiry then
    v_visitor_id   := v_enquiry.visitor_id;
    v_session_id   := v_enquiry.session_id;
    v_arrival_id   := v_enquiry.arrival_id;
    v_gclid        := v_enquiry.gclid;
    v_gbraid       := v_enquiry.gbraid;
    v_wbraid       := v_enquiry.wbraid;
    v_fbclid       := v_enquiry.fbclid;
    v_utm_source   := v_enquiry.utm_source;
    v_utm_medium   := v_enquiry.utm_medium;
    v_utm_campaign := v_enquiry.utm_campaign;
    v_utm_content  := v_enquiry.utm_content;
    v_utm_term     := v_enquiry.utm_term;
    v_ga_client_id := v_enquiry.ga_client_id;
    v_meta_fbp     := v_enquiry.meta_fbp;
    v_meta_fbc     := v_enquiry.meta_fbc;

  elsif v_has_lead then
    v_visitor_id := v_lead.visitor_id;
    v_session_id := v_lead.session_id;
    v_arrival_id := v_lead.arrival_id;

    -- The click ids are not on the lead. Prefer the session the lead was
    -- captured in; fall back to that visitor's most recent session, because a
    -- shopper who came back on a later visit before opting in still arrived
    -- from somewhere worth crediting.
    v_attr := public.lead_attribution_session(v_lead.session_id, v_lead.visitor_id);

    if v_attr.id is not null then
      v_gclid        := v_attr.gclid;
      v_gbraid       := v_attr.gbraid;
      v_wbraid       := v_attr.wbraid;
      v_fbclid       := v_attr.fbclid;
      v_utm_source   := coalesce(v_attr.last_touch_source,   v_attr.first_touch_source);
      v_utm_medium   := coalesce(v_attr.last_touch_medium,   v_attr.first_touch_medium);
      v_utm_campaign := coalesce(v_attr.last_touch_campaign, v_attr.first_touch_campaign);
      v_utm_content  := coalesce(v_attr.last_touch_content,  v_attr.first_touch_content);
      v_utm_term     := coalesce(v_attr.last_touch_term,     v_attr.first_touch_term);
      v_ga_client_id := v_attr.ga_client_id;
      v_meta_fbp     := v_attr.meta_fbp;
      v_meta_fbc     := v_attr.meta_fbc;
    end if;
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
    v_visitor_id, v_session_id, v_arrival_id,
    v_gclid, v_gbraid, v_wbraid, v_fbclid,
    v_utm_source, v_utm_medium, v_utm_campaign, v_utm_content, v_utm_term,
    v_ga_client_id, v_meta_fbp, v_meta_fbc,
    case when v_has_enquiry then v_enquiry.reference
         else nullif(upper(trim(coalesce(p_whatsapp_reference, ''))), '') end,
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
         -- A library fabric names itself; otherwise the one typed, if any.
         case when f.id is not null then f.name else r.custom_fabric end,
         fc.name,
         r.custom_title
  from (
    select (item->>'variant_id')::uuid as variant_id,
           nullif(item->>'fabric_id', '')::uuid as fabric_id,
           nullif(item->>'unit_price', '')::numeric as unit_price,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity,
           nullif(left(btrim(coalesce(item->>'custom_title', '')), 120), '') as custom_title,
           nullif(left(btrim(coalesce(item->>'custom_fabric', '')), 120), '') as custom_fabric
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

  if v_has_lead then
    update public.checkout_recovery_leads
    set converted_order_id = v_order_id,
        status = 'converted',
        updated_at = now()
    where id = v_lead.id;
  end if;

  return jsonb_build_object(
    'id', v_order_id,
    'items_subtotal', v_items_subtotal,
    'delivery_total', v_delivery,
    'total_amount', v_total,
    'preferred_delivery_date', p_preferred_delivery_date,
    'linked_lead', v_has_lead,
    'linked_whatsapp', v_has_enquiry
  );
end;
$function$;

create or replace function private.update_order_details(p_order_id uuid, p_customer_name text, p_customer_email text, p_customer_phone text, p_shipping_address text, p_special_instructions text, p_preferred_delivery_date date, p_delivery_total numeric, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  create temp table _kept_lines on commit drop as
    select id, customisation, custom_title, fabric_id, fabric_name from public.order_items where order_id = p_order_id;

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
         -- A library fabric names itself. Otherwise the fabric typed now, or,
         -- when the caller did not send one, the fabric typed before.
         case
           when f.id is not null then f.name
           when r.sets_fabric then r.custom_fabric
           when k.fabric_id is null then k.fabric_name
         end,
         fc.name,
         k.customisation,
         case when r.sets_title then r.custom_title else k.custom_title end
  from (
    select (item->>'variant_id')::uuid as variant_id,
           nullif(item->>'fabric_id', '')::uuid as fabric_id,
           nullif(item->>'item_id', '')::uuid as item_id,
           round(least(greatest(coalesce(nullif(item->>'unit_price', '')::numeric, 0), 0), 1000000), 2) as unit_price,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity,
           item ? 'custom_title' as sets_title,
           nullif(left(btrim(coalesce(item->>'custom_title', '')), 120), '') as custom_title,
           item ? 'custom_fabric' as sets_fabric,
           nullif(left(btrim(coalesce(item->>'custom_fabric', '')), 120), '') as custom_fabric
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.fabrics f on f.id = r.fabric_id
  left join public.fabric_collections fc on fc.id = f.collection_id
  left join _kept_lines k on k.id = r.item_id;

  select coalesce(sum(oi.price_at_time_of_purchase * oi.quantity), 0),
         coalesce(bool_or(oi.fabric_id is not null or oi.fabric_name is not null or (oi.customisation is not null and coalesce(oi.customisation->>'kind', '') <> 'options')), false)
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
