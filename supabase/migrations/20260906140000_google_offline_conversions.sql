-- Staging table for a FUTURE Google Ads offline/enhanced conversion import.
--
-- Nothing in this codebase uploads to Google from this table - see the
-- explicit boundary in docs/TRACKING_V2_EXPORT_CONTRACT.md. It exists purely
-- so a separate operational process (a Google Sheet, Google Ads Data Manager)
-- has a structured, deduplicated source to read from.
--
-- One row per (order_id, conversion_stage) - the unique constraint is what
-- makes writing it idempotent from utils/orderConversions.ts, the same
-- guard-column pattern purchase_event_sent_at/delivered_event_sent_at already
-- use on the orders table itself.

create table if not exists public.google_offline_conversions (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders(id),

  conversion_stage      text not null check (conversion_stage in ('confirmed', 'delivered')),
  conversion_time       timestamptz not null,

  value                 numeric not null,
  currency              text not null default 'GBP',

  gclid                 text,
  gbraid                text,
  wbraid                text,

  customer_email        text,
  customer_phone        text,
  customer_first_name   text,
  customer_last_name    text,
  customer_postcode     text,

  upload_status         text not null default 'pending'
                          check (upload_status in ('pending', 'uploaded', 'error')),
  uploaded_at           timestamptz,
  error_message         text,

  created_at            timestamptz not null default now(),

  unique (order_id, conversion_stage)
);

create index if not exists google_offline_conversions_order_id_idx
  on public.google_offline_conversions (order_id);
create index if not exists google_offline_conversions_upload_status_idx
  on public.google_offline_conversions (upload_status);
create index if not exists google_offline_conversions_created_at_idx
  on public.google_offline_conversions (created_at);

alter table public.google_offline_conversions enable row level security;
revoke all on public.google_offline_conversions from anon, authenticated;

-- Readable from the ordinary admin-authenticated client (is_admin()), the way
-- src/app/admin/reviews/page.tsx already reads other tables - not just the
-- service-role client - so a future admin screen or export job running under
-- a signed-in admin session can query this without needing the service role.
drop policy if exists "Admins can read offline conversion staging" on public.google_offline_conversions;
create policy "Admins can read offline conversion staging"
  on public.google_offline_conversions for select
  to authenticated
  using (public.is_admin());

comment on table public.google_offline_conversions is
  'Staging rows for a future, separate Google Ads offline/enhanced conversion '
  'upload. Written by utils/orderConversions.ts when an order first reaches '
  'confirmed/delivered. Nothing in this codebase uploads from this table.';
