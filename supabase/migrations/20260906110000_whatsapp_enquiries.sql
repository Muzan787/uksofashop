-- WhatsApp enquiries: a reference minted before the visitor leaves for
-- WhatsApp, so a chat that becomes a sale can be linked back to the ad, page
-- and product that produced it. See utils/attribution/whatsapp.ts for the
-- format and src/app/api/attribution/whatsapp-click/route.ts for the writer.
--
-- Additive only. RLS enabled, no anon/authenticated policies - written by the
-- service-role client from the click route, and read by the service-role
-- client (or a later is_admin() policy) when a manual order is linked to a
-- reference in place_manual_order (see
-- 20260906160000_manual_order_whatsapp_reference.sql).

create table if not exists public.whatsapp_enquiries (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique,
  created_at        timestamptz not null default now(),

  visitor_id        uuid,
  session_id        uuid,
  arrival_id        uuid,

  page_url          text,
  page_context      text,

  product_id        uuid,
  variant_id        uuid,
  product_name      text,

  gclid             text,
  gbraid            text,
  wbraid            text,
  fbclid            text,

  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  utm_content       text,
  utm_term          text,

  ga_client_id      text,
  meta_fbp          text,
  meta_fbc          text,

  converted_order_id uuid references public.orders(id),
  converted_at        timestamptz,

  constraint whatsapp_enquiries_reference_format
    check (reference ~ '^UKSS-WA-[0-9]{6}-[A-Z0-9]{6}$')
);

create index if not exists whatsapp_enquiries_session_id_idx
  on public.whatsapp_enquiries (session_id);
create index if not exists whatsapp_enquiries_converted_order_id_idx
  on public.whatsapp_enquiries (converted_order_id);
create index if not exists whatsapp_enquiries_created_at_idx
  on public.whatsapp_enquiries (created_at);

alter table public.whatsapp_enquiries enable row level security;
revoke all on public.whatsapp_enquiries from anon, authenticated;

comment on table public.whatsapp_enquiries is
  'One row per WhatsApp reference minted client-side before the visitor '
  'leaves the site. converted_order_id/converted_at are set when a staff '
  'member links the reference to a manual order - see place_manual_order.';
