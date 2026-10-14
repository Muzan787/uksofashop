-- Let the admin read checkout leads under its own session (plan §4, check 4).
--
-- checkout_recovery_leads, offer_entitlements and offer_product_tiers were
-- service-role only: no grant to `authenticated`, no policy. So the admin Home
-- page, the Leads page and the two Leads actions reached for the service-role
-- key to read and tick them off - which bypasses RLS, so the admin check in
-- front of it was the only thing between a mistake and every lead's phone
-- number. With these grants and policies the cookie-bound client does the
-- same work, and the database checks is_admin() on every row.
--
-- Least privilege: SELECT on all three, and UPDATE only on the three columns
-- the Leads actions write (done/waiting, and the reminder-email stamp). No
-- INSERT or DELETE: shoppers create leads through /api/checkout/recovery and
-- the cleanup cron removes them, both with the service role, unchanged.

grant select on public.checkout_recovery_leads to authenticated;
grant update (status, done_at, reminder_emailed_at) on public.checkout_recovery_leads to authenticated;

drop policy if exists "admin can view checkout recovery leads" on public.checkout_recovery_leads;
create policy "admin can view checkout recovery leads"
  on public.checkout_recovery_leads
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "admin can update checkout recovery leads" on public.checkout_recovery_leads;
create policy "admin can update checkout recovery leads"
  on public.checkout_recovery_leads
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- The Leads page shows whether each shopper's 48-hour offer is still running,
-- which needs their entitlement and their basket's offer tiers. Read only.
grant select on public.offer_entitlements to authenticated;
drop policy if exists "admin can view offer entitlements" on public.offer_entitlements;
create policy "admin can view offer entitlements"
  on public.offer_entitlements
  for select
  to authenticated
  using ((select public.is_admin()));

grant select on public.offer_product_tiers to authenticated;
drop policy if exists "admin can view offer product tiers" on public.offer_product_tiers;
create policy "admin can view offer product tiers"
  on public.offer_product_tiers
  for select
  to authenticated
  using ((select public.is_admin()));
