// src/utils/orderDepositServer.ts
//
// Reading a deposit for the pages and emails that do not load the whole order
// row (the customer's confirmation and tracking pages, the confirmed alert).
// The full order id is the access token, as it is for order_for_confirmation.
//
// A failure reads as "no deposit" rather than breaking the page: the customer's
// page must still open if the database function is missing or slow.

import 'server-only'
import type { createClient } from '@/utils/supabase/server'

type Db = Awaited<ReturnType<typeof createClient>>

export interface OrderDeposit {
  deposit_paid: number
  deposit_paid_at: string | null
}

const NONE: OrderDeposit = { deposit_paid: 0, deposit_paid_at: null }

/**
 * Record (or correct, or clear with 0) the deposit on an order. Admin only:
 * the database refuses anyone else, and a deposit above the order total.
 * Returns a sentence for the form rather than a raised Postgres error.
 */
export async function saveOrderDeposit(
  supabase: Db,
  orderId: string,
  amount: number,
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase.rpc('set_order_deposit', { p_order_id: orderId, p_amount: amount })
  if (!error) return { ok: true }
  console.error('set_order_deposit failed:', error)
  const message = error.message ?? ''
  if (message.includes('DEPOSIT_TOO_HIGH')) return { error: "The deposit can't be more than the order total." }
  if (message.includes('BAD_DEPOSIT')) return { error: 'The deposit is not a valid amount.' }
  if (message.includes('NOT_AUTHORISED')) return { error: 'You are not authorised to record deposits.' }
  if (message.includes('NOT_FOUND')) return { error: 'That order no longer exists.' }
  return { error: 'The deposit did not save. Please try again.' }
}

export async function readOrderDeposit(supabase: Db, orderId: string): Promise<OrderDeposit> {
  try {
    const { data, error } = await supabase.rpc('order_deposit', { p_order_id: orderId })
    if (error || !data || typeof data !== 'object') return NONE
    const row = data as { deposit_paid?: unknown; deposit_paid_at?: unknown }
    const paid = Number(row.deposit_paid ?? 0)
    return {
      deposit_paid: Number.isFinite(paid) && paid > 0 ? paid : 0,
      deposit_paid_at: typeof row.deposit_paid_at === 'string' ? row.deposit_paid_at : null,
    }
  } catch {
    return NONE
  }
}
