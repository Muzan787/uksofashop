// src/utils/orderMoves.ts
//
// Which status moves an order allows (plan decision 5). The database enforces
// this itself (private.order_move_allowed, migration 20261031131331_order_on_hold);
// this copy is for screens, so they only offer moves the database will take.
// scripts/order-rules.test.cjs checks the two agree on every pair.
//
//   Waiting to confirm -> Confirmed or Cancelled
//   Confirmed / On hold / Delivered -> any of those three, or Cancelled (so
//     mistakes can be corrected)
//   Cancelled -> Confirmed, by an admin, with a reason
//
// Processing and On its way were retired on 31 Oct 2026; older orders' history
// still names them.

export const ORDER_STATUSES = ['pending_cod', 'confirmed', 'on_hold', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

const MIDDLE: readonly string[] = ['confirmed', 'on_hold', 'delivered']

export function orderMoveAllowed(from: string, to: string, staff: boolean): boolean {
  if (from === to) return true
  if (from === 'pending_cod') return to === 'confirmed' || to === 'cancelled'
  if (MIDDLE.includes(from)) return MIDDLE.includes(to) || to === 'cancelled'
  if (from === 'cancelled') return staff && to === 'confirmed'
  return false
}

/** The statuses an admin may move an order to from `from`, itself excluded. */
export function movesFrom(from: string): OrderStatus[] {
  return ORDER_STATUSES.filter(to => to !== from && orderMoveAllowed(from, to, true))
}

/** Reopening a cancelled order needs a reason; cancelling keeps one if given. */
export function reasonRequired(from: string, to: string): boolean {
  return from === 'cancelled' && to !== 'cancelled'
}
