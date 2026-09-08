'use server'

import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import type { CartItem } from '@/app/actions/checkout'
import type { OfferQuote, OfferQuoteResult, OfferTier, OfferSource } from '@/types/offers'

const itemsSchema = z.array(z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  fabric_id: z.string().uuid().nullish(),
})).min(1, 'Your cart is empty.')

const entitlementSchema = z.string().uuid().nullish()

function asTier(value: unknown): OfferTier | null {
  return value === 'ELECTRIC' || value === 'ROMA' || value === 'STANDARD' || value === 'EXCLUDED'
    ? value
    : null
}

function asSource(value: unknown): OfferSource | null {
  return value === 'manual_code' || value === 'paid_entitlement' ? value : null
}

/**
 * Ask the database for the current authoritative basket offer.
 *
 * The action accepts basket identities and an optional customer-facing code,
 * never a client-selected discount or tier. The database re-prices the basket
 * and runs the same calculator place_order calls again at final submission.
 *
 * entitlementToken is the Phase C input contract only. The Phase B database
 * deliberately grants it no authority, so a fabricated token cannot unlock an
 * offer before paid-visitor entitlement issuance actually exists.
 */
export async function quoteOffer(
  cartItems: CartItem[],
  promotionCode: string | null = null,
  entitlementToken: string | null = null,
): Promise<OfferQuoteResult> {
  const validatedItems = itemsSchema.safeParse(cartItems)
  if (!validatedItems.success) {
    return { error: validatedItems.error.issues[0]?.message ?? 'Your cart is not valid.' }
  }

  const validatedEntitlement = entitlementSchema.safeParse(entitlementToken)
  if (!validatedEntitlement.success) {
    return { error: 'That offer entitlement is not valid.' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('calculate_order_offer', {
    p_items: validatedItems.data.map(item => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
      fabric_id: item.fabric_id ?? null,
    })),
    p_promotion_code: promotionCode,
    p_offer_entitlement_token: validatedEntitlement.data ?? null,
  })

  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    console.error('Offer quote failed:', error)
    const message = error?.message ?? ''
    if (message.includes('UNAVAILABLE_ITEMS')) {
      return { error: 'One of the items in your basket is no longer available.' }
    }
    if (message.includes('EMPTY_CART')) {
      return { error: 'Your cart is empty.' }
    }
    return { error: 'We could not check that offer code. Please try again.' }
  }

  const raw = data as Record<string, unknown>
  const normalizedCode = typeof raw.normalized_code === 'string' ? raw.normalized_code : null
  const discountAmount = Number(raw.discount_amount ?? 0)
  const discountTier = asTier(raw.discount_tier)
  const offerSource = asSource(raw.offer_source)
  const itemsSubtotal = Number(raw.items_subtotal ?? 0)
  const valid = raw.code_valid === true || offerSource === 'paid_entitlement'

  let message = ''
  if (!valid) {
    message = promotionCode?.trim() ? 'Offer code not recognised.' : ''
  } else if (discountAmount > 0) {
    message = `${normalizedCode ?? 'Offer'} applied · £${discountAmount.toFixed(0)} off`
  } else {
    message = `${normalizedCode ?? 'Offer'} is recognised. No extra cash discount applies to this basket.`
  }

  const quote: OfferQuote = {
    valid,
    normalizedCode,
    discountAmount: Number.isFinite(discountAmount) ? Math.max(0, discountAmount) : 0,
    discountTier,
    offerSource,
    itemsSubtotal: Number.isFinite(itemsSubtotal) ? Math.max(0, itemsSubtotal) : 0,
    message,
  }

  return { success: true, quote }
}
