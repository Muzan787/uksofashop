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
// components/UI/TrackingScripts.tsx), so neither global is there when a page
// first mounts. GA events sent in that window are simply dropped - gtag is
// installed by the head snippet, so the gap is a few milliseconds. The Meta
// gap is seconds, and wide enough to swallow a whole event; see the queue
// below the fbq helper for what happens instead.
//
// EVERY META EVENT HERE IS SENT TWICE - once by the Pixel, once by the
// server, through /api/meta/event. The two carry the same event_id and Meta
// keeps whichever arrives first. The second copy exists because the first
// one is blockable: a third of visitors run something that refuses
// connect.facebook.net, and that third is not a random sample of the people
// buying sofas. GA4 needs no equivalent - Consent Mode already sends
// cookieless pings for the visitors it cannot measure directly.

import { META_PIXEL_ID, META_PIXEL_READY_EVENT } from '@/utils/consentMode'
import { getConsent } from '@/utils/consent'
import { normaliseUkMobile } from '@/utils/phone'

const CURRENCY = 'GBP'

/** The 4th argument is Meta's options bag, where the dedup event id goes. */
type FbqOptions = { eventID: string } | undefined

type FbqArgs =
  | ['track', string, Record<string, unknown>?, FbqOptions?]
  | ['trackCustom', string, Record<string, unknown>?, FbqOptions?]
  | ['init', string, AdvancedMatching?]

// `dataLayer` is already declared on Window by the GA typings, so this only
// adds the two globals the tag scripts install.
interface TagWindow extends Window {
  fbq?: (...args: unknown[]) => void
  gtag?: (...args: unknown[]) => void
}

/**
 * Meta's advanced matching keys, as fbq('init') takes them.
 *
 * Plain text, not digests: fbevents.js normalises and SHA-256s these in the
 * browser before anything leaves the page, and hashing them ourselves first
 * would only produce a hash of a hash that matches nobody. The server side
 * is the opposite - utils/metaCapi.ts must hash, because it is the thing
 * making the request.
 */
interface AdvancedMatching {
  em?: string
  ph?: string
  fn?: string
  ln?: string
  zp?: string
  country?: string
}

/** Whatever the page has learned about who this visitor is. */
export interface MetaIdentity {
  email?: string | null
  /** Any UK format. Normalised to 447… before it is sent. */
  phone?: string | null
  /** As typed, in one field. Split into first and last here. */
  name?: string | null
  postcode?: string | null
}

/**
 * Held in memory for the life of the tab, and nowhere else.
 *
 * Deliberately not sessionStorage. This is a customer name, email, mobile and
 * postcode - persisting it would leave it on a shared or family device after
 * the tab is closed, to buy nothing except matching on a visit that has
 * already ended.
 */
let identity: MetaIdentity | null = null

/**
 * Events fired before the Pixel existed, waiting for it.
 *
 * The Pixel is gated on consent, and consent is read in an effect - so the
 * snippet is injected a render AFTER the page mounts, and fbevents.js only
 * starts loading a second or two after the load event. A product page reports
 * ViewContent from its own mount effect, which is always earlier than that, so
 * before this queue existed EVERY product view was dropped: the helper found
 * no window.fbq and returned. AddToCart and InitiateCheckout survived only
 * because a person cannot click that fast.
 *
 * WHY THIS IS NOT A CONSENT HOLE. Nothing here is ever sent unless the Pixel
 * loads, and the Pixel only loads once consent is granted. A visitor who
 * declines leaves the queue sitting in memory until the page is closed.
 *
 * BOUNDED, on purpose. If the banner is answered ten minutes into a visit, the
 * Pixel mounts on whatever page they are on now and reports a PageView for it;
 * replaying a ViewContent from four pages ago as though it had just happened
 * would be a false report, not a recovered one. So the queue drops anything
 * older than the bridge it exists to cover, and caps its own length rather
 * than growing without limit on a long single-page session.
 */
const pending: { args: FbqArgs; at: number }[] = []
const PENDING_TTL_MS = 30_000
const PENDING_MAX = 20

/** Safe call into the Meta Pixel. Held, not lost, while it is still loading. */
function fbq(...args: FbqArgs): void {
  if (typeof window === 'undefined') return
  const w = window as TagWindow

  if (typeof w.fbq !== 'function') {
    if (pending.length < PENDING_MAX) pending.push({ args, at: Date.now() })
    return
  }

  w.fbq(...args)
}

/**
 * Send whatever was held, once the Pixel says it is ready.
 *
 * The listener is registered on import rather than from a component: this
 * module is what owns the queue, and a component that happened to unmount
 * would otherwise take the flush with it.
 */
if (typeof window !== 'undefined') {
  window.addEventListener(META_PIXEL_READY_EVENT, () => {
    const w = window as TagWindow
    if (typeof w.fbq !== 'function') return

    // Before the queue, not after: an event that carries who it belongs to
    // is worth more than the same event sent a millisecond earlier.
    applyAdvancedMatching()

    const cutoff = Date.now() - PENDING_TTL_MS
    const queued = pending.splice(0, pending.length)
    for (const item of queued) {
      if (item.at >= cutoff) w.fbq(...item.args)
    }
  })
}

/**
 * Tell the Pixel who this is.
 *
 * Re-running fbq('init') on a pixel that is already initialised is Meta's
 * own documented way to attach advanced matching once it becomes known,
 * rather than a second initialisation - the id is the same, so there is
 * still one pixel. Every event after this call carries the hashed keys, and
 * a match on a hashed email is worth far more than one on a cookie that
 * Safari will delete in seven days.
 *
 * Calls window.fbq directly rather than going through the queue above,
 * because ordering matters here: this has to land before the events it is
 * meant to improve, and the queue is FIFO with those events already in it.
 */
function applyAdvancedMatching(): void {
  if (typeof window === 'undefined' || !identity) return
  const w = window as TagWindow
  if (typeof w.fbq !== 'function') return

  const name = (identity.name ?? '').trim()
  const phone = identity.phone ? normaliseUkMobile(identity.phone) : null

  const matching: AdvancedMatching = { country: 'gb' }
  if (identity.email) matching.em = identity.email.trim().toLowerCase()
  if (phone) matching.ph = phone
  if (name) matching.fn = name.split(/s+/)[0]
  if (name.includes(' ')) matching.ln = name.split(/s+/).slice(1).join(' ')
  if (identity.postcode) matching.zp = identity.postcode.replace(/s+/g, '').toLowerCase()

  w.fbq('init', META_PIXEL_ID, matching)
}

/**
 * Record who the visitor is, for every Meta event from here on.
 *
 * Called from the checkout form once its own validation has passed, which is
 * the first and only point on this site where a visitor tells us who they
 * are without signing in. Signed-in customers are matched server-side
 * instead, from the session - see app/api/meta/event/route.ts - so that the
 * storefront bundle does not have to carry a Supabase client to find out.
 */
export function setMetaIdentity(who: MetaIdentity): void {
  identity = who
  applyAdvancedMatching()
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

/**
 * The lines of an event, in the one shape both Meta paths take.
 *
 * Shared rather than written twice because the Pixel copy and the server
 * copy of an event are deduplicated against each other: if the two ever
 * described different baskets, whichever arrived first would win and the
 * other would be discarded unseen - a divergence invisible in Events
 * Manager and wrong in the ad account.
 */
function contentsOf(items: TrackedItem[]) {
  return items.map(i => ({
    id: i.variantId,
    quantity: i.quantity,
    item_price: Number(i.price.toFixed(2)),
  }))
}

/** Meta wants a flat id list plus per-item price/quantity in `contents`. */
function metaPayload(items: TrackedItem[], value?: number) {
  return {
    content_type: 'product',
    content_ids: items.map(i => i.variantId),
    contents: contentsOf(items),
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

// ─── The server copy ───────────────────────────────────────────────────────

/** Events that have a Conversions API twin. See app/api/meta/event. */
type MirroredEvent = 'ViewContent' | 'AddToCart' | 'InitiateCheckout'

/**
 * A fresh id, shared by the two copies of one event so Meta counts it once.
 *
 * randomUUID needs a secure context, which every page here is; the fallback
 * covers the last browsers that have crypto but not that method. It has to
 * be unique among this account’s events, not unguessable - nothing is
 * authorised by it.
 *
 * globalThis rather than window: this runs before the helpers that check
 * for a browser, so it must not be the thing that throws on a server render.
 */
function newEventId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(1, 12)
}

/**
 * Post one event to our own endpoint, which forwards it to Meta.
 *
 * CONSENT is checked here rather than server-side, because the answer lives
 * in localStorage and the server cannot read it. This is the same trust the
 * Pixel operates on: it is not loaded unless consent is granted, and this is
 * not called unless consent is granted.
 *
 * keepalive, because the two events most worth having - AddToCart and
 * InitiateCheckout - are each followed immediately by a navigation, and a
 * plain fetch is cancelled when the document goes away.
 *
 * Fire and forget, silent on failure. This is a second copy of something the
 * Pixel already has; no customer should ever see a console error or a slower
 * page because an advertising endpoint was unhappy.
 */
function mirror(
  event: MirroredEvent,
  eventId: string,
  body: { value: number; contents: ReturnType<typeof contentsOf> },
): void {
  if (typeof window === 'undefined') return

  const name = (identity?.name ?? '').trim()

  try {
    // Inside the try because reading localStorage throws outright in a
    // browser set to block site data, and an advertising copy of an event
    // must never be able to break the page that fired it.
    if (getConsent() !== 'granted') return

    void fetch('/api/meta/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event,
        eventId,
        path: window.location.pathname + window.location.search,
        value: body.value,
        currency: CURRENCY,
        contents: body.contents,
        user: identity
          ? {
              email: identity.email?.trim().toLowerCase() || undefined,
              phone: identity.phone || undefined,
              firstName: name.split(/\s+/)[0] || undefined,
              lastName: name.split(/\s+/).slice(1).join(' ') || undefined,
              postcode: identity.postcode || undefined,
            }
          : undefined,
      }),
    }).catch(() => {})
  } catch {
    // Offline, or refused before it was made. Nothing useful to do here.
  }
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
  const eventId = newEventId()
  const value = Number((item.price * item.quantity).toFixed(2))

  fbq('track', 'ViewContent', metaPayload([item]), { eventID: eventId })
  mirror('ViewContent', eventId, { value, contents: contentsOf([item]) })
  ga('view_item', {
    currency: CURRENCY,
    value,
    items: gaItems([item]),
  })
}

export function trackAddToCart(item: TrackedItem): void {
  const eventId = newEventId()
  const value = Number((item.price * item.quantity).toFixed(2))

  fbq('track', 'AddToCart', metaPayload([item]), { eventID: eventId })
  mirror('AddToCart', eventId, { value, contents: contentsOf([item]) })
  ga('add_to_cart', {
    currency: CURRENCY,
    value,
    items: gaItems([item]),
  })
}

/** Someone moved from the basket into the details form. */
export function trackInitiateCheckout(items: TrackedItem[], value: number): void {
  const eventId = newEventId()

  fbq('track', 'InitiateCheckout', {
    ...metaPayload(items, value),
    num_items: items.reduce((n, i) => n + i.quantity, 0),
  }, { eventID: eventId })
  mirror('InitiateCheckout', eventId, {
    value: Number(value.toFixed(2)),
    contents: contentsOf(items),
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
