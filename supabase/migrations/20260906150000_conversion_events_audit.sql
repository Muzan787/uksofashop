-- Append-only audit trail for every conversion send attempt.
--
-- purchase_event_sent_at/delivered_event_sent_at (20260825150000) remain the
-- idempotency guards that decide whether a send happens at all - this table
-- does not replace them and nothing here gates a business decision. It exists
-- so a Meta CAPI failure, a GA4 rejection, or a Google offline-staging write
-- can be seen after the fact, per order, without grepping server logs.

create table if not exists public.conversion_events (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid references public.orders(id),

  platform           text not null check (platform in ('meta', 'ga4', 'google_offline_staging')),
  event_name         text not null,
  event_id           text,

  created_at         timestamptz not null default now(),
  sent_at            timestamptz,

  status             text not null default 'pending'
                       check (status in ('pending', 'sent', 'failed', 'skipped')),

  response_metadata  jsonb,
  error_metadata     jsonb
);

create index if not exists conversion_events_order_id_idx on public.conversion_events (order_id);
create index if not exists conversion_events_platform_idx on public.conversion_events (platform);
create index if not exists conversion_events_created_at_idx on public.conversion_events (created_at);

alter table public.conversion_events enable row level security;
revoke all on public.conversion_events from anon, authenticated;

drop policy if exists "Admins can read conversion audit log" on public.conversion_events;
create policy "Admins can read conversion audit log"
  on public.conversion_events for select
  to authenticated
  using (public.is_admin());

comment on table public.conversion_events is
  'Append-only audit trail of Meta/GA4/Google-offline-staging send attempts, '
  'written from utils/orderConversions.ts. Not an idempotency guard - see '
  'orders.purchase_event_sent_at / delivered_event_sent_at for that.';
