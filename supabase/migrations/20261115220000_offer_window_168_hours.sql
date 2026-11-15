-- Run 9 (15 Nov 2026, owner decision): the one-time visitor offer window
-- becomes SEVEN DAYS (168 hours).
--   1. shop_settings row and column default -> 168; the issuing function's
--      fallback -> 168.
--   2. Each window that is STILL OPEN, unrevoked and exactly 96 hours long is
--      extended ONCE to started_at + 168 hours. started_at, the visitor, the
--      token and the source are untouched. Expired and revoked windows stay as
--      they are; nothing is reopened; no new window is issued to anyone.
--   3. The browser cookie: the shop's first page of every visit asks
--      /api/offer/qualify, which returns the visitor's EXISTING row (by the
--      first-party visitor id) and re-sets the HttpOnly cookie to the row's own
--      remaining time. So a cookie that was set to end at 96 h is replaced by
--      one that ends at the new expiry, with the same token - never a new grant.
-- Rollback: see the bottom of this file.

alter table public.shop_settings alter column offer_window_hours set default 168;
update public.shop_settings set offer_window_hours = 168 where offer_window_hours <> 168;

create or replace function public.issue_paid_offer_entitlement(p_visitor_id uuid, p_source text, p_arrival_id uuid default null::uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_now timestamptz := now();
  v_row public.offer_entitlements%rowtype;
  v_s public.shop_settings%rowtype;
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

  select * into v_s from public.shop_settings limit 1;

  -- The offer switched off in Admin -> Settings: no new windows. A visitor
  -- who already has one gets it back untouched and it runs to its own
  -- deadline; anyone else gets an answer that has already ended, which the
  -- shop reads as "no offer" and sets no cookie for.
  if not coalesce(v_s.offer_enabled, true) then
    select * into v_row from public.offer_entitlements where visitor_id = p_visitor_id;
    if found then
      return jsonb_build_object(
        'token', v_row.token, 'source', v_row.source, 'started_at', v_row.started_at,
        'expires_at', v_row.expires_at, 'revoked', v_row.revoked_at is not null
      );
    end if;
    return jsonb_build_object(
      'token', gen_random_uuid(), 'source', p_source, 'started_at', v_now,
      'expires_at', v_now, 'revoked', true
    );
  end if;

  insert into public.offer_entitlements (
    token, visitor_id, source, qualifying_arrival_id,
    started_at, expires_at, revoked_at, updated_at
  )
  values (
    gen_random_uuid(), p_visitor_id, p_source, p_arrival_id,
    v_now, v_now + make_interval(hours => coalesce(v_s.offer_window_hours, 168)), null, v_now
  )
  on conflict (visitor_id) do update
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


-- One-off: open 96-hour windows become 168 hours from their own start.
update public.offer_entitlements
   set expires_at = started_at + interval '168 hours',
       updated_at = now()
 where revoked_at is null
   and expires_at > now()
   and expires_at = started_at + interval '96 hours';

update public.offer_codes
   set label = 'The visitor code (works inside the visitor''s own 7-day window)'
 where code = 'SOFAEXTRA';

-- Rollback (manual, only if ever needed): set offer_window_hours back to 96;
-- windows already extended keep their promised expiry (shortening a deadline a
-- customer has been shown is not recommended).
