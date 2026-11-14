-- Admin -> Business: OrderFlow send progress (14 Nov 2026, Run 5). Applied to
-- production as the migration "admin_orderflow_summary".
--
-- orderflow.sends is not reachable by the app's service role, so this
-- SECURITY DEFINER function reads it for the admin Business page and returns
-- only counts, order references (first 8 characters) and short refusal text.
-- Callable by service_role only; checks admin / service_role itself.
-- A "send" is one transmission attempt to OrderFlow. It is NOT a sale and NOT
-- a courier delivery. Orders are counted from the recording start (14 Oct
-- 2026); earlier sends carry no order id ("before_recording").
create or replace function public.admin_orderflow_summary(p_from timestamptz, p_to timestamptz)
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
  with s as (
    select * from orderflow.sends where sent_at >= p_from and sent_at < p_to
  ),
  since as (select min(sent_at) as at from orderflow.sends where order_id is not null),
  ro as (
    select o.id, o.status, o.created_at,
           (select bool_or(x.ok) from orderflow.sends x where x.order_id = o.id) as any_ok,
           (select x.ok from orderflow.sends x where x.order_id = o.id and x.answered_at is not null order by x.sent_at desc limit 1) as last_ok
    from public.orders o where o.is_test = false
  )
  select jsonb_build_object(
    'recording_since', (select at from since),
    'attempts', (select count(*) from s),
    'accepted', (select count(*) from s where ok),
    'refused', (select count(*) from s where ok = false),
    'unanswered', (select count(*) from s where answered_at is null and sent_at < now() - interval '15 minutes'),
    'orders_sent', (select count(distinct order_id) from s where order_id is not null),
    'last_accepted_at', (select max(answered_at) from orderflow.sends where ok),
    'by_source', (select coalesce(jsonb_agg(jsonb_build_object('source', source, 'attempts', n, 'accepted', a, 'refused', r) order by n desc), '[]'::jsonb)
                  from (select source, count(*) n, count(*) filter (where ok) a, count(*) filter (where ok = false) r from s group by source) q),
    'orders_since_recording', (select count(*) from ro where created_at >= (select at from since)),
    'orders_without_accepted_send', (select count(*) from ro where created_at >= (select at from since) and any_ok is not true and status <> 'cancelled'),
    'orders_latest_refused', (select count(*) from ro where last_ok = false and status <> 'cancelled'),
    'recent_refusals', (select coalesce(jsonb_agg(jsonb_build_object('at', r.sent_at, 'order_id', r.order_id, 'order_ref', upper(left(r.order_id::text, 8)), 'status_code', r.status_code, 'message', left(coalesce(r.message, r.error), 140), 'source', r.source) order by r.sent_at desc), '[]'::jsonb)
                        from (select * from s where ok = false order by sent_at desc limit 8) r)
  ) into v;
  return v;
end;
$$;
revoke all on function public.admin_orderflow_summary(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_orderflow_summary(timestamptz, timestamptz) to service_role;
