// src/utils/rateLimit.ts
//
// A small in-process rate limiter for the public endpoints that send email.
//
// The contact form and place_order both send mail on every call, both are
// reachable without a session, and both go through one mailbox with a daily
// send cap. A bot loop on either would exhaust that cap and take order
// confirmations down with it - so the limit protects deliverability, not just
// the inbox.
//
// SCOPE AND HONESTY ABOUT IT: this counter lives in the memory of one server
// instance. On Vercel that means it is per-lambda and resets on cold start, so
// a determined attacker spraying across instances gets more through than the
// numbers below suggest. It stops casual abuse and accidental double-submits,
// which is the common case. If this ever needs to be authoritative, move the
// counter to Postgres or Upstash - the call sites would not change.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/** Stops the map growing without bound on a long-lived instance. */
function sweep(now: number) {
  if (buckets.size < 500) return
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the window resets. Only meaningful when ok is false. */
  retryAfter: number
}

/**
 * Fixed-window counter.
 *
 * @param key    Identifies the caller - typically `contact:<ip>`.
 * @param limit  Requests allowed per window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) }
  }

  existing.count += 1
  return { ok: true, retryAfter: 0 }
}

/**
 * Best-effort caller identity from the request headers.
 *
 * x-forwarded-for is set by the proxy in front of the app; its first entry is
 * the client. Falls back to a constant so a missing header degrades into a
 * shared bucket rather than into no limit at all.
 */
export function callerKey(headers: Headers, prefix: string): string {
  const ip =
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  return `${prefix}:${ip}`
}
