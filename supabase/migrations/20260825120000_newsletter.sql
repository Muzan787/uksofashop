-- Newsletter subscribers, with double opt-in and a real unsubscribe.
--
-- Replaces a form that ran a 1200ms setTimeout, said "You're in! Check your
-- inbox", and stored nothing - while promising "No spam, ever. Unsubscribe in
-- one click."
--
-- UK GDPR needs us to be able to show, per subscriber, that consent was freely
-- given and when. So we record the moment they submitted, the moment they
-- confirmed from their own inbox, and the IP and user agent that did it.
--
-- SECURITY NOTE ON THE TOKENS
-- Double opt-in only protects anyone if the confirmation token is reachable
-- solely through the subscriber's own inbox. If a caller could hit the REST API
-- and read back a token, they could subscribe a third party and confirm it
-- themselves, which defeats the whole mechanism. So these functions are NOT
-- granted to anon or authenticated - they are called from server actions using
-- the service role, and the token only ever leaves the server inside an email.
-- Please don't "fix" this by granting execute to anon.

create table if not exists public.newsletter_subscribers (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  status             text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'unsubscribed')),
  confirm_token      uuid not null default gen_random_uuid(),
  unsubscribe_token  uuid not null default gen_random_uuid(),
  consent_ip         text,
  consent_user_agent text,
  subscribed_at      timestamptz not null default now(),
  confirmed_at       timestamptz,
  unsubscribed_at    timestamptz,
  last_sent_at       timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists newsletter_subscribers_status_idx
  on public.newsletter_subscribers (status);
create index if not exists newsletter_subscribers_confirm_token_idx
  on public.newsletter_subscribers (confirm_token);
create index if not exists newsletter_subscribers_unsubscribe_token_idx
  on public.newsletter_subscribers (unsubscribe_token);

alter table public.newsletter_subscribers enable row level security;

-- No public policy at all: the table is unreachable from the anon key. Only
-- admins can read it, and only the service role can write to it.
drop policy if exists "admin can view subscribers" on public.newsletter_subscribers;
create policy "admin can view subscribers"
  on public.newsletter_subscribers
  for select to authenticated
  using (is_admin());

-- ── Subscribe ────────────────────────────────────────────────────────────────
-- Returns the confirmation token so the caller can email it. Deliberately
-- returns the same shape whether or not the address was already on the list, so
-- the endpoint can't be used to test who is subscribed.
create or replace function public.newsletter_subscribe(
  p_email      text,
  p_ip         text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email  text;
  v_row    public.newsletter_subscribers%rowtype;
begin
  v_email := lower(trim(coalesce(p_email, '')));

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    return jsonb_build_object('outcome', 'invalid_email');
  end if;

  select * into v_row from public.newsletter_subscribers where email = v_email;

  if found and v_row.status = 'confirmed' then
    -- Already on the list. Say nothing that would confirm that to a stranger.
    return jsonb_build_object('outcome', 'already_confirmed');
  end if;

  if found then
    -- Pending or previously unsubscribed: start a fresh opt-in. Regenerating
    -- the token invalidates any older confirmation link.
    if v_row.last_sent_at is not null and v_row.last_sent_at > now() - interval '2 minutes' then
      return jsonb_build_object('outcome', 'throttled');
    end if;

    update public.newsletter_subscribers
    set status             = 'pending',
        confirm_token      = gen_random_uuid(),
        consent_ip         = coalesce(p_ip, consent_ip),
        consent_user_agent = coalesce(p_user_agent, consent_user_agent),
        subscribed_at      = now(),
        confirmed_at       = null,
        unsubscribed_at    = null,
        last_sent_at       = now()
    where id = v_row.id
    returning * into v_row;
  else
    insert into public.newsletter_subscribers (email, consent_ip, consent_user_agent, last_sent_at)
    values (v_email, p_ip, p_user_agent, now())
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'outcome',       'confirmation_required',
    'email',         v_row.email,
    'confirm_token', v_row.confirm_token
  );
end;
$function$;

-- ── Confirm (double opt-in) ──────────────────────────────────────────────────
create or replace function public.newsletter_confirm(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row public.newsletter_subscribers%rowtype;
begin
  select * into v_row from public.newsletter_subscribers where confirm_token = p_token;

  if not found then
    return jsonb_build_object('outcome', 'invalid_token');
  end if;

  if v_row.status = 'confirmed' then
    return jsonb_build_object('outcome', 'already_confirmed', 'email', v_row.email,
                              'unsubscribe_token', v_row.unsubscribe_token);
  end if;

  -- This is the moment consent is proven: it came from the inbox owner.
  update public.newsletter_subscribers
  set status = 'confirmed', confirmed_at = now(), unsubscribed_at = null
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object('outcome', 'confirmed', 'email', v_row.email,
                            'unsubscribe_token', v_row.unsubscribe_token);
end;
$function$;

-- ── Unsubscribe ──────────────────────────────────────────────────────────────
-- The token is permanent so a link in an old email keeps working forever, which
-- is what "unsubscribe in one click" actually requires.
create or replace function public.newsletter_unsubscribe(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row public.newsletter_subscribers%rowtype;
begin
  select * into v_row from public.newsletter_subscribers where unsubscribe_token = p_token;

  if not found then
    return jsonb_build_object('outcome', 'invalid_token');
  end if;

  update public.newsletter_subscribers
  set status = 'unsubscribed', unsubscribed_at = now()
  where id = v_row.id;

  return jsonb_build_object('outcome', 'unsubscribed', 'email', v_row.email);
end;
$function$;

revoke all on function public.newsletter_subscribe(text, text, text)  from public, anon, authenticated;
revoke all on function public.newsletter_confirm(uuid)                from public, anon, authenticated;
revoke all on function public.newsletter_unsubscribe(uuid)            from public, anon, authenticated;

-- Defence in depth. RLS already returns zero rows to anon because no policy
-- matches it, but this table holds personal data, so drop the table grant too.
revoke all on table public.newsletter_subscribers from anon;
