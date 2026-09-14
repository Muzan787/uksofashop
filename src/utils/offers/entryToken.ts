import { createHmac, timingSafeEqual } from 'node:crypto'

export const OFFER_ENTRY_VERSION = 1 as const

export type TrustedOfferEntrySource = 'meta_ads' | 'meta_catalog'

export interface OfferEntryPayload {
  v: typeof OFFER_ENTRY_VERSION
  source: TrustedOfferEntrySource
  destination: string
  variantId?: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHOP_PATH = /^\/shop\/[a-z0-9%+._~-]+\/[a-z0-9%+._~-]+$/i

function signingKey(): Buffer {
  // A dedicated key can be introduced later without changing the public
  // token contract. Production already has a strong server-only root secret,
  // so derive a purpose-specific HMAC key from it instead of adding another
  // operational credential solely for this bounded, public/shareable offer.
  // Domain separation means a valid offer signature reveals nothing useful
  // about the Supabase service-role key and cannot be replayed as one.
  const root = process.env.OFFER_ENTRY_SIGNING_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!root || root.length < 32) {
    throw new Error('Server offer-entry signing authority is not configured.')
  }
  return createHmac('sha256', root).update('ukss:offer-entry:v1').digest()
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

function signature(encodedPayload: string): string {
  return createHmac('sha256', signingKey()).update(encodedPayload).digest('base64url')
}

function safeDestination(raw: string): URL | null {
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('#')) return null
  try {
    const url = new URL(raw, 'https://uksofashop.invalid')
    return url.origin === 'https://uksofashop.invalid' ? url : null
  } catch {
    return null
  }
}

export function validateOfferEntryPayload(value: unknown): OfferEntryPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  if (candidate.v !== OFFER_ENTRY_VERSION) return null
  if (candidate.source !== 'meta_ads' && candidate.source !== 'meta_catalog') return null
  if (typeof candidate.destination !== 'string' || candidate.destination.length > 1024) return null

  const destination = safeDestination(candidate.destination)
  if (!destination) return null

  if (candidate.source === 'meta_catalog') {
    if (typeof candidate.variantId !== 'string' || !UUID.test(candidate.variantId)) return null
    if (!SHOP_PATH.test(destination.pathname)) return null
    if (destination.searchParams.get('variant') !== candidate.variantId) return null
    if ([...destination.searchParams.keys()].some(key => key !== 'variant')) return null
  } else {
    if (candidate.variantId !== undefined) return null
  }

  return {
    v: OFFER_ENTRY_VERSION,
    source: candidate.source,
    destination: `${destination.pathname}${destination.search}`,
    ...(candidate.source === 'meta_catalog' ? { variantId: candidate.variantId as string } : {}),
  }
}

export function signOfferEntry(payload: OfferEntryPayload): string {
  const valid = validateOfferEntryPayload(payload)
  if (!valid) throw new Error('Invalid offer-entry payload.')
  const encoded = base64url(JSON.stringify(valid))
  return `${encoded}.${signature(encoded)}`
}

export function verifyOfferEntry(token: string): OfferEntryPayload | null {
  if (token.length > 1800) return null
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null

  const expected = Buffer.from(signature(parts[0]), 'base64url')
  let supplied: Buffer
  try {
    supplied = Buffer.from(parts[1], 'base64url')
  } catch {
    return null
  }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null

  try {
    const parsed = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as unknown
    return validateOfferEntryPayload(parsed)
  } catch {
    return null
  }
}
