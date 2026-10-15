// src/utils/leadsTabs.ts
//
// The Leads page's tabs (admin upgrade I1-I6), and which one opens.
//
// Leads opens on what needs doing, like the orders list: the first of
// samples, messages and basket reminders with something waiting. WhatsApp
// enquiries are a record to look things up in rather than a queue to clear,
// so they open only when nothing else waits. A link that names a tab gets
// it, and the old basket-reminder links (/admin/leads?view=done) still land
// on basket reminders.

export const LEADS_TABS = [
  { key: 'samples', label: 'Samples' },
  { key: 'messages', label: 'Messages' },
  { key: 'enquiries', label: 'WhatsApp enquiries' },
  { key: 'reminders', label: 'Basket reminders' },
  { key: 'newsletter', label: 'Newsletter' },
] as const

export type LeadsTabKey = (typeof LEADS_TABS)[number]['key']

export type LeadsCounts = Record<LeadsTabKey, number>

const QUEUES: LeadsTabKey[] = ['samples', 'messages', 'reminders']

export function isLeadsTab(value: unknown): value is LeadsTabKey {
  return typeof value === 'string' && LEADS_TABS.some(t => t.key === value)
}

export function pickLeadsTab(requested: string | undefined, counts: LeadsCounts, legacyView?: string): LeadsTabKey {
  if (isLeadsTab(requested)) return requested
  if (legacyView) return 'reminders'
  const waiting = QUEUES.find(key => counts[key] > 0)
  if (waiting) return waiting
  return counts.enquiries > 0 ? 'enquiries' : 'reminders'
}

/** A Leads address: the tab, plus whatever that tab's own filters are. */
export function leadsHref(tab: LeadsTabKey, params: Record<string, string | number | null | undefined> = {}): string {
  const search = new URLSearchParams({ tab })
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value))
  }
  return `/admin/leads?${search.toString()}`
}

/** WhatsApp enquiries count as new for a day: the tab's count and Home's chip. */
export const NEW_ENQUIRY_HOURS = 24

/** When the "new" enquiries window starts, as an ISO time for a query. */
export function newEnquiriesSince(now: Date = new Date()): string {
  return new Date(now.getTime() - NEW_ENQUIRY_HOURS * 60 * 60 * 1000).toISOString()
}
