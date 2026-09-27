-- Additive Google-only foundation. No historical backfill, no financial RPC replacement.
create table public.google_phase2b_config (
  singleton boolean primary key default true check(singleton),
  eligible_from timestamptz not null default clock_timestamp(),
  policy_version text not null default 'ukss-google-2026-09-27-v1',
  sheet_id text not null default '18rbA__A2xyMk02EjXHqIFCq4g_CRRFlUrdqL9c0butU'
);
insert into public.google_phase2b_config(singleton) values(true);
create table public.google_consent_receipts (
  id uuid primary key, decision_id uuid not null, visitor_id uuid not null, session_id uuid not null, arrival_id uuid not null,
  ad_storage text not null check(ad_storage in ('granted','denied')),
  analytics_storage text not null check(analytics_storage in ('granted','denied')),
  ad_user_data text not null check(ad_user_data in ('granted','denied')),
  ad_personalization text not null check(ad_personalization in ('granted','denied')),
  captured_at timestamptz not null, received_at timestamptz not null default clock_timestamp(),
  policy_version text not null, surface text not null check(surface='cookie_banner'),
  reason text not null check(reason in ('granted','denied','revoked'))
);
create index google_consent_visitor_time on public.google_consent_receipts(visitor_id,captured_at desc);
create table public.google_order_consent (
  order_id uuid primary key references public.orders(id),
  receipt_id uuid not null references public.google_consent_receipts(id),
  attached_at timestamptz not null default clock_timestamp()
);
create table public.google_conversion_outbox (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
  stage text not null check(stage in ('confirmed','delivered')), conversion_time timestamptz not null,
  value numeric(14,2) not null check(value>=0), currency text not null default 'GBP' check(currency='GBP'),
  conversion_action_id text not null, conversion_name text not null, receipt_id uuid not null references public.google_consent_receipts(id),
  schema_version integer not null default 1 check(schema_version=1),
  acquisition jsonb not null default '{}'::jsonb, error_code text, retry_count integer not null default 0,
  status text not null default 'pending' check(status in ('pending','sheet_synced','held','withdrawn')),
  created_at timestamptz not null default clock_timestamp(), sheet_synced_at timestamptz,
  sheet_id text, payload_hash text, lease_id uuid, lease_until timestamptz,
  google_import_status text not null default 'not_verified' check(google_import_status in ('not_verified','accepted','rejected','adjustment_required','retracted')),
  unique(order_id,stage)
);
create index google_outbox_pending on public.google_conversion_outbox(created_at) where status='pending';
create table public.google_sheet_sync_runs (
  id uuid primary key, started_at timestamptz not null default clock_timestamp(), completed_at timestamptz,
  sheet_id text not null, verified_count integer not null default 0, verification jsonb,
  status text not null default 'started' check(status in ('started','verified','failed','empty'))
);
create table public.google_ga4_delivery (
  order_id uuid primary key references public.orders(id), conversion_time timestamptz not null,
  status text not null check(status in ('claimed','transport_accepted','ambiguous','held')),
  claimed_at timestamptz not null default clock_timestamp(), completed_at timestamptz, error_code text
);

create function public.google_phase2b_stage(p_order_id uuid) returns void language plpgsql
security definer set search_path='' as $$
declare o public.orders%rowtype; r public.google_consent_receipts%rowtype; c public.google_phase2b_config%rowtype;
begin
 select * into c from public.google_phase2b_config where singleton;
 select * into o from public.orders where id=p_order_id;
 if not found or o.created_at<c.eligible_from or o.utm_campaign='offer-test' or
   coalesce(o.utm_campaign,'') ~* '(qa|test|debug|probe)' then return; end if;
 select cr.* into r from public.google_order_consent oc join public.google_consent_receipts cr on cr.id=oc.receipt_id where oc.order_id=o.id;
 if not found or r.policy_version<>c.policy_version or r.captured_at<c.eligible_from then return; end if;
 if o.confirmed_at is not null then
  insert into public.google_conversion_outbox(order_id,stage,conversion_time,value,conversion_action_id,conversion_name,receipt_id,acquisition)
  values(o.id,'confirmed',o.confirmed_at,o.total_amount,'7800456388','UKSS - Confirmed Order',r.id,
    jsonb_build_object('visitor_id',o.visitor_id,'session_id',o.session_id,'arrival_id',o.arrival_id,'ga_client_id',o.ga_client_id,
    'gclid',o.gclid,'gbraid',o.gbraid,'wbraid',o.wbraid,'source',o.source,'utm_source',o.utm_source,'utm_medium',o.utm_medium,
    'utm_campaign',o.utm_campaign,'utm_content',o.utm_content,'utm_term',o.utm_term)) on conflict(order_id,stage) do nothing;
 end if;
 if o.delivered_at is not null then
  insert into public.google_conversion_outbox(order_id,stage,conversion_time,value,conversion_action_id,conversion_name,receipt_id,acquisition)
  values(o.id,'delivered',o.delivered_at,o.total_amount,'7800456391','UKSS - Delivered Order',r.id,
    jsonb_build_object('visitor_id',o.visitor_id,'session_id',o.session_id,'arrival_id',o.arrival_id,'ga_client_id',o.ga_client_id,
    'gclid',o.gclid,'gbraid',o.gbraid,'wbraid',o.wbraid,'source',o.source,'utm_source',o.utm_source,'utm_medium',o.utm_medium,
    'utm_campaign',o.utm_campaign,'utm_content',o.utm_content,'utm_term',o.utm_term)) on conflict(order_id,stage) do nothing;
 end if;
 if o.cancelled_at is not null or o.status='cancelled' then
  update public.google_conversion_outbox set status=case when sheet_synced_at is null then 'held' else 'withdrawn' end,
    google_import_status=case when sheet_synced_at is null then google_import_status else 'adjustment_required' end where order_id=o.id;
 end if;
end $$;
create function public.google_phase2b_order_trigger() returns trigger language plpgsql
security definer set search_path='' as $$ begin
 perform public.google_phase2b_stage(new.id); return new;
exception when others then raise warning 'Google staging failed: %',sqlstate; return new; end $$;
create trigger google_phase2b_lifecycle after update of confirmed_at,delivered_at,cancelled_at,status on public.orders
for each row execute function public.google_phase2b_order_trigger();

create function public.google_phase2b_attach_consent(p_order_id uuid,p_receipt_id uuid,p_visitor_id uuid,p_session_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$ begin
 insert into public.google_order_consent(order_id,receipt_id)
 select o.id,r.id from public.orders o join public.google_consent_receipts r on r.id=p_receipt_id
 cross join public.google_phase2b_config c
 where o.id=p_order_id and o.visitor_id=p_visitor_id and o.session_id=p_session_id and
 r.visitor_id=p_visitor_id and r.session_id=p_session_id and o.created_at>=c.eligible_from and
 r.captured_at>=c.eligible_from and r.captured_at<=o.created_at and r.policy_version=c.policy_version
 and not exists(select 1 from public.google_consent_receipts newer where newer.visitor_id=r.visitor_id and newer.captured_at>r.captured_at)
 on conflict(order_id) do nothing;
 perform public.google_phase2b_stage(p_order_id);
 return exists(select 1 from public.google_order_consent where order_id=p_order_id);
end $$;

create function public.google_phase2b_consent_valid(p_receipt_id uuid,p_analytics boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.google_consent_receipts r cross join public.google_phase2b_config c
 where r.id=p_receipt_id and r.policy_version=c.policy_version and r.ad_user_data='granted' and r.ad_personalization='granted'
 and r.ad_storage='granted' and (not p_analytics or r.analytics_storage='granted') and r.reason='granted'
 and not exists(select 1 from public.google_consent_receipts x where x.visitor_id=r.visitor_id
 and x.captured_at>=r.captured_at and (x.ad_user_data<>'granted' or x.ad_personalization<>'granted' or x.ad_storage<>'granted' or x.analytics_storage<>'granted')))
$$;
-- Reuse only the existing exact WhatsApp enquiry/order linkage, never a guessed customer match.
create function public.google_phase2b_attach_whatsapp(p_order_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$ begin
 insert into public.google_order_consent(order_id,receipt_id)
 select o.id,r.id from public.orders o join public.whatsapp_enquiries w
 on w.reference=o.whatsapp_reference and w.converted_order_id=o.id
 join public.google_consent_receipts r on r.visitor_id=w.visitor_id and r.session_id=w.session_id and r.arrival_id=w.arrival_id
 cross join public.google_phase2b_config c where o.id=p_order_id and o.source='whatsapp'
 and o.visitor_id=w.visitor_id and o.created_at>=c.eligible_from and w.created_at>=c.eligible_from
 and r.captured_at>=c.eligible_from and r.captured_at<=w.created_at and r.policy_version=c.policy_version
 and public.google_phase2b_consent_valid(r.id)
 order by r.captured_at desc limit 1 on conflict(order_id) do nothing;
 perform public.google_phase2b_stage(p_order_id);
 return exists(select 1 from public.google_order_consent where order_id=p_order_id);
end $$;
create function public.google_phase2b_withdrawal_trigger() returns trigger language plpgsql
security definer set search_path='' as $$ begin
 if new.ad_user_data='denied' or new.analytics_storage='denied' or new.ad_personalization='denied' or new.ad_storage='denied' then
  update public.google_conversion_outbox q set status=case when q.sheet_synced_at is null then 'held' else 'withdrawn' end,
  google_import_status=case when q.sheet_synced_at is null then q.google_import_status else 'adjustment_required' end
  from public.google_consent_receipts r where q.receipt_id=r.id and r.visitor_id=new.visitor_id and r.captured_at<=new.captured_at;
 end if; return new;
end $$;
create trigger google_phase2b_withdrawal after insert on public.google_consent_receipts for each row
execute function public.google_phase2b_withdrawal_trigger();

-- Private service-only payload. Opaque internal IDs are NOT transmitted as Order ID.
create function public.google_phase2b_sheet_payload(p_id uuid) returns jsonb language plpgsql
stable security definer set search_path='' as $$
declare q public.google_conversion_outbox%rowtype; o public.orders%rowtype; r public.google_consent_receipts%rowtype;
 w public.whatsapp_enquiries%rowtype; email text; phone text; click text; braid text; webbraid text;
begin
 select * into q from public.google_conversion_outbox where id=p_id;
 if not found or q.status not in ('pending','sheet_synced') then return null; end if;
 select * into o from public.orders where id=q.order_id;
 select * into r from public.google_consent_receipts where id=q.receipt_id;
 if o.cancelled_at is not null or o.status='cancelled' or not public.google_phase2b_consent_valid(r.id) or
 q.conversion_time<o.created_at or q.conversion_time>clock_timestamp() or q.conversion_time<clock_timestamp()-interval '89 days' then return null; end if;
 if exists(select 1 from public.orders other where other.id<>o.id and upper(left(other.id::text,8))=upper(left(o.id::text,8))) then return null; end if;
 -- Linked WhatsApp acquisition is evidence only when the existing deterministic linkage belongs to this order and visitor.
 if o.whatsapp_reference is not null then select * into w from public.whatsapp_enquiries
 where reference=o.whatsapp_reference and converted_order_id=o.id and visitor_id=r.visitor_id; end if;
 click=nullif(coalesce(o.gclid,w.gclid),''); braid=nullif(coalesce(o.gbraid,w.gbraid),''); webbraid=nullif(coalesce(o.wbraid,w.wbraid),'');
 email=lower(btrim(o.customer_email));
 if email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then email=null; end if;
 if email ~ '@(gmail|googlemail)\.com$' then email=replace(split_part(email,'@',1),'.','')||'@'||split_part(email,'@',2); end if;
 phone=regexp_replace(coalesce(o.customer_phone,''),'[^0-9]','','g');
 if phone ~ '^07[0-9]{9}$' then phone='44'||substr(phone,2); end if;
 if phone ~ '^447[0-9]{9}$' then phone='+'||phone; else phone=null; end if;
 if click is null and braid is null and webbraid is null and email is null and phone is null then return null; end if;
 return jsonb_build_object('GCLID',coalesce(click,''),'GBRAID',coalesce(braid,''),'WBRAID',coalesce(webbraid,''),
 'Conversion Name',q.conversion_name,'Conversion Time',to_char(q.conversion_time at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')||'+00:00',
 'Conversion Value',q.value,'Conversion Currency','GBP','Order ID',upper(left(o.id::text,8)),
 'Email',case when email is null then '' else encode(extensions.digest(email,'sha256'),'hex') end,
 'Phone Number',case when phone is null then '' else encode(extensions.digest(phone,'sha256'),'hex') end,
 'Ad User Data','GRANTED','Ad Personalization','GRANTED');
end $$;

create function public.google_phase2b_claim_sheet(p_run_id uuid,p_limit integer default 200)
returns table(queue_id uuid,stage text,payload jsonb,payload_hash text) language plpgsql
security definer set search_path='' as $$ begin
 insert into public.google_sheet_sync_runs(id,sheet_id) select p_run_id,sheet_id from public.google_phase2b_config on conflict(id) do nothing;
 return query with candidates as (
 select q.id from public.google_conversion_outbox q where q.status='pending' and
 (q.lease_until is null or q.lease_until<clock_timestamp() or q.lease_id=p_run_id) and public.google_phase2b_sheet_payload(q.id) is not null
 order by q.created_at limit least(greatest(p_limit,1),200) for update skip locked
 ), claimed as (update public.google_conversion_outbox q set lease_id=p_run_id,lease_until=clock_timestamp()+interval '15 minutes'
 from candidates c where q.id=c.id returning q.id,q.stage)
 select c.id,c.stage,p.p,encode(extensions.digest(p.p::text,'sha256'),'hex') from claimed c
 cross join lateral(select public.google_phase2b_sheet_payload(c.id) p) p;
end $$;
create function public.google_phase2b_ack_sheet(p_run_id uuid,p_queue_id uuid,p_payload_hash text,p_sheet_id text,p_verification jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; current_payload jsonb;
begin
 if p_sheet_id<>(select sheet_id from public.google_phase2b_config) then return false; end if;
 current_payload=public.google_phase2b_sheet_payload(p_queue_id);
 if current_payload is null or p_payload_hash<>encode(extensions.digest(current_payload::text,'sha256'),'hex') then return false; end if;
 update public.google_conversion_outbox set status='sheet_synced',sheet_synced_at=clock_timestamp(),sheet_id=p_sheet_id,payload_hash=p_payload_hash,lease_until=null
 where id=p_queue_id and status='pending' and lease_id=p_run_id and lease_until>clock_timestamp();
 get diagnostics n=row_count;
 if n=1 then update public.google_sheet_sync_runs set verified_count=verified_count+1,verification=p_verification,status='verified',completed_at=clock_timestamp() where id=p_run_id; end if;
 return n=1;
end $$;
create function public.google_phase2b_claim_ga4(p_order_id uuid)
returns table(ga_client_id text,conversion_time timestamptz,ad_user_data text,ad_personalization text)
language plpgsql security definer set search_path='' as $$ begin
 return query with candidate as (
 select o.id,o.ga_client_id,o.confirmed_at,r.ad_user_data,r.ad_personalization from public.orders o
 join public.google_order_consent oc on oc.order_id=o.id join public.google_consent_receipts r on r.id=oc.receipt_id
 cross join public.google_phase2b_config c where o.id=p_order_id and o.created_at>=c.eligible_from and
 o.confirmed_at is not null and o.confirmed_at>=clock_timestamp()-interval '71 hours' and o.confirmed_at<=clock_timestamp()
 and o.cancelled_at is null and o.status<>'cancelled' and o.ga_client_id is not null
 and coalesce(o.utm_campaign,'') !~* '(qa|test|debug|probe)' and public.google_phase2b_consent_valid(r.id,true)
 and not exists(select 1 from public.orders x where x.id<>o.id and upper(left(x.id::text,8))=upper(left(o.id::text,8)))
 ), claimed as (insert into public.google_ga4_delivery(order_id,conversion_time,status)
 select c.id,c.confirmed_at,'claimed' from candidate c on conflict(order_id) do nothing returning order_id)
 select c.ga_client_id,c.confirmed_at,c.ad_user_data,c.ad_personalization from candidate c join claimed x on x.order_id=c.id;
end $$;

-- Explicit RLS and privileges. No public/anon/authenticated access to any Google authority.
do $$ declare t text; f record; begin
 foreach t in array array['google_phase2b_config','google_consent_receipts','google_order_consent','google_conversion_outbox','google_sheet_sync_runs','google_ga4_delivery'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on table public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on table public.%I to service_role',t);
 end loop;
 for f in select p.oid::regprocedure identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like 'google_phase2b_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.identity);
 execute format('grant execute on function %s to service_role',f.identity);
 end loop;
end $$;
