// src/utils/tracking.ts
//
// Meta Pixel and GA4 e-commerce events.
//
// Every event carries the SAME item identifier that appears as <g:id> in the
// Google Merchant feed (src/app/feeds/google-merchant.xml/route.ts): the
// product_variants row id. That match is what makes dynamic product ads work -
// Meta and Google join a pixel event to a catalogue item by id, and if the ids
// disagree the event counts as traffic but can never retarget the specific
// sofa someone looked at.
//
// Both destinations are loaded only after cookie consent (see
// components/UI/TrackingScripts.tsx). Before that, window.fbq and the GA
// dataLayer do not exist, so every helper here no-ops rather than throwing.

const CURRENCY = 'GBP'

/** The 4th argument is Meta's options bag, where the dedup event id goes. */
type FbqOptions = { eventID: string } | undefined

type FbqArgs =
  | ['track', string, Record<string, unknown>?, FbqOptions?]
  | ['trackCustom', string, Record<string, unknown>?, FbqOptions?]
  | ['init', string]

// `dataLayer` is already declared on Window by the GA typings, so this only
// adds the two globals the tag scripts install.
interface TagWindow extends Window {
  fbq?: (...args: unknown[]) => void
  gtag?: (...args: unknown[]) => void
}

/** Safe call into the Meta Pixel. Silent when consent has not been given. */
function fbq(...args: FbqArgs): void {
  if (typeof window === 'undefined') return
  const w = window as TagWindow
  if (typeof w.fbq !== 'function') return
  w.fbq(...args)
}

/**
 * Safe call into GA4, via gtag directly.
 *
 * NOT @next/third-parties' sendGAEvent: that helper only works if its own
 * <GoogleAnalytics> component rendered, because it returns early on an
 * internal flag that component sets. TrackingScripts loads the Google tag by
 * hand so the Consent Mode v2 defaults are guaranteed to run first, which
 * means that flag is never set and sendGAEvent would silently drop every
 * event.
 *
 * gtag itself is defined by the consent-defaults snippet, which runs
 * beforeInteractive on every page. Events sent while consent is denied are
 * still worth sending: Consent Mode forwards them as cookieless pings, which
 * is what feeds Google's conversion modelling.
 */
function ga(event: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const w = window as TagWindow
  if (typeof w.gtag !== 'function') return
  w.gtag('event', event, params)
}

/**
 * One line of a cart or a product view.
 *
 * `variantId` must be the product_variants row id - the same value the
 * Merchant feed publishes as <g:id>.
 */
export interface TrackedItem {
  variantId: string
  title: string
  price: number
  quantity: number
}

/** Meta wants a flat id list plus per-item price/quantity in `contents`. */
function metaPayload(items: TrackedItem[], value?: number) {
  return {
    content_type: 'product',
    content_ids: items.map(i => i.variantId),
    contents: items.map(i => ({
      id: i.variantId,
      quantity: i.quantity,
      item_price: Number(i.price.toFixed(2)),
    })),
    content_name: items.map(i => i.title).join(', ').slice(0, 200),
    value: Number((value ?? totalOf(items)).toFixed(2)),
    currency: CURRENCY,
  }
}

/** GA4 wants an `items` array with its own field names. */
function gaItems(items: TrackedItem[]) {
  return items.map(i => ({
    item_id: i.variantId,
    item_name: i.title,
    price: Number(i.price.toFixed(2)),
    quantity: i.quantity,
  }))
}

function totalOf(items: TrackedItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0)
}

// ─── Events ──────────────────────────────────────────────────────────────────

/**
 * Someone opened a product page, or switched to a different variant on one.
 *
 * Fires per variant rather than per product: the variant is what the catalogue
 * holds, so this is what builds a retargeting audience for the exact sofa and
 * colour a visitor was looking at.
 */
export function trackViewContent(item: TrackedItem): void {
  fbq('track', 'ViewContent', metaPayload([item]))
  ga('view_item', {
    currency: CURRENCY,
    value: Number((item.price * item.quantity).toFixed(2)),
    items: gaItems([item]),
  })
}

export function trackAddToCart(item: TrackedItem): void {
  fbq('track', 'AddToCart', metaPayload([item]))
  ga('add_to_cart', {
    currency: CURRENCY,
    value: Number((item.price * item.quantity).toFixed(2)),
    items: gaItems([item]),
  })
}

/** Someone moved from the basket into the details form. */
export function trackInitiateCheckout(items: TrackedItem[], value: number): void {
  fbq('track', 'InitiateCheckout', {
    ...metaPayload(items, value),
    num_items: items.reduce((n, i) => n + i.quantity, 0),
  })
  ga('begin_checkout', {
    currency: CURRENCY,
    value: Number(value.toFixed(2)),
    items: gaItems(items),
  })
}

/**
 * The checkout form was submitted successfully.
 *
 * Deliberately NOT a Purchase. Around a quarter of cash-on-delivery orders are
 * never completed, so counting a submitted form as a sale overstated revenue
 * by roughly a third and trained both ad platforms to find more people who
 * fill in forms rather than more people who pay.
 *
 * Purchase is now reported server-side when the order reaches 'confirmed' -
 * see utils/orderConversions.ts. This event stays as the funnel step, so the
 * placed -> confirmed -> delivered drop-off is still measurable.
 *
 * `total` is the database's figure, not the browser's, and is delivery
 * inclusive.
 */
export function trackOrderPlaced(orderId: string, total: number, items: TrackedItem[] = []): void {
  // trackCustom, not track: OrderPlaced is not one of Meta's standard events
  // and sending it as one would be silently ignored.
  fbq('trackCustom', 'OrderPlaced', {
    ...metaPayload(items, total),
    order_id: orderId,
  })
  ga('order_placed', {
    transaction_id: orderId,
    currency: CURRENCY,
    value: Number(total.toFixed(2)),
    items: gaItems(items),
  })
}

// ─── Google Ads ──────────────────────────────────────────────────────────────

/**
 * The conversion action to report against, as "AW-<account>/<label>".
 *
 * Read from the environment rather than hardcoded because the label is the one
 * value here that changes without the code changing: creating a new conversion
 * action in the Ads UI issues a new label, and a stale one reports into an
 * action nobody is bidding on. Absent, this whole function is a no-op - the
 * same way every other optional integration in this project behaves.
 *
 * NEXT_PUBLIC_ is required: the value is inlined at build time and read in the
 * browser. It is not a secret; the label is visible in any page that fires it.
 */
const ADS_SEND_TO = process.env.NEXT_PUBLIC_ADS_PURCHASE_SEND_TO

/**
 * Report one order to Google Ads.
 *
 * Deliberately NOT paired with a GA4 'purchase' here. GA4 already receives one
 * for every order, server-side, when it reaches 'confirmed' - see
 * utils/orderConversions.ts. Sending a second from the browser would double
 * the revenue in the Monetisation reports and re-introduce the cash-on-delivery
 * overstatement that the server-side design exists to remove.
 *
 * Google Ads has no such server-side path on this site, which is why this one
 * is a browser event.
 *
 * `reference` is the order's SHORT code - the first 8 characters of its uuid,
 * uppercased - and it is the canonical transaction id for this order
 * everywhere. The server-side GA4 purchase and the Meta CAPI event in
 * utils/orderConversions.ts already report against the same value, so one
 * order carries one identifier across all three platforms and the three
 * reports can be reconciled against each other.
 *
 * It is deliberately not the full uuid: that is the access token for
 * /confirm-order/[id], where holding it is enough to confirm the order and
 * read the customer's name, total and address. A transaction_id is transmitted
 * to Google and retained in its logs, which is no place for a bearer token.
 *
 * Google Ads treats transaction_id as the deduplication key. This event is
 * sent from two places - the checkout success step and /confirm-order/[id] -
 * and they agree on this value, so an order reported by both is counted once.
 * That is also the only guard that works across devices, where the local
 * storage check in components/Checkout/AdsPurchaseConversion.tsx cannot see
 * that the order has already been reported.
 *
 * Currency is GBP unconditionally. Google converts into the Ads account's
 * currency itself, so declaring the account's currency here instead would
 * silently mis-state the value of every order.
 */
export function trackAdsPurchase(reference: string, total: number): void {
  if (!ADS_SEND_TO) return

  ga('conversion', {
    send_to: ADS_SEND_TO,
    value: Number(total.toFixed(2)),
    currency: CURRENCY,
    transaction_id: reference,
  })
}
