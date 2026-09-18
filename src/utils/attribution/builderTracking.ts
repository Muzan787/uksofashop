'use client'

// Privacy-safe first-party telemetry for /build.
//
// No free-text notes, dimensions, names, emails or other customer data leave
// the builder through this helper. The "value" field is limited to catalogue
// or choice labels already public on the page.
export type BuilderAction =
  | 'builder_started'
  | 'builder_size_selected'
  | 'builder_design_selected'
  | 'builder_fabric_selected'
  | 'builder_feet_selected'
  | 'builder_piping_selected'
  | 'builder_custom_details_completed'
  | 'builder_summary_viewed'
  | 'builder_add_to_cart'
  | 'builder_whatsapp_click'

export function trackBuilderAction(
  action: BuilderAction,
  options: {
    step?: string
    value?: string
    productId?: string | null
    variantId?: string | null
  } = {},
) {
  if (typeof window === 'undefined' || !globalThis.crypto?.randomUUID) return

  const body = JSON.stringify({
    action,
    actionId: globalThis.crypto.randomUUID(),
    path: window.location.pathname + window.location.search,
    productId: options.productId || undefined,
    variantId: options.variantId || undefined,
    metadata: {
      step: options.step?.slice(0, 64),
      value: options.value?.slice(0, 160),
    },
  })

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon('/api/attribution/action', blob)) return
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch('/api/attribution/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}
