// src/utils/orderDeposit.ts
//
// What a recorded deposit does to the figures, worked out once so every page
// agrees (receipt, emails, the customer's confirmation and tracking pages, the
// driver's delivery note, the copy text).
//
// The deposit is part of the price, not on top of it. The customer owes the
// order total either way; a deposit only means some of it is already paid, so
// what is collected on the door is the balance.
//
// Pure: no server-only imports. The print button runs in the browser.

const cents = (n: number) => Math.round(n * 100)
const num = (n: unknown) => {
  const v = Number(n ?? 0)
  return Number.isFinite(v) ? v : 0
}

export interface DepositFigures {
  /** Pounds paid up front, never below 0 and never above the total. */
  deposit: number
  /** What is left to pay on delivery. */
  balance: number
  /** True when a deposit has been recorded. */
  has: boolean
}

/** The deposit and the balance for an order total. Clamped, so a total that was
 *  edited down below an old deposit never shows a negative balance. */
export function depositFigures(total: unknown, depositPaid: unknown): DepositFigures {
  const t = Math.max(0, num(total))
  const d = Math.min(Math.max(0, num(depositPaid)), t)
  const deposit = cents(d) / 100
  return { deposit, balance: cents(t - d) / 100, has: cents(d) > 0 }
}

/** "£50.00". */
export const poundsText = (n: unknown) => `£${num(n).toFixed(2)}`

/**
 * What the deposit field holds, as pounds. Empty is none; anything that is not
 * a plain non-negative amount is an error rather than a quiet zero.
 */
export function parseDepositInput(raw: string): { ok: true; value: number } | { ok: false } {
  const text = raw.trim().replace(/^£/, '')
  if (text === '') return { ok: true, value: 0 }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { ok: false }
  return { ok: true, value: Number(text) }
}
