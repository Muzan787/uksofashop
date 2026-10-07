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
// SERVER: an explicit TRACKING_ENV, set by hand on the server that serves
// live customers.
//
// This used to read VERCEL_ENV alone, on the reasoning that it is a platform
// variable present in every deployed function and never set by a developer -
// which was true while the site ran on Vercel. It moved to Hostinger on
// 2026-09-29, where there is no platform variable at all, so that sentence
// stopped being a guarantee and became an assumption: server-side tracking
// now depends on somebody having hand-set a variable named after a platform
// this site no longer uses. It IS set there today - every confirmed order
// since the move has its purchase_event_sent_at stamped - but nothing says
// so, and rebuilding the server without it would silently stop every Meta
// CAPI send, every GA4 Measurement Protocol hit and every offline-conversion
// row, with no error anywhere.
//
// TRACKING_ENV names the thing it actually controls. VERCEL_ENV is still
// honoured as a fallback so that the currently-running server keeps working
// untouched; set TRACKING_ENV=production on the host and the Vercel name can
// be retired.
//
// Both are checked against the literal 'production'. Anything else - unset,
// 'preview', 'staging', a typo - reads false, so the failure mode stays
// closed: tracking off, and the *_event_sent_at guard columns left unclaimed
// so a real order still reports correctly once the server is configured.
// NODE_ENV is deliberately not trusted as a substitute: the audit that led to
// this file found it was never actually being checked anywhere.

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
 * True only on the server that serves live customers.
 *
 * Gates every server-side conversion send: Meta CAPI, the GA4 Measurement
 * Protocol, and the Google offline-conversion staging rows in
 * utils/orderConversions.ts. A staging host, a branch deployment, or a local
 * `next start` all read false here, so an order confirmed while testing one
 * of those never reaches a live ad account or the offline-conversion staging
 * table - and, because the *_event_sent_at guard columns are never claimed
 * in that case, the same order still reports correctly later if it turns out
 * to be a real production order after all.
 *
 * See the note at the top of this file for why there are two names.
 */
export function isServerTrackingEnabled(): boolean {
  return (process.env.TRACKING_ENV ?? process.env.VERCEL_ENV) === 'production'
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
