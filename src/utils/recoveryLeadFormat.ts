// src/utils/recoveryLeadFormat.ts
//
// Reads the basket snapshot on a checkout_recovery_leads row back into
// something a person can act on: the lines the admin leads page lists, and
// the reminder the shopper asked for, written out and ready to send.
//
// The snapshot is taken once by /api/checkout/recovery from live product rows
// and never refreshed, so a price here is the price when they left checkout,
// not necessarily today's. Fine for a reminder; not an authority for anything.

import { PHONE_DISPLAY } from '@/constants/contact'

export type RecoveryBasketItem = {
  product_title?: string | null
  sku?: string | null
  color?: string | null
  material?: string | null
  fabric_name?: string | null
  fabric_code?: string | null
  fabric_collection?: string | null
  quantity?: number | null
  unit_price_gbp?: number | null
}

export interface RecoveryLine {
  /** Product title, or "Sofa" when the snapshot has none. */
  title: string
  /**
   * How the customer would describe it: colour, then the fabric by collection
   * and name, or the material when there is no fabric. No codes - those are
   * for the purchase order, not the person.
   */
  detail: string | null
  sku: string | null
  /** The R&S code for a made-to-order fabric, kept separate for the same reason. */
  fabricCode: string | null
  quantity: number
  /** Null when the snapshot has no price, rather than £0.00. */
  unitPrice: number | null
  lineTotal: number | null
}

/** £649, or £649.50 - never £649.00, which reads like an invoice. */
export function gbp(amount: number): string {
  return amount.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export function recoveryBasketLines(value: unknown): RecoveryLine[] {
  if (!Array.isArray(value)) return []

  return value.map((raw) => {
    const item = (raw ?? {}) as RecoveryBasketItem
    const qty = Number(item.quantity)
    const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1
    // Number(null) is 0, which is a price - so the null check comes first.
    const unitPrice =
      item.unit_price_gbp != null && Number.isFinite(Number(item.unit_price_gbp))
        ? Number(item.unit_price_gbp)
        : null

    const fabric = [item.fabric_collection, item.fabric_name].filter(Boolean).join(' ')
    const detail = [item.color, fabric || item.material].filter(Boolean).join(' ') || null

    return {
      title: item.product_title || 'Sofa',
      detail,
      sku: item.sku ?? null,
      fabricCode: item.fabric_code ?? null,
      quantity,
      unitPrice,
      lineTotal: unitPrice === null ? null : unitPrice * quantity,
    }
  })
}

/** Sum of the lines that have a price; null when none of them do. */
export function recoveryBasketTotal(lines: RecoveryLine[]): number | null {
  const priced = lines.filter((l): l is RecoveryLine & { lineTotal: number } => l.lineTotal !== null)
  if (priced.length === 0) return null
  return priced.reduce((sum, l) => sum + l.lineTotal, 0)
}

/** "Verona 3 Seater, Grey Velvet – £649", or "2 × Verona 3 Seater – £1,298". */
function customerLine(line: RecoveryLine): string {
  const what = [line.title, line.detail].filter(Boolean).join(', ')
  const qty = line.quantity > 1 ? `${line.quantity} × ` : ''
  const price = line.lineTotal !== null ? ` – ${gbp(line.lineTotal)}` : ''
  return `${qty}${what}${price}`
}

/**
 * The reminder itself, as the opening message of a WhatsApp chat.
 *
 * Mirrors the consent copy on the checkout ("Want us to remind you if you
 * don't finish?") so the customer recognises what this is before they have
 * read the second line. It ends on a question, because the point is a reply -
 * the price gets agreed in the conversation, not in this message.
 */
export function recoveryReminderMessage(basket: unknown): string {
  const lines = recoveryBasketLines(basket)

  const opening =
    "Hi, it's UK Sofa Shop. You asked us to remind you if you didn't finish your order on uksofashop.co.uk"

  if (lines.length === 0) {
    return `${opening}. Would you like to go ahead, or is there anything you'd like to check first? Happy to help.`
  }

  const still = lines.length === 1 ? "It's still available." : "They're all still available."

  return [
    `${opening} – here's what you had picked out:`,
    '',
    ...lines.map((l) => `• ${customerLine(l)}`),
    '',
    `${still} Would you like to go ahead, or is there anything you'd like to check first? Happy to help.`,
  ].join('\n')
}

/**
 * The same reminder for the email channel, with a subject and a way back that
 * leads to WhatsApp - which is where the sale actually happens.
 */
export function recoveryReminderEmail(basket: unknown): { subject: string; body: string } {
  const lines = recoveryBasketLines(basket)
  const subject = `${lines.length > 1 ? 'Your sofas are' : 'Your sofa is'} still waiting for you – UK Sofa Shop`
  const body = [
    recoveryReminderMessage(basket),
    '',
    `Just reply to this email, or WhatsApp us on ${PHONE_DISPLAY} if that's easier.`,
    '',
    'UK Sofa Shop',
    'uksofashop.co.uk',
  ].join('\n')

  return { subject, body }
}

/** mailto: with the subject and body filled in. */
export function mailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
