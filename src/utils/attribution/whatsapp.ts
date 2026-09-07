// src/utils/attribution/whatsapp.ts
//
// A reference minted before the visitor ever leaves for WhatsApp, so a chat
// that turns into a sale can be linked back to whichever ad, page and product
// produced it - see docs/TRACKING_V2_EXPORT_CONTRACT.md and
// supabase/migrations/20260906110000_whatsapp_enquiries.sql.
//
// FORMAT: UKSS-WA-YYMMDD-XXXXXX. The date makes a reference typed into
// /admin/orders sort and skim naturally; the six trailing characters are
// drawn from crypto.randomUUID, not a counter, so a reference cannot be
// guessed or enumerated - it is written into an outbound WhatsApp message,
// which is as public as a URL query string once sent.

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function randomSuffix(): string {
  const bytes = new Uint8Array(6)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}

function datePart(): string {
  const now = new Date()
  const yy = String(now.getUTCFullYear()).slice(2)
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

/** UKSS-WA-260906-A7F31C */
export function generateWhatsAppReference(): string {
  return `UKSS-WA-${datePart()}-${randomSuffix()}`
}

/** Matches what the database's check constraint accepts. Used to validate input, not just generate it. */
export const WHATSAPP_REFERENCE_PATTERN = /^UKSS-WA-\d{6}-[A-Z0-9]{6}$/

export function isValidWhatsAppReference(value: string): boolean {
  return WHATSAPP_REFERENCE_PATTERN.test(value.trim().toUpperCase())
}

/** Appends the reference on its own line, kept out of the readable part of the message. */
export function withReferenceLine(message: string, reference: string): string {
  return `${message}\n\nRef: ${reference}`
}

export interface WhatsAppEnquiryPayload {
  reference: string
  pageUrl: string
  pageContext: string
  productId?: string
  variantId?: string
  productName?: string
}

/**
 * Fire-and-forget beacon to /api/attribution/whatsapp-click.
 *
 * keepalive because the tab may be about to background itself (wa.me opens in
 * a new tab via target="_blank", so the current page does not actually
 * unload - but the request is written the same defensive way as the Meta CAPI
 * mirror in utils/tracking.ts regardless, since nothing about a fetch here
 * should ever be allowed to block or fail the WhatsApp navigation itself).
 */
export function sendWhatsAppEnquiry(payload: WhatsAppEnquiryPayload): void {
  if (typeof window === 'undefined') return
  try {
    void fetch('/api/attribution/whatsapp-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(payload),
    }).catch(() => {})
  } catch {
    // Never block the WhatsApp link over a beacon failure.
  }
}
