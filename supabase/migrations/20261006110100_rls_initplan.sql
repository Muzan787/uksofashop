-- Evaluate auth.uid() and auth.jwt() once per query instead of once per row.
--
-- Inside an RLS policy, a bare `auth.uid()` is a volatile function call that
-- Postgres re-runs for every candidate row. Wrapping it in a scalar subquery
-- - `(select auth.uid())` - makes the planner treat it as an InitPlan:
-- evaluated once, then compared as a constant.
--
-- The eight policies below are every one the advisor flagged. Nothing about
-- who can see what changes; this is the same predicate, hoisted.
--
-- It matters most on `orders` and `order_items`, where the account page
-- scans every order looking for a matching email, and the comparison is a
-- JWT claim lookup rather than a cheap column read.

-- ── admins ──────────────────────────────────────────────────────────────
alter policy "self can check own admin row" on public.admins
  using ((select auth.uid()) = id);

-- ── orders ──────────────────────────────────────────────────────────────
alter policy "owner can view own orders" on public.orders
  using (((select auth.jwt()) ->> 'email') = customer_email);

alter policy "owner can view own order_items" on public.order_items
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and ((select auth.jwt()) ->> 'email') = o.customer_email
  ));

-- ── reviews ─────────────────────────────────────────────────────────────
alter policy "Users can insert their own reviews" on public.reviews
  with check ((select auth.uid()) = user_id);

alter policy "Users can view their own reviews regardless of approval" on public.reviews
  using ((select auth.uid()) = user_id);

-- ── wishlist ────────────────────────────────────────────────────────────
alter policy "Users can view their own wishlist" on public.wishlist
  using ((select auth.uid()) = user_id);

alter policy "Users can insert into their own wishlist" on public.wishlist
  with check ((select auth.uid()) = user_id);

alter policy "Users can delete from their own wishlist" on public.wishlist
  using ((select auth.uid()) = user_id);
