\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create table public.orders (
  id uuid primary key,
  status text not null,
  customer_name text,
  total_amount numeric,
  shipping_address text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.orders enable row level security;

create or replace function public.confirm_order(p_order_id uuid)
returns table(
  id uuid,
  status text,
  customer_name text,
  total_amount numeric,
  shipping_address text,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.orders o set status = 'confirmed'
  where o.id = p_order_id and o.status = 'pending_cod';

  return query
  select o.id, o.status, o.customer_name, o.total_amount, o.shipping_address, o.created_at
  from public.orders o
  where o.id = p_order_id;
end;
$function$;

grant execute on function public.confirm_order(uuid) to public, anon, authenticated, service_role;
revoke all on public.orders from public, anon, authenticated, service_role;

create temp table function_before as
select
  p.oid::regprocedure::text as signature,
  p.prosecdef as security_definer,
  p.proconfig::text as proconfig,
  pg_get_userbyid(p.proowner) as owner_name,
  p.proacl::text as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'confirm_order';

insert into public.orders(id, status, customer_name, total_amount, shipping_address, created_at, confirmed_at) values
('00000000-0000-0000-0000-000000000001', 'pending_cod', 'QA Pending', 100, 'Test', '2026-09-07T10:00:00Z', null),
('00000000-0000-0000-0000-000000000002', 'confirmed', 'QA Confirmed', 100, 'Test', '2026-09-07T10:00:00Z', '2026-09-07T10:05:00Z'),
('00000000-0000-0000-0000-000000000003', 'confirmed', 'QA Legacy Null', 100, 'Test', '2026-09-07T10:00:00Z', null),
('00000000-0000-0000-0000-000000000004', 'cancelled', 'QA Cancelled', 100, 'Test', '2026-09-07T10:00:00Z', null),
('00000000-0000-0000-0000-000000000005', 'delivered', 'QA Delivered', 100, 'Test', '2026-09-07T10:00:00Z', '2026-09-07T10:06:00Z');

\i supabase/migrations/20260907140000_atomic_confirm_order_timestamp.sql

-- Function security/signature/ACL must survive CREATE OR REPLACE unchanged.
do $$
declare
  b record;
  a record;
begin
  select * into b from function_before;
  select
    p.oid::regprocedure::text as signature,
    p.prosecdef as security_definer,
    p.proconfig::text as proconfig,
    pg_get_userbyid(p.proowner) as owner_name,
    p.proacl::text as acl
  into a
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'confirm_order';

  if a.signature is distinct from b.signature then raise exception 'signature changed: % -> %', b.signature, a.signature; end if;
  if a.security_definer is distinct from true then raise exception 'SECURITY DEFINER lost'; end if;
  if a.proconfig is distinct from b.proconfig then raise exception 'search_path config changed: % -> %', b.proconfig, a.proconfig; end if;
  if a.owner_name is distinct from b.owner_name then raise exception 'owner changed: % -> %', b.owner_name, a.owner_name; end if;
  if a.acl is distinct from b.acl then raise exception 'ACL changed: % -> %', b.acl, a.acl; end if;
end $$;

-- Anonymous role has zero table privileges; confirmation must still work only
-- through the SECURITY DEFINER RPC.
set role anon;
select * from public.confirm_order('00000000-0000-0000-0000-000000000001');
reset role;

create temp table first_confirmation as
select status, confirmed_at
from public.orders
where id = '00000000-0000-0000-0000-000000000001';

select pg_sleep(0.05);

set role anon;
select * from public.confirm_order('00000000-0000-0000-0000-000000000001');
reset role;

-- Already-confirmed, legacy-null, cancelled, delivered and nonexistent calls
-- preserve the existing friendly return semantics without new transitions.
set role anon;
select * from public.confirm_order('00000000-0000-0000-0000-000000000002');
select * from public.confirm_order('00000000-0000-0000-0000-000000000003');
select * from public.confirm_order('00000000-0000-0000-0000-000000000004');
select * from public.confirm_order('00000000-0000-0000-0000-000000000005');
select * from public.confirm_order('00000000-0000-0000-0000-000000000099');
reset role;

do $$
declare
  first_status text;
  first_ts timestamptz;
  now_status text;
  now_ts timestamptz;
  c bigint;
begin
  select status, confirmed_at into first_status, first_ts from first_confirmation;
  if first_status <> 'confirmed' then raise exception 'first confirmation status was %', first_status; end if;
  if first_ts is null then raise exception 'first confirmation did not stamp confirmed_at'; end if;

  select status, confirmed_at into now_status, now_ts
  from public.orders where id = '00000000-0000-0000-0000-000000000001';
  if now_status <> 'confirmed' then raise exception 'repeat confirmation changed status to %', now_status; end if;
  if now_ts is distinct from first_ts then raise exception 'confirmed_at moved on repeat: % -> %', first_ts, now_ts; end if;

  if (select confirmed_at from public.orders where id = '00000000-0000-0000-0000-000000000002')
       is distinct from '2026-09-07T10:05:00Z'::timestamptz then
    raise exception 'already-confirmed timestamp changed';
  end if;

  if (select confirmed_at from public.orders where id = '00000000-0000-0000-0000-000000000003') is not null then
    raise exception 'legacy confirmed/null row was assigned a fabricated timestamp';
  end if;

  if (select status from public.orders where id = '00000000-0000-0000-0000-000000000004') <> 'cancelled' then
    raise exception 'cancelled order changed status';
  end if;
  if (select confirmed_at from public.orders where id = '00000000-0000-0000-0000-000000000004') is not null then
    raise exception 'cancelled order received confirmed_at';
  end if;

  if (select status from public.orders where id = '00000000-0000-0000-0000-000000000005') <> 'delivered' then
    raise exception 'delivered order changed status';
  end if;
  if (select confirmed_at from public.orders where id = '00000000-0000-0000-0000-000000000005')
       is distinct from '2026-09-07T10:06:00Z'::timestamptz then
    raise exception 'delivered order confirmation timestamp changed';
  end if;

  select count(*) into c from public.confirm_order('00000000-0000-0000-0000-000000000099');
  if c <> 0 then raise exception 'nonexistent order unexpectedly returned % rows', c; end if;
end $$;

select 'Tracking V2.1 atomic confirm_order database test PASS' as result;
