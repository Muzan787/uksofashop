-- Five samples per request, not three.
--
-- The storefront moved from "three, free" to "up to five, £5 for the set,
-- refunded against a future order" - see the note in src/constants/swatches.ts
-- for why. The fee is settled on the phone call that already precedes every
-- posting, so nothing about payment is recorded here; the only thing the
-- database was enforcing, and the only thing that changes, is the count.
--
-- Both halves of the rule are rewritten, because there are two and they have
-- to agree. request_swatches() rejects an oversized array before it writes
-- anything, so a customer gets a sentence rather than a constraint violation;
-- the trigger is the one that cannot be talked out of, and catches anything
-- reaching the rows by another route.
--
-- Raising a limit is safe in a way that lowering it would not be: every
-- request already stored holds three or fewer, so nothing existing violates
-- five and no backfill is needed.
--
-- request_swatches() below is the body from 20260831100000_fabric_library.sql
-- with two numbers changed and nothing else. In particular the postcode is
-- still stored as upper(trim(...)) - /admin/swatches groups by it and the
-- confirmation reads it back, so normalising on the way in is load-bearing.

create or replace function public.enforce_swatch_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if (select count(*) from public.swatch_request_items
      where request_id = new.request_id) > 5 then
    raise exception 'SWATCH_LIMIT: at most 5 swatches per request'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;

drop trigger if exists swatch_limit on public.swatch_request_items;
create constraint trigger swatch_limit
  after insert on public.swatch_request_items
  deferrable initially immediate
  for each row execute function public.enforce_swatch_limit();

create or replace function public.request_swatches(
  p_customer_name    text,
  p_customer_email   text,
  p_customer_phone   text,
  p_postcode         text,
  p_shipping_address text,
  p_fabric_ids       uuid[],
  p_ip               text default null,
  p_user_agent       text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id      uuid;
  v_ids     uuid[];
  v_found   int;
begin
  -- Duplicates collapse rather than counting towards the five.
  select array_agg(distinct x) into v_ids from unnest(coalesce(p_fabric_ids, '{}'::uuid[])) as x;

  if v_ids is null or array_length(v_ids, 1) is null then
    raise exception 'NO_SWATCHES' using errcode = 'check_violation';
  end if;

  if array_length(v_ids, 1) > 5 then
    raise exception 'SWATCH_LIMIT: at most 5 swatches per request' using errcode = 'check_violation';
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

-- create or replace keeps existing privileges, but they are restated so this
-- file describes the whole function rather than relying on what came before.
revoke all on function public.request_swatches(text, text, text, text, text, uuid[], text, text) from public;
grant execute on function public.request_swatches(text, text, text, text, text, uuid[], text, text) to anon, authenticated;
