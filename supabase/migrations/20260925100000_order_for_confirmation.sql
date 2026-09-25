-- Reading an order for the confirmation page, without confirming it.
--
-- /confirm-order/[id] used to call confirm_order on GET, so the order was
-- confirmed by the act of opening the link. That is wrong twice over.
--
-- Muaz's brief (2026-09-25): the link should show the customer everything on
-- the order first and confirm only when they press a button. And the same
-- argument that governs newsletter double opt-in applies here (see
-- actions/newsletter-confirm.ts) - mail providers and security appliances
-- pre-fetch every link in a message, so a GET that confirms is a confirmation
-- given by a scanner rather than by the customer.
--
-- So the reading and the writing are now two functions. This one only reads.
-- confirm_order is unchanged and is called from the button's server action.
--
-- The full order uuid is the access token, exactly as it is for confirm_order:
-- 122 unguessable bits, sent only to the customer's own email and WhatsApp.
-- Somebody holding it is the customer, so this returns what the customer needs
-- in order to check the order is right - including the phone number the shop
-- will ring and the day they asked for. Nothing about attribution, the
-- advertising identifiers or the internal timestamps is exposed.
--
-- Returns null for an id that matches nothing, which the page turns into a 404.

begin;

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
        'title',                     p.title
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

revoke execute on function public.order_for_confirmation(uuid) from public;

grant execute on function public.order_for_confirmation(uuid) to anon, authenticated, service_role;

comment on function public.order_for_confirmation(uuid) is
  'Read an order for /confirm-order/[id]. The full uuid is the access token. Reads only - confirm_order does the writing.';

commit;
