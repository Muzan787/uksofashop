-- Explicit, channel-specific checkout recovery opt-in.
--
-- This is intentionally separate from anonymous checkout-friction telemetry.
-- A row exists only after a shopper actively asks for a reminder. Contact data
-- is never inferred from partially typed fields, and the table is service-role
-- only: the storefront reaches it through the validated server route.

create table if not exists public.checkout_recovery_leads (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  session_id uuid not null unique,
  arrival_id uuid not null,
  email text,
  phone text,
  email_opt_in boolean not null default false,
  whatsapp_opt_in boolean not null default false,
  consent_at timestamptz not null default now(),
  consent_copy_version text not null default '2026-09-16-v1',
  basket jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'converted', 'unsubscribed')),
  converted_order_id uuid references public.orders(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkout_recovery_channel_required check (
    status <> 'active' or email_opt_in or whatsapp_opt_in
  ),
  constraint checkout_recovery_email_if_opted check (
    not email_opt_in or (email is not null and length(trim(email)) > 3)
  ),
  constraint checkout_recovery_phone_if_opted check (
    not whatsapp_opt_in or (phone is not null and length(trim(phone)) >= 10)
  )
);

create index if not exists checkout_recovery_status_expires_idx
  on public.checkout_recovery_leads(status, expires_at);
create index if not exists checkout_recovery_arrival_idx
  on public.checkout_recovery_leads(arrival_id);

alter table public.checkout_recovery_leads enable row level security;

-- No anon/authenticated policies on purpose. The service-role server route owns
-- reads/writes; a browser cannot list abandoned-checkout contacts through REST.
revoke all on table public.checkout_recovery_leads from anon, authenticated;

comment on table public.checkout_recovery_leads is
  'Explicit abandoned-checkout reminder consent. Service-role only; expires after 90 days unless converted/unsubscribed sooner.';
comment on column public.checkout_recovery_leads.basket is
  'Server-verified product snapshot: title/SKU/variant, colour or fabric, quantity and current unit price. Never an order/discount authority.';

-- When an opted-in checkout becomes an order, the order becomes the lawful
-- operational record. Keep the consent/audit shell, but remove the duplicate
-- recovery contact/basket data immediately.
create or replace function public.mark_checkout_recovery_converted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.session_id is not null then
    update public.checkout_recovery_leads
    set status = 'converted',
        converted_order_id = new.id,
        email = null,
        phone = null,
        basket = '[]'::jsonb,
        updated_at = now()
    where session_id = new.session_id
      and status = 'active';
  end if;
  return new;
end;
$$;

revoke all on function public.mark_checkout_recovery_converted() from public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_mark_checkout_recovery_converted ON public.orders;
create trigger trg_mark_checkout_recovery_converted
after insert on public.orders
for each row execute function public.mark_checkout_recovery_converted();
