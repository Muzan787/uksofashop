// src/utils/delivery.ts
//
// "When will it arrive" — computed once, here.
//
// The site promises delivery in 2–4 working days (see ANNOUNCEMENTS in
// src/constants/promises.ts). Printing that sentence is not the same as
// answering the question: a customer paying cash on the doorstep is deciding
// whether they will be in the house, and "2–4 working days" makes them do the
// arithmetic themselves — including working out which days are working days.
//
// This turns the promise into two dates.
//
// Deliberately server-side. The window is rendered into the HTML on the server
// so it is in the markup for a crawler and cannot disagree with itself after
// hydration; every date operation below is pinned to Europe/London rather than
// to whatever zone the machine happens to be in.

/** Working days added to the order date before the earliest / latest arrival. */
export const DELIVERY_MIN_DAYS = 2
export const DELIVERY_MAX_DAYS = 4

const LONDON = 'Europe/London'

/** Today in Europe/London, as a plain Y/M/D with no time component. */
function londonToday(now: Date): Date {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)
  // UTC midnight of the London calendar date. Using UTC for the arithmetic
  // keeps the day counter immune to British Summer Time starting mid-window.
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')))
}

/** Advances `n` working days, skipping Saturday and Sunday. */
function addWorkingDays(from: Date, n: number): Date {
  const d = new Date(from)
  let left = n
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) left--
  }
  return d
}

const DAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short' })
const DAY_MONTH = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'long' })
const NUMERIC = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric' })
const MONTH = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long' })

export interface DeliveryWindow {
  /** "Thu 28 August – Mon 1 September", or "Thu 28 – Mon 1 September" in one month. */
  label: string
  /** ISO date of the earliest arrival, for <time datetime>. */
  fromISO: string
  toISO: string
}

/**
 * The delivery window for an order placed now.
 *
 * Bank holidays are not modelled. Adding a hardcoded list would go stale
 * silently and start under-promising a year from now, which is worse than a
 * window the customer reads as approximate — which "2–4 working days" already
 * told them it was.
 */
export function deliveryWindow(now: Date = new Date()): DeliveryWindow {
  const today = londonToday(now)
  const from = addWorkingDays(today, DELIVERY_MIN_DAYS)
  const to = addWorkingDays(today, DELIVERY_MAX_DAYS)

  const sameMonth = from.getUTCMonth() === to.getUTCMonth() && from.getUTCFullYear() === to.getUTCFullYear()

  const label = sameMonth
    ? `${DAY.format(from)} ${NUMERIC.format(from)} – ${DAY.format(to)} ${NUMERIC.format(to)} ${MONTH.format(to)}`
    : `${DAY_MONTH.format(from)} – ${DAY_MONTH.format(to)}`

  return {
    label,
    fromISO: from.toISOString().slice(0, 10),
    toISO: to.toISOString().slice(0, 10),
  }
}
