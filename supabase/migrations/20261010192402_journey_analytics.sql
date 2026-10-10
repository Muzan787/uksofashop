-- Additive to the established ledger; preserve its current check verbatim.
DO $$
DECLARE existing text;
BEGIN
  SELECT pg_get_expr(conbin,conrelid) INTO existing FROM pg_constraint
    WHERE conrelid='public.attribution_actions'::regclass
      AND conname='attribution_actions_action_type_check';
  IF existing IS NULL THEN RAISE EXCEPTION 'Expected action vocabulary is missing'; END IF;
  ALTER TABLE public.attribution_actions DROP CONSTRAINT attribution_actions_action_type_check;
  EXECUTE format('ALTER TABLE public.attribution_actions ADD CONSTRAINT attribution_actions_action_type_check CHECK ((%s) OR action_type = %L)',existing,'journey_event');
END $$;
CREATE INDEX attribution_actions_journey_arrival_idx ON public.attribution_actions(arrival_id,created_at)
  WHERE action_type='journey_event';
CREATE VIEW public.journey_events_v1 WITH(security_invoker=true) AS
SELECT a.created_at,substr(md5(a.session_id::text),1,12) AS session_key,
  substr(md5(a.metadata->>'navigation_id'),1,12) AS page_view_key,
  a.page_url AS page_path,a.product_id,a.variant_id,
  a.metadata->>'kind' AS event,a.metadata->>'page_type' AS page_type,
  a.metadata->>'device' AS device,
  CASE WHEN s.gclid IS NOT NULL OR s.gbraid IS NOT NULL OR s.wbraid IS NOT NULL OR lower(s.last_touch_source) IN ('google','google_ads') THEN 'google'
    WHEN s.fbclid IS NOT NULL OR lower(s.last_touch_source) IN ('facebook','instagram','meta','fb','ig') THEN 'meta'
    WHEN nullif(s.last_touch_source,'') IS NULL THEN 'direct_or_unattributed' ELSE 'other' END AS source,
  CASE WHEN s.last_touch_campaign ~ '^[a-zA-Z0-9 _|+-]{1,120}$' THEN s.last_touch_campaign ELSE NULL END AS campaign,
  a.metadata->>'surface' AS cta_position,a.metadata->>'section' AS section,
  a.metadata->>'option_code' AS option_code,a.metadata->>'step' AS step,
  a.metadata->>'outcome' AS outcome,a.metadata->>'error_code' AS error_code,
  a.metadata->>'field' AS field_category,a.metadata->>'destination' AS destination,
  (a.metadata->>'depth')::int AS scroll_percent,(a.metadata->>'sequence')::int AS sequence,
  (a.metadata->>'elapsed_ms')::int AS elapsed_ms,(a.metadata->>'price')::numeric AS price,
  (a.metadata->>'quantity')::int AS quantity,
  (a.metadata->>'engaged_ms')::int AS engaged_ms,
  a.metadata->>'source_product_id' AS source_product_id,
  a.metadata->>'extra' AS delivery_extra,(a.metadata->>'enabled')::boolean AS extra_enabled
FROM public.attribution_actions a
LEFT JOIN public.attribution_sessions s ON s.arrival_id=a.arrival_id
WHERE a.action_type='journey_event' AND a.metadata->>'data_class'='consented_journey'
  AND a.created_at>=now()-interval '90 days';
REVOKE ALL ON public.journey_events_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.journey_events_v1 TO service_role;

-- Lifecycle outcomes are booleans; no order IDs or customer records are exposed.
CREATE VIEW public.journey_session_funnel_v1 WITH(security_invoker=true) AS
SELECT j.session_key,j.source,j.campaign,j.device,min(j.created_at) AS first_event_at,
  max(j.created_at) AS last_event_at,count(*) AS interactions,count(distinct j.page_view_key) AS pages,
  bool_or(j.event IN ('cta_click','cart_update_requested')) AS cart_attempted,
  bool_or(j.event='cart_updated') AS cart_updated,
  bool_or(j.event IN ('checkout_start','checkout_step_viewed')) AS checkout_started,
  bool_or(j.event='whatsapp_outbound') AS whatsapp_clicked,
  bool_or(j.event='order_saved') AS website_order_saved,
  EXISTS(SELECT 1 FROM public.attribution_actions a WHERE substr(md5(a.session_id::text),1,12)=j.session_key AND a.action_type='whatsapp_click') AS enquiry_recorded,
  EXISTS(SELECT 1 FROM public.orders o WHERE substr(md5(o.session_id::text),1,12)=j.session_key) AS order_linked,
  EXISTS(SELECT 1 FROM public.orders o WHERE substr(md5(o.session_id::text),1,12)=j.session_key AND o.confirmed_at IS NOT NULL) AS order_confirmed,
  EXISTS(SELECT 1 FROM public.orders o WHERE substr(md5(o.session_id::text),1,12)=j.session_key AND o.delivered_at IS NOT NULL) AS order_delivered
FROM public.journey_events_v1 j GROUP BY j.session_key,j.source,j.campaign,j.device;
REVOKE ALL ON public.journey_session_funnel_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.journey_session_funnel_v1 TO service_role;

-- Retain optional behaviour for 90 days; never purge operational/order history.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.schedule('ukss-journey-retention-v1','25 3 * * *',
      'DELETE FROM public.attribution_actions WHERE action_type=''journey_event'' AND created_at < now() - interval ''90 days''');
  END IF;
END $$;
