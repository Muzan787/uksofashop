-- Scheduled jobs run from the database, an hourly health check, and a
-- smarter OrderFlow re-send (admin upgrade Phase 4: Q2, Q3, R2).
--
-- WHY: the three daily/weekly jobs ran from GitHub Actions, which switches a
-- scheduled workflow off after 60 days without repository activity and tells
-- nobody. pg_cron lives with the data and reports into job_runs, which the
-- Status page reads.
--
-- HOW A JOB THAT NEEDS THE SITE RUNS (review requests, the Monday email, the
-- hourly health check):
--   1. private.start_site_job(job) writes a job_runs row with a one-time
--      ticket - only its SHA-256 is kept - and posts the ticket to
--      <site>/api/jobs/<job> with pg_net.
--   2. The site claims the ticket: it works once, for that job, within 15
--      minutes. It does the work and writes the result onto the row.
--   3. private.expire_job_runs() marks any run that has not reported back
--      within 30 minutes as failed.
-- No secret is stored anywhere: the ticket is the only credential, it is
-- random per run, and it is worthless once claimed or expired.
--
-- A job that only touches the database (recovery clean-up) runs as plain SQL
-- in private.run_recovery_cleanup(), recording itself the same way.
--
-- The cron.schedule() calls are NOT in this migration. Each job is scheduled
-- only after it has run once from the database and reported ok, and its
-- GitHub schedule line is removed at the same time (see the migration that
-- follows this one).

-- ── job_runs: who started it, and the database's tickets ──────────────────
alter table public.job_runs
  add column if not exists trigger text not null default 'cron_secret',
  add column if not exists ticket_hash text,
  add column if not exists ticket_expires_at timestamptz,
  add column if not exists claimed_at timestamptz;

alter table public.job_runs drop constraint if exists job_runs_trigger_check;
alter table public.job_runs
  add constraint job_runs_trigger_check check (trigger in ('cron_secret', 'database'));

create unique index if not exists job_runs_ticket_idx
  on public.job_runs (ticket_hash) where ticket_hash is not null;

comment on column public.job_runs.trigger is
  'cron_secret: /api/cron/* called with CRON_SECRET (GitHub or by hand). database: started by pg_cron.';
comment on column public.job_runs.ticket_hash is
  'SHA-256 of the one-time ticket the database posted to /api/jobs/<job>. The ticket itself is never stored.';

-- ── health_alerts: what the hourly check last told the owner ──────────────
create table if not exists public.health_alerts (
  check_key text primary key,
  state text not null check (state in ('ok', 'amber', 'red')),
  red_since timestamptz,
  last_alert_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.health_alerts is
  'The last state of each Status check, as the hourly health check saw it: an email goes when one turns red, again after a day, and when it is fixed.';

alter table public.health_alerts enable row level security;
revoke all on public.health_alerts from anon, authenticated;
grant select on public.health_alerts to authenticated;

drop policy if exists "admin can read health alerts" on public.health_alerts;
create policy "admin can read health alerts"
  on public.health_alerts
  for select
  to authenticated
  using ((select public.is_admin()));

-- ── Where the site is ─────────────────────────────────────────────────────
-- Not a secret. One place, so a move of host or domain is a one-line change.
create or replace function private.site_url()
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select 'https://www.uksofashop.co.uk'::text;
$function$;

-- ── Runs that never reported back count as failed ─────────────────────────
create or replace function private.expire_job_runs()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  n integer;
begin
  update public.job_runs
     set status = 'failed',
         finished_at = now(),
         detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object('error', 'No report within 30 minutes')
   where status = 'running'
     and started_at < now() - interval '30 minutes';
  get diagnostics n = row_count;
  return n;
end;
$function$;

-- ── Start a job that runs on the site ─────────────────────────────────────
create or replace function private.start_site_job(p_job text)
 returns bigint
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_ticket text;
  v_id bigint;
begin
  if p_job !~ '^[a-z][a-z-]{1,40}$' then
    raise exception 'BAD_JOB';
  end if;

  perform private.expire_job_runs();

  v_ticket := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.job_runs (job, trigger, ticket_hash, ticket_expires_at)
  values (p_job, 'database', encode(sha256(convert_to(v_ticket, 'UTF8')), 'hex'), now() + interval '15 minutes')
  returning id into v_id;

  perform net.http_post(
    url := private.site_url() || '/api/jobs/' || p_job,
    body := jsonb_build_object('run', v_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-ticket', v_ticket),
    timeout_milliseconds := 30000
  );

  return v_id;
end;
$function$;

-- ── Recovery clean-up: database only, so plain SQL ────────────────────────
-- The same delete /api/cron/recovery-cleanup does: checkout-reminder records
-- whose 90 days are up.
create or replace function private.run_recovery_cleanup()
 returns bigint
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_id bigint;
  v_deleted integer;
begin
  perform private.expire_job_runs();

  insert into public.job_runs (job, trigger)
  values ('recovery-cleanup', 'database')
  returning id into v_id;

  begin
    with gone as (
      delete from public.checkout_recovery_leads
       where expires_at < now()
      returning 1
    )
    select count(*) into v_deleted from gone;

    update public.job_runs
       set status = 'ok', finished_at = now(), detail = jsonb_build_object('deleted', v_deleted)
     where id = v_id;
  exception when others then
    update public.job_runs
       set status = 'failed', finished_at = now(), detail = jsonb_build_object('error', sqlerrm)
     where id = v_id;
  end;

  return v_id;
end;
$function$;

revoke all on function private.site_url() from public, anon, authenticated;
revoke all on function private.expire_job_runs() from public, anon, authenticated;
revoke all on function private.start_site_job(text) from public, anon, authenticated;
revoke all on function private.run_recovery_cleanup() from public, anon, authenticated;

-- ── R2: re-send only what OrderFlow hasn't accepted ───────────────────────
-- Decision 13 (yes). This used to re-send every order changed in the last
-- three days, every 15 minutes - about 270 sends a day for a handful of
-- orders. Now an order is re-sent only when its latest send was turned away,
-- got no reply, or never happened since recording began. Every change to an
-- order still triggers a send at once, exactly as before; this job is only
-- the safety net.
--
-- A refusal stays eligible for seven days even if the order last changed
-- longer ago, so an edit to an old order that OrderFlow refused is still
-- retried. What is sent, and to where, is unchanged.
create or replace function orderflow.resend_recent(p_window interval DEFAULT '3 days'::interval)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  n integer := 0;
  r record;
begin
  -- Transaction-local: only this job's sends carry the label.
  perform set_config('orderflow.send_source', 'resend', true);

  -- Fresh answers first, so an order accepted a minute ago is not sent again.
  perform orderflow.collect_answers();

  for r in
    select o.id
      from public.orders o
      left join lateral (
        select s.ok, s.answered_at, s.sent_at
          from orderflow.sends s
         where s.order_id = o.id
         order by s.sent_at desc
         limit 1
      ) last on true
     where (
             greatest(o.created_at, o.confirmed_at, o.processing_at,
                      o.shipped_at, o.delivered_at, o.cancelled_at) > now() - p_window
             or last.sent_at > now() - interval '7 days'
           )
       and (
             last.sent_at is null
             or last.ok = false
             or (last.answered_at is null and last.sent_at < now() - interval '10 minutes')
           )
     order by o.created_at desc
     limit 200
  loop
    begin
      perform orderflow.push_order(r.id);
      n := n + 1;
    exception when others then
      raise warning 'orderflow resend failed for order %: %', r.id, sqlerrm;
    end;
  end loop;
  return n;
end;
$function$;
