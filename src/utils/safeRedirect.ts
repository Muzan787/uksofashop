// src/utils/safeRedirect.ts
//
// Where to send someone after they sign in, when the address came from the
// URL (`/login?next=/admin/orders`).
//
// A `next` that is taken as given is an open redirect: a link to our own
// sign-in page that lands the person on somebody else's site straight after
// they have typed their password, which is the setup a phishing page wants.
// So only a path on this site is accepted. Anything with a scheme, a host,
// a protocol-relative `//`, a backslash (which browsers read as a slash) or a
// control character is refused, and the caller falls back to its default.

const PLACEHOLDER_ORIGIN = 'https://placeholder.invalid'

/**
 * The path, query and hash of `raw` when it points somewhere on this site;
 * otherwise null.
 */
export function safeNextPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!value || value.length > 2048) return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  // Backslashes and control characters are where the parsers disagree.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null

  let url: URL
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN)
  } catch {
    return null
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return null

  return `${url.pathname}${url.search}${url.hash}`
}

/** True for the admin panel and anything under it. */
export function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/') || path.startsWith('/admin?') || path.startsWith('/admin#')
}
