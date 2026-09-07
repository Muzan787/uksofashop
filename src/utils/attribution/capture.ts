// src/utils/attribution/capture.ts
//
// Reads gclid/gbraid/wbraid/fbclid/UTMs off the current URL, decides whether
// this pageview is a new "arrival", and tells the server about it.
//
// Runs on every pageview (see components/UI/AttributionBoot.tsx), but only
// WRITES anything - cookies or the /api/attribution/arrival beacon - when
// there is something new to record. Plain internal navigation between two
// pages with no campaign parameters touches none of this.

import { isBrowserTrackingEnabled } from '@/utils/trackingEnv'
import { getConsent } from '@/utils/consent'
import {
  ensureVisitorId,
  ensureSession,
  ensureFirstTouch,
  readTouch,
  updateLastTouch,
  type TouchAttribution,
} from './ids'

const CLICK_ID_PARAMS = ['gclid', 'gbraid', 'wbraid', 'fbclid'] as const
const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

function readTouchFromLocation(): { touch: TouchAttribution; hasFreshParams: boolean } {
  const params = new URLSearchParams(window.location.search)
  const hasFreshParams =
    CLICK_ID_PARAMS.some(p => params.has(p)) || UTM_PARAMS.some(p => params.has(p))

  const touch: TouchAttribution = {
    source: params.get('utm_source') ?? undefined,
    medium: params.get('utm_medium') ?? undefined,
    campaign: params.get('utm_campaign') ?? undefined,
    content: params.get('utm_content') ?? undefined,
    term: params.get('utm_term') ?? undefined,
    gclid: params.get('gclid') ?? undefined,
    gbraid: params.get('gbraid') ?? undefined,
    wbraid: params.get('wbraid') ?? undefined,
    fbclid: params.get('fbclid') ?? undefined,
    landingPage: window.location.pathname,
    referrer: document.referrer || undefined,
    touchAtMs: Date.now(),
  }

  return { touch, hasFreshParams }
}

interface ArrivalContext {
  productId?: string
  variantId?: string
}

let lastPingedArrivalId: string | null = null

/**
 * Run once per pageview. Ensures the visitor/session/arrival cookies exist,
 * updates first/last touch as appropriate, and - only on a genuinely new
 * arrival - tells the server so it can persist attribution_sessions.
 *
 * The server write is production-gated (see api/attribution/arrival/route.ts);
 * the cookie bookkeeping here is not, because it is what checkout.ts and the
 * WhatsApp enquiry route read back later regardless of which environment an
 * order happens to be placed from - the same reasoning _ga/_fbp already
 * follow in this codebase.
 */
export function captureArrival(context: ArrivalContext = {}): void {
  if (typeof window === 'undefined') return

  const visitorId = ensureVisitorId()
  const { touch, hasFreshParams } = readTouchFromLocation()
  const { sessionId, arrivalId, isNewSession } = ensureSession(hasFreshParams)

  // Advertising click IDs / UTMs are marketing attribution data. Keep the
  // operational visitor/session/arrival ids regardless, but do not persist
  // marketing touch cookies until the visitor has explicitly granted consent.
  // AttributionBoot re-runs this function on the consent-granted event so a
  // landing URL that still carries gclid/fbclid/UTMs is captured at that point.
  if (getConsent() === 'granted') {
    ensureFirstTouch(touch)

    // Last-touch follows a last-non-direct rule: a fresh paid/UTM touch may
    // replace it, but a later direct return must not erase the campaign that
    // actually brought the visitor. If there is no previous last-touch at all,
    // initialise it on the first session so direct-only visitors still have a
    // coherent record.
    const existingLastTouch = readTouch('lastTouch')
    if (hasFreshParams || (!existingLastTouch && isNewSession)) updateLastTouch(touch)
  }

  if (!isNewSession || lastPingedArrivalId === arrivalId) return
  lastPingedArrivalId = arrivalId

  if (!isBrowserTrackingEnabled()) return

  try {
    void fetch('/api/attribution/arrival', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        visitorId,
        sessionId,
        arrivalId,
        productId: context.productId,
        variantId: context.variantId,
        landingPath: window.location.pathname + window.location.search,
        referrer: document.referrer || undefined,
      }),
    }).catch(() => {})
  } catch {
    // Nothing useful to do if fetch itself throws (e.g. blocked outright).
  }
}
