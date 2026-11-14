// src/utils/websiteReport.ts
//
// Periods, filters and rates for Admin -> Website and Admin -> Business.
// Pure, so the pages and the tests read the same rules.
//
// Reporting days are UK calendar days (Europe/London). A period is
// [from 00:00 UK, to+1 00:00 UK), converted to an instant for the database.

export type Preset = 'today' | '7d' | '30d' | 'custom'
export const DEVICES = ['mobile', 'desktop', 'tablet'] as const
export const SOURCES = ['meta', 'google', 'direct_or_unattributed', 'other'] as const
export type Device = typeof DEVICES[number]
export type Source = typeof SOURCES[number]

export const SOURCE_LABEL: Record<string, string> = {
  meta: 'Meta (Facebook / Instagram)',
  google: 'Google',
  direct_or_unattributed: 'Direct or not tagged',
  other: 'Other sites',
}

export const MAX_DAYS = 92

export interface Period {
  preset: Preset
  /** UK calendar dates, inclusive. */
  fromDay: string
  toDay: string
  /** Instants for the database: [start, end). */
  start: Date
  end: Date
  days: number
  label: string
  error: string | null
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export function ukDay(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
}

/** The instant a UK calendar day starts (handles BST / GMT). */
export function ukDayStart(day: string): Date {
  const guess = new Date(`${day}T00:00:00Z`)
  // London is UTC or UTC+1; find which by reading the UK clock at midnight UTC.
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(guess))
  return new Date(guess.getTime() - (hour === 1 ? 3600000 : 0))
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function prettyDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function parsePeriod(params: { period?: string; from?: string; to?: string }, now: Date = new Date()): Period {
  const today = ukDay(now)
  let preset: Preset = params.period === 'today' || params.period === '30d' || params.period === 'custom' ? params.period : '7d'
  let fromDay = today
  let toDay = today
  let error: string | null = null
  if (preset === 'today') { fromDay = today }
  else if (preset === '7d') { fromDay = addDays(today, -6) }
  else if (preset === '30d') { fromDay = addDays(today, -29) }
  else {
    const f = params.from && DAY_RE.test(params.from) ? params.from : null
    const t = params.to && DAY_RE.test(params.to) ? params.to : null
    if (!f || !t || f > t) {
      error = 'Choose a start and end date, start first.'
      preset = '7d'; fromDay = addDays(today, -6)
    } else if ((Date.parse(t) - Date.parse(f)) / 86400000 + 1 > MAX_DAYS) {
      error = `Choose ${MAX_DAYS} days or fewer.`
      preset = '7d'; fromDay = addDays(today, -6)
    } else { fromDay = f; toDay = t > today ? today : t }
  }
  const days = Math.round((Date.parse(toDay) - Date.parse(fromDay)) / 86400000) + 1
  const label = fromDay === toDay ? prettyDay(fromDay) : `${prettyDay(fromDay)} to ${prettyDay(toDay)}`
  return { preset, fromDay, toDay, start: ukDayStart(fromDay), end: ukDayStart(addDays(toDay, 1)), days, label, error }
}

export function parseDevice(v?: string): Device | null {
  return (DEVICES as readonly string[]).includes(v ?? '') ? v as Device : null
}
export function parseSource(v?: string): Source | null {
  return (SOURCES as readonly string[]).includes(v ?? '') ? v as Source : null
}

/** "38%" of a real denominator, or "–" when there is nothing to divide by. */
export function rate(part: number | null | undefined, whole: number | null | undefined): string {
  if (!whole || part === null || part === undefined) return '–'
  return `${Math.round((part / whole) * 100)}%`
}

/** Query string for a link that keeps the current filters and changes one. */
export function withParams(base: string, current: Record<string, string | undefined>, change: Record<string, string | undefined>): string {
  const merged = { ...current, ...change }
  const q = Object.entries(merged).filter(([, v]) => v).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`).join('&')
  return q ? `${base}?${q}` : base
}
