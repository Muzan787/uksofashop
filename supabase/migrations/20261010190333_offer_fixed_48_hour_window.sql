-- The paid-traffic offer gets one fixed 48-hour window per visitor, so the
-- countdown the storefront now shows can be true.
--
-- Until now an entitlement lasted seven days and every later qualifying ad
-- click slid expires_at to seven days after THAT click - and an expired or
-- revoked one was simply issued again. A timer drawn over that would have
-- restarted every time someone came back from an ad, which is the fake
-- urgency the DMCC Act 2024 bans outright (and the CMA has acted on: Emma
-- Sleep, Wowcher). So, from here:
--
--   * A new entitlement runs 48 hours from the first qualifying click.
--     (Of the last 42 orders, 32 came within 48 hours of the first visit.)
--   * A later click never moves started_at or expires_at. The source may
--     still be upgraded while the window is open, as before.
--   * Once a window has ended - expired or revoked - it is never reissued.
--     The row comes back unchanged and the caller treats it as inactive.
--   * Rows issued under the old rule keep the expiry they already have; it
--     is no longer extended. Nobody's current offer is cut short.
--
-- And SOFAEXTRA, which until now took the same discount off for anyone who
-- typed it, works only for a visitor whose window is open. Otherwise the
-- code shown beside the timer would have outlived it. No order has ever used
-- the typed code (all 13 discounted orders since September came from the
-- entitlement itself), and it appears in no ad.

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
    v_now, v_now + interval '48 hours', null, v_now
  )
  on conflict (visitor_id) do update
  -- token, started_at, expires_at and revoked_at are deliberately absent:
  -- nothing a later click does can move the deadline or bring it back.
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
        else 'meta_catalog'
      end,
      qualifying_arrival_id = case
        when offer_entitlements.revoked_at is not null
          or offer_entitlements.expires_at <= v_now
          then offer_entitlements.qualifying_arrival_id
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

  if p_offer_entitlement_token is not null then
    select exists (
      select 1
      from public.offer_entitlements oe
      where oe.token = p_offer_entitlement_token
        and oe.revoked_at is null
        and oe.expires_at > now()
    ) into v_entitlement_valid;
  end if;

  -- The code is the visible name of the visitor's own window, not a second
  -- way in: it is valid only while that window is open.
  v_code_valid := coalesce(v_normalized_code = 'SOFAEXTRA', false) and v_entitlement_valid;

  if v_entitlement_valid then
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
    v_offer_source := 'paid_entitlement';
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
