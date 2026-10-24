// src/utils/metaSignals.ts
//
// When an order is ready for its Meta Purchase or OrderDelivered signal, and
// whether it has been sent. Shared by Admin → Meta and the More page's
// one-line note, so the count on the menu is the count on the page.

/**
 * The acquisition evidence isGoogleOnlyAcquisition weighs, and nothing else.
 *
 * Its own type because two callers ask only that one question, about orders
 * they fetched for their own reasons: the admin card's "Send Purchase"
 * action (actions/orders.ts) and the conversion reporter
 * (orderConversions.ts). Asking them for the whole of MetaSignalOrder meant
 * asking them to select columns no rule in this file reads - utm_campaign
 * and cancellation_reason, which Admin → Meta fetches to display - and the
 * build failed on the two that reasonably do not.
 */
export interface MetaAcquisitionOrder {
  utm_source?: string | null
  manual_acquisition_source?: string | null
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  fbclid?: string | null
}

/** Everything the rules below read: what META_SIGNAL_COLUMNS fetches. */
export interface MetaSignalOrder extends MetaAcquisitionOrder {
  status: string | null
  confirmed_at: string | null
  delivered_at: string | null
  purchase_event_sent_at: string | null
  delivered_event_sent_at: string | null
  utm_campaign: string | null
  cancellation_reason: string | null
  is_test: boolean | null
  /** Hold or Don't send from Admin -> Meta (admin upgrade N4), embedded from meta_signal_holds. */
  meta_signal_holds?: { state: string } | { state: string }[] | null
}

/** The fields the rules below read, for a select(). */
export const META_SIGNAL_COLUMNS =
  'status, utm_source, manual_acquisition_source, gclid, gbraid, wbraid, fbclid, confirmed_at, delivered_at, purchase_event_sent_at, delivered_event_sent_at, utm_campaign, cancellation_reason, is_test, meta_signal_holds(state)'

/** A test order never sends a conversion (admin upgrade F5). */
export function isQa(order: MetaSignalOrder): boolean {
  return order.is_test === true
}

/** Google-only acquisition must not produce NEW Meta Purchase or delivery signals. */
export function isGoogleOnlyAcquisition(order: MetaAcquisitionOrder): boolean {
  const override = order.manual_acquisition_source?.toLowerCase()
  if (override) return override === 'google'
  return order.utm_source?.toLowerCase() === 'google' &&
    Boolean(order.gclid || order.gbraid || order.wbraid) && !order.fbclid
}

export function purchaseEligible(order: MetaSignalOrder): boolean {
  return Boolean(order.confirmed_at) && order.status !== 'cancelled' && !isQa(order) && !isGoogleOnlyAcquisition(order)
}

export function deliveredEligible(order: MetaSignalOrder): boolean {
  return order.status === 'delivered' && Boolean(order.delivered_at) && !isQa(order) && !isGoogleOnlyAcquisition(order)
}

/** 'hold' or 'dont_send' when an admin has stopped this order's Meta signals, else null. */
export function holdState(order: MetaSignalOrder): 'hold' | 'dont_send' | null {
  const row = Array.isArray(order.meta_signal_holds) ? order.meta_signal_holds[0] : order.meta_signal_holds
  return row?.state === 'hold' || row?.state === 'dont_send' ? row.state : null
}

/** Ready and not yet sent. A held order isn't waiting: someone decided it waits. */
export function purchasePending(order: MetaSignalOrder): boolean {
  return purchaseEligible(order) && !order.purchase_event_sent_at && holdState(order) === null
}

export function deliveredPending(order: MetaSignalOrder): boolean {
  return deliveredEligible(order) && !order.delivered_event_sent_at && holdState(order) === null
}

/** A Purchase that went to Meta for an order cancelled since: Meta can't take it back (N5). */
export function cancelledAfterSending(order: MetaSignalOrder): boolean {
  return Boolean(order.purchase_event_sent_at) && order.status === 'cancelled'
}
