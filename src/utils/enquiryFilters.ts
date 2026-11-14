// src/utils/enquiryFilters.ts
//
// Filters for Leads -> WhatsApp enquiries (Run 5, 14 Nov 2026). Pure.
//
// A WhatsApp enquiry is a TAP on a WhatsApp button. It is not a submitted
// lead and not a sale. The only stored facts about it are when it happened,
// where it came from, and whether an order was later taken with its
// reference. So the statuses offered are exactly those facts and nothing
// invented:
//   open     no order has been taken with this reference (yet)
//   ordered  an order was taken with this reference
//   all      both
// "Open" is split by age in the UI ("New" = last 24 h) but age is a filter
// (period), not a status someone has to maintain.

export type EnquiryStatus = 'open' | 'ordered' | 'all'
export type EnquiryPeriod = '24h' | '7d' | '30d' | 'all'
export type EnquirySource = 'meta' | 'google' | 'none' | 'all'

export interface EnquiryFilters {
  status: EnquiryStatus
  period: EnquiryPeriod
  source: EnquirySource
  /** Reference fragment or product words, cleaned. */
  q: string
}

export const ENQUIRY_STATUSES: { key: EnquiryStatus; label: string }[] = [
  { key: 'open', label: 'Not yet ordered' },
  { key: 'ordered', label: 'Ordered' },
  { key: 'all', label: 'All' },
]
export const ENQUIRY_PERIODS: { key: EnquiryPeriod; label: string; hours: number | null }[] = [
  { key: '24h', label: 'Last 24 hours', hours: 24 },
  { key: '7d', label: '7 days', hours: 24 * 7 },
  { key: '30d', label: '30 days', hours: 24 * 30 },
  { key: 'all', label: 'Everything', hours: null },
]
export const ENQUIRY_SOURCES: { key: EnquirySource; label: string }[] = [
  { key: 'all', label: 'Any source' },
  { key: 'meta', label: 'Meta ad' },
  { key: 'google', label: 'Google ad' },
  { key: 'none', label: 'No ad recorded' },
]

/** Letters, digits, spaces and a few separators only; never reaches a query unescaped. */
export function cleanEnquirySearch(raw: string | undefined): string {
  return (raw ?? '').replace(/[^A-Za-z0-9 +&'.-]/g, '').trim().slice(0, 40)
}

export function parseEnquiryFilters(sp: { status?: string; period?: string; source?: string; q?: string; show?: string }): EnquiryFilters {
  const q = cleanEnquirySearch(sp.q)
  const status = (['open', 'ordered', 'all'] as const).find(s => s === sp.status) ?? (q ? 'all' : 'open')
  // The old "Show all" link (?show=all) means everything; the old default was 24 hours.
  const period = (['24h', '7d', '30d', 'all'] as const).find(p => p === sp.period) ?? (sp.show === 'all' || q ? 'all' : '7d')
  const source = (['meta', 'google', 'none', 'all'] as const).find(s => s === sp.source) ?? 'all'
  return { status, period, source, q }
}

export function periodStart(period: EnquiryPeriod, now: Date = new Date()): string | null {
  const hours = ENQUIRY_PERIODS.find(p => p.key === period)?.hours
  return hours ? new Date(now.getTime() - hours * 3600e3).toISOString() : null
}

/** PostgREST or-filters for a source. Click ids are proof; the tag alone is a claim. */
export const SOURCE_OR: Record<'meta' | 'google', string> = {
  meta: 'fbclid.not.is.null,utm_source.in.(fb,ig,meta,facebook,instagram)',
  google: 'gclid.not.is.null,gbraid.not.is.null,wbraid.not.is.null,utm_source.eq.google',
}
export const NO_SOURCE_AND = ['fbclid', 'gclid', 'gbraid', 'wbraid'] as const

/** The query string for a link that keeps the filters and changes some. */
export function enquiryHref(f: EnquiryFilters, change: Partial<Record<keyof EnquiryFilters | 'page', string | number | null>> = {}): string {
  const merged: Record<string, string | number | null | undefined> = { tab: 'enquiries', ...f, ...change }
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) if (v !== null && v !== undefined && v !== '') search.set(k, String(v))
  return `/admin/leads?${search.toString()}`
}
