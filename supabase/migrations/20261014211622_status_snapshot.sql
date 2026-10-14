-- One call that collects everything the Status page needs (admin upgrade P2).
--
-- admin_status_snapshot() returns facts, not verdicts: counts, last times and
-- the latest failures, read from across the database. Whether each fact means
-- green, amber or red is decided in one pure, tested TypeScript function
-- (src/utils/health/checks.ts), which the Status page, the Home health card
-- and (Phase 4) the hourly alert all share - so they can never disagree.
--
-- Owner rights, in the private schema behind a public wrapper: it reads
-- tables admins cannot (cron, Vault names, orderflow.sends, the migrations
-- list). It refuses anyone who is not an admin, except the service role,
-- which the hourly check will use. It never returns a secret's value - only
-- whether the OrderFlow address and key exist.

grant usage on schema private to service_role;

create or replace function private.admin_status_snapshot()
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v jsonb;
begin
  if not (coalesce(public.is_admin(), false) or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),

    'database', (
      select jsonb_build_object(
        'migrations', count(*),
        'latest_version', max(m.version),
        'latest_name', (select m2.name from supabase_migrations.schema_migrations m2 order by m2.version desc limit 1))
      from supabase_migrations.schema_migrations m),

    'catalogue', jsonb_build_object(
      'on_sale', (select count(*) from public.products p where p.is_active)),

    'orders', (
      select jsonb_build_object(
        'real', count(*) filter (where coalesce(o.utm_campaign, '') <> 'offer-test'),
        'test', count(*) filter (where o.utm_campaign = 'offer-test'),
        'waiting', count(*) filter (where o.status = 'pending_cod' and coalesce(o.utm_campaign, '') <> 'offer-test'),
        'latest_at', max(o.created_at))
      from public.orders o),

    'email', (
      select jsonb_build_object(
        'logged', count(*),
        'sent_24h', count(*) filter (where e.status = 'sent' and e.created_at > now() - interval '24 hours'),
        'failed_24h', count(*) filter (where e.status = 'failed' and e.created_at > now() - interval '24 hours'),
        'skipped_24h', count(*) filter (where e.status = 'skipped' and e.created_at > now() - interval '24 hours'),
        'last_sent_at', max(e.created_at) filter (where e.status = 'sent'),
        'last_failure', (
          select jsonb_build_object('at', f.created_at, 'kind', f.kind, 'error', left(f.error, 200))
            from public.email_log f where f.status = 'failed' order by f.created_at desc limit 1))
      from public.email_log e),

    'jobs', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'job', j.job, 'started_at', j.started_at, 'finished_at', j.finished_at,
               'status', j.status, 'detail', j.detail, 'last_ok_at', j.last_ok_at)), '[]'::jsonb)
        from (
          select distinct on (r.job) r.job, r.started_at, r.finished_at, r.status, r.detail,
                 (select max(k.finished_at) from public.job_runs k where k.job = r.job and k.status = 'ok') as last_ok_at
            from public.job_runs r
           order by r.job, r.started_at desc
        ) j),

    'cron', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'name', c.jobname, 'schedule', c.schedule, 'active', c.active,
               'last_status', d.status, 'last_start', d.start_time, 'last_end', d.end_time,
               'last_message', left(d.return_message, 200))), '[]'::jsonb)
        from cron.job c
        left join lateral (
          select x.status, x.start_time, x.end_time, x.return_message
            from cron.job_run_details x
           where x.jobid = c.jobid
           order by x.start_time desc
           limit 1
        ) d on true),

    'orderflow', jsonb_build_object(
      'configured', (select count(*) = 2 from vault.secrets s
                      where s.name in ('orderflow_ingest_url', 'orderflow_ingest_key')),
      'recording_since', (select min(s.sent_at) from orderflow.sends s),
      'sends_24h', (select count(*) from orderflow.sends s where s.sent_at > now() - interval '24 hours'),
      'accepted_24h', (select count(*) from orderflow.sends s where s.sent_at > now() - interval '24 hours' and s.ok),
      'refused_24h', (select count(*) from orderflow.sends s where s.sent_at > now() - interval '24 hours' and s.ok = false),
      'unanswered', (select count(*) from orderflow.sends s where s.answered_at is null and s.sent_at < now() - interval '15 minutes'),
      'last_accepted_at', (select max(s.answered_at) from orderflow.sends s where s.ok),
      -- Orders whose most recent send (in the last day) was turned away: the
      -- ones OrderFlow may not have, or may have out of date.
      'orders_refused_now', (
        select count(*) from (
          select distinct on (s.order_id) s.order_id, s.ok
            from orderflow.sends s
           where s.order_id is not null and s.answered_at is not null
             and s.sent_at > now() - interval '24 hours'
           order by s.order_id, s.sent_at desc
        ) latest where latest.ok = false),
      'recent_refusals', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'at', r.sent_at, 'order_ref', r.order_ref, 'status_code', r.status_code,
                 'message', r.message, 'source', r.source)), '[]'::jsonb)
          from (
            select s.sent_at, upper(left(s.order_id::text, 8)) as order_ref, s.status_code,
                   left(coalesce(s.message, s.error), 200) as message, s.source
              from orderflow.sends s
             where s.ok = false and s.sent_at > now() - interval '24 hours'
             order by s.sent_at desc
             limit 5
          ) r)),

    'tracking', (
      select jsonb_build_object(
        'meta_sent_7d', count(*) filter (where c.platform = 'meta' and c.status = 'sent' and c.created_at > now() - interval '7 days'),
        'failed_7d', count(*) filter (where c.status not in ('sent', 'skipped') and c.created_at > now() - interval '7 days'),
        'last_meta_sent_at', max(c.sent_at) filter (where c.platform = 'meta' and c.status = 'sent'),
        'last_failure', (
          select jsonb_build_object('at', f.created_at, 'platform', f.platform, 'event', f.event_name, 'status', f.status)
            from public.conversion_events f
           where f.status not in ('sent', 'skipped')
           order by f.created_at desc limit 1))
      from public.conversion_events c),

    'ga4', (
      select jsonb_build_object(
        'accepted_7d', count(*) filter (where g.status = 'transport_accepted' and g.completed_at > now() - interval '7 days'),
        'problems_7d', count(*) filter (where g.status not in ('transport_accepted', 'pending')
                                         and coalesce(g.completed_at, g.claimed_at) > now() - interval '7 days'),
        'last_at', max(g.completed_at))
      from public.google_ga4_delivery g),

    'google_offline', (
      select jsonb_build_object(
        'pending', count(*) filter (where q.status = 'pending'),
        'oldest_pending_at', min(q.created_at) filter (where q.status = 'pending'),
        'held', count(*) filter (where q.status = 'held'),
        'synced', count(*) filter (where q.status = 'sheet_synced'),
        'last_sync_started_at', (select max(r.started_at) from public.google_sheet_sync_runs r),
        'last_sync_status', (select r.status from public.google_sheet_sync_runs r order by r.started_at desc limit 1),
        'sync_runs', (select count(*) from public.google_sheet_sync_runs r))
      from public.google_conversion_outbox q),

    'trustpilot', jsonb_build_object(
      'delivered_30d', (select count(*) from public.orders o where o.delivered_at > now() - interval '30 days'),
      'asked_30d', (select count(*) from public.orders o where o.review_request_sent_at > now() - interval '30 days'),
      'invites_sent_30d', (select count(*) from public.email_log e
                            where e.meta->>'trustpilot' = 'true' and e.status = 'sent'
                              and e.created_at > now() - interval '30 days'),
      'invites_failed_7d', (select count(*) from public.email_log e
                             where e.meta->>'trustpilot' = 'true' and e.status = 'failed'
                               and e.created_at > now() - interval '7 days')),

    'feeds', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'feed', f.feed, 'fetcher', f.fetcher, 'last_at', f.last_at, 'fetches_7d', f.fetches_7d)), '[]'::jsonb)
        from (
          select x.feed, x.fetcher, max(x.fetched_at) as last_at,
                 count(*) filter (where x.fetched_at > now() - interval '7 days') as fetches_7d
            from public.feed_fetches x
           group by x.feed, x.fetcher
        ) f)
  ) into v;

  return v;
end;
$function$;

revoke all on function private.admin_status_snapshot() from public, anon, authenticated, service_role;
grant execute on function private.admin_status_snapshot() to authenticated, service_role;

create or replace function public.admin_status_snapshot()
 returns jsonb
 language sql
 stable
 security invoker
 set search_path to ''
as $function$
  select private.admin_status_snapshot();
$function$;

revoke all on function public.admin_status_snapshot() from public, anon, authenticated, service_role;
grant execute on function public.admin_status_snapshot() to authenticated, service_role;
