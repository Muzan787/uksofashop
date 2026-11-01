-- Match a hand-taken order to the website visit that produced it.
--
-- WHY. A WhatsApp or phone sale carries the visit's ad click only when the
-- customer brings a reference with them: UKSS-WA-… from a WhatsApp button,
-- UKSS-LD-… from a checkout reminder. Swatch requests, phone calls and chats
-- started from a saved number have none, so the order cannot say which visit
-- it came from and Meta's Purchase has nothing to match on.
--
-- Staff usually know roughly when the customer was on the site, and what they
-- looked at. So: list the visits active around that time with the pages each
-- one opened, staff pick the one that is plainly their customer, and the
-- order takes that visit's identity and click ids exactly as the reference
-- path does. From there the existing gates decide everything - consent,
-- Google-only acquisition, holds, the 7-day window.
--
-- CONSENT. Only visits whose cookie choice allows advertising are listed or
-- attachable. private.visit_ad_receipt is the same rule as
-- src/utils/metaOrderConsent.ts (latest banner choice for that exact visit
-- grants all three ad signals, and the visitor never withdrew afterwards);
-- the Purchase still re-checks it when it is sent.
--
-- AUDIT. visit_matched_at / visit_matched_by on the order, and a
-- 'visit_matched' line in its history with who did it.

alter table public.orders
  add column if not exists visit_matched_at timestamptz,
  add column if not exists visit_matched_by uuid,
  add column if not exists visit_match_note text;

comment on column public.orders.visit_matched_at is
  'When staff matched this hand-taken order to a website visit by time and pages. Null when it was never matched by hand.';

-- Additive to the history vocabulary; keep whatever is there verbatim.
do $$
declare existing text;
begin
  select pg_get_expr(conbin, conrelid) into existing from pg_constraint
   where conrelid = 'public.order_events'::regclass and conname = 'order_events_kind_check';
  if existing is null then raise exception 'Expected order_events_kind_check is missing'; end if;
  if existing not like '%visit_matched%' then
    alter table public.order_events drop constraint order_events_kind_check;
    execute format('alter table public.order_events add constraint order_events_kind_check check ((%s) or kind = %L)', existing, 'visit_matched');
  end if;
end $$;

-- The consent receipt that lets this visit feed advertising, or null.
-- Mirrors orderAdvertisingConsent() in src/utils/metaOrderConsent.ts.
create or replace function private.visit_ad_receipt(p_visitor uuid, p_session uuid, p_arrival uuid, p_before timestamptz)
 returns uuid
 language sql
 stable security definer
 set search_path to ''
as $function$
  with latest as (
    select r.id, r.captured_at, r.policy_version, r.surface,
           (r.ad_storage = 'granted' and r.ad_user_data = 'granted' and r.ad_personalization = 'granted') as grants
      from public.google_consent_receipts r
     where r.visitor_id = p_visitor and r.session_id = p_session and r.arrival_id = p_arrival
       and r.captured_at <= p_before
     order by r.captured_at desc
     limit 2
  ), choice as (
    select * from latest order by captured_at desc limit 1
  )
  select c.id from choice c
   where c.policy_version = 'ukss-google-2026-09-27-v1' and c.surface = 'cookie_banner' and c.grants
     -- Conflicting simultaneous choices must not favour the grant.
     and not exists (select 1 from latest l where l.captured_at = c.captured_at and not l.grants)
     -- A withdrawal belongs to the visitor, on any later visit.
     and not exists (
       select 1 from public.google_consent_receipts x
        where x.visitor_id = p_visitor and x.captured_at > c.captured_at
          and (x.ad_storage <> 'granted' or x.ad_user_data <> 'granted' or x.ad_personalization <> 'granted'))
$function$;

-- Visits active in a time window, newest evidence first. Admin only.
--
-- p_at is the moment staff are matching against (when the customer says they
-- were on the site, or when they rang or messaged); p_from..p_to the window
-- around it, at most two days. p_product_id keeps only visits that opened
-- that product. p_phone marks visits whose checkout reminder carries that
-- number, and finds the swatch requests and reminders on it so staff can
-- search around their times. p_channel ('whatsapp', 'call', 'swatches')
-- lifts visits that did that thing on the site to the top.
create or replace function private.find_order_visits(
  p_from timestamptz, p_to timestamptz, p_at timestamptz,
  p_product_id uuid default null, p_phone text default null, p_channel text default null
)
 returns jsonb
 language plpgsql
 -- Volatile only because it keeps its working set in a temporary table.
 security definer
 set search_path to ''
as $function$
declare
  v_phone text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
  v_at timestamptz := coalesce(p_at, p_from + (p_to - p_from) / 2);
  v_visits jsonb;
  v_hidden int;
  v_more int;
  v_phone_hits jsonb;
begin
  perform private.require_admin();
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '48 hours' then
    raise exception 'BAD_WINDOW';
  end if;
  if length(v_phone) < 9 then v_phone := null; end if;

  create temporary table if not exists pg_temp.visit_candidates (
    session_id uuid primary key, visitor_id uuid,
    window_first timestamptz, window_last timestamptz
  ) on commit drop;
  truncate pg_temp.visit_candidates;

  with active as (
    select a.session_id, a.visitor_id, a.arrival_id, a.created_at
      from public.attribution_actions a
     where a.created_at >= p_from and a.created_at <= p_to
       and a.session_id is not null and a.visitor_id is not null and a.arrival_id is not null
       and ((a.action_type = 'journey_event' and a.metadata->>'data_class' = 'consented_journey')
            or a.action_type in ('whatsapp_click', 'call_click'))
  ), arrivals as (
    select session_id, visitor_id, arrival_id, min(created_at) as first_at, max(created_at) as last_at
      from active group by session_id, visitor_id, arrival_id
  ), consented as (
    select ar.*, private.visit_ad_receipt(ar.visitor_id, ar.session_id, ar.arrival_id, now()) as receipt_id
      from arrivals ar
  ), per_session as (
    select c.session_id,
           (array_agg(c.visitor_id order by c.last_at desc))[1] as visitor_id,
           min(c.first_at) as window_first, max(c.last_at) as window_last,
           bool_or(c.receipt_id is not null) as ok
      from consented c group by c.session_id
  )
  insert into pg_temp.visit_candidates (session_id, visitor_id, window_first, window_last)
  select session_id, visitor_id, window_first, window_last from per_session where ok;

  -- Visits with no advertising consent are counted, never shown.
  select count(distinct a.session_id) into v_hidden
    from public.attribution_actions a
   where a.created_at >= p_from and a.created_at <= p_to and a.session_id is not null
     and a.action_type = 'journey_event' and a.metadata->>'data_class' = 'consented_journey'
     and not exists (select 1 from pg_temp.visit_candidates v where v.session_id = a.session_id);

  if p_product_id is not null then
    delete from pg_temp.visit_candidates v
     where not exists (
             select 1 from public.attribution_actions a
              where a.session_id = v.session_id and a.product_id = p_product_id)
       and not exists (
             select 1 from public.whatsapp_enquiries w
              where w.session_id = v.session_id and w.product_id = p_product_id);
  end if;

  with ranked as (
    select v.*,
           l.reference as lead_reference, l.converted_order_id as lead_order_id,
           (v_phone is not null and right(regexp_replace(coalesce(l.phone, ''), '\D', '', 'g'), 10) = v_phone) as phone_match,
           w.reference as wa_reference, w.created_at as wa_at, w.product_name as wa_product,
           w.converted_order_id as wa_order_id,
           o.id as linked_order_id,
           exists (select 1 from public.attribution_actions a where a.session_id = v.session_id
                    and (a.action_type in ('call_click') or a.metadata->>'kind' = 'phone_outbound')) as tapped_call,
           exists (select 1 from public.attribution_actions a where a.session_id = v.session_id
                    and a.action_type = 'journey_event' and a.page_url like '/swatches%') as saw_swatches,
           exists (select 1 from public.attribution_actions a where a.session_id = v.session_id
                    and (a.action_type = 'add_to_cart' or a.metadata->>'kind' = 'cart_updated')) as added_to_basket,
           exists (select 1 from public.attribution_actions a where a.session_id = v.session_id
                    and (a.action_type in ('checkout_start', 'checkout_step_viewed') or a.metadata->>'kind' in ('checkout_start', 'checkout_step_viewed'))) as reached_checkout
      from pg_temp.visit_candidates v
      left join public.checkout_recovery_leads l on l.session_id = v.session_id
      left join lateral (
        select * from public.whatsapp_enquiries w
         where w.session_id = v.session_id order by w.created_at desc limit 1
      ) w on true
      left join lateral (
        select id from public.orders o where o.session_id = v.session_id order by o.created_at desc limit 1
      ) o on true
  ), ordered as (
    select r.*,
           row_number() over (order by
             r.phone_match desc,
             case p_channel
               when 'whatsapp' then (r.wa_reference is not null)
               when 'call' then r.tapped_call
               when 'swatches' then r.saw_swatches
               else false end desc,
             abs(extract(epoch from (r.window_last - v_at))) asc) as rank
      from ranked r
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'session_id', r.session_id,
           'first_at', r.window_first,
           'last_at', r.window_last,
           'phone_match', r.phone_match,
           'whatsapp', case when r.wa_reference is null then null else jsonb_build_object(
             'reference', r.wa_reference, 'at', r.wa_at, 'product', r.wa_product,
             'used', r.wa_order_id is not null) end,
           'lead', case when r.lead_reference is null then null else jsonb_build_object(
             'reference', r.lead_reference, 'used', r.lead_order_id is not null) end,
           'linked_order_id', r.linked_order_id,
           'tapped_call', r.tapped_call,
           'saw_swatches', r.saw_swatches,
           'added_to_basket', r.added_to_basket,
           'reached_checkout', r.reached_checkout,
           'device', (
             select a.metadata->>'device' from public.attribution_actions a
              where a.session_id = r.session_id and a.action_type = 'journey_event' and a.metadata ? 'device'
              group by 1 order by count(*) desc limit 1),
           'arrival', (
             select jsonb_build_object(
                      'source', coalesce(s.last_touch_source, s.first_touch_source),
                      'medium', coalesce(s.last_touch_medium, s.first_touch_medium),
                      'campaign', coalesce(s.last_touch_campaign, s.first_touch_campaign),
                      'content', coalesce(s.last_touch_content, s.first_touch_content),
                      'meta_click', s.fbclid is not null or s.meta_fbc is not null,
                      'google_click', s.gclid is not null or s.gbraid is not null or s.wbraid is not null,
                      'landing_page', split_part(s.landing_page, '?', 1),
                      'referrer', s.referrer)
               from public.attribution_sessions s
              where s.session_id = r.session_id
              order by (s.fbclid is not null or s.gclid is not null or s.gbraid is not null or s.wbraid is not null) desc,
                       s.created_at asc
              limit 1),
           'pages', coalesce((
             select jsonb_agg(jsonb_build_object('at', p.created_at, 'path', p.path, 'type', p.page_type, 'product', p.title) order by p.created_at)
               from (
                 select q.* from (
                   select a.created_at, split_part(a.page_url, '?', 1) as path, a.metadata->>'page_type' as page_type,
                          pr.title,
                          lag(split_part(a.page_url, '?', 1)) over (order by a.created_at) as previous_path
                     from public.attribution_actions a
                     left join public.products pr on pr.id = a.product_id
                    where a.session_id = r.session_id and a.action_type = 'journey_event'
                      and a.metadata->>'data_class' = 'consented_journey' and a.metadata->>'kind' = 'page_enter'
                 ) q
                  where q.previous_path is distinct from q.path
                  order by q.created_at
                  limit 40
               ) p
           ), '[]'::jsonb)
         ) order by r.rank), '[]'::jsonb)
    into v_visits
    from ordered r
   where r.rank <= 25;

  select count(*) into v_more from pg_temp.visit_candidates;
  v_more := greatest(v_more - 25, 0);

  -- Where the number turns up, so staff can search around those times.
  if v_phone is not null then
    select coalesce(jsonb_agg(h order by h->>'at' desc), '[]'::jsonb) into v_phone_hits
      from (
        select jsonb_build_object('kind', 'swatches', 'at', sr.created_at,
                 'label', coalesce(nullif(btrim(sr.customer_name), ''), 'Swatch request') ||
                          coalesce(', ' || nullif(btrim(sr.postcode), ''), '')) as h
          from public.swatch_requests sr
         where right(regexp_replace(coalesce(sr.customer_phone, ''), '\D', '', 'g'), 10) = v_phone
           and sr.created_at > now() - interval '120 days'
        union all
        select jsonb_build_object('kind', 'lead', 'at', l.created_at, 'label', l.reference)
          from public.checkout_recovery_leads l
         where right(regexp_replace(coalesce(l.phone, ''), '\D', '', 'g'), 10) = v_phone
           and l.created_at > now() - interval '120 days'
      ) x(h);
  end if;

  drop table if exists pg_temp.visit_candidates;

  return jsonb_build_object(
    'visits', v_visits,
    'hidden_no_consent', v_hidden,
    'more', v_more,
    'phone_hits', coalesce(v_phone_hits, '[]'::jsonb)
  );
end;
$function$;

-- Put a visit's identity and click ids on a hand-taken order, or take a
-- hand-made match off again (p_session_id null). Admin only.
create or replace function private.match_order_visit(p_order_id uuid, p_session_id uuid, p_note text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_order public.orders%rowtype;
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 300), '');
  v_visitor uuid;
  v_arrival uuid;
  v_receipt uuid;
  v_sess public.attribution_sessions%rowtype;
  v_enq public.whatsapp_enquiries%rowtype;
  v_has_enquiry boolean := false;
  v_lead public.checkout_recovery_leads%rowtype;
  v_has_lead boolean := false;
  v_released_reference text;
  v_source text;
  v_seen timestamptz;
begin
  perform private.require_admin();

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.source is distinct from 'whatsapp' then raise exception 'NOT_MANUAL'; end if;
  if v_order.purchase_event_sent_at is not null then raise exception 'ALREADY_SENT'; end if;
  if v_order.visit_matched_at is null and (v_order.visitor_id is not null or v_order.session_id is not null) then
    raise exception 'ALREADY_LINKED';
  end if;
  if v_order.visit_matched_at is not null and exists (select 1 from public.google_conversion_outbox g where g.order_id = p_order_id) then
    raise exception 'ALREADY_SENT';
  end if;
  if p_session_id is null and v_order.visit_matched_at is null then raise exception 'NOT_MATCHED'; end if;

  -- Undo an earlier hand-made match first: whatever it claimed goes back.
  if v_order.visit_matched_at is not null then
    select reference into v_released_reference from public.whatsapp_enquiries
     where converted_order_id = p_order_id limit 1;
    update public.whatsapp_enquiries set converted_order_id = null, converted_at = null
     where converted_order_id = p_order_id;
    update public.checkout_recovery_leads set converted_order_id = null, status = 'done', updated_at = now()
     where converted_order_id = p_order_id;
    delete from public.google_order_consent where order_id = p_order_id;
  end if;

  if p_session_id is null then
    update public.orders set
      visitor_id = null, session_id = null, arrival_id = null,
      gclid = null, gbraid = null, wbraid = null, fbclid = null,
      utm_source = null, utm_medium = null, utm_campaign = null, utm_content = null, utm_term = null,
      ga_client_id = null, meta_fbp = null, meta_fbc = null, landing_page = null, referrer = null,
      whatsapp_reference = case when whatsapp_reference = v_released_reference then null else whatsapp_reference end,
      visit_matched_at = null, visit_matched_by = null, visit_match_note = null
     where id = p_order_id;
    insert into public.order_events (order_id, kind, staff_id, note)
    values (p_order_id, 'visit_matched', auth.uid(), 'Website visit match removed' || coalesce(': ' || v_note, ''));
    return jsonb_build_object('matched', false);
  end if;

  if exists (select 1 from public.orders x where x.session_id = p_session_id and x.id <> p_order_id) then
    raise exception 'VISIT_TAKEN';
  end if;

  -- A WhatsApp tap in that visit is the most specific evidence, as with a
  -- typed reference - when its own arrival carries the consent.
  select * into v_enq from public.whatsapp_enquiries w
   where w.session_id = p_session_id and w.converted_order_id is null and w.created_at <= v_order.created_at
     and private.visit_ad_receipt(w.visitor_id, w.session_id, w.arrival_id, v_order.created_at) is not null
   order by w.created_at desc limit 1 for update;
  v_has_enquiry := found;

  if v_has_enquiry then
    v_visitor := v_enq.visitor_id;
    v_arrival := v_enq.arrival_id;
  else
    -- Otherwise the consented arrival in that visit that knows the most.
    select c.visitor_id, c.arrival_id into v_visitor, v_arrival
      from (
        select distinct a.visitor_id, a.arrival_id
          from public.attribution_actions a
         where a.session_id = p_session_id and a.visitor_id is not null and a.arrival_id is not null
           and a.created_at <= v_order.created_at
      ) c
      left join public.attribution_sessions s on s.arrival_id = c.arrival_id
     where private.visit_ad_receipt(c.visitor_id, p_session_id, c.arrival_id, v_order.created_at) is not null
     order by ((s.fbclid is not null)::int + (s.meta_fbc is not null)::int + (s.meta_fbp is not null)::int
             + (s.gclid is not null)::int + (s.gbraid is not null)::int + (s.wbraid is not null)::int
             + (s.ga_client_id is not null)::int + (coalesce(s.last_touch_source, s.first_touch_source) is not null)::int) desc,
              s.created_at desc nulls last
     limit 1;
  end if;

  if v_arrival is null then raise exception 'NO_CONSENT'; end if;
  v_receipt := private.visit_ad_receipt(v_visitor, p_session_id, v_arrival, v_order.created_at);
  if v_receipt is null then raise exception 'NO_CONSENT'; end if;

  select * into v_sess from public.attribution_sessions where arrival_id = v_arrival;

  select * into v_lead from public.checkout_recovery_leads
   where session_id = p_session_id and converted_order_id is null for update;
  v_has_lead := found;

  update public.orders set
    visitor_id = v_visitor,
    session_id = p_session_id,
    arrival_id = v_arrival,
    gclid        = case when v_has_enquiry then v_enq.gclid        else v_sess.gclid end,
    gbraid       = case when v_has_enquiry then v_enq.gbraid       else v_sess.gbraid end,
    wbraid       = case when v_has_enquiry then v_enq.wbraid       else v_sess.wbraid end,
    fbclid       = case when v_has_enquiry then v_enq.fbclid       else v_sess.fbclid end,
    utm_source   = case when v_has_enquiry then v_enq.utm_source   else coalesce(v_sess.last_touch_source,   v_sess.first_touch_source) end,
    utm_medium   = case when v_has_enquiry then v_enq.utm_medium   else coalesce(v_sess.last_touch_medium,   v_sess.first_touch_medium) end,
    utm_campaign = case when v_has_enquiry then v_enq.utm_campaign else coalesce(v_sess.last_touch_campaign, v_sess.first_touch_campaign) end,
    utm_content  = case when v_has_enquiry then v_enq.utm_content  else coalesce(v_sess.last_touch_content,  v_sess.first_touch_content) end,
    utm_term     = case when v_has_enquiry then v_enq.utm_term     else coalesce(v_sess.last_touch_term,     v_sess.first_touch_term) end,
    ga_client_id = case when v_has_enquiry then v_enq.ga_client_id else v_sess.ga_client_id end,
    meta_fbp     = case when v_has_enquiry then v_enq.meta_fbp     else v_sess.meta_fbp end,
    meta_fbc     = case when v_has_enquiry then v_enq.meta_fbc     else v_sess.meta_fbc end,
    landing_page = v_sess.landing_page,
    referrer     = v_sess.referrer,
    whatsapp_reference = case
      when v_has_enquiry and (whatsapp_reference is null or whatsapp_reference = v_released_reference) then v_enq.reference
      when whatsapp_reference = v_released_reference then null
      else whatsapp_reference end,
    visit_matched_at = now(),
    visit_matched_by = auth.uid(),
    visit_match_note = v_note
   where id = p_order_id;

  if v_has_enquiry then
    update public.whatsapp_enquiries set converted_order_id = p_order_id, converted_at = now() where id = v_enq.id;
  end if;
  if v_has_lead then
    update public.checkout_recovery_leads set converted_order_id = p_order_id, status = 'converted', updated_at = now()
     where id = v_lead.id;
  end if;

  select max(a.created_at) into v_seen from public.attribution_actions a
   where a.session_id = p_session_id and a.created_at <= v_order.created_at;
  v_source := case
    when (case when v_has_enquiry then v_enq.fbclid else v_sess.fbclid end) is not null then 'a Facebook or Instagram ad'
    when coalesce(case when v_has_enquiry then v_enq.gclid else v_sess.gclid end,
                  case when v_has_enquiry then v_enq.gbraid else v_sess.gbraid end,
                  case when v_has_enquiry then v_enq.wbraid else v_sess.wbraid end) is not null then 'a Google ad'
    when coalesce(case when v_has_enquiry then v_enq.utm_source else coalesce(v_sess.last_touch_source, v_sess.first_touch_source) end, '') <> ''
      then coalesce(case when v_has_enquiry then v_enq.utm_source else coalesce(v_sess.last_touch_source, v_sess.first_touch_source) end, '')
    else 'no ad (came straight in)' end;

  insert into public.order_events (order_id, kind, staff_id, note)
  values (p_order_id, 'visit_matched', auth.uid(),
          'Matched by hand to a website visit from ' || v_source ||
          coalesce(', last seen ' || to_char(v_seen at time zone 'Europe/London', 'DD Mon HH24:MI') || ' UK', '') ||
          case when v_has_enquiry then ' (' || v_enq.reference || ')' else '' end ||
          coalesce(' - ' || v_note, ''));

  return jsonb_build_object(
    'matched', true,
    'receipt_id', v_receipt,
    'visitor_id', v_visitor,
    'whatsapp_reference', case when v_has_enquiry then v_enq.reference end,
    'lead_reference', case when v_has_lead then v_lead.reference end
  );
end;
$function$;

revoke all on function private.visit_ad_receipt(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.find_order_visits(timestamptz, timestamptz, timestamptz, uuid, text, text) from public, anon, authenticated;
revoke all on function private.match_order_visit(uuid, uuid, text) from public, anon, authenticated;
grant execute on function private.find_order_visits(timestamptz, timestamptz, timestamptz, uuid, text, text) to authenticated;
grant execute on function private.match_order_visit(uuid, uuid, text) to authenticated;

-- Public wrappers the admin calls, as with the other order functions.
create or replace function public.find_order_visits(
  p_from timestamptz, p_to timestamptz, p_at timestamptz,
  p_product_id uuid default null, p_phone text default null, p_channel text default null
)
 returns jsonb language sql security invoker set search_path to ''
as $function$ select private.find_order_visits(p_from, p_to, p_at, p_product_id, p_phone, p_channel); $function$;

create or replace function public.match_order_visit(p_order_id uuid, p_session_id uuid, p_note text default null)
 returns jsonb language sql security invoker set search_path to ''
as $function$ select private.match_order_visit(p_order_id, p_session_id, p_note); $function$;

revoke all on function public.find_order_visits(timestamptz, timestamptz, timestamptz, uuid, text, text) from public, anon, authenticated;
revoke all on function public.match_order_visit(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.find_order_visits(timestamptz, timestamptz, timestamptz, uuid, text, text) to authenticated;
grant execute on function public.match_order_visit(uuid, uuid, text) to authenticated;
