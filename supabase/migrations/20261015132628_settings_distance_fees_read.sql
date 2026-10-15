-- Admin -> Settings shows the distance delivery fees (admin upgrade M1).
-- The table stays closed to the shop: the "service role only" policy is
-- untouched, and this only lets a signed-in admin read it. Changing a row
-- is still done by hand.
drop policy if exists "admins read distance fees" on public.delivery_distance_fees;
create policy "admins read distance fees" on public.delivery_distance_fees
  for select to authenticated using ((select private.is_admin()));
