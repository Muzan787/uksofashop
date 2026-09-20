-- A delivery day on a manually entered (WhatsApp) order.
--
-- The website checkout has let the customer pick a day since
-- 20260918150000_preferred_delivery_date.sql; the admin form that records a
-- WhatsApp sale could not. It writes the same column. The rules are looser
-- than the website's four-day lead, because this is a day the shop itself
-- has already agreed in the chat: not in the past, and within a year.
--
-- Adding a defaulted parameter changes the signature, so the old function is
-- dropped first (two overloads differing only by a trailing default make
-- every call ambiguous) and its grants are re-applied. The body is otherwise
-- the production definition as of 2026-09-20.

begin;

drop function if exists public.place_manual_order(
  text, text, text, text, text, jsonb, numeric, text, text
);

create function public.place_manual_order(
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
    fabric_id, fabric_code, fabric_name, fabric_collection
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
         fc.name
  from (
    select (item->>'variant_id')::uuid as variant_id,
           nullif(item->>'fabric_id', '')::uuid as fabric_id,
           nullif(item->>'unit_price', '')::numeric as unit_price,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity
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

revoke execute on function public.place_manual_order(
  text, text, text, text, text, jsonb, numeric, text, text, date
) from public, anon;

grant execute on function public.place_manual_order(
  text, text, text, text, text, jsonb, numeric, text, text, date
) to authenticated, service_role;

comment on function public.place_manual_order(
  text, text, text, text, text, jsonb, numeric, text, text, date
) is
  'Records an order agreed on WhatsApp at the negotiated price. Refuses anyone who is not an admin. Lands as pending_cod like a website order.';

commit;
