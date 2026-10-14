-- The admin list becomes an allowlist of email addresses (admin upgrade A1).
--
-- Until now public.admins held one column that mattered - the auth user's id -
-- so the only way to make someone an admin was to look up their account id and
-- insert it by hand, and the only way to stop being one was to delete the row.
-- Now each row is an email address, a name, an on/off switch and, once that
-- address has signed in, the account it belongs to:
--
--   * Muaz adds an address (and creates its account in Supabase Auth).
--   * The first time an account with that CONFIRMED address signs in,
--     claim_admin() links it: id is filled in and claimed_at stamped.
--   * From then on "is admin" means: this account is linked AND active.
--     Nothing in the sign-in token is trusted - claim_admin() reads the
--     address and its confirmation from auth.users itself.
--
-- is_admin() keeps its name, signature, owner rights and grants, because 22
-- RLS policies call it. Only its body changes, to add "and is_active".
--
-- The existing row is backfilled from auth.users and counts as claimed when
-- it was created. Nothing the running code reads is removed: proxy.ts selects
-- `id` by the signed-in user, and `id` stays, now unique rather than the key.
--
-- The foreign key to auth.users moves from ON DELETE CASCADE to SET NULL. With
-- an allowlist, deleting and recreating an account should unlink the address,
-- not forget it; the next confirmed sign-in links it again.

alter table public.admins
  add column if not exists email text,
  add column if not exists name text,
  add column if not exists is_active boolean not null default true,
  add column if not exists claimed_at timestamptz;

update public.admins a
   set email = lower(btrim(u.email)),
       claimed_at = coalesce(a.claimed_at, a.created_at)
  from auth.users u
 where u.id = a.id
   and a.email is null;

alter table public.admins alter column email set not null;
alter table public.admins
  add constraint admins_email_normalised
  check (email = lower(btrim(email)) and email like '%_@_%');

-- The address is the key now; the account id is filled in later, so it can
-- no longer be the primary key. Still unique: one account, one admin row.
alter table public.admins drop constraint admins_pkey;
alter table public.admins alter column id drop not null;
alter table public.admins add constraint admins_id_key unique (id);
alter table public.admins add constraint admins_pkey primary key (email);

alter table public.admins drop constraint admins_id_fkey;
alter table public.admins
  add constraint admins_id_fkey
  foreign key (id) references auth.users(id) on delete set null;

comment on table public.admins is
  'Admin allowlist. Add an address; its account is linked on the first confirmed sign-in (claim_admin). is_admin() = linked and active.';

-- ── is_admin(): linked and active ──────────────────────────────────────────
-- create or replace keeps the existing grants and every policy that calls it.
create or replace function public.is_admin()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.admins where id = auth.uid() and is_active
  );
$function$;

-- ── claim_admin(): link a confirmed account to its listed address ──────────
-- Owner-rights functions live in a schema the API does not expose; the
-- signed-in caller reaches it only through the thin public wrapper below.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.claim_admin()
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid   uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    return false;
  end if;

  -- From auth.users, never from the token: a claim only counts for an
  -- address its owner has proved they receive mail at.
  select lower(btrim(u.email)) into v_email
    from auth.users u
   where u.id = v_uid
     and u.email_confirmed_at is not null;

  if v_email is null then
    return false;
  end if;

  update public.admins
     set id = v_uid,
         claimed_at = now()
   where email = v_email
     and id is null
     and is_active;

  return exists (
    select 1 from public.admins where id = v_uid and is_active
  );
end;
$function$;

revoke all on function private.claim_admin() from public, anon, authenticated;
grant execute on function private.claim_admin() to authenticated;

create or replace function public.claim_admin()
 returns boolean
 language sql
 security invoker
 set search_path to ''
as $function$
  select private.claim_admin();
$function$;

revoke all on function public.claim_admin() from public, anon, authenticated;
grant execute on function public.claim_admin() to authenticated;
