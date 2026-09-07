// src/utils/attribution/checkoutLinkage.ts
//
// Automatic website-order -> WhatsApp linkage is deliberately conservative.
// A reference alone is not enough: it must still belong to the same persistent
// browser visitor, be recent, unclaimed, and (for a product enquiry) match a
// variant that is actually in the checkout basket. Cross-device historical
// attribution therefore remains a manual evidence decision rather than an
// automatic guess.

export interface CheckoutWhatsAppEnquiry {
  reference: string
  created_at: string
  visitor_id: string | null
  product_id: string | null
  variant_id: string | null
  converted_order_id: string | null
}

interface MatchInput {
  visitorId: string | null
  cartVariantIds: string[]
  enquiry: CheckoutWhatsAppEnquiry
  maxAgeSeconds: number
  nowMs?: number
}

export function isDeterministicCheckoutWhatsAppMatch({
  visitorId,
  cartVariantIds,
  enquiry,
  maxAgeSeconds,
  nowMs = Date.now(),
}: MatchInput): boolean {
  if (!visitorId || !enquiry.visitor_id || enquiry.visitor_id !== visitorId) return false
  if (enquiry.converted_order_id) return false

  const createdAtMs = Date.parse(enquiry.created_at)
  if (!Number.isFinite(createdAtMs)) return false
  const ageMs = nowMs - createdAtMs
  if (ageMs < 0 || ageMs > maxAgeSeconds * 1000) return false

  // Product enquiries must identify a concrete variant and that exact variant
  // must be in the basket. A product id without a variant is too ambiguous to
  // auto-link. Generic acquisition enquiries have neither and may link by the
  // same-visitor persisted reference alone.
  if (enquiry.variant_id) return cartVariantIds.includes(enquiry.variant_id)
  if (enquiry.product_id) return false
  return true
}
