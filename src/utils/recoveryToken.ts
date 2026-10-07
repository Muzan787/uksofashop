// src/utils/recoveryToken.ts
//
// One-click opt-out for the abandoned-checkout reminder.
//
// WHY THIS EXISTS. The reminder is sent to someone who ticked a box at
// checkout, so there is consent — but PECR reg 22(3)(c) wants a simple means
// of refusing in EVERY message, not only at the point of signing up. The
// only opt-out the site had was the checkbox itself, and
// /api/checkout/recovery reads `uksofashop_sid` from the visitor's cookies
// to find the row. Two days later, in a mail client, on a different device,
// those cookies are not there: there was no way to stop the reminder from
// the reminder.
//
// Same construction as utils/reviewToken.ts, for the same reasons: stateless,
// nothing stored, nothing to expire, and the lead id cannot be swapped for
// another without the secret. The worst a forged token could do is
// unsubscribe somebody from an email they did not want anyway, but a bare
// uuid in a link would still be a row id handed to anyone who sees the URL.

import { createHmac, timingSafeEqual } from 'crypto'

function secret(): string {
  const s = process.env.REVIEW_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('No secret available to sign recovery tokens')
  return s
}

/** Base64url, so the token is safe in a query string without escaping. */
function b64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function sign(leadId: string): string {
  return b64url(createHmac('sha256', secret()).update(`recovery:${leadId}`).digest())
}

export function createRecoveryOptOutToken(leadId: string): string {
  return `${leadId}.${sign(leadId)}`
}

/**
 * Returns the lead id, or null for anything that does not verify.
 * Constant-time comparison: a plain === leaks how much of a forged signature
 * was right through timing.
 */
export function verifyRecoveryOptOutToken(token: string | null | undefined): string | null {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [leadId, provided] = parts
  if (!leadId || !provided) return null

  const a = Buffer.from(provided)
  const b = Buffer.from(sign(leadId))
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null

  return leadId
}
