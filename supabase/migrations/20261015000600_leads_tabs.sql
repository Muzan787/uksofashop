-- Admin upgrade Phase 8: one Leads page with tabs (I1-I6).
--
-- Additive only:
--   * contact_messages - every contact-form message, stored as well as emailed
--     (decision 10). The server action writes it with the service role, as it
--     does the email; admins read it, and change its state only through
--     set_contact_message_status() (new, replied, closed).
--   * whatsapp_enquiries - admins may now read it (I3). It stays closed to
--     everyone else, and nothing can write to it but the server.
--   * checkout_recovery_leads - the reminder email can only ever go once (I4).
--     claim_lead_reminder() stamps reminder_emailed_at before the email goes,
--     and only if it was empty; release_lead_reminder() clears that same
--     stamp if the send then fails, so a failure can be tried again. A trigger
--     refuses any other change to a stamp once it is set, and the admin's
--     direct column grant on it is withdrawn.

-- ── Messages ──────────────────────────────────────────────────────────────
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (length(btrim(name)) between 1 and 200),
  email text not null check (length(email) between 3 and 200),
  order_number text check (order_number is null or length(order_number) <= 40),
  message text not null check (length(message) between 1 and 4000),
  status text not null default 'new' check (status in ('new', 'replied', 'closed')),
  status_changed_at timestamptz,
  status_changed_by uuid
);

comment on table public.contact_messages is
  'Contact-form messages, stored as well as emailed (admin upgrade decision 10). Written by the server; read by admins; state changed through set_contact_message_status().';

create index if not exists contact_messages_status_created_idx on public.contact_messages (status, created_at desc);

alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from public, anon, authenticated;
grant select on public.contact_messages to authenticated;
drop policy if exists "admin can read contact messages" on public.contact_messages;
create policy "admin can read contact messages" on public.contact_messages
  for select to authenticated using ((select private.is_admin()));

create or replace function private.set_contact_message_status(p_id uuid, p_status text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.require_admin();
  if p_status is null or p_status not in ('new', 'replied', 'closed') then
    raise exception 'BAD_STATUS';
  end if;
  update public.contact_messages
     set status = p_status,
         status_changed_at = case when p_status = 'new' then null else now() end,
         status_changed_by = case when p_status = 'new' then null else auth.uid() end
   where id = p_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$function$;

-- ── WhatsApp enquiries ────────────────────────────────────────────────────
grant select on public.whatsapp_enquiries to authenticated;
drop policy if exists "admin can read whatsapp enquiries" on public.whatsapp_enquiries;
create policy "admin can read whatsapp enquiries" on public.whatsapp_enquiries
  for select to authenticated using ((select private.is_admin()));

-- ── Basket reminders: the email goes once ─────────────────────────────────
create or replace function private.lead_reminder_once()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if old.reminder_emailed_at is not null
     and new.reminder_emailed_at is distinct from old.reminder_emailed_at
     and coalesce(current_setting('leads.release_reminder', true), '') <> 'on' then
    raise exception 'REMINDER_ALREADY_SENT' using detail = 'A basket reminder email can only be sent once.';
  end if;
  return new;
end;
$function$;

drop trigger if exists checkout_recovery_leads_reminder_once on public.checkout_recovery_leads;
create trigger checkout_recovery_leads_reminder_once
  before update of reminder_emailed_at on public.checkout_recovery_leads
  for each row execute function private.lead_reminder_once();

-- Stamps the reminder as sent, before it is sent, and only the first time.
-- Returns the stamp, which release_lead_reminder() needs to undo a failure.
create or replace function private.claim_lead_reminder(p_id uuid)
 returns timestamptz
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_at timestamptz;
  v_lead public.checkout_recovery_leads%rowtype;
begin
  perform private.require_admin();
  update public.checkout_recovery_leads
     set reminder_emailed_at = now()
   where id = p_id
     and reminder_emailed_at is null
     and status in ('active', 'done')
     and email_opt_in
     and email is not null
     and data_class is distinct from 'qa_test'
  returning reminder_emailed_at into v_at;
  if v_at is not null then
    return v_at;
  end if;

  select * into v_lead from public.checkout_recovery_leads where id = p_id;
  if not found then
    raise exception 'NOT_FOUND';
  elsif v_lead.reminder_emailed_at is not null then
    raise exception 'REMINDER_ALREADY_SENT';
  else
    raise exception 'NO_EMAIL_REMINDER';
  end if;
end;
$function$;

-- The email failed after the claim: clear that claim, and only that one.
create or replace function private.release_lead_reminder(p_id uuid, p_claimed_at timestamptz)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.require_admin();
  perform set_config('leads.release_reminder', 'on', true);
  update public.checkout_recovery_leads
     set reminder_emailed_at = null
   where id = p_id and reminder_emailed_at = p_claimed_at;
  perform set_config('leads.release_reminder', '', true);
  return found;
end;
$function$;

-- The admin may still change status and done_at directly; the stamp only
-- through the two functions above.
revoke update (reminder_emailed_at) on public.checkout_recovery_leads from authenticated;

-- ── Grants and wrappers ───────────────────────────────────────────────────
revoke all on function private.set_contact_message_status(uuid, text) from public, anon, authenticated;
revoke all on function private.claim_lead_reminder(uuid) from public, anon, authenticated;
revoke all on function private.release_lead_reminder(uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.lead_reminder_once() from public, anon, authenticated;
grant execute on function private.set_contact_message_status(uuid, text) to authenticated;
grant execute on function private.claim_lead_reminder(uuid) to authenticated;
grant execute on function private.release_lead_reminder(uuid, timestamptz) to authenticated;

create or replace function public.set_contact_message_status(p_id uuid, p_status text)
 returns void language sql security invoker set search_path to ''
as $function$ select private.set_contact_message_status(p_id, p_status); $function$;

create or replace function public.claim_lead_reminder(p_id uuid)
 returns timestamptz language sql security invoker set search_path to ''
as $function$ select private.claim_lead_reminder(p_id); $function$;

create or replace function public.release_lead_reminder(p_id uuid, p_claimed_at timestamptz)
 returns boolean language sql security invoker set search_path to ''
as $function$ select private.release_lead_reminder(p_id, p_claimed_at); $function$;

revoke all on function public.set_contact_message_status(uuid, text) from public, anon, authenticated;
revoke all on function public.claim_lead_reminder(uuid) from public, anon, authenticated;
revoke all on function public.release_lead_reminder(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.set_contact_message_status(uuid, text) to authenticated;
grant execute on function public.claim_lead_reminder(uuid) to authenticated;
grant execute on function public.release_lead_reminder(uuid, timestamptz) to authenticated;
