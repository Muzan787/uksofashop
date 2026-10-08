-- Supabase's API roles. They do not exist in a bare PGlite instance, and the
-- migrations replayed on top of this fixture revoke EXECUTE from them, which
-- fails with "role does not exist" rather than being skipped.
do $roles$begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end$roles$;

create table products(id uuid primary key, title text, is_active boolean, base_price numeric);
create table product_variants(id uuid primary key, product_id uuid, price_adjustment numeric);
create table fabrics(id uuid primary key, is_active boolean, code text, name text, collection_id uuid);
create table fabric_collections(id uuid primary key, name text);
-- id/first_touch/last_touch are the original three, and one test still
-- inserts into them positionally - so the real columns the lead attribution
-- lookup reads are APPENDED, never reordered.
create table attribution_sessions(id uuid primary key,first_touch jsonb,last_touch jsonb,
 session_id uuid,visitor_id uuid,created_at timestamptz default now(),
 first_touch_source text,first_touch_medium text,first_touch_campaign text,first_touch_content text,first_touch_term text,
 last_touch_source text,last_touch_medium text,last_touch_campaign text,last_touch_content text,last_touch_term text,
 gclid text,gbraid text,wbraid text,fbclid text,ga_client_id text,meta_fbp text,meta_fbc text);
create table checkout_recovery_leads(id uuid primary key default gen_random_uuid(),visitor_id uuid,session_id uuid,arrival_id uuid,
 email text,phone text,email_opt_in boolean,whatsapp_opt_in boolean,basket jsonb,status text default 'active',
 converted_order_id uuid,created_at timestamptz default now(),updated_at timestamptz default now(),data_class text default 'production_real');
create table whatsapp_enquiries(id uuid primary key default gen_random_uuid(),reference text unique,created_at timestamptz,visitor_id uuid,session_id uuid,arrival_id uuid,
 gclid text,gbraid text,wbraid text,fbclid text,utm_source text,utm_medium text,utm_campaign text,utm_content text,utm_term text,ga_client_id text,meta_fbp text,meta_fbc text,page_context text,converted_order_id uuid,converted_at timestamptz);
create table orders(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),customer_name text,customer_email text,customer_phone text,shipping_address text,special_instructions text,status text,source text,
 items_subtotal numeric,delivery_floor integer,delivery_has_lift boolean,fee_upstairs numeric,wants_assembly boolean,fee_assembly numeric,wants_sofa_removal boolean,fee_sofa_removal numeric,delivery_total numeric,total_amount numeric,has_made_to_order boolean,
 visitor_id uuid,session_id uuid,arrival_id uuid,gclid text,gbraid text,wbraid text,fbclid text,utm_source text,utm_medium text,utm_campaign text,utm_content text,utm_term text,ga_client_id text,meta_fbp text,meta_fbc text,whatsapp_reference text,preferred_delivery_date date,
 purchase_event_id text default gen_random_uuid()::text,purchase_event_sent_at timestamptz,delivered_event_sent_at timestamptz,confirmed_at timestamptz,delivered_at timestamptz,customer_user_agent text,customer_ip text);
create table order_items(order_id uuid,variant_id uuid,quantity int,price_at_time_of_purchase numeric,fabric_id uuid,fabric_code text,fabric_name text,fabric_collection text,custom_title text);
create table google_consent_receipts(id uuid default gen_random_uuid(),visitor_id uuid,session_id uuid,arrival_id uuid,ad_storage text,ad_user_data text,ad_personalization text,analytics_storage text,captured_at timestamptz,policy_version text,surface text);
create table conversion_events(id uuid default gen_random_uuid(),order_id uuid,platform text,event_name text,event_id text,sent_at timestamptz,status text,response_metadata jsonb,error_metadata jsonb);
create table google_offline_conversions(order_id uuid,conversion_stage text,conversion_time timestamptz,value numeric,currency text,gclid text,gbraid text,wbraid text,customer_email text,customer_phone text,customer_first_name text,customer_last_name text,customer_postcode text,unique(order_id,conversion_stage));
create function is_admin() returns boolean language sql as $$select true$$;
insert into products values('11111111-1111-4111-8111-111111111111','Fixture sofa',true,799);
insert into product_variants values('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',0);
