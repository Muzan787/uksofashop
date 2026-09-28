// src/utils/requestOrigin.ts
//
// The origin the visitor actually used.
//
// `new URL(request.url).origin` inside a Route Handler is NOT that. Next
// rebuilds `request.url` from the address the server process is listening on,
// so behind a reverse proxy it is the internal origin - never the one in the
// browser's address bar. Vercel's edge hid this by handing the function the
// external URL; Hostinger's proxy does not, and on the day this site changed
// hosts every comparison against it silently began to fail:
//
//   /api/google/consent   403 on every request  - consent receipts stopped
//   /api/offer/qualify    400 INACTIVE always   - offer entitlements stopped
//   /offer-entry/[token]  redirected paid ad clicks to the internal origin
//
// None of those surfaced as an error anywhere a person would look.
//
// The Host and X-Forwarded-Proto headers DO survive the proxy, so the origin
// is reconstructed from them instead. `middleware`/`proxy.ts` is unaffected -
// `NextRequest.url` there is populated from the incoming request - so this is
// only needed in Route Handlers, which receive a plain `Request`.
//
// This helper reconstructs; it does not authorise. Callers that care whether
// the host is genuinely ours still check it with `isProductionRequestHost`.

/**
 * Scheme + host (and port, when the browser used one), as the visitor saw it.
 * Null when there is no Host header to build from.
 *
 * X-Forwarded-Proto is preferred when present and sane. Without it the scheme
 * is inferred: loopback means a local `next start`, anything else is a
 * deployed host and therefore https - the site sends HSTS, so a plain-http
 * request never reaches application code in production anyway.
 */
export function externalOrigin(headers: Headers): string | null {
  const host = headers.get('host')
  if (!host) return null

  const forwarded = headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  const proto =
    forwarded === 'http' || forwarded === 'https'
      ? forwarded
      : /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(host)
        ? 'http'
        : 'https'

  return `${proto}://${host}`
}
