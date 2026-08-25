-- Lock down public order tracking.
--
-- Before this migration two SECURITY DEFINER functions were executable by the
-- `anon` role and could each be used to read other people's orders:
--
--   track_orders_by_postcode(p_nospace, p_spaced)
--     Matched `shipping_address ilike '%' || p_nospace || '%'` and returned
--     EVERY matching row. The only length check lived in the Next.js server
--     action, so a direct POST to /rest/v1/rpc/ with a single letter returned
--     the entire orders table: addresses, line items and totals.
--
--   track_order_by_shortcode(p_shortcode)
--     Returned an order, including its full shipping address, to anyone who
--     supplied 8 hex characters. Unreferenced by the application.
--
-- Both are replaced by a single function that requires the order reference AND
-- the delivery postcode, validates both itself, anchors the postcode to the end
-- of the address, returns at most one order, and returns only the fields the
-- tracking page renders (no name, email, phone or address).

-- (The migration runner wraps this file in a transaction.)

drop function if exists public.track_orders_by_postcode(text, text);
drop function if exists public.track_order_by_shortcode(text);

create or replace function public.track_order(
  p_reference text,
  p_postcode  text
)
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
  -- Order reference: exactly 8 hex characters, the leading block of the uuid.
  -- Validated here rather than only in the application, so a direct REST call
  -- is held to the same rule.
  v_ref := lower(regexp_replace(coalesce(p_reference, ''), '[^0-9a-fA-F]', '', 'g'));
  if v_ref !~ '^[0-9a-f]{8}$' then
    return null;
  end if;

  -- Postcode: strip everything that isn't alphanumeric so "bb6 7ls", "BB67LS"
  -- and "Bb6-7Ls" all normalise to the same value. Stripping also removes any
  -- LIKE metacharacters, so the value cannot alter the pattern below.
  --
  -- The length floor is the important part: an empty or one-character postcode
  -- would turn the LIKE into a wildcard and let the reference alone unlock the
  -- order, which is the hole this migration exists to close. Five is the
  -- shortest real UK postcode with spaces removed (e.g. M1 1AA -> M11AA).
  v_postcode := upper(regexp_replace(coalesce(p_postcode, ''), '[^a-zA-Z0-9]', '', 'g'));
  if length(v_postcode) < 5 or length(v_postcode) > 8 then
    return null;
  end if;

  -- Range scan on the primary key rather than a text comparison on id::text,
  -- so the lookup stays indexed.
  v_min := (v_ref || '-0000-0000-0000-000000000000')::uuid;
  v_max := (v_ref || '-ffff-ffff-ffff-ffffffffffff')::uuid;

  select jsonb_build_object(
    'id',           o.id,
    'status',       o.status,
    'created_at',   o.created_at,
    'total_amount', o.total_amount,
    'order_items',  coalesce((
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
    -- No trailing %, so the postcode must sit at the END of the address.
    -- A fragment cannot match a house number, street or town mid-string.
    and upper(regexp_replace(o.shipping_address, '[^a-zA-Z0-9]', '', 'g'))
        like '%' || v_postcode
  limit 1;

  -- Every failure path returns null and the caller shows one generic message,
  -- so the endpoint never reveals whether the reference or the postcode was
  -- the part that was wrong.
  return v_result;
end;
$function$;

comment on function public.track_order(text, text) is
  'Public order tracking. Requires both the 8-character order reference and the delivery postcode. Returns at most one order and only the fields the tracking page renders.';

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
