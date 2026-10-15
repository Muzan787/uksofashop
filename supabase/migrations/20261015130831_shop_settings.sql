-- Admin upgrade Phase 10: settings (M1-M4).
--
--   * shop_settings - one row holding the figures checkout charges and the
--     shop shows, filled with exactly today's figures: upstairs (first floor,
--     each extra floor, highest floor), assembly, removal per seat and the
--     seat limits, the delivery window and the days a customer can choose,
--     the offer tier amounts, the offer window length and the sample limit.
--     Plus two switches: the ad-visitor offer (M2) and OrderFlow (M4).
--     place_order, calculate_order_offer, issue_paid_offer_entitlement and
--     request_swatches read it instead of their own numbers; every read
--     falls back to today's figure, so a missing row changes nothing.
--     place_manual_order takes its delivery charge by hand and has its own
--     agreed-date rule, so nothing here applies to it.
--   * offer_codes (M3) - the codes an order can carry, seeded with the one
--     calculate_order_offer has always accepted (SOFAEXTRA, valid only inside
--     the 48-hour window). Orders keep the code as text.
--   * orderflow.push_order respects the OrderFlow switch. On (the default),
--     it sends exactly what it always sent.
--   * Admin functions: save_shop_settings, orderflow_status,
--     orderflow_collect_now, orderflow_send_test.
--
-- Trialled against production before applying: 2,890 baskets priced by the
-- old and new functions gave identical results.

-- ── The settings row ─────────────────────────────────────────────────────
create table if not exists public.shop_settings (
  id boolean primary key default true check (id),
  upstairs_first_floor numeric not null default 20,
  upstairs_per_extra_floor numeric not null default 10,
  max_floor integer not null default 20,
  assembly_fee numeric not null default 20,
  removal_per_seat numeric not null default 10,
  removal_min_seats integer not null default 1,
  removal_default_seats integer not null default 3,
  removal_max_seats integer not null default 10,
  delivery_window_from_days integer not null default 2,
  delivery_window_to_days integer not null default 4,
  preferred_earliest_days integer not null default 4,
  preferred_latest_days integer not null default 180,
  tier_electric numeric not null default 50,
  tier_roma numeric not null default 30,
  tier_standard numeric not null default 20,
  tier_excluded numeric not null default 0,
  offer_window_hours integer not null default 48,
  offer_enabled boolean not null default true,
  sample_limit integer not null default 5,
  orderflow_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint shop_settings_fees check (
    upstairs_first_floor between 0 and 1000 and upstairs_per_extra_floor between 0 and 1000
    and assembly_fee between 0 and 1000 and removal_per_seat between 0 and 1000),
  constraint shop_settings_floor check (max_floor between 1 and 50),
  constraint shop_settings_seats check (removal_min_seats >= 1 and removal_min_seats <= removal_default_seats
    and removal_default_seats <= removal_max_seats and removal_max_seats <= 30),
  constraint shop_settings_window check (delivery_window_from_days >= 0 and delivery_window_to_days >= delivery_window_from_days
    and delivery_window_to_days <= 60),
  constraint shop_settings_dates check (preferred_earliest_days >= 0 and preferred_latest_days > preferred_earliest_days
    and preferred_latest_days <= 365),
  constraint shop_settings_tiers check (tier_electric >= tier_roma and tier_roma >= tier_standard
    and tier_standard >= tier_excluded and tier_excluded >= 0 and tier_electric <= 1000),
  constraint shop_settings_offer check (offer_window_hours between 1 and 720),
  constraint shop_settings_samples check (sample_limit between 1 and 20)
);

comment on table public.shop_settings is
  'The one row of figures checkout charges and the shop shows (admin upgrade M1). Read by place_order, calculate_order_offer, issue_paid_offer_entitlement and request_swatches. Changed only through save_shop_settings().';

insert into public.shop_settings (id) values (true) on conflict (id) do nothing;

alter table public.shop_settings enable row level security;
revoke all on public.shop_settings from public, anon, authenticated;
grant select on public.shop_settings to anon, authenticated, service_role;
drop policy if exists "everyone reads the shop settings" on public.shop_settings;
create policy "everyone reads the shop settings" on public.shop_settings for select to public using (true);

-- ── Offer codes ──────────────────────────────────────────────────────────
create table if not exists public.offer_codes (
  code text primary key check (code ~ '^[A-Z0-9]{4,24}$'),
  label text check (label is null or length(label) <= 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.offer_codes is
  'Codes an order can carry (admin upgrade M3). A code is accepted only inside a visitor''s offer window; the discount comes from the window, the code labels the order. Orders keep the code as text, so deleting one never changes an order.';
insert into public.offer_codes (code, label) values ('SOFAEXTRA', 'The ad-visitor code (valid only inside the 48-hour window)')
  on conflict (code) do nothing;

alter table public.offer_codes enable row level security;
revoke all on public.offer_codes from public, anon, authenticated;
grant select, insert, update, delete on public.offer_codes to authenticated;
drop policy if exists "admins manage offer codes" on public.offer_codes;
create policy "admins manage offer codes" on public.offer_codes for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Whether a code is live; the only window the shop has onto the table.
create or replace function private.offer_code_active(p_code text)
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select exists (
    select 1 from public.offer_codes
     where code = upper(btrim(coalesce(p_code, ''))) and is_active
  );
$function$;
revoke all on function private.offer_code_active(text) from public;
grant execute on function private.offer_code_active(text) to anon, authenticated, service_role;

-- ── calculate_order_offer: tier amounts and codes from the tables ────────
create or replace function public.calculate_order_offer(p_items jsonb, p_promotion_code text default null::text, p_offer_entitlement_token uuid default null::uuid)
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
  v_s public.shop_settings%rowtype;
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

  -- A live code from Admin -> Settings (SOFAEXTRA until others are added),
  -- and only inside the visitor's offer window, as always.
  v_code_valid := v_normalized_code is not null and private.offer_code_active(v_normalized_code) and v_entitlement_valid;

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

    -- The tier amounts from Admin -> Settings; today's figures if the row is missing.
    select * into v_s from public.shop_settings limit 1;
    v_tier_amount := case v_discount_tier
      when 'ELECTRIC' then coalesce(v_s.tier_electric, 50)
      when 'ROMA' then coalesce(v_s.tier_roma, 30)
      when 'STANDARD' then coalesce(v_s.tier_standard, 20)
      when 'EXCLUDED' then coalesce(v_s.tier_excluded, 0)
      else 0
    end;

    v_discount_amount := least(v_items_subtotal, v_tier_amount);
    v_offer_source := 'paid_entitlement';
  end if;

  return jsonb_build_object(
    'items_subtotal', v_items_subtotal,
    'code_valid', v_code_valid,
    'entitlement_valid', v_entitlement_valid,
    'normalized_code', case when v_code_valid then v_normalized_code else null end,
    'discount_amount', v_discount_amount,
    'discount_tier', v_discount_tier,
    'promotion_code', case when v_code_valid then v_normalized_code else null end,
    'offer_source', v_offer_source
  );
end;
$function$;

-- ── issue_paid_offer_entitlement: the window length, and the switch ──────
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
    v_now, v_now + make_interval(hours => coalesce(v_s.offer_window_hours, 48)), null, v_now
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

-- ── place_order: the delivery figures and date window from the table ─────
create or replace function public.place_order(p_customer_name text, p_customer_email text, p_customer_phone text, p_shipping_address text, p_special_instructions text, p_items jsonb, p_expected_total numeric, p_delivery_floor integer default 0, p_delivery_has_lift boolean default false, p_wants_assembly boolean default false, p_wants_sofa_removal boolean default false, p_promotion_code text default null::text, p_offer_entitlement_token uuid default null::uuid, p_sofa_removal_seats integer default null::integer, p_preferred_delivery_date date default null::date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_order_id uuid;
  v_bad_fabrics text;
  v_offer jsonb;
  v_items_subtotal numeric;
  v_discount_amount numeric;
  v_discount_tier text;
  v_promotion_code text;
  v_offer_source text;
  v_has_mto boolean;
  v_floor int;
  v_upstairs numeric;
  v_assembly numeric;
  v_removal_seats int;
  v_removal numeric;
  v_postcode text;
  v_distance numeric;
  v_region text;
  v_delivery numeric;
  v_total numeric;
  v_today date;
  v_delivery_date date;
  v_s public.shop_settings%rowtype;
  v_earliest int;
  v_latest int;
begin
  -- The figures from Admin -> Settings; each falls back to today's.
  select * into v_s from public.shop_settings limit 1;
  v_earliest := coalesce(v_s.preferred_earliest_days, 4);
  v_latest := coalesce(v_s.preferred_latest_days, 180);

  v_today := (now() at time zone 'Europe/London')::date;
  v_delivery_date := p_preferred_delivery_date;
  if v_delivery_date is not null then
    if v_delivery_date < v_today + v_earliest then
      raise exception 'DELIVERY_DATE_TOO_SOON: earliest is %', v_today + v_earliest
        using errcode = 'check_violation';
    end if;
    if v_delivery_date > v_today + v_latest then
      raise exception 'DELIVERY_DATE_TOO_FAR: latest is %', v_today + v_latest
        using errcode = 'check_violation';
    end if;
  end if;

  v_offer := public.calculate_order_offer(p_items, p_promotion_code, p_offer_entitlement_token);
  v_items_subtotal := (v_offer->>'items_subtotal')::numeric;
  v_discount_amount := coalesce((v_offer->>'discount_amount')::numeric, 0);
  v_discount_tier := nullif(v_offer->>'discount_tier', '');
  v_promotion_code := nullif(v_offer->>'promotion_code', '');
  v_offer_source := nullif(v_offer->>'offer_source', '');

  select string_agg(distinct r.fabric_id::text, ', ')
  into v_bad_fabrics
  from (
    select nullif(item->>'fabric_id', '')::uuid as fabric_id
    from jsonb_array_elements(p_items) as item
  ) r
  left join public.fabrics f on f.id = r.fabric_id
  where r.fabric_id is not null
    and (f.id is null or f.is_active = false);

  if v_bad_fabrics is not null then
    raise exception 'UNAVAILABLE_FABRIC: %', v_bad_fabrics using errcode = 'check_violation';
  end if;

  select coalesce(bool_or(coalesce(p.custom_made, false)), false)
  into v_has_mto
  from jsonb_array_elements(p_items) item
  join public.product_variants pv on pv.id = (item->>'variant_id')::uuid
  join public.products p on p.id = pv.product_id;

  v_floor := greatest(0, least(coalesce(p_delivery_floor, 0), coalesce(v_s.max_floor, 20)));

  v_upstairs := case
    when v_floor <= 0 then 0
    when coalesce(p_delivery_has_lift, false) then coalesce(v_s.upstairs_first_floor, 20)
    else coalesce(v_s.upstairs_first_floor, 20) + (v_floor - 1) * coalesce(v_s.upstairs_per_extra_floor, 10)
  end;
  v_assembly := case when coalesce(p_wants_assembly, false) then coalesce(v_s.assembly_fee, 20) else 0 end;

  v_removal_seats := case
    when coalesce(p_wants_sofa_removal, false)
      then greatest(coalesce(v_s.removal_min_seats, 1),
                    least(coalesce(p_sofa_removal_seats, coalesce(v_s.removal_default_seats, 3)), coalesce(v_s.removal_max_seats, 10)))
    else null
  end;
  v_removal := coalesce(v_removal_seats, 0) * coalesce(v_s.removal_per_seat, 10);

  v_postcode := upper(substring(p_shipping_address from '([A-Za-z]{1,2}[0-9][0-9A-Za-z]?\s*[0-9][A-Za-z]{2})\s*$'));
  v_distance := public.delivery_distance_fee(v_postcode);
  select f.region into v_region
  from public.delivery_distance_fees f
  where f.outcode = upper(regexp_replace(btrim(coalesce(v_postcode, '')), '\s*[0-9][A-Za-z]{2}$', ''));

  v_delivery := v_upstairs + v_assembly + v_removal + v_distance;

  v_total := greatest(0, v_items_subtotal - v_discount_amount) + v_delivery;

  if round(v_total, 2) is distinct from round(coalesce(p_expected_total, -1), 2) then
    raise exception 'PRICE_MISMATCH: quoted % but current prices/offer give %',
      coalesce(p_expected_total, -1), v_total
      using errcode = 'check_violation';
  end if;

  insert into public.orders (
    customer_name, customer_email, customer_phone, shipping_address,
    special_instructions, status,
    items_subtotal, discount_amount, discount_tier, promotion_code, offer_source,
    delivery_floor, delivery_has_lift,
    fee_upstairs, wants_assembly, fee_assembly,
    wants_sofa_removal, sofa_removal_seats, fee_sofa_removal, fee_distance, delivery_region, delivery_total,
    total_amount, has_made_to_order, preferred_delivery_date
  )
  values (
    p_customer_name, p_customer_email, p_customer_phone, p_shipping_address,
    p_special_instructions, 'pending_cod',
    v_items_subtotal, v_discount_amount, v_discount_tier, v_promotion_code, v_offer_source,
    v_floor, coalesce(p_delivery_has_lift, false),
    v_upstairs, coalesce(p_wants_assembly, false), v_assembly,
    coalesce(p_wants_sofa_removal, false), v_removal_seats, v_removal, v_distance, v_region, v_delivery,
    v_total, v_has_mto, v_delivery_date
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, variant_id, quantity, price_at_time_of_purchase,
    fabric_id, fabric_code, fabric_name, fabric_collection,
    customisation
  )
  select v_order_id,
         r.variant_id,
         r.quantity,
         (p.base_price + coalesce(pv.price_adjustment, 0)),
         f.id,
         f.code,
         f.name,
         fc.name,
         r.customisation
  from (
    select (item->>'variant_id')::uuid as variant_id,
           nullif(item->>'fabric_id', '')::uuid as fabric_id,
           least(greatest(coalesce((item->>'quantity')::int, 1), 1), 99) as quantity,
           case when jsonb_typeof(item->'customisation') = 'object'
                then item->'customisation' else null end as customisation
    from jsonb_array_elements(p_items) as item
  ) r
  join public.product_variants pv on pv.id = r.variant_id
  join public.products p on p.id = pv.product_id
  left join public.fabrics f on f.id = r.fabric_id
  left join public.fabric_collections fc on fc.id = f.collection_id;

  return jsonb_build_object(
    'id', v_order_id,
    'items_subtotal', v_items_subtotal,
    'discount_amount', v_discount_amount,
    'discount_tier', v_discount_tier,
    'promotion_code', v_promotion_code,
    'offer_source', v_offer_source,
    'fee_distance', v_distance,
    'delivery_region', v_region,
    'delivery_total', v_delivery,
    'total_amount', v_total,
    'preferred_delivery_date', v_delivery_date
  );
end;
$function$;

-- ── request_swatches: the sample limit from the table ───────────────────
create or replace function private.request_swatches(p_customer_name text, p_customer_email text, p_customer_phone text, p_postcode text, p_shipping_address text, p_fabric_ids uuid[], p_ip text default null::text, p_user_agent text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_id      uuid;
  v_ids     uuid[];
  v_found   int;
  v_limit   int := coalesce((select s.sample_limit from public.shop_settings s limit 1), 5);
begin
  -- Duplicates collapse rather than counting towards the limit.
  select array_agg(distinct x) into v_ids from unnest(coalesce(p_fabric_ids, '{}'::uuid[])) as x;

  if v_ids is null or array_length(v_ids, 1) is null then
    raise exception 'NO_SWATCHES' using errcode = 'check_violation';
  end if;

  if array_length(v_ids, 1) > v_limit then
    raise exception 'SWATCH_LIMIT: at most % swatches per request', v_limit using errcode = 'check_violation';
  end if;

  select count(*) into v_found
  from public.fabrics f
  where f.id = any(v_ids) and f.is_active and f.is_swatchable;

  if v_found <> array_length(v_ids, 1) then
    raise exception 'UNAVAILABLE_FABRIC' using errcode = 'check_violation';
  end if;

  insert into public.swatch_requests (
    customer_name, customer_email, customer_phone,
    postcode, shipping_address, customer_ip, customer_user_agent
  )
  values (
    p_customer_name, p_customer_email, p_customer_phone,
    upper(trim(p_postcode)), p_shipping_address, p_ip, p_user_agent
  )
  returning id into v_id;

  insert into public.swatch_request_items (
    request_id, fabric_id, fabric_code, fabric_name, fabric_collection
  )
  select v_id, f.id, f.code, f.name, fc.name
  from public.fabrics f
  join public.fabric_collections fc on fc.id = f.collection_id
  where f.id = any(v_ids);

  return jsonb_build_object('id', v_id);
end;
$function$;

-- ── orderflow.push_order: the switch ─────────────────────────────────────
create or replace function orderflow.push_order(p_order_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  fn_url text;
  fn_key text;
  v_request bigint;
  v_source text;
begin
  select decrypted_secret into fn_url
    from vault.decrypted_secrets where name = 'orderflow_ingest_url';
  select decrypted_secret into fn_key
    from vault.decrypted_secrets where name = 'orderflow_ingest_key';

  -- Not configured yet: do nothing at all, quietly.
  if fn_url is null or fn_key is null then
    return;
  end if;

  -- Switched off in Admin -> Settings (admin upgrade M4): nothing is sent.
  -- Switched back on, the 15-minute re-send picks up recent orders that
  -- have no send.
  if not coalesce((select s.orderflow_enabled from public.shop_settings s limit 1), true) then
    return;
  end if;

  -- pg_net registers against the `extensions` schema but puts its functions in
  -- `net`, so that — not `extensions.net` — is the qualified name.
  v_request := net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-orderflow-key', fn_key),
    body := orderflow.order_payload(p_order_id),
    timeout_milliseconds := 10000
  );

  -- Record the send. Its own block: if this insert ever fails, the send above
  -- still stands - recording is never allowed to cost an order its push.
  begin
    v_source := coalesce(nullif(current_setting('orderflow.send_source', true), ''), 'change');
    insert into orderflow.sends (request_id, order_id, source, by_hand)
    values (v_request, p_order_id, v_source, v_source = 'by_hand');
  exception when others then
    raise warning 'orderflow send for order % was not recorded: %', p_order_id, sqlerrm;
  end;
end;
$function$;

-- ── Admin: saving the settings ───────────────────────────────────────────
create or replace function private.save_shop_settings(p jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v public.shop_settings%rowtype;
  v_key text;
  v_connected boolean;
begin
  perform private.require_admin();
  select * into v from public.shop_settings limit 1;
  if not found then
    insert into public.shop_settings (id) values (true) returning * into v;
  end if;

  -- Every figure must be a number; whole numbers where they count days, seats or floors.
  foreach v_key in array array['upstairs_first_floor', 'upstairs_per_extra_floor', 'assembly_fee', 'removal_per_seat',
                                'tier_electric', 'tier_roma', 'tier_standard', 'tier_excluded'] loop
    if p ? v_key and (jsonb_typeof(p -> v_key) <> 'number' or (p ->> v_key)::numeric < 0) then
      raise exception 'BAD_NUMBER' using detail = v_key;
    end if;
  end loop;
  foreach v_key in array array['max_floor', 'removal_min_seats', 'removal_default_seats', 'removal_max_seats',
                                'delivery_window_from_days', 'delivery_window_to_days', 'preferred_earliest_days',
                                'preferred_latest_days', 'offer_window_hours', 'sample_limit'] loop
    if p ? v_key and (jsonb_typeof(p -> v_key) <> 'number' or (p ->> v_key)::numeric <> trunc((p ->> v_key)::numeric) or (p ->> v_key)::numeric < 0) then
      raise exception 'BAD_WHOLE_NUMBER' using detail = v_key;
    end if;
  end loop;

  v.upstairs_first_floor := coalesce((p ->> 'upstairs_first_floor')::numeric, v.upstairs_first_floor);
  v.upstairs_per_extra_floor := coalesce((p ->> 'upstairs_per_extra_floor')::numeric, v.upstairs_per_extra_floor);
  v.max_floor := coalesce((p ->> 'max_floor')::integer, v.max_floor);
  v.assembly_fee := coalesce((p ->> 'assembly_fee')::numeric, v.assembly_fee);
  v.removal_per_seat := coalesce((p ->> 'removal_per_seat')::numeric, v.removal_per_seat);
  v.removal_min_seats := coalesce((p ->> 'removal_min_seats')::integer, v.removal_min_seats);
  v.removal_default_seats := coalesce((p ->> 'removal_default_seats')::integer, v.removal_default_seats);
  v.removal_max_seats := coalesce((p ->> 'removal_max_seats')::integer, v.removal_max_seats);
  v.delivery_window_from_days := coalesce((p ->> 'delivery_window_from_days')::integer, v.delivery_window_from_days);
  v.delivery_window_to_days := coalesce((p ->> 'delivery_window_to_days')::integer, v.delivery_window_to_days);
  v.preferred_earliest_days := coalesce((p ->> 'preferred_earliest_days')::integer, v.preferred_earliest_days);
  v.preferred_latest_days := coalesce((p ->> 'preferred_latest_days')::integer, v.preferred_latest_days);
  v.tier_electric := coalesce((p ->> 'tier_electric')::numeric, v.tier_electric);
  v.tier_roma := coalesce((p ->> 'tier_roma')::numeric, v.tier_roma);
  v.tier_standard := coalesce((p ->> 'tier_standard')::numeric, v.tier_standard);
  v.tier_excluded := coalesce((p ->> 'tier_excluded')::numeric, v.tier_excluded);
  v.offer_window_hours := coalesce((p ->> 'offer_window_hours')::integer, v.offer_window_hours);
  v.offer_enabled := coalesce((p ->> 'offer_enabled')::boolean, v.offer_enabled);
  v.sample_limit := coalesce((p ->> 'sample_limit')::integer, v.sample_limit);
  v.orderflow_enabled := coalesce((p ->> 'orderflow_enabled')::boolean, v.orderflow_enabled);

  -- The rules, as codes the admin turns into sentences.
  if v.delivery_window_to_days < v.delivery_window_from_days then raise exception 'WINDOW_ORDER'; end if;
  if v.preferred_latest_days <= v.preferred_earliest_days then raise exception 'DATES_ORDER'; end if;
  if not (v.tier_electric >= v.tier_roma and v.tier_roma >= v.tier_standard and v.tier_standard >= v.tier_excluded) then
    raise exception 'TIERS_ORDER';
  end if;
  if not (v.removal_min_seats >= 1 and v.removal_min_seats <= v.removal_default_seats and v.removal_default_seats <= v.removal_max_seats) then
    raise exception 'SEATS_ORDER';
  end if;
  if v.orderflow_enabled and not coalesce((select s.orderflow_enabled from public.shop_settings s limit 1), true) then
    select count(*) = 2 into v_connected from vault.secrets where name in ('orderflow_ingest_url', 'orderflow_ingest_key');
    if not v_connected then raise exception 'ORDERFLOW_NOT_CONNECTED'; end if;
  end if;

  update public.shop_settings set
    upstairs_first_floor = v.upstairs_first_floor, upstairs_per_extra_floor = v.upstairs_per_extra_floor,
    max_floor = v.max_floor, assembly_fee = v.assembly_fee, removal_per_seat = v.removal_per_seat,
    removal_min_seats = v.removal_min_seats, removal_default_seats = v.removal_default_seats, removal_max_seats = v.removal_max_seats,
    delivery_window_from_days = v.delivery_window_from_days, delivery_window_to_days = v.delivery_window_to_days,
    preferred_earliest_days = v.preferred_earliest_days, preferred_latest_days = v.preferred_latest_days,
    tier_electric = v.tier_electric, tier_roma = v.tier_roma, tier_standard = v.tier_standard, tier_excluded = v.tier_excluded,
    offer_window_hours = v.offer_window_hours, offer_enabled = v.offer_enabled, sample_limit = v.sample_limit,
    orderflow_enabled = v.orderflow_enabled, updated_at = now(), updated_by = auth.uid()
  where id;
exception
  when check_violation then
    raise exception 'OUT_OF_RANGE' using detail = sqlerrm;
end;
$function$;

-- ── Admin: the OrderFlow card ────────────────────────────────────────────
create or replace function private.orderflow_status()
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'connected', (select count(*) = 2 from vault.secrets where name in ('orderflow_ingest_url', 'orderflow_ingest_key')),
    'enabled', coalesce((select s.orderflow_enabled from public.shop_settings s limit 1), true),
    'test_order', (select jsonb_build_object('id', o.id, 'created_at', o.created_at)
                     from public.orders o where o.is_test order by o.created_at desc limit 1),
    'sends', coalesce((
      select jsonb_agg(jsonb_build_object(
               'order_id', x.order_id, 'sent_at', x.sent_at, 'source', x.source, 'answered_at', x.answered_at,
               'status_code', x.status_code, 'ok', x.ok, 'outcome', x.outcome, 'message', x.message,
               'order_number', x.order_number, 'error', x.error) order by x.sent_at desc)
        from (select * from orderflow.sends order by sent_at desc limit 20) x
    ), '[]'::jsonb)
  );
end;
$function$;

create or replace function private.orderflow_collect_now()
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.require_admin();
  perform orderflow.collect_answers();
end;
$function$;

-- Sends our most recent test order again. OrderFlow already has it, so it
-- updates rather than adding an order, and it goes exactly as every order
-- does (decision 7: unmarked, payload untouched).
create or replace function private.orderflow_send_test()
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_order uuid;
begin
  perform private.require_admin();
  if (select count(*) from vault.secrets where name in ('orderflow_ingest_url', 'orderflow_ingest_key')) <> 2 then
    raise exception 'ORDERFLOW_NOT_CONNECTED';
  end if;
  if not coalesce((select s.orderflow_enabled from public.shop_settings s limit 1), true) then
    raise exception 'ORDERFLOW_SWITCHED_OFF';
  end if;
  select o.id into v_order from public.orders o where o.is_test order by o.created_at desc limit 1;
  if v_order is null then raise exception 'NO_TEST_ORDER'; end if;
  perform set_config('orderflow.send_source', 'by_hand', true);
  perform orderflow.push_order(v_order);
  perform set_config('orderflow.send_source', '', true);
  return v_order;
end;
$function$;

-- ── Grants and wrappers ──────────────────────────────────────────────────
revoke all on function private.save_shop_settings(jsonb) from public, anon, authenticated;
revoke all on function private.orderflow_status() from public, anon, authenticated;
revoke all on function private.orderflow_collect_now() from public, anon, authenticated;
revoke all on function private.orderflow_send_test() from public, anon, authenticated;
grant execute on function private.save_shop_settings(jsonb) to authenticated;
grant execute on function private.orderflow_status() to authenticated;
grant execute on function private.orderflow_collect_now() to authenticated;
grant execute on function private.orderflow_send_test() to authenticated;

create or replace function public.save_shop_settings(p jsonb)
 returns void language sql security invoker set search_path to ''
as $function$ select private.save_shop_settings(p); $function$;
create or replace function public.orderflow_status()
 returns jsonb language sql stable security invoker set search_path to ''
as $function$ select private.orderflow_status(); $function$;
create or replace function public.orderflow_collect_now()
 returns void language sql security invoker set search_path to ''
as $function$ select private.orderflow_collect_now(); $function$;
create or replace function public.orderflow_send_test()
 returns uuid language sql security invoker set search_path to ''
as $function$ select private.orderflow_send_test(); $function$;

revoke all on function public.save_shop_settings(jsonb) from public, anon, authenticated;
revoke all on function public.orderflow_status() from public, anon, authenticated;
revoke all on function public.orderflow_collect_now() from public, anon, authenticated;
revoke all on function public.orderflow_send_test() from public, anon, authenticated;
grant execute on function public.save_shop_settings(jsonb) to authenticated;
grant execute on function public.orderflow_status() to authenticated;
grant execute on function public.orderflow_collect_now() to authenticated;
grant execute on function public.orderflow_send_test() to authenticated;
