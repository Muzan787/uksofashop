// src/utils/metaSignals.ts
//
// When an order is ready for its Meta Purchase or OrderDelivered signal, and
// whether it has been sent. Shared by Admin → Meta and the More page's
// one-line note, so the count on the menu is the count on the page.

export interface MetaSignalOrder {
  status: string | null
  confirmed_at: string | null
  delivered_at: string | null
  purchase_event_sent_at: string | null
  delivered_event_sent_at: string | null
  utm_campaign: string | null
  cancellation_reason: string | null
}

/** The fields the rules below read, for a select(). */
export const META_SIGNAL_COLUMNS =
  'status, confirmed_at, delivered_at, purchase_event_sent_at, delivered_event_sent_at, utm_campaign, cancellation_reason'

export function isQa(order: MetaSignalOrder): boolean {
  return (
    order.utm_campaign === 'offer-test' ||
    /(?:^|\b)(?:test|testing|qa)(?:\b|$)/i.test(order.cancellation_reason ?? '')
  )
}

export function purchaseEligible(order: MetaSignalOrder): boolean {
  return Boolean(order.confirmed_at) && order.status !== 'cancelled' && !isQa(order)
}

export function deliveredEligible(order: MetaSignalOrder): boolean {
  return order.status === 'delivered' && Boolean(order.delivered_at) && !isQa(order)
}

export function purchasePending(order: MetaSignalOrder): boolean {
  return purchaseEligible(order) && !order.purchase_event_sent_at
}

export function deliveredPending(order: MetaSignalOrder): boolean {
  return deliveredEligible(order) && !order.delivered_event_sent_at
}
