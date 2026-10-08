-- Give every checkout-recovery lead a reference, the way a WhatsApp enquiry has one.
--
-- THE GAP THIS CLOSES. A visitor who reaches checkout, asks to be reminded,
-- and then orders in a WhatsApp conversation is currently unlinkable. The
-- WhatsApp path has UKSS-WA-…, which place_manual_order resolves in order to
-- copy the click ids, the UTMs and the _fbp/_fbc onto the order - so that
-- conversion reaches Meta and Google with the ad click that earned it
-- attached. A lead carries none of that onto the order, and the numbers say
-- so: 17 reminded leads, not one of them linked to an order.
--
-- WHY THE DATABASE GENERATES IT, NOT THE APPLICATION. The opt-in endpoint
-- upserts on session_id. A shopper who ticks the box, changes their mind and
-- ticks it again writes the row a second time, and an application-supplied
-- value would be regenerated on that write - while the first reference was
-- already sitting in a reminder email. A column default is evaluated on
-- insert only, so the reference is stable for the life of the row.
--
-- FORMAT mirrors UKSS-WA-YYMMDD-XXXXXX exactly, with LD for lead. The two are
-- then recognisable side by side in the admin panel, and a reference pasted
-- into the wrong box fails a check constraint rather than silently matching
-- nothing. Six characters from gen_random_uuid(): a CSPRNG rather than a
-- counter, because the reference travels in outbound mail and must not be
-- guessable or enumerable.

create or replace function public.lead_reference(p_at timestamptz default now())
returns text
language sql
volatile
as $$
  select 'UKSS-LD-'
      || to_char(p_at at time zone 'UTC', 'YYMMDD')
      || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
$$;

-- search_path is pinned in 20261008203500; it belongs on the create above
-- and is only separate because the advisor caught it after the fact.
--
-- Not part of the public API. Supabase exposes every public function as an
-- RPC endpoint; this one has no business being called from a browser.
revoke execute on function public.lead_reference(timestamptz) from anon, authenticated, public;

alter table public.checkout_recovery_leads add column if not exists reference text;

-- Backfilled from each row's OWN created_at, so a historical reference does
-- not claim to have been minted today. This is what makes the existing leads
-- linkable retrospectively.
update public.checkout_recovery_leads
set reference = public.lead_reference(created_at)
where reference is null;

alter table public.checkout_recovery_leads
  alter column reference set default public.lead_reference(),
  alter column reference set not null;

alter table public.checkout_recovery_leads
  add constraint checkout_recovery_leads_reference_format
  check (reference ~ '^UKSS-LD-[0-9]{6}-[A-Z0-9]{6}$');

create unique index if not exists checkout_recovery_leads_reference_key
  on public.checkout_recovery_leads (reference);
