/** MADE_TO_ORDER: the flat £50 on the Made-To-Order Sofas collection (Run 7). */
export type OfferTier = 'ELECTRIC' | 'ROMA' | 'STANDARD' | 'EXCLUDED' | 'MADE_TO_ORDER'
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

