-- place_manual_order learns about leads.
--
-- Same job the WhatsApp reference already does: given a reference, find the
-- thing it names, copy its attribution onto the order, and mark it converted
-- so it cannot be claimed twice. The difference is where the attribution
-- lives. A whatsapp_enquiries row carries the click ids on itself. A
-- checkout_recovery_leads row carries only visitor_id/session_id/arrival_id,
-- and the click ids live in attribution_sessions - so the lead branch reads
-- them from there.
--
-- NOTE: the attribution lookup in the lead branch below takes `limit 1` with
-- no ordering, which is WRONG - attribution_sessions.session_id is not
-- unique. It is left here as applied, and corrected by the next-but-two
-- migration, 20261008202143_lead_attribution_pick_richest_session.sql, so
-- that replaying this folder in order reproduces the live function.
--
-- PRECEDENCE: an enquiry wins. If both references are given, the WhatsApp one
-- is the more specific evidence - it names a click on a known page at a known
-- time - and the lead is still marked converted so it leaves the open list.
--
-- UTM MAPPING: attribution_sessions stores first_touch_* and last_touch_*
-- where orders stores utm_*. Last touch is the one credited, because that is
-- the visit that produced the lead; first touch is the fallback for a session
-- that only ever had one.
--
-- The parameter is added LAST and defaulted, so every existing caller keeps
-- working unchanged. That creates an overload rather than a replacement; the
-- old ten-argument version is dropped in the next migration.

create or replace function public.place_manual_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_special_instructions text,
  p_items jsonb,
  p_delivery_charge numeric default 0,
  p_source text default 'whatsapp'::text,
  p_whatsapp_reference text default null::text,
  p_preferred_delivery_date date default null::date,
  p_lead_reference text default null::text
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
  v_lead public.checkout_recovery_leads%rowtype;
  v_has_lead boolean := false;
  v_attr public.attribution_sessions%rowtype;
  v_today date;
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
    select * into v_attr
    from public.attribution_sessions
    where session_id = v_lead.session_id
    limit 1;

    if not found and v_lead.visitor_id is not null then
      select * into v_attr
      from public.attribution_sessions
      where visitor_id = v_lead.visitor_id
      order by created_at desc
      limit 1;
    end if;

    if found then
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
         f.name,
         fc.name,
         r.custom_title
  from (
    select (item->>'variant_id')::uuid as variant_id,
           nullif(item->>'fabric_id', '')::uuid as fabric_id,
           nullif(item->>'unit_price', '')::numeric as unit_price,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity,
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
