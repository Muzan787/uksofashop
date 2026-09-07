// src/utils/trackingEnv.ts
//
// Whether tracking is allowed to run at all, decided once, in one place.
//
// THE GAP THIS CLOSES. Nothing in this codebase previously distinguished
// production traffic from a developer's laptop, a LAN preview, or a Vercel
// preview deployment - GA and the Meta Pixel loaded identically everywhere,
// and a confirmed order taken while testing would report a real conversion
// against the live ad accounts. isBrowserTrackingEnabled and
// isServerTrackingEnabled are the two calls that now stand between "this is
// live customer traffic" and every tag, pixel and server-side send in the app.
//
// BROWSER: a hostname allowlist, not an env var. NEXT_PUBLIC_* values are
// inlined at build time, and NEXT_PUBLIC_VERCEL_ENV specifically is only
// populated when a project has the "Automatically expose System Environment
// Variables" toggle turned on - unset by default, and this repository does
// not reference it anywhere, so trusting it here would fail OPEN (tracking
// running everywhere) the moment that toggle is off, which is the exact
// failure mode this file exists to close. window.location.hostname cannot be
// silently misconfigured the same way, and needs no build-time wiring at all.
//
// SERVER: VERCEL_ENV is a Vercel platform variable, present in the process
// environment of every deployed function regardless of that toggle, and is
// not something a developer sets by hand. Anything running outside Vercel
// entirely - `next start` on a laptop, a CI job - has no VERCEL_ENV and is
// therefore never production here, regardless of NODE_ENV: the forensic audit
// that led to this file found NODE_ENV alone was never actually being checked
// anywhere, so it is deliberately not trusted as a substitute now either.

/**
 * The only hostnames production browser tracking is allowed to run on.
 * Exact match - no subdomain wildcard, no *.vercel.app, no bare-domain-only
 * bypass. Add a hostname here only when it is a real, permanent production
 * domain for this storefront.
 */
export const PRODUCTION_HOSTS = ['uksofashop.co.uk', 'www.uksofashop.co.uk'] as const

/**
 * True only when this code is running in an actual visitor's browser, on one
 * of the live production hostnames.
 *
 * False on localhost, 127.0.0.1, any 192.168.x.x or 10.x.x.x LAN address, any
 * vercel.app preview or branch deployment, and any other non-production
 * domain the app might be served from - and false during server rendering,
 * where there is no window to read a hostname from at all.
 */
export function isBrowserTrackingEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return (PRODUCTION_HOSTS as readonly string[]).includes(window.location.hostname)
}

/**
 * True only for code executing inside a Vercel Production deployment.
 *
 * Gates every server-side conversion send: Meta CAPI, the GA4 Measurement
 * Protocol, and the Google offline-conversion staging rows in
 * utils/orderConversions.ts. A preview deployment, a branch deployment, or a
 * local `next start` all read false here, so an order confirmed while testing
 * one of those never reaches a live ad account or the offline-conversion
 * staging table - and, because the *_event_sent_at guard columns are never
 * claimed in that case, the same order still reports correctly later if it
 * turns out to be a real production order after all.
 */
export function isServerTrackingEnabled(): boolean {
  return process.env.VERCEL_ENV === 'production'
}

/**
 * Defense-in-depth for the two API routes that take a customer-facing request
 * directly (attribution arrival capture, the WhatsApp enquiry beacon):
 * reject anything that did not arrive over one of the production hostnames,
 * independent of whichever Vercel deployment happens to be serving it.
 *
 * Takes the raw `Host` header value, which may carry a port (`localhost:3000`)
 * that has no place in a hostname comparison.
 */
export function isProductionRequestHost(host: string | null | undefined): boolean {
  if (!host) return false
  return (PRODUCTION_HOSTS as readonly string[]).includes(host.split(':')[0].toLowerCase())
}
