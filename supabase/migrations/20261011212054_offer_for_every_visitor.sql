-- The 48-hour offer goes to every visitor, not only those from an ad.
--
-- Muaz's call (2026-10-12): the countdown and the discount behind it for
-- anyone who visits the site. The window rules are unchanged - 48 hours from
-- the first visit, fixed, never extended, never reissued once ended - so the
-- countdown stays true. What changes is who can open one:
--
--   * A new source, 'site_visit', for a visitor who arrives any other way.
--   * Paid sources still outrank it while a window is open, in the same
--     order as before (meta_ads > google_ads > meta_catalog > site_visit),
--     so a visitor who comes back from an ad is still credited to the ad -
--     but their deadline does not move.
--
-- The function keeps its name: three routes call it, and "paid" is now only
-- historical. orders.offer_source stays 'paid_entitlement' for any window;
-- which kind it was lives on the entitlement row.

alter table public.offer_entitlements
  drop constraint if exists offer_entitlements_source_check;

alter table public.offer_entitlements
  add constraint offer_entitlements_source_check
  check (source = any (array['google_ads'::text, 'meta_ads'::text, 'meta_catalog'::text, 'site_visit'::text]));

create or replace function public.issue_paid_offer_entitlement(
  p_visitor_id uuid,
  p_source text,
  p_arrival_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_now timestamptz := now();
  v_row public.offer_entitlements%rowtype;
begin
  if p_visitor_id is null then
    raise exception 'VISITOR_REQUIRED' using errcode = 'check_violation';
  end if;

  if p_source is null or p_source <> all (array[
    'google_ads'::text,
    'meta_ads'::text,
    'meta_catalog'::text,
    'site_visit'::text
  ]) then
    raise exception 'INVALID_OFFER_SOURCE' using errcode = 'check_violation';
  end if;

  insert into public.offer_entitlements (
    token, visitor_id, source, qualifying_arrival_id,
    started_at, expires_at, revoked_at, updated_at
  )
  values (
    gen_random_uuid(), p_visitor_id, p_source, p_arrival_id,
    v_now, v_now + interval '48 hours', null, v_now
  )
  on conflict (visitor_id) do update
  -- token, started_at, expires_at and revoked_at are deliberately absent:
  -- nothing a later visit does can move the deadline or bring it back.
  set source = case
        when offer_entitlements.revoked_at is not null
          or offer_entitlements.expires_at <= v_now
          then offer_entitlements.source
        when offer_entitlements.source = 'meta_ads'
          or excluded.source = 'meta_ads'
          then 'meta_ads'
        when offer_entitlements.source = 'google_ads'
          or excluded.source = 'google_ads'
          then 'google_ads'
        when offer_entitlements.source = 'meta_catalog'
          or excluded.source = 'meta_catalog'
          then 'meta_catalog'
        else 'site_visit'
      end,
      qualifying_arrival_id = case
        when offer_entitlements.revoked_at is not null
          or offer_entitlements.expires_at <= v_now
          then offer_entitlements.qualifying_arrival_id
        -- The arrival that earned the strongest source is the one kept.
        when offer_entitlements.source = 'meta_ads'
          or (offer_entitlements.source = 'google_ads' and excluded.source in ('meta_catalog', 'site_visit'))
          or (offer_entitlements.source = 'meta_catalog' and excluded.source = 'site_visit')
          then offer_entitlements.qualifying_arrival_id
        when excluded.source = 'meta_ads'
          or (excluded.source = 'google_ads' and offer_entitlements.source in ('meta_catalog', 'site_visit'))
          or (excluded.source = 'meta_catalog' and offer_entitlements.source = 'site_visit')
          then excluded.qualifying_arrival_id
        else coalesce(offer_entitlements.qualifying_arrival_id, excluded.qualifying_arrival_id)
      end,
      updated_at = case
        when offer_entitlements.revoked_at is not null
          or offer_entitlements.expires_at <= v_now
          then offer_entitlements.updated_at
        else v_now
      end
  returning * into v_row;

  return jsonb_build_object(
    'token', v_row.token,
    'source', v_row.source,
    'started_at', v_row.started_at,
    'expires_at', v_row.expires_at,
    'revoked', v_row.revoked_at is not null
  );
end;
$function$;

revoke execute on function public.issue_paid_offer_entitlement(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.issue_paid_offer_entitlement(uuid, text, uuid)
  to service_role;
