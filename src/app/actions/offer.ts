'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'
import { createAdminClient } from '@/utils/supabase/admin'
import type { CartItem } from '@/app/actions/checkout'
import type { OfferQuote, OfferQuoteResult, OfferTier, OfferSource } from '@/types/offers'
import { OFFER_ENTITLEMENT_COOKIE } from '@/utils/offers/constants'

const itemsSchema = z.array(z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  fabric_id: z.string().uuid().nullish(),
})).min(1, 'Your cart is empty.')

const tokenSchema = z.string().uuid()

function asTier(value: unknown): OfferTier | null {
  return value === 'ELECTRIC' || value === 'ROMA' || value === 'STANDARD' || value === 'EXCLUDED'
    ? value
    : null
}

function asSource(value: unknown): OfferSource | null {
  return value === 'manual_code' || value === 'paid_entitlement' ? value : null
}

/**
 * Ask the database for the current authoritative basket offer. The caller may
 * supply a shareable customer-facing code, but never a paid entitlement token,
 * tier or amount. The opaque Phase C bearer is read only from the HttpOnly
 * first-party cookie on this server action and is revalidated by PostgreSQL.
 */
export async function quoteOffer(
  cartItems: CartItem[],
  promotionCode: string | null = null,
): Promise<OfferQuoteResult> {
  const validatedItems = itemsSchema.safeParse(cartItems)
  if (!validatedItems.success) {
    return { error: validatedItems.error.issues[0]?.message ?? 'Your cart is not valid.' }
  }

  const jar = await cookies()
  const parsedToken = tokenSchema.safeParse(jar.get(OFFER_ENTITLEMENT_COOKIE)?.value)
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('calculate_order_offer', {
    p_items: validatedItems.data.map(item => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
      fabric_id: item.fabric_id ?? null,
    })),
    p_promotion_code: promotionCode,
    p_offer_entitlement_token: parsedToken.success ? parsedToken.data : null,
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
    return { error: 'We could not check that offer. Please try again.' }
  }

  const raw = data as Record<string, unknown>
  const codeValid = raw.code_valid === true
  const entitlementValid = raw.entitlement_valid === true
  const normalizedCode = codeValid && typeof raw.normalized_code === 'string' ? raw.normalized_code : null
  const discountAmount = Number(raw.discount_amount ?? 0)
  const discountTier = asTier(raw.discount_tier)
  const offerSource = asSource(raw.offer_source)
  const itemsSubtotal = Number(raw.items_subtotal ?? 0)
  const valid = codeValid || entitlementValid

  let message = ''
  if (promotionCode?.trim() && !codeValid) {
    message = 'Offer code not recognised.'
  } else if (!valid) {
    message = ''
  } else if (discountAmount > 0) {
    message = offerSource === 'paid_entitlement'
      ? `Online offer applied · £${discountAmount.toFixed(0)} off`
      : `${normalizedCode ?? 'Offer'} applied · £${discountAmount.toFixed(0)} off`
  } else {
    message = offerSource === 'paid_entitlement'
      ? 'Your online offer is active. No extra cash discount applies to this basket.'
      : `${normalizedCode ?? 'Offer'} is recognised. No extra cash discount applies to this basket.`
  }

  const quote: OfferQuote = {
    valid,
    codeValid,
    normalizedCode,
    discountAmount: Number.isFinite(discountAmount) ? Math.max(0, discountAmount) : 0,
    discountTier,
    offerSource,
    itemsSubtotal: Number.isFinite(itemsSubtotal) ? Math.max(0, itemsSubtotal) : 0,
    message,
  }

  return { success: true, quote }
}
