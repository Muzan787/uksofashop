-- Admin -> Journeys: daily trend, delivery-step outcomes and rollup freshness
-- (14 Nov 2026, Run 5).
--
-- The Journeys page failed to load because, on every request, it looked up
-- order associations through journey_session_funnel_v1, which aggregates all
-- 90 days of events before filtering: 9.3 s for a one-day selection, past the
-- API's 8 s timeout. This reads the 15-minute session rollup instead (the same
-- consented rows and stage definitions as Admin -> Website), so Journeys and
-- Website share one set of numbers.
--
-- Returns, for sessions that STARTED in the period (UK days):
--   days      one row per UK day: sessions and each stage, distinct sessions
--   outcomes  what happened to sessions that reached the delivery step
--   refresh   when the rollup was last refreshed and whether it succeeded
-- SECURITY DEFINER only to read cron's own run history; callable by
-- service_role only, and it checks admin / service_role itself as well.

create or replace function public.admin_journey_daily(
  p_from timestamptz,
  p_to timestamptz,
  p_device text default null,
  p_source text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not (coalesce(public.is_admin(), false) or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;
  if p_to <= p_from or p_to - p_from > interval '92 days' then
    raise exception 'BAD_RANGE' using errcode = '22023';
  end if;

  with so as (
    select r.*, coalesce(o.confirmed, false) as confirmed
    from public.journey_session_rollup r
    left join (
      select session_id, bool_or(confirmed_at is not null) as confirmed
      from public.orders where session_id is not null and is_test is not true
      group by session_id
    ) o on o.session_id = r.session_id
    where r.first_event_at >= p_from and r.first_event_at < p_to
      and (p_device is null or r.device = p_device)
      and (p_source is null or r.source = p_source)
  ),
  days as (
    select coalesce(jsonb_agg(d order by d.day), '[]'::jsonb) as rows from (
      select (first_event_at at time zone 'Europe/London')::date as day,
             count(*) as sessions,
             count(*) filter (where product) as product,
             count(*) filter (where added) as added,
             count(*) filter (where cart) as cart,
             count(*) filter (where delivery) as delivery,
             count(*) filter (where delivery and typed) as typed,
             count(*) filter (where delivery and place) as place,
             count(*) filter (where saved) as saved,
             count(*) filter (where whatsapp) as whatsapp,
             count(*) filter (where confirmed) as confirmed
      from so group by 1) d
  ),
  outcomes as (
    select jsonb_build_object(
      'reached_delivery', count(*) filter (where delivery),
      'placed_order', count(*) filter (where delivery and place),
      'switched_to_whatsapp', count(*) filter (where delivery and not place and whatsapp),
      'whatsapp_then_confirmed', count(*) filter (where delivery and not place and whatsapp and confirmed),
      'typed_then_stopped', count(*) filter (where delivery and not place and not whatsapp and typed),
      'left_untouched', count(*) filter (where delivery and not place and not whatsapp and not typed),
      'form_error', count(*) filter (where delivery and validation_error)
    ) as o from so
  ),
  refresh as (
    select jsonb_build_object('last_status', d.status, 'last_end', d.end_time) as r
    from cron.job j
    join lateral (
      select x.status, x.end_time from cron.job_run_details x
      where x.jobid = j.jobid order by x.start_time desc limit 1
    ) d on true
    where j.jobname = 'ukss-journey-rollup-refresh'
  )
  select jsonb_build_object(
    'days', days.rows,
    'outcomes', outcomes.o,
    'refresh', coalesce((select r from refresh), '{}'::jsonb)
  ) into v
  from days, outcomes;

  return v;
end;
$$;

revoke all on function public.admin_journey_daily(timestamptz, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.admin_journey_daily(timestamptz, timestamptz, text, text) to service_role;
