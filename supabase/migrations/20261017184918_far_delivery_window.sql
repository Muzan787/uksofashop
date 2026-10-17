-- The delivery window for the areas that pay a distance charge (2026-10-17).
--
-- Muaz: the districts in delivery_distance_fees (Devon, Cornwall, the
-- Aberdeen area and the north of Scotland) take 5-7 days, against 2-4 for the
-- rest of the mainland. Two figures beside the existing window, so Admin ->
-- Settings holds both:
--   * far_window_from_days / far_window_to_days - 5 and 7, counted in
--     delivery days (every day but Monday, which is the one day the vans do
--     not go out). The shop shows these dates once a postcode in a charged
--     area is entered; place_order uses the end of it as the earliest day a
--     customer there may choose (the next migration).
--   * save_shop_settings checks and saves them like the others.
--
-- Nothing reads the new columns until the code that knows them is live, and
-- every reader falls back to 5 and 7.

alter table public.shop_settings
  add column if not exists far_window_from_days integer not null default 5,
  add column if not exists far_window_to_days integer not null default 7;

alter table public.shop_settings drop constraint if exists shop_settings_far_window;
alter table public.shop_settings add constraint shop_settings_far_window check (
  far_window_from_days >= 0 and far_window_to_days >= far_window_from_days and far_window_to_days <= 60);

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
                                'delivery_window_from_days', 'delivery_window_to_days',
                                'far_window_from_days', 'far_window_to_days', 'preferred_earliest_days',
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
  v.far_window_from_days := coalesce((p ->> 'far_window_from_days')::integer, v.far_window_from_days);
  v.far_window_to_days := coalesce((p ->> 'far_window_to_days')::integer, v.far_window_to_days);
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
  if v.far_window_to_days < v.far_window_from_days then raise exception 'WINDOW_ORDER'; end if;
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
    far_window_from_days = v.far_window_from_days, far_window_to_days = v.far_window_to_days,
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
