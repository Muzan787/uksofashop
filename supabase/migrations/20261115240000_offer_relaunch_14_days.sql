-- Run 10 (15 Nov 2026, owner's final decision): the offer is relaunched with a
-- 14-DAY (336-hour) window, ONCE per visitor, from their first storefront
-- visit after this release - new visitors, visitors whose earlier window ended,
-- visitors with an earlier window still open, and past customers alike.
--
-- How (generation-versioned, server-decided, atomic):
--   * shop_settings.offer_generation names the current grant generation and
--     offer_generation_started_at records when it went live (set once here).
--   * offer_entitlements.generation records which generation a row belongs to
--     (every existing row: NULL = before the relaunch).
--   * issue_paid_offer_entitlement, called by /api/offer/qualify on the first
--     storefront page of a visit:
--       - no row: insert one row of the current generation (336 h);
--       - row of an EARLIER generation (open or ended), not revoked: archive it
--         to private.offer_entitlement_history, then rotate THAT row once:
--         new token, started_at = now, expires_at = now + 336 h, generation =
--         current, source/arrival = this arrival (promotional, not evidence of
--         a new ad click);
--       - row of the CURRENT generation: returned unchanged, open or ended -
--         reloads, revisits, tabs and code spellings never move it; there is no
--         second grant in this generation;
--       - revoked row (an explicit block): returned unchanged, never regranted.
--     The row is locked (FOR UPDATE) before the decision, so parallel tabs make
--     exactly one grant.
--   * Nothing is granted at deployment: no row is touched by this migration.
--   * Orders, their acquisition evidence and conversion records are untouched.

alter table public.shop_settings alter column offer_window_hours set default 336;
update public.shop_settings set offer_window_hours = 336 where offer_window_hours <> 336;

alter table public.shop_settings add column if not exists offer_generation text;
alter table public.shop_settings add column if not exists offer_generation_started_at timestamptz;
update public.shop_settings
   set offer_generation = 'run10_2026_11_15_14d',
       offer_generation_started_at = coalesce(offer_generation_started_at, now())
 where offer_generation is distinct from 'run10_2026_11_15_14d';

alter table public.offer_entitlements add column if not exists generation text;

create table if not exists private.offer_entitlement_history (
  id bigserial primary key,
  visitor_id uuid not null,
  previous_token_hash text not null,
  previous_source text,
  previous_qualifying_arrival_id uuid,
  previous_started_at timestamptz,
  previous_expires_at timestamptz,
  previous_generation text,
  new_generation text not null,
  reason text not null,
  archived_at timestamptz not null default now()
);
revoke all on private.offer_entitlement_history from public, anon, authenticated;
create index if not exists offer_entitlement_history_visitor on private.offer_entitlement_history (visitor_id);

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
  v_gen text;
  v_hours integer;
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
  v_gen := v_s.offer_generation;
  v_hours := coalesce(v_s.offer_window_hours, 336);

  -- The offer switched off in Admin -> Settings: no new windows. A visitor
  -- who already has one gets it back untouched; anyone else gets an answer
  -- that has already ended, which the shop reads as "no offer".
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

  -- 1. A brand-new visitor: one row of the current generation.
  insert into public.offer_entitlements (
    token, visitor_id, source, qualifying_arrival_id,
    started_at, expires_at, revoked_at, updated_at, generation
  )
  values (
    gen_random_uuid(), p_visitor_id, p_source, p_arrival_id,
    v_now, v_now + make_interval(hours => v_hours), null, v_now, v_gen
  )
  on conflict (visitor_id) do nothing
  returning * into v_row;

  if not found then
    -- 2. An existing visitor: lock the row, then decide once.
    select * into v_row from public.offer_entitlements where visitor_id = p_visitor_id for update;

    if v_row.revoked_at is null and v_gen is not null and v_row.generation is distinct from v_gen then
      -- First visit since the relaunch: archive, then one fresh window.
      insert into private.offer_entitlement_history (
        visitor_id, previous_token_hash, previous_source, previous_qualifying_arrival_id,
        previous_started_at, previous_expires_at, previous_generation, new_generation, reason
      ) values (
        v_row.visitor_id, md5(v_row.token::text), v_row.source, v_row.qualifying_arrival_id,
        v_row.started_at, v_row.expires_at, v_row.generation, v_gen,
        case when v_row.expires_at > v_now then 'relaunch_regrant_from_open_window' else 'relaunch_regrant_from_ended_window' end
      );
      update public.offer_entitlements
         set token = gen_random_uuid(),
             source = p_source,
             qualifying_arrival_id = p_arrival_id,
             started_at = v_now,
             expires_at = v_now + make_interval(hours => v_hours),
             generation = v_gen,
             updated_at = v_now
       where visitor_id = p_visitor_id
      returning * into v_row;
    elsif v_row.revoked_at is null and v_row.expires_at > v_now then
      -- Same generation, still open: credit a later ad arrival without moving the deadline.
      update public.offer_entitlements
         set source = case
               when v_row.source = 'meta_ads' or p_source = 'meta_ads' then 'meta_ads'
               when v_row.source = 'google_ads' or p_source = 'google_ads' then 'google_ads'
               when v_row.source = 'meta_catalog' or p_source = 'meta_catalog' then 'meta_catalog'
               else 'site_visit' end,
             qualifying_arrival_id = case
               when v_row.source = 'meta_ads'
                 or (v_row.source = 'google_ads' and p_source in ('meta_catalog', 'site_visit'))
                 or (v_row.source = 'meta_catalog' and p_source = 'site_visit')
                 then v_row.qualifying_arrival_id
               when p_source = 'meta_ads'
                 or (p_source = 'google_ads' and v_row.source in ('meta_catalog', 'site_visit'))
                 or (p_source = 'meta_catalog' and v_row.source = 'site_visit')
                 then p_arrival_id
               else coalesce(v_row.qualifying_arrival_id, p_arrival_id) end,
             updated_at = v_now
       where visitor_id = p_visitor_id
      returning * into v_row;
    end if;
    -- Otherwise (current generation ended, or revoked): returned unchanged.
  end if;

  return jsonb_build_object(
    'token', v_row.token,
    'source', v_row.source,
    'started_at', v_row.started_at,
    'expires_at', v_row.expires_at,
    'revoked', v_row.revoked_at is not null
  );
end;
$function$;

update public.offer_codes
   set label = 'The visitor code (works inside the visitor''s own 14-day window)'
 where code = 'SOFAEXTRA';

-- Rollback (only if the launch fails): restore the 168-hour function from
-- 20261115220000 and set offer_window_hours = 168. Windows already granted in
-- this generation keep their promised 14-day expiry.
