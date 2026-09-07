// src/utils/attribution/ids.ts
//
// Visitor / session / arrival identity, and first-touch / last-touch storage.
//
// Three ids, three different lifetimes:
//
//   visitor_id  one per device+browser, for as long as cookies survive. Never
//               regenerated once set.
//   session_id  one per period of activity. Reset after 30 minutes of
//               inactivity - the same window GA4 itself uses - so a visitor
//               who leaves a tab open overnight and returns is a new session,
//               not a thirteen-hour one.
//   arrival_id  one per MEANINGFUL entry into the site: the start of a new
//               session, or a later pageview that carries fresh campaign
//               parameters (gclid, fbclid, utm_source, ...). Clicking a
//               second ad mid-session is a new arrival even though the
//               session never ended - that is what lets last-touch move
//               without destroying the session it happened in.
//
// All three are plain first-party cookies rather than localStorage, so both
// the browser (for the WhatsApp beacon and the arrival ping) and server
// actions (checkout, the WhatsApp click API route) can read the same values
// with `cookies()` - exactly the way _ga, _fbp and _fbc already work in this
// codebase. No identifier here is a marketing cookie in Meta or Google's
// sense; nothing in this file is gated on cookie consent, the same way a
// visitor counter or a session id would not be under most cookie regimes -
// see the note in docs/TRACKING_V2_EXPORT_CONTRACT.md on what is and is not
// consent-gated. gclid/fbclid VALUES captured alongside them are a separate
// question, covered in capture.ts.

const DAY_MS = 24 * 60 * 60 * 1000

export const COOKIE = {
  visitor: 'uksofashop_vid',
  session: 'uksofashop_sid',
  arrival: 'uksofashop_aid',
  firstTouch: 'uksofashop_ft',
  lastTouch: 'uksofashop_lt',
} as const

/** 30 minutes, matching GA4's own default session timeout. */
export const SESSION_MAX_AGE_S = 30 * 60
/** ~400 days - the maximum Chrome will honour for a cookie's Max-Age at all. */
const VISITOR_MAX_AGE_S = 400 * 24 * 60 * 60
const TOUCH_MAX_AGE_S = VISITOR_MAX_AGE_S

function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return
  document.cookie =
    `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`
}

export interface TouchAttribution {
  source?: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
  gclid?: string
  gbraid?: string
  wbraid?: string
  fbclid?: string
  landingPage?: string
  referrer?: string
  /** Client timestamp for this meaningful touch; used to construct Meta fbc if _fbc is unavailable. */
  touchAtMs?: number
}

export function readTouch(name: 'firstTouch' | 'lastTouch'): TouchAttribution | null {
  const raw = readCookie(COOKIE[name])
  if (!raw) return null
  try {
    return JSON.parse(raw) as TouchAttribution
  } catch {
    return null
  }
}

function writeTouch(name: 'firstTouch' | 'lastTouch', value: TouchAttribution): void {
  writeCookie(COOKIE[name], JSON.stringify(value), TOUCH_MAX_AGE_S)
}

/** Get or create the persistent visitor id. Stable for ~400 days. */
export function ensureVisitorId(): string {
  const existing = readCookie(COOKIE.visitor)
  if (existing) {
    // Refresh the expiry on every visit so an active visitor's id does not
    // quietly lapse.
    writeCookie(COOKIE.visitor, existing, VISITOR_MAX_AGE_S)
    return existing
  }
  const id = newId()
  writeCookie(COOKIE.visitor, id, VISITOR_MAX_AGE_S)
  return id
}

export interface SessionState {
  sessionId: string
  arrivalId: string
  /** True when this call started a brand new session (first pageview, or timed out). */
  isNewSession: boolean
}

/**
 * Get or create the session id, sliding its 30-minute expiry forward, and
 * decide whether this pageview starts a new arrival.
 *
 * `hasFreshTouchParams` should be true when the current URL carries any of
 * gclid/gbraid/wbraid/fbclid/utm_source - i.e. this pageview is itself a
 * meaningful touch, not just internal navigation. A new arrival is minted
 * whenever the session is new OR the pageview is itself a fresh touch, so a
 * second ad click ten minutes into an existing session still gets its own
 * arrival even though the session continues.
 */
export function ensureSession(hasFreshTouchParams: boolean): SessionState {
  const existingSession = readCookie(COOKIE.session)
  const existingArrival = readCookie(COOKIE.arrival)

  const isNewSession = !existingSession
  const sessionId = existingSession ?? newId()
  writeCookie(COOKIE.session, sessionId, SESSION_MAX_AGE_S)

  const needsNewArrival = isNewSession || hasFreshTouchParams || !existingArrival
  const arrivalId = needsNewArrival ? newId() : existingArrival!
  writeCookie(COOKIE.arrival, arrivalId, SESSION_MAX_AGE_S)

  return { sessionId, arrivalId, isNewSession: isNewSession || needsNewArrival }
}

/** First-touch is written once and never overwritten while it still exists. */
export function ensureFirstTouch(candidate: TouchAttribution): TouchAttribution {
  const existing = readTouch('firstTouch')
  if (existing) return existing
  writeTouch('firstTouch', candidate)
  return candidate
}

/** Last-touch is overwritten only when the caller has a fresh touch to record. */
export function updateLastTouch(candidate: TouchAttribution): TouchAttribution {
  writeTouch('lastTouch', candidate)
  return candidate
}

export { DAY_MS }
