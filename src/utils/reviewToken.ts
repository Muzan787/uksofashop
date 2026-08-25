// src/utils/reviewToken.ts
//
// Signed links that let a guest review the thing they actually bought.
//
// The review form used to require an account, but customers check out as
// guests - so the only people who could leave a review were people who had
// never bought anything. This closes that, without asking a customer to make
// an account before they can say the sofa arrived.
//
// The token is stateless: order id, product id and an HMAC over both. Nothing
// is stored, nothing expires server-side, and a token cannot be altered to
// point at a different order without the secret. The database enforces one
// review per (order, product) so a link cannot be reused to post twice.

import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Falls back to the service-role key so the feature still works before a
 * dedicated secret is set. Both are server-only and equally secret; a
 * dedicated REVIEW_TOKEN_SECRET is preferable so the two can be rotated
 * independently.
 */
function secret(): string {
  const s = process.env.REVIEW_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('No secret available to sign review tokens')
  return s
}

/** Base64url, so the token is safe in a query string without escaping. */
function b64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function sign(orderId: string, productId: string): string {
  return b64url(createHmac('sha256', secret()).update(`${orderId}:${productId}`).digest())
}

export function createReviewToken(orderId: string, productId: string): string {
  return `${orderId}.${productId}.${sign(orderId, productId)}`
}

export interface VerifiedReviewToken {
  orderId: string
  productId: string
}

/**
 * Returns null for anything that does not verify. Comparison is
 * constant-time: a plain === leaks how much of a forged signature was correct
 * through timing, which is enough to forge one byte at a time.
 */
export function verifyReviewToken(token: string | null | undefined): VerifiedReviewToken | null {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [orderId, productId, provided] = parts
  if (!orderId || !productId || !provided) return null

  const expected = sign(orderId, productId)

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null

  return { orderId, productId }
}
