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

// ─── A preferred delivery day ────────────────────────────────────────────────
//
// The customer may pick the day they want the sofa, at checkout. A request,
// not a booking - the team rings to agree the slot - but it tells them which
// week to aim for. Muaz's rule (2026-09-18): any day at all, as long as it is
// at least four days away. The database function place_order enforces the
// same two limits, so the browser's calendar and the server can never
// disagree about which days are allowed.

/** Days from today before the first day a customer may ask for. */
export const PREFERRED_DELIVERY_MIN_DAYS = 4
/** How far ahead a request is accepted. A sanity ceiling, not a promise. */
export const PREFERRED_DELIVERY_MAX_DAYS = 180

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(from: Date, n: number): Date {
  const d = new Date(from)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

/** The first day a customer may ask for, as YYYY-MM-DD in Europe/London. */
export function earliestPreferredDeliveryDate(now: Date = new Date()): string {
  return isoDate(addDays(londonToday(now), PREFERRED_DELIVERY_MIN_DAYS))
}

/** The last day accepted, as YYYY-MM-DD. */
export function latestPreferredDeliveryDate(now: Date = new Date()): string {
  return isoDate(addDays(londonToday(now), PREFERRED_DELIVERY_MAX_DAYS))
}

/**
 * Whether a value is a real calendar date inside the accepted range.
 *
 * Strings compare correctly in YYYY-MM-DD form, which is why the range check
 * is a string comparison and needs no Date at all - but the round trip
 * through Date is still made, because "2026-02-31" matches the pattern and
 * is not a day.
 */
export function isValidPreferredDeliveryDate(value: string, now: Date = new Date()): boolean {
  if (!ISO_DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || isoDate(parsed) !== value) return false
  return value >= earliestPreferredDeliveryDate(now) && value <= latestPreferredDeliveryDate(now)
}

/**
 * The looser rule for a day the SHOP agrees - on the phone or in a WhatsApp
 * chat - and records in the admin panel: not in the past, within a year. The
 * four-day lead is for a customer choosing unaided on the website;
 * place_manual_order applies this rule, not that one.
 */
export function isValidAgreedDeliveryDate(value: string, now: Date = new Date()): boolean {
  if (!ISO_DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || isoDate(parsed) !== value) return false
  const today = londonToday(now)
  return value >= isoDate(today) && value <= isoDate(addDays(today, 365))
}

const FULL_DAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
const FULL_DAY_YEAR = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/**
 * "Saturday 26 September" - the year only when it is not this year, which
 * for a sofa ordered in December it sometimes is not.
 */
export function formatPreferredDeliveryDate(value: string, now: Date = new Date()): string {
  if (!ISO_DATE.test(value)) return value
  const d = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return value
  const thisYear = londonToday(now).getUTCFullYear() === d.getUTCFullYear()
  return (thisYear ? FULL_DAY : FULL_DAY_YEAR).format(d)
}
