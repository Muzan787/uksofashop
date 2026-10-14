-- What the order page and the orders list need (admin upgrade Phase 6).
--
--   * orders.channel - how an order taken by staff came in: 'whatsapp' or
--     'phone' (G1). Informational only: orders.source stays 'whatsapp' for
--     every order taken by hand, exactly as before, so what Meta, Google and
--     OrderFlow receive does not change. Website orders leave it empty.
--   * search_orders(q) - the orders list's search box (D3): the order code
--     (8 characters or the full id), name, email, postcode with or without its
--     space, and phone with or without spaces or +44. Admins only.
--   * order_orderflow_sends(order) - each time this order was sent to
--     OrderFlow and its answer (E9). orderflow.sends stays server-only; this
--     admin-only function is the window onto one order's rows.
--   * send_order_to_orderflow(order) - "Send to OrderFlow now" (E9): the same
--     push_order() as every other send, labelled by_hand. Same payload, same
--     address; test orders go like any other (decision 7).

alter table public.orders
  add column if not exists channel text;

alter table public.orders drop constraint if exists orders_channel_check;
alter table public.orders
  add constraint orders_channel_check check (channel is null or channel in ('whatsapp', 'phone'));

comment on column public.orders.channel is
  'How staff took the order: whatsapp or phone. Null for website orders. Shown in the admin only; source is unchanged.';

-- Every order taken by hand so far came in on WhatsApp.
update public.orders set channel = 'whatsapp' where source = 'whatsapp' and channel is null;

create or replace function private.set_order_channel(p_order_id uuid, p_channel text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.require_admin();
  if p_channel is not null and p_channel not in ('whatsapp', 'phone') then
    raise exception 'BAD_CHANNEL';
  end if;
  update public.orders set channel = p_channel where id = p_order_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$function$;

-- ── Search ────────────────────────────────────────────────────────────────
create or replace function private.search_orders(p_query text)
 returns setof uuid
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  -- Only letters, digits, spaces and the few characters an email or a
  -- reference uses; everything else is dropped before it is matched.
  v_q text := btrim(regexp_replace(coalesce(p_query, ''), '[^A-Za-z0-9@._+ -]', '', 'g'));
  v_compact text;
  v_hex text;
  v_digits text;
begin
  perform private.require_admin();
  if length(v_q) < 2 then
    return;
  end if;

  v_compact := upper(replace(v_q, ' ', ''));
  v_hex := lower(replace(v_q, '-', ''));
  v_digits := regexp_replace(v_q, '\D', '', 'g');
  if v_digits like '44%' then
    v_digits := '0' || substr(v_digits, 3);
  end if;

  return query
  select o.id
    from public.orders o
   where (v_hex ~ '^[0-9a-f]{4,32}$' and replace(o.id::text, '-', '') like v_hex || '%')
      or o.customer_name ilike '%' || v_q || '%'
      or o.customer_email ilike '%' || v_q || '%'
      or (length(v_compact) >= 3 and upper(replace(coalesce(o.shipping_address, ''), ' ', '')) like '%' || v_compact || '%')
      or (length(v_digits) >= 4
          and regexp_replace(regexp_replace(coalesce(o.customer_phone, ''), '\D', '', 'g'), '^44', '0') like '%' || v_digits || '%')
   order by o.created_at desc
   limit 500;
end;
$function$;

-- ── OrderFlow, one order at a time ────────────────────────────────────────
create or replace function private.order_orderflow_sends(p_order_id uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  perform private.require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'sent_at', s.sent_at, 'source', s.source, 'by_hand', s.by_hand,
             'answered_at', s.answered_at, 'status_code', s.status_code, 'ok', s.ok,
             'outcome', s.outcome, 'message', s.message, 'order_number', s.order_number,
             'error', s.error)
           order by s.sent_at desc)
      from (
        select * from orderflow.sends
         where order_id = p_order_id
         order by sent_at desc
         limit 20
      ) s
  ), '[]'::jsonb);
end;
$function$;

create or replace function private.send_order_to_orderflow(p_order_id uuid)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.require_admin();
  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'NOT_FOUND';
  end if;
  if not exists (select 1 from vault.secrets where name in ('orderflow_ingest_url', 'orderflow_ingest_key') having count(*) = 2) then
    raise exception 'ORDERFLOW_OFF';
  end if;
  perform set_config('orderflow.send_source', 'by_hand', true);
  perform orderflow.push_order(p_order_id);
  perform set_config('orderflow.send_source', '', true);
  return true;
end;
$function$;

revoke all on function private.set_order_channel(uuid, text) from public, anon, authenticated;
revoke all on function private.search_orders(text) from public, anon, authenticated;
revoke all on function private.order_orderflow_sends(uuid) from public, anon, authenticated;
revoke all on function private.send_order_to_orderflow(uuid) from public, anon, authenticated;
grant execute on function private.set_order_channel(uuid, text) to authenticated;
grant execute on function private.search_orders(text) to authenticated;
grant execute on function private.order_orderflow_sends(uuid) to authenticated;
grant execute on function private.send_order_to_orderflow(uuid) to authenticated;

create or replace function public.set_order_channel(p_order_id uuid, p_channel text)
 returns void language sql security invoker set search_path to ''
as $function$ select private.set_order_channel(p_order_id, p_channel); $function$;

create or replace function public.search_orders(p_query text)
 returns setof uuid language sql stable security invoker set search_path to ''
as $function$ select * from private.search_orders(p_query); $function$;

create or replace function public.order_orderflow_sends(p_order_id uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$ select private.order_orderflow_sends(p_order_id); $function$;

create or replace function public.send_order_to_orderflow(p_order_id uuid)
 returns boolean language sql security invoker set search_path to ''
as $function$ select private.send_order_to_orderflow(p_order_id); $function$;

revoke all on function public.set_order_channel(uuid, text) from public, anon, authenticated;
revoke all on function public.search_orders(text) from public, anon, authenticated;
revoke all on function public.order_orderflow_sends(uuid) from public, anon, authenticated;
revoke all on function public.send_order_to_orderflow(uuid) from public, anon, authenticated;
grant execute on function public.set_order_channel(uuid, text) to authenticated;
grant execute on function public.search_orders(text) to authenticated;
grant execute on function public.order_orderflow_sends(uuid) to authenticated;
grant execute on function public.send_order_to_orderflow(uuid) to authenticated;
