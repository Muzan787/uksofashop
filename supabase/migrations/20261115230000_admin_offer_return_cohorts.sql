-- Admin -> Website: "Returning after the offer" (Run 9, read-only).
-- Mature cohorts only: visitors whose FIRST offer window started on or after
-- 12 Oct 2026 and at least 14 days ago. A "return" is a new first-party
-- attribution session for the SAME visitor id (same browser) - no cross-device
-- matching, no WhatsApp identity inference, and only sessions the consented
-- tracker recorded. Historical windows were 48/72/96 hours long, so these are
-- elapsed-day patterns, not results of a 7-day offer. Orders are matched by the
-- same visitor id and exclude test orders. Counts only; no identities leave.
create or replace function public.admin_offer_return_cohorts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v jsonb;
begin
  if not (coalesce(public.is_admin(), false) or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;
  with c as (
    select visitor_id, min(started_at) as opened,
           bool_or(source in ('meta_ads', 'google_ads', 'meta_catalog')) as paid
      from public.offer_entitlements
     where started_at >= '2026-10-12' and started_at < now() - interval '14 days'
     group by visitor_id
  ), s as (
    select c.visitor_id, c.paid,
      exists (select 1 from public.attribution_sessions a where a.visitor_id = c.visitor_id and a.created_at >= c.opened + interval '4 days') as r4,
      exists (select 1 from public.attribution_sessions a where a.visitor_id = c.visitor_id and a.created_at >= c.opened + interval '4 days' and a.created_at < c.opened + interval '5 days') as d4to5,
      exists (select 1 from public.attribution_sessions a where a.visitor_id = c.visitor_id and a.created_at >= c.opened + interval '5 days' and a.created_at < c.opened + interval '7 days') as d5to7,
      exists (select 1 from public.attribution_sessions a where a.visitor_id = c.visitor_id and a.created_at >= c.opened + interval '7 days') as r7,
      exists (select 1 from public.orders o where o.visitor_id = c.visitor_id and coalesce(o.is_test, false) = false and o.created_at >= c.opened + interval '4 days') as order4,
      exists (select 1 from public.orders o where o.visitor_id = c.visitor_id and coalesce(o.is_test, false) = false and o.created_at >= c.opened + interval '5 days' and o.created_at < c.opened + interval '7 days') as order5to7,
      exists (select 1 from public.orders o where o.visitor_id = c.visitor_id and coalesce(o.is_test, false) = false) as any_order
    from c
  ), g as (
    select case when paid then 'ad' else 'other' end as origin, count(*) as visitors,
           count(*) filter (where r4) as returned_after_day4,
           count(*) filter (where d4to5) as returned_day4to5,
           count(*) filter (where d5to7) as returned_day5to7,
           count(*) filter (where r7) as returned_after_day7,
           count(*) filter (where order4) as orders_after_day4,
           count(*) filter (where order5to7) as orders_day5to7,
           count(*) filter (where any_order) as any_order
      from s group by 1
  )
  select jsonb_build_object(
    'computed_at', now(),
    'cohort_from', '2026-10-12',
    'cohort_to', now() - interval '14 days',
    'rows', coalesce((select jsonb_agg(to_jsonb(g) order by g.origin) from g), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;
revoke all on function public.admin_offer_return_cohorts() from public, anon, authenticated;
grant execute on function public.admin_offer_return_cohorts() to service_role;
