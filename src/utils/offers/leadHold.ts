// src/utils/offers/leadHold.ts
//
// Whether the shopper behind a checkout reminder still has an open ad-offer
// window, and what it is worth on the basket they left.
//
// 26 of the first 33 reminder leads came from a paid visit, and most opted in
// within minutes of arriving - so when a reminder goes out, their 48 hours
// are often still running. Saying so ("held for you until Sun 2:05pm") is a
// true reason to come back. Saying nothing once it has ended is the rule: a
// reminder never mentions an offer it cannot give.
//
// The amount follows calculate_order_offer: the highest tier in the basket,
// never more than the basket itself. Display only - the checkout prices the
// order, and a WhatsApp sale is priced in the chat.

import type { createUntypedAdminClient } from '@/utils/supabase/admin'
import { OFFER_TIER_AMOUNTS } from './constants'
import type { OfferHold } from './deadline'

type Tier = keyof typeof OFFER_TIER_AMOUNTS
const PRIORITY: Record<Tier, number> = { ELECTRIC: 4, ROMA: 3, STANDARD: 2, EXCLUDED: 1 }

export interface LeadForHold {
  id: string
  visitor_id: string | null
  basket: unknown
}

export interface LeadHold extends OfferHold {
  /** True when the window has already ended - for the admin card only. */
  ended: boolean
}

function basketItems(basket: unknown): { productId: string; total: number }[] {
  if (!Array.isArray(basket)) return []
  return basket.flatMap(raw => {
    const item = (raw ?? {}) as { product_id?: unknown; unit_price_gbp?: unknown; quantity?: unknown }
    if (typeof item.product_id !== 'string') return []
    const price = Number(item.unit_price_gbp)
    const qty = Number(item.quantity)
    return [{
      productId: item.product_id,
      total: (Number.isFinite(price) ? price : 0) * (Number.isFinite(qty) && qty > 0 ? qty : 1),
    }]
  })
}

/**
 * One holds lookup for a page of leads: two queries, whatever the count.
 * Leads with no entitlement, or none that applies to their basket, are absent
 * from the map. A failed lookup returns an empty map - the reminder still
 * goes, just without an offer line, which is the safe way to be wrong.
 */
export async function offerHoldsForLeads(
  admin: ReturnType<typeof createUntypedAdminClient>,
  leads: LeadForHold[],
): Promise<Map<string, LeadHold>> {
  const holds = new Map<string, LeadHold>()
  const visitorIds = [...new Set(leads.map(l => l.visitor_id).filter((v): v is string => Boolean(v)))]
  if (visitorIds.length === 0) return holds

  const productIds = [...new Set(leads.flatMap(l => basketItems(l.basket).map(i => i.productId)))]

  const [entitlements, tiers] = await Promise.all([
    admin.from('offer_entitlements').select('visitor_id, expires_at, revoked_at').in('visitor_id', visitorIds),
    productIds.length
      ? admin.from('offer_product_tiers').select('product_id, tier').in('product_id', productIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (entitlements.error || tiers.error) {
    console.error('Lead offer lookup failed:', entitlements.error?.message ?? tiers.error?.message)
    return holds
  }

  const windowFor = new Map<string, { expires_at: string; revoked_at: string | null }>()
  for (const row of (entitlements.data ?? []) as { visitor_id: string; expires_at: string; revoked_at: string | null }[]) {
    windowFor.set(row.visitor_id, row)
  }
  const tierFor = new Map<string, Tier>()
  for (const row of (tiers.data ?? []) as { product_id: string; tier: string }[]) {
    if (row.tier in OFFER_TIER_AMOUNTS) tierFor.set(row.product_id, row.tier as Tier)
  }

  const now = Date.now()
  for (const lead of leads) {
    const window = lead.visitor_id ? windowFor.get(lead.visitor_id) : undefined
    if (!window || window.revoked_at) continue

    const items = basketItems(lead.basket)
    const best = items
      .map(i => tierFor.get(i.productId))
      .filter((t): t is Tier => Boolean(t))
      .sort((a, b) => PRIORITY[b] - PRIORITY[a])[0]
    const basketTotal = items.reduce((sum, i) => sum + i.total, 0)
    const amount = best ? Math.min(OFFER_TIER_AMOUNTS[best], basketTotal || OFFER_TIER_AMOUNTS[best]) : 0
    if (amount <= 0) continue

    holds.set(lead.id, {
      amount,
      expiresAt: window.expires_at,
      ended: Date.parse(window.expires_at) <= now,
    })
  }
  return holds
}
