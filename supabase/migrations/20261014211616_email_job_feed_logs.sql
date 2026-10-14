-- Three logs the Status page reads (admin upgrade Phase 3: Q1, P1).
--
--   email_log     one row per email the site sends, tries to send, or skips.
--                 Written by deliver() in src/utils/email.ts.
--   job_runs      one row per run of a scheduled job (/api/cron/*): when it
--                 started, when it finished and what it reported.
--   feed_fetches  one row each time Meta or Google fetches a product feed,
--                 so "the catalogue feed has stopped being read" is visible.
--
-- All three are written only by the server with the service role. Admins can
-- read them; nobody can write to them through the API - no insert, update or
-- delete grant to anon or authenticated, and no policy that would allow one.
-- The recipient address in email_log is personal data, which is one more
-- reason the read policy is admins only.

-- ── email_log ───────────────────────────────────────────────────────────────
create table if not exists public.email_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null,
  -- The order the email is about, when the sender knows its id; otherwise
  -- the 8-character code staff use (admin notifications only carry that).
  order_id uuid references public.orders(id) on delete set null,
  order_ref text,
  recipient text,
  subject text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_message_id text,
  error text,
  -- Small facts about the send, e.g. {"trustpilot": true} when the delivered
  -- email carried the Trustpilot invitation.
  meta jsonb not null default '{}'::jsonb
);

comment on table public.email_log is
  'Every email the site sent, failed to send, or skipped. Written by the server (service role) from deliver(); admins read it.';

create index if not exists email_log_created_at_idx on public.email_log (created_at desc);
create index if not exists email_log_order_id_idx on public.email_log (order_id) where order_id is not null;
create index if not exists email_log_failed_idx on public.email_log (created_at desc) where status = 'failed';

alter table public.email_log enable row level security;
revoke all on public.email_log from anon, authenticated;
grant select on public.email_log to authenticated;

drop policy if exists "admin can read the email log" on public.email_log;
create policy "admin can read the email log"
  on public.email_log
  for select
  to authenticated
  using ((select public.is_admin()));

-- ── job_runs ────────────────────────────────────────────────────────────────
create table if not exists public.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'failed', 'skipped')),
  -- What the job reported: the JSON its route returned, or the error.
  detail jsonb
);

comment on table public.job_runs is
  'One row per run of a scheduled job (/api/cron/*). running -> ok | failed | skipped. Written by the server; admins read it.';

create index if not exists job_runs_job_started_idx on public.job_runs (job, started_at desc);

alter table public.job_runs enable row level security;
revoke all on public.job_runs from anon, authenticated;
grant select on public.job_runs to authenticated;

drop policy if exists "admin can read job runs" on public.job_runs;
create policy "admin can read job runs"
  on public.job_runs
  for select
  to authenticated
  using ((select public.is_admin()));

-- ── feed_fetches ────────────────────────────────────────────────────────────
create table if not exists public.feed_fetches (
  id bigint generated always as identity primary key,
  feed text not null,
  -- 'meta' or 'google' from the fetcher's user agent; anything else is not
  -- recorded at all (a person opening the feed is not a fetch that matters).
  fetcher text not null,
  item_count integer,
  fetched_at timestamptz not null default now()
);

comment on table public.feed_fetches is
  'Each time Meta or Google fetched a product feed. Written by the feed routes; admins read it.';

create index if not exists feed_fetches_feed_idx on public.feed_fetches (feed, fetcher, fetched_at desc);

alter table public.feed_fetches enable row level security;
revoke all on public.feed_fetches from anon, authenticated;
grant select on public.feed_fetches to authenticated;

drop policy if exists "admin can read feed fetches" on public.feed_fetches;
create policy "admin can read feed fetches"
  on public.feed_fetches
  for select
  to authenticated
  using ((select public.is_admin()));
