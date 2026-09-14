-- Phase 4C follow-up: preserve the strongest trustworthy acquisition source
-- while an entitlement is active. A later catalogue visit must not downgrade
-- a normal paid-Meta or Google qualification.

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
    'meta_catalog'::text
  ]) then
    raise exception 'INVALID_OFFER_SOURCE' using errcode = 'check_violation';
  end if;

  insert into public.offer_entitlements (
    token, visitor_id, source, qualifying_arrival_id,
    started_at, expires_at, revoked_at, updated_at
  )
  values (
    gen_random_uuid(), p_visitor_id, p_source, p_arrival_id,
    v_now, v_now + interval '7 days', null, v_now
  )
  on conflict (visitor_id) do update
  set token = case
        when offer_entitlements.revoked_at is null
         and offer_entitlements.expires_at > v_now
          then offer_entitlements.token
        else gen_random_uuid()
      end,
      source = case
        when offer_entitlements.revoked_at is not null
          or offer_entitlements.expires_at <= v_now
          then excluded.source
        when offer_entitlements.source = 'meta_ads'
          or excluded.source = 'meta_ads'
          then 'meta_ads'
        when offer_entitlements.source = 'google_ads'
          or excluded.source = 'google_ads'
          then 'google_ads'
        else 'meta_catalog'
      end,
      qualifying_arrival_id = case
        when offer_entitlements.revoked_at is not null
          or offer_entitlements.expires_at <= v_now
          then excluded.qualifying_arrival_id
        when offer_entitlements.source = 'meta_ads'
          or (
            offer_entitlements.source = 'google_ads'
            and excluded.source = 'meta_catalog'
          )
          then offer_entitlements.qualifying_arrival_id
        when excluded.source = 'meta_ads'
          or (
            excluded.source = 'google_ads'
            and offer_entitlements.source = 'meta_catalog'
          )
          then excluded.qualifying_arrival_id
        else coalesce(offer_entitlements.qualifying_arrival_id, excluded.qualifying_arrival_id)
      end,
      started_at = case
        when offer_entitlements.revoked_at is null
         and offer_entitlements.expires_at > v_now
          then offer_entitlements.started_at
        else v_now
      end,
      expires_at = v_now + interval '7 days',
      revoked_at = null,
      updated_at = v_now
  returning * into v_row;

  return jsonb_build_object(
    'token', v_row.token,
    'source', v_row.source,
    'started_at', v_row.started_at,
    'expires_at', v_row.expires_at
  );
end;
$function$;

revoke execute on function public.issue_paid_offer_entitlement(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.issue_paid_offer_entitlement(uuid, text, uuid)
  to service_role;
