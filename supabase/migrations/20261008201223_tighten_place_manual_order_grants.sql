-- Recreating the function reset its grants to the default, which is EXECUTE
-- to PUBLIC - and Supabase exposes every public function as an RPC endpoint,
-- so that put a SECURITY DEFINER order-writing function on the anon role.
--
-- It is guarded (`if not public.is_admin() then raise`), so this was never
-- exploitable, but it is needless surface and the security advisor flags it
-- correctly. Matched to update_order_details, which is the same shape of
-- function and is already restricted this way.
revoke execute on function public.place_manual_order(
  text, text, text, text, text, jsonb, numeric, text, text, date, text
) from public, anon;
