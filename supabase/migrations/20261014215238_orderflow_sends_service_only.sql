-- orderflow.sends is written by push_order() and collect_answers() and read by
-- admin_status_snapshot(), all with owner rights. No one reads or writes it
-- through the API; this says so, as order_rules_wiring did for the other
-- server-only tables, and leaves the security advisor clean.
drop policy if exists "service role only" on orderflow.sends;
create policy "service role only"
  on orderflow.sends
  for all
  to anon, authenticated
  using (false)
  with check (false);
