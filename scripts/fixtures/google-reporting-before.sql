create table public.orders(
 id uuid primary key, created_at timestamptz default clock_timestamp()-interval '2 hours',
 confirmed_at timestamptz default clock_timestamp()-interval '1 hour', delivered_at timestamptz,
 cancelled_at timestamptz, status text default 'confirmed',is_test boolean default false,
 utm_campaign text, total_amount numeric default 879,visitor_id uuid,session_id uuid,arrival_id uuid,
 ga_client_id text default '12345.67890',gclid text default 'fixture-click',gbraid text,wbraid text,
 source text default 'website',utm_source text,utm_medium text,utm_content text,utm_term text,
 whatsapp_reference text,customer_email text,customer_phone text);
 create table public.meta_signal_holds(order_id uuid primary key,state text);
 create table public.whatsapp_enquiries(reference text,converted_order_id uuid,visitor_id uuid,gclid text,gbraid text,wbraid text);
 create schema extensions;
 create function extensions.digest(text,text) returns bytea language sql as $$select convert_to($1,'UTF8')$$;

CREATE OR REPLACE FUNCTION public.google_phase2b_claim_ga4(p_order_id uuid)
 RETURNS TABLE(ga_client_id text, conversion_time timestamp with time zone, ad_user_data text, ad_personalization text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin
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
end $function$
;
CREATE OR REPLACE FUNCTION public.google_phase2b_consent_valid(p_receipt_id uuid, p_analytics boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.google_consent_receipts r cross join public.google_phase2b_config c
 where r.id=p_receipt_id and r.policy_version=c.policy_version and r.ad_user_data='granted' and r.ad_personalization='granted'
 and r.ad_storage='granted' and (not p_analytics or r.analytics_storage='granted') and r.reason='granted'
 and not exists(select 1 from public.google_consent_receipts x where x.visitor_id=r.visitor_id
 and x.captured_at>=r.captured_at and (x.ad_user_data<>'granted' or x.ad_personalization<>'granted' or x.ad_storage<>'granted' or x.analytics_storage<>'granted')))
$function$
;
CREATE OR REPLACE FUNCTION public.google_phase2b_sheet_payload(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;
CREATE OR REPLACE FUNCTION public.google_phase2b_stage(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype; r public.google_consent_receipts%rowtype; c public.google_phase2b_config%rowtype;
begin
 select * into c from public.google_phase2b_config where singleton;
 select * into o from public.orders where id=p_order_id;
 if not found or o.created_at<c.eligible_from or o.utm_campaign='offer-test' or o.is_test or
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
end $function$
;
