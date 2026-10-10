-- Product-page telemetry, and the builder events that never landed.
--
-- The ledger saw a product view and then, for most visitors, nothing until an
-- add to cart: what happened in between - photos swiped, sizes tried, the
-- fabric picker opened and abandoned - was invisible. The pdp_* actions are
-- that stretch. None of them carries a form value; a postcode check records
-- its outcome, never the postcode.
--
-- The builder_* actions have been accepted by /api/attribution/action since
-- /build shipped on 2026-09-18, but were never added to this constraint, so
-- every one of them was rejected at insert and the builder's funnel has no
-- rows at all. They are added here alongside.

alter table public.attribution_actions
  drop constraint if exists attribution_actions_action_type_check;

alter table public.attribution_actions
  add constraint attribution_actions_action_type_check
  check (action_type in (
    'arrival', 'product_view', 'add_to_cart', 'checkout_start',
    'whatsapp_click', 'call_click', 'order_placed',
    'offer_qualified', 'offer_prompt_shown', 'offer_prompt_dismissed', 'offer_code_copied',
    'checkout_step_viewed', 'checkout_field_started', 'checkout_field_completed',
    'checkout_validation_error', 'postcode_lookup_attempt', 'postcode_lookup_result',
    'address_results_returned', 'address_selected', 'delivery_extra_toggled',
    'offer_code_attempt', 'offer_code_result', 'place_order_clicked', 'place_order_failed',
    'checkout_back_to_cart', 'checkout_quote_whatsapp_click', 'checkout_exit',
    'builder_started', 'builder_size_selected', 'builder_design_selected',
    'builder_fabric_selected', 'builder_feet_selected', 'builder_piping_selected',
    'builder_custom_details_completed', 'builder_summary_viewed',
    'builder_add_to_cart', 'builder_whatsapp_click',
    'pdp_photo_swiped', 'pdp_zoom_opened', 'pdp_size_selected', 'pdp_style_selected',
    'pdp_custom_size_opened', 'pdp_fabric_picker_opened', 'pdp_fabric_viewed',
    'pdp_fabric_picker_closed', 'pdp_postcode_checked', 'pdp_details_opened',
    'pdp_add_button_seen', 'assistant_opened'
  ));
