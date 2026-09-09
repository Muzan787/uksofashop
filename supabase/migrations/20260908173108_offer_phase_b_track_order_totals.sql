-- Offer Phase B — expose the authoritative financial breakdown through the
-- existing reference + postcode order-tracking boundary without exposing PII.
-- Reconciled from the production definition recorded under version 20260908173108.

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
    'fee_sofa_removal',   o.fee_sofa_removal,
    'order_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'quantity',                  oi.quantity,
        'price_at_time_of_purchase', oi.price_at_time_of_purchase,
        'product_variants', jsonb_build_object(
          'color',    pv.color,
          'products', jsonb_build_object('title', p.title)
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

-- Preserve the pre-existing public tracking boundary and make the intended ACL
-- explicit when rebuilding from migrations.
revoke execute on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated, service_role;
