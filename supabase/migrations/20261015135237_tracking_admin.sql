-- Admin upgrade Phase 11: tracking (N2, N4, N7).
--
--   * shop_settings.tracking_mode - Dry run, Test or Live (N2). Live is today's
--     behaviour and the default; the server still sends nothing unless it is
--     the production server (TRACKING_ENV). Changed only through
--     set_tracking_mode().
--   * meta_signal_holds - Hold or Don't send on an order's Meta signals (N4).
--     A separate table rather than a column on orders, so setting one never
--     touches the order (no history line, no re-send to OrderFlow).
--   * tracking_event_log - every Meta and GA4 server event exactly as it was
--     built, with personal details hashed (N7), written by the server with
--     the service key and read by admins. Kept for 30 days by a daily job.
--
-- Nothing here changes what is sent: with the mode on Live and no holds, every
-- send goes exactly as before.

-- ── N2: the mode ─────────────────────────────────────────────────────────
alter table public.shop_settings add column if not exists tracking_mode text not null default 'live';
alter table public.shop_settings drop constraint if exists shop_settings_tracking_mode;
alter table public.shop_settings add constraint shop_settings_tracking_mode
  check (tracking_mode in ('dry_run', 'test', 'live'));

create or replace function private.set_tracking_mode(p_mode text)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.require_admin();
  if p_mode is null or p_mode not in ('dry_run', 'test', 'live') then
    raise exception 'MODE_INVALID';
  end if;
  update public.shop_settings
     set tracking_mode = p_mode, updated_at = now(), updated_by = auth.uid()
   where id;
  return p_mode;
end;
$function$;
revoke all on function private.set_tracking_mode(text) from public, anon, authenticated;
grant execute on function private.set_tracking_mode(text) to authenticated;

create or replace function public.set_tracking_mode(p_mode text)
 returns text language sql security invoker set search_path to ''
as $function$ select private.set_tracking_mode(p_mode); $function$;
revoke all on function public.set_tracking_mode(text) from public, anon, authenticated;
grant execute on function public.set_tracking_mode(text) to authenticated;

-- ── N4: Hold and Don't send ──────────────────────────────────────────────
create table if not exists public.meta_signal_holds (
  order_id uuid primary key references public.orders(id) on delete cascade,
  state text not null check (state in ('hold', 'dont_send')),
  set_at timestamptz not null default now(),
  set_by uuid default auth.uid()
);
comment on table public.meta_signal_holds is
  'Admin -> Meta: an order whose Meta signals are held (hold) or never to be sent (dont_send). Admin upgrade N4.';

alter table public.meta_signal_holds enable row level security;
revoke all on public.meta_signal_holds from public, anon, authenticated;
grant select, insert, update, delete on public.meta_signal_holds to authenticated;
drop policy if exists "admins manage meta holds" on public.meta_signal_holds;
create policy "admins manage meta holds" on public.meta_signal_holds for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ── N7: the latest events, as built ──────────────────────────────────────
create table if not exists public.tracking_event_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  platform text not null check (platform in ('meta', 'ga4')),
  event_name text not null,
  event_id text,
  mode text not null check (mode in ('dry_run', 'test', 'live')),
  outcome text not null,
  order_ref text,
  payload jsonb not null
);
create index if not exists tracking_event_log_created_at_idx on public.tracking_event_log (created_at desc);
comment on table public.tracking_event_log is
  'Every Meta CAPI and GA4 server event as it was built, personal details hashed (admin upgrade N7). Written with the service key; kept 30 days.';

alter table public.tracking_event_log enable row level security;
revoke all on public.tracking_event_log from public, anon, authenticated;
grant select on public.tracking_event_log to authenticated;
drop policy if exists "admins read the tracking log" on public.tracking_event_log;
create policy "admins read the tracking log" on public.tracking_event_log for select to authenticated
  using ((select private.is_admin()));

select cron.schedule('tracking-event-log-retention', '41 3 * * *',
  $$delete from public.tracking_event_log where created_at < now() - interval '30 days'$$);
