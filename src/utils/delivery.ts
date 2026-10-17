// src/utils/delivery.ts
//
// "When will it arrive" — computed once, here.
//
// The site promises delivery in 2–4 days to most of the UK, and 5–7 to the
// areas that pay a distance charge (see PROMISES in src/constants/promises.ts).
// Printing that sentence is not the same as answering the question: a
// customer paying cash on the doorstep is deciding whether they will be in
// the house, and "2–4 days" makes them do the arithmetic themselves.
//
// This turns the promise into two dates.
//
// THE DAYS ARE DELIVERY DAYS. Muaz, 2026-10-17: the vans go out every day of
// the week except Monday - Saturday and Sunday included. So a window counts
// every day but Monday, no date the shop gives ever lands on one, and a
// customer cannot ask for one.
//
// Deliberately server-side. The window is rendered into the HTML on the server
// so it is in the markup for a crawler and cannot disagree with itself after
// hydration; every date operation below is pinned to Europe/London rather than
// to whatever zone the machine happens to be in.

import { DEFAULT_SHOP_SETTINGS, type ShopSettings } from './shopSettings'

/**
 * The day counts come from Admin -> Settings (admin upgrade M1): the delivery
 * windows in delivery days - one for most of the UK, one for the charged
 * areas - and the first and last day a customer may choose. Every function
 * takes them, and falls back to today's figures without them.
 */
export type DeliveryDateSettings = Pick<ShopSettings,
  'deliveryWindowFromDays' | 'deliveryWindowToDays' | 'farWindowFromDays' | 'farWindowToDays'
  | 'preferredEarliestDays' | 'preferredLatestDays'>

/** getUTCDay() of the one day there is no delivery. */
const NO_DELIVERY_DAY = 1 // Monday

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

/** Advances `n` delivery days, skipping Mondays. */
function addDeliveryDays(from: Date, n: number): Date {
  const d = new Date(from)
  let left = n
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (d.getUTCDay() !== NO_DELIVERY_DAY) left--
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
 * `far` is a postcode in a charged area (delivery_distance_fees), which gets
 * that area's longer window. Before a postcode is known, it is the usual one.
 *
 * Bank holidays are not modelled. Adding a hardcoded list would go stale
 * silently and start under-promising a year from now, which is worse than a
 * window the customer reads as approximate — which "2–4 days" already told
 * them it was.
 */
export function deliveryWindow(now: Date = new Date(), s: DeliveryDateSettings = DEFAULT_SHOP_SETTINGS, far = false): DeliveryWindow {
  const today = londonToday(now)
  const from = addDeliveryDays(today, far ? s.farWindowFromDays : s.deliveryWindowFromDays)
  const to = addDeliveryDays(today, far ? s.farWindowToDays : s.deliveryWindowToDays)

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
// week to aim for. Muaz's rules: at least four days away (2026-09-18); never a
// Monday, and in a charged area no sooner than the end of that area's 5-7 day
// window (2026-10-17). The database function place_order enforces the same
// rules, so the browser's calendar and the server can never disagree about
// which days are allowed.

/** Days from today before the first day a customer may ask for (today's default). */
export const PREFERRED_DELIVERY_MIN_DAYS = DEFAULT_SHOP_SETTINGS.preferredEarliestDays

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(from: Date, n: number): Date {
  const d = new Date(from)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

/** Whether a YYYY-MM-DD is a Monday, the day there is no delivery. */
export function isNoDeliveryDay(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  return new Date(`${value}T00:00:00Z`).getUTCDay() === NO_DELIVERY_DAY
}

/**
 * The first day a customer may ask for, as YYYY-MM-DD in Europe/London.
 * `far` is a postcode in a charged area. A first day that falls on a Monday
 * moves to the Tuesday, the same as place_order.
 */
export function earliestPreferredDeliveryDate(now: Date = new Date(), s: DeliveryDateSettings = DEFAULT_SHOP_SETTINGS, far = false): string {
  const lead = far ? Math.max(s.preferredEarliestDays, s.farWindowToDays) : s.preferredEarliestDays
  const first = addDays(londonToday(now), lead)
  return isoDate(first.getUTCDay() === NO_DELIVERY_DAY ? addDays(first, 1) : first)
}

/** The last day accepted, as YYYY-MM-DD. */
/** How far ahead a request is accepted. A sanity ceiling, not a promise. */
export function latestPreferredDeliveryDate(now: Date = new Date(), s: DeliveryDateSettings = DEFAULT_SHOP_SETTINGS): string {
  return isoDate(addDays(londonToday(now), s.preferredLatestDays))
}

/**
 * Whether a value is a real calendar date inside the accepted range.
 *
 * Strings compare correctly in YYYY-MM-DD form, which is why the range check
 * is a string comparison and needs no Date at all - but the round trip
 * through Date is still made, because "2026-02-31" matches the pattern and
 * is not a day.
 */
export function isValidPreferredDeliveryDate(value: string, now: Date = new Date(), s: DeliveryDateSettings = DEFAULT_SHOP_SETTINGS, far = false): boolean {
  if (!ISO_DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || isoDate(parsed) !== value) return false
  if (isNoDeliveryDay(value)) return false
  return value >= earliestPreferredDeliveryDate(now, s, far) && value <= latestPreferredDeliveryDate(now, s)
}

/**
 * What is wrong with a chosen day, as one sentence for the customer, or null.
 * Checkout's form, its server action and place_order's refusals all say it
 * the same way.
 */
export function preferredDeliveryDateProblem(value: string, now: Date = new Date(), s: DeliveryDateSettings = DEFAULT_SHOP_SETTINGS, far = false): string | null {
  if (isValidPreferredDeliveryDate(value, now, s, far)) return null
  if (isNoDeliveryDay(value)) return 'We don’t deliver on Mondays. Please choose another day.'
  if (ISO_DATE.test(value) && value > latestPreferredDeliveryDate(now, s)) {
    return `Please choose a day no later than ${formatPreferredDeliveryDate(latestPreferredDeliveryDate(now, s), now)}.`
  }
  return `Please choose a day from ${formatPreferredDeliveryDate(earliestPreferredDeliveryDate(now, s, far), now)} onwards.`
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
