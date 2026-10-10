// src/utils/offers/deadline.ts
//
// How the end of a visitor's offer window is written, everywhere it is
// written: the countdown on the product page and at checkout, the line in a
// WhatsApp enquiry, and the checkout reminder. One file, so the clock time a
// customer reads on the site is the clock time the shop reads in the chat.
//
// UK time always. The shop and its customers are in the UK; a deadline
// printed in the server's zone (UTC on Hostinger) would be an hour out for
// half the year.

import { OFFER_PUBLIC_CODE } from './constants'

const LONDON = 'Europe/London'

/** "Sun 12 Oct, 2:05pm" — the deadline as a person says it. */
export function formatOfferDeadline(iso: string): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  const day = at.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: LONDON })
  const time = at
    .toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: LONDON })
    .replace(/\s/g, '')
    .toLowerCase()
  return `${day}, ${time}`
}

/**
 * "47:12:05", or "3d 04:12:05" for the few windows issued under the old
 * seven-day rule that are still running. Zero-padded so the width does not
 * jitter as it ticks.
 */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  // Inside the 48-hour window the hours run to 47 rather than rolling into a
  // day, which is how a two-day countdown is read.
  if (days >= 2) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(days * 24 + hours)}:${pad(minutes)}:${pad(seconds)}`
}

export interface OfferHold {
  /** Pounds off, for the product or basket in question. 0 or less draws nothing. */
  amount: number
  /** When the visitor's window ends, ISO. */
  expiresAt: string
}

/**
 * The line a WhatsApp enquiry or a reminder carries while the window is open:
 *
 *   My ad offer: £30 off with SOFAEXTRA, valid until Sun 12 Oct, 2:05pm
 *
 * In the chat it tells the shop the customer's real deadline - which is the
 * deadline to honour, no later.
 */
export function offerHoldLine(hold: OfferHold | null | undefined, now = Date.now()): string | null {
  if (!isOpen(hold, now)) return null
  return `My ad offer: £${Math.round(hold.amount)} off with ${OFFER_PUBLIC_CODE}, valid until ${formatOfferDeadline(hold.expiresAt)}`
}

/**
 * The same fact in the shop's voice, for the checkout reminder:
 *
 *   Your £30 online offer is held for you until Sun 12 Oct, 2:05pm.
 *
 * Only while the window is open - a reminder sent after it has ended says
 * nothing about an offer rather than mentioning one it cannot give.
 */
export function offerHoldReminderLine(hold: OfferHold | null | undefined, now = Date.now()): string | null {
  if (!isOpen(hold, now)) return null
  return `Your £${Math.round(hold.amount)} online offer is held for you until ${formatOfferDeadline(hold.expiresAt)}.`
}

function isOpen(hold: OfferHold | null | undefined, now: number): hold is OfferHold {
  if (!hold || hold.amount <= 0) return false
  const ends = Date.parse(hold.expiresAt)
  return Number.isFinite(ends) && ends > now
}
