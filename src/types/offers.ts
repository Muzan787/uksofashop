export type OfferTier = 'ELECTRIC' | 'ROMA' | 'STANDARD' | 'EXCLUDED'
export type OfferSource = 'manual_code' | 'paid_entitlement'

/**
 * One authoritative basket-level offer quote.
 *
 * The browser never chooses a tier or amount. These values are returned by the
 * database calculator that final order creation calls again before insert.
 */
export interface OfferQuote {
  valid: boolean
  codeValid: boolean
  normalizedCode: string | null
  discountAmount: number
  discountTier: OfferTier | null
  offerSource: OfferSource | null
  itemsSubtotal: number
  message: string
}

export type OfferQuoteResult =
  | { success?: undefined; error: string }
  | { success: true; error?: undefined; quote: OfferQuote }

/**
 * Phase B accepts the public manual code. Phase C may later supply an opaque
 * server-validated entitlement token through the same contract; merely sending
 * a token grants no discount in Phase B.
 */
export interface OfferAuthorityInput {
  promotionCode?: string | null
  entitlementToken?: string | null
}
