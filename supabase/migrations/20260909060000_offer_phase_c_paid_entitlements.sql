-- Offer Phase C — seven-day paid-visitor entitlement authority.
--
-- The public SOFAEXTRA code remains shareable. This table adds a second
-- authorisation route for paid arrivals without creating a second discount
-- calculator: both routes still resolve through calculate_order_offer.

create table public.offer_entitlements (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  visitor_id uuid not null,
  source text not null check (source = any (array['google_ads'::text, 'meta_ads'::text])),
  qualifying_arrival_id uuid,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offer_entitlements_token_key unique (token),
  constraint offer_entitlements_visitor_key unique (visitor_id),
  constraint offer_entitlements_expiry_after_start check (expires_at > started_at)
);

alter table public.offer_entitlements enable row level security;
revoke all on table public.offer_entitlements from public, anon, authenticated;
grant select, insert, update, delete on table public.offer_entitlements to service_role;

-- Issue or refresh the one automatic-offer entitlement associated with this
-- browser visitor id. A fresh paid click while the row is still active keeps
-- the same token and started_at, so prompt dismissal cannot be reset by another
-- ad click. It only slides expires_at to seven days after the newest qualifying
-- click. An expired/revoked row gets a new opaque token and a new presentation
-- identity.
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

  if p_source is null or p_source <> all (array['google_ads'::text, 'meta_ads'::text]) then
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
      source = excluded.source,
      qualifying_arrival_id = excluded.qualifying_arrival_id,
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

revoke execute on function public.issue_paid_offer_entitlement(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.issue_paid_offer_entitlement(uuid, text, uuid) to service_role;

-- Extend the Phase B calculator rather than duplicating its tier map or money
-- logic. A token is authority only when it exists server-side, is unrevoked and
-- has not expired. Manual SOFAEXTRA wins the audit-source preference when both
-- routes are present, but the calculation still runs exactly once.
create or replace function public.calculate_order_offer(
  p_items jsonb,
  p_promotion_code text default null,
  p_offer_entitlement_token uuid default null
)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_items_subtotal numeric := 0;
  v_normalized_code text := nullif(upper(btrim(coalesce(p_promotion_code, ''))), '');
  v_code_valid boolean := false;
  v_entitlement_valid boolean := false;
  v_discount_tier text := null;
  v_tier_amount numeric := 0;
  v_discount_amount numeric := 0;
  v_offer_source text := null;
begin
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'check_violation';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    left join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
    left join public.products p on p.id = pv.product_id
    where pv.id is null or coalesce(p.is_active, false) = false
  ) then
    raise exception 'UNAVAILABLE_ITEMS' using errcode = 'check_violation';
  end if;

  select coalesce(sum((p.base_price + coalesce(pv.price_adjustment, 0)) *
                      least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99)), 0)
  into v_items_subtotal
  from jsonb_array_elements(p_items) item
  join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
  join public.products p on p.id = pv.product_id;

  v_code_valid := coalesce(v_normalized_code = 'SOFAEXTRA', false);

  if p_offer_entitlement_token is not null then
    select exists (
      select 1
      from public.offer_entitlements oe
      where oe.token = p_offer_entitlement_token
        and oe.revoked_at is null
        and oe.expires_at > now()
    ) into v_entitlement_valid;
  end if;

  if v_code_valid or v_entitlement_valid then
    select ranked.tier
    into v_discount_tier
    from (
      select distinct opt.tier,
        case opt.tier
          when 'ELECTRIC' then 4
          when 'ROMA' then 3
          when 'STANDARD' then 2
          when 'EXCLUDED' then 1
          else 0
        end as priority
      from jsonb_array_elements(p_items) item
      join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
      join public.offer_product_tiers opt on opt.product_id = pv.product_id
    ) ranked
    order by ranked.priority desc
    limit 1;

    v_tier_amount := case v_discount_tier
      when 'ELECTRIC' then 50
      when 'ROMA' then 30
      when 'STANDARD' then 20
      else 0
    end;

    v_discount_amount := least(v_items_subtotal, v_tier_amount);
    v_offer_source := case
      when v_code_valid then 'manual_code'
      when v_entitlement_valid then 'paid_entitlement'
      else null
    end;
  end if;

  return jsonb_build_object(
    'items_subtotal', v_items_subtotal,
    'code_valid', v_code_valid,
    'entitlement_valid', v_entitlement_valid,
    'normalized_code', case when v_code_valid then 'SOFAEXTRA' else null end,
    'discount_amount', v_discount_amount,
    'discount_tier', v_discount_tier,
    'promotion_code', case when v_code_valid then 'SOFAEXTRA' else null end,
    'offer_source', v_offer_source
  );
end;
$function$;

revoke execute on function public.calculate_order_offer(jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.calculate_order_offer(jsonb, text, uuid) to service_role;
