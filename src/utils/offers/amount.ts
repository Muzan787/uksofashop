// src/utils/offers/amount.ts
//
// What the visitor's offer takes off ONE product, for display. The database
// (calculate_order_offer) is the authority and prices every basket itself;
// this mirrors its rules so the product page, the WhatsApp line and the offer
// sheet say what checkout will do:
//   - Made-To-Order Sofas collection (owner decision, 15 Nov 2026): a flat
//     MTO_OFFER_AMOUNT off each product line, whatever the old tier, exclusion
//     or price floor, never more than the line costs;
//   - everything else: its tier's amount from Admin -> Settings, nothing under
//     the floor, nothing for an excluded product (tier null).
import type { OfferTier } from '@/types/offers'

/** £ off each Made-To-Order product line inside the visitor's window. */
export const MTO_OFFER_AMOUNT = 50
/** The main collection the flat amount applies to. */
export const MADE_TO_ORDER_SLUG = 'made-to-order-sofas'

type TierAmounts = Record<'ELECTRIC' | 'ROMA' | 'STANDARD' | 'EXCLUDED', number>

export function offerAmountFor(tier: OfferTier | null | undefined, price: number, tierAmounts: TierAmounts, minPrice: number): number {
  if (!tier) return 0
  if (tier === 'MADE_TO_ORDER') return price > 0 ? Math.min(MTO_OFFER_AMOUNT, price) : MTO_OFFER_AMOUNT
  if (price < minPrice) return 0
  return tierAmounts[tier] ?? 0
}
