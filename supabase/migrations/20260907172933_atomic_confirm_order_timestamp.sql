-- Tracking V2.1: make the customer confirmation business timestamp atomic
-- with the existing pending_cod -> confirmed transition.
--
-- This intentionally preserves the existing function signature, return shape,
-- SECURITY DEFINER behavior, search_path, owner and grants. CREATE OR REPLACE on
-- the same signature keeps the existing EXECUTE privileges intact.
--
-- No historical rows are modified. Already-confirmed orders are returned exactly
-- as before and are not assigned a new timestamp by a repeated link visit.

create or replace function public.confirm_order(p_order_id uuid)
returns table(
  id uuid,
  status text,
  customer_name text,
  total_amount numeric,
  shipping_address text,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.orders o
  set
    status = 'confirmed',
    confirmed_at = coalesce(o.confirmed_at, now())
  where o.id = p_order_id
    and o.status = 'pending_cod';

  return query
  select
    o.id,
    o.status,
    o.customer_name,
    o.total_amount,
    o.shipping_address,
    o.created_at
  from public.orders o
  where o.id = p_order_id;
end;
$function$;
