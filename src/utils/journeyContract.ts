// Public, bounded vocabulary. No form values, contact details or private IDs.
export const JOURNEY_VERSION = 'ukss-journey-v1'
export const JOURNEY_KINDS = [
  'page_enter', 'page_exit', 'scroll_depth', 'section_view', 'navigation',
  'first_interaction', 'cta_click', 'product_click', 'variant_changed', 'price_changed',
  'section_exit', 'sort_changed', 'filter_changed', 'search_used', 'gallery_selected', 'video_started', 'video_completed',
  'builder_step_viewed', 'builder_step_completed', 'builder_back', 'builder_restarted', 'builder_back_selected',
  'material_selected', 'colour_selected', 'fabric_category_selected',
  'fabric_viewed', 'fabric_selected', 'sample_click',
  'cart_update_requested', 'cart_updated', 'cart_update_failed', 'cart_update_deferred',
  'cart_removed', 'cart_quantity_changed', 'cart_viewed', 'cart_continue', 'order_submit', 'order_submit_failed',
  'order_saved', 'whatsapp_outbound', 'phone_outbound',
  'product_view', 'checkout_start', 'call_click',
  'pdp_photo_swiped', 'pdp_zoom_opened', 'pdp_size_selected', 'pdp_style_selected',
  'pdp_custom_size_opened', 'pdp_fabric_picker_opened', 'pdp_fabric_viewed',
  'pdp_fabric_picker_closed', 'pdp_postcode_checked', 'pdp_details_opened',
  'pdp_add_button_seen', 'assistant_opened',
  'builder_started', 'builder_size_selected', 'builder_design_selected',
  'builder_fabric_selected', 'builder_feet_selected', 'builder_piping_selected',
  'builder_custom_details_completed', 'builder_summary_viewed',
  'builder_add_to_cart', 'builder_whatsapp_click',
  'checkout_step_viewed', 'checkout_field_started', 'checkout_field_completed',
  'checkout_validation_error', 'postcode_lookup_attempt', 'postcode_lookup_result',
  'address_results_returned', 'address_selected', 'delivery_extra_toggled',
  'offer_code_attempt', 'offer_code_result', 'place_order_clicked', 'place_order_failed',
  'checkout_back_to_cart', 'checkout_quote_whatsapp_click', 'checkout_exit',
] as const
export type JourneyKind = typeof JOURNEY_KINDS[number]
export const SURFACES = ['primary', 'sticky', 'fabric_picker', 'builder', 'header',
  'footer', 'home', 'collection', 'related', 'recent', 'checkout', 'other'] as const
export type JourneySurface = typeof SURFACES[number]
export const PAGE_TYPES = ['home', 'collection', 'product', 'builder', 'checkout', 'content'] as const
export type JourneyPage = typeof PAGE_TYPES[number]
export type JourneyMeta = {
  surface?: JourneySurface
  section?: 'price' | 'configuration' | 'fabric' | 'dimensions' | 'delivery' | 'reviews' | 'faq' | 'primary' | 'sticky'
  option_code?: string
  step?: 'cart' | 'delivery' | 'success' | 'seats' | 'size' | 'design' | 'fabric' | 'feet' | 'piping' | 'notes' | 'summary'
  outcome?: 'success' | 'failed' | 'requires_fabric' | 'missing_variant' | 'selected' | 'opened' | 'closed' | 'submitted' | 'mainland_success' | 'custom_quote' | 'invalid' | 'not_found' | 'network_error' | 'available' | 'valid' | 'error'
  extra?: 'upstairs' | 'lift' | 'assembly' | 'sofa_removal'
  enabled?: boolean
  source_product_id?: string
  error_code?: 'required' | 'invalid_format' | 'invalid_mobile' | 'invalid_postcode' | 'address_missing' | 'delivery_unavailable' | 'server_error' | 'unknown'
  field?: 'name' | 'email' | 'phone' | 'postcode' | 'address' | 'special_instructions'
  depth?: 25 | 50 | 75 | 90
  engaged_ms?: number
  quantity?: number
  price?: number
  destination?: string
}
export type JourneyEvent = {
  id: string; kind: JourneyKind; path: string; page_type: JourneyPage
  navigation_id: string; sequence: number; elapsed_ms: number
  device: 'mobile' | 'tablet' | 'desktop'; qa: boolean
  product_id?: string; variant_id?: string; metadata: JourneyMeta
}
export function publicJourneyPath(input: string): string | null {
  const path = input.split(/[?#]/)[0]
  if (path === '/' || ['/build', '/checkout', '/swatches', '/fabrics', '/delivery-returns', '/about', '/contact', '/showroom', '/faq', '/collection', '/search', '/size-guide', '/care-guide'].includes(path)) return path
  return /^\/(?:shop\/[a-z0-9-]+(?:\/[a-z0-9-]+)?|collection\/[a-z0-9-]+)\/?$/.test(path) ? path : null
}
export function journeyPage(path: string): JourneyPage {
  if (path === '/') return 'home'
  if (path === '/build') return 'builder'
  if (path === '/checkout') return 'checkout'
  if (path.startsWith('/collection') || path === '/search') return 'collection'
  if (path.startsWith('/shop/')) return path.split('/').filter(Boolean).length > 2 ? 'product' : 'collection'
  return 'content'
}
export function catalogueCode(value: string): string {
  const code=value.replace(/[^a-zA-Z0-9_-]/g,'_')
  return (/^[a-zA-Z]/.test(code)?code:'option_'+code).slice(0,40)
}
export function searchClassification(value:string):string {
  // Classification only. The search term itself must never enter telemetry.
  if (/fabric|velvet|chenille|leather|swatch|boucle/i.test(value)) return 'fabric'
  if (/corner|seater|u.?shape|3.?2|recliner/i.test(value)) return 'configuration'
  if (/sofa|couch|settee|verona|bishop|chesterfield/i.test(value)) return 'sofa'
  return 'other'
}
export function scrollThresholds(scrollTop: number, viewport: number, pageHeight: number, seen: Set<number>): (25|50|75|90)[] {
  if (pageHeight <= 0 || viewport <= 0) return []
  const depth = Math.min(100, 100 * (Math.max(0, scrollTop) + viewport) / pageHeight)
  const reached = ([25,50,75,90] as const).filter(n => depth >= n && !seen.has(n))
  reached.forEach(n => seen.add(n))
  return reached
}
