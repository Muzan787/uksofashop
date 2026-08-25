-- Admin RLS policies for public.reviews.
--
-- The reviews table had SELECT policies for "your own" and "approved", and an
-- INSERT policy, but no admin SELECT and no UPDATE or DELETE policy at all.
-- That gap is why the moderation screen and its two Server Actions reached for
-- SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely and - because those
-- actions never checked the caller - let anyone who could reach the action ID
-- approve or delete reviews on the storefront.
--
-- With these policies the ordinary cookie-bound client can moderate, so the
-- service-role key is removed from the application code.

-- Read every review, including other users' unapproved ones, for moderation.
drop policy if exists "admin can view all reviews" on public.reviews;
create policy "admin can view all reviews"
  on public.reviews
  for select
  to authenticated
  using (is_admin());

-- Approve / unapprove.
drop policy if exists "admin can update reviews" on public.reviews;
create policy "admin can update reviews"
  on public.reviews
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- Remove spam or abusive reviews.
drop policy if exists "admin can delete reviews" on public.reviews;
create policy "admin can delete reviews"
  on public.reviews
  for delete
  to authenticated
  using (is_admin());
