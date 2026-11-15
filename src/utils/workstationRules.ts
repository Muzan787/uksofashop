// src/utils/workstationRules.ts
//
// Pure rules for the Workstation (Run 8): which group a job belongs in, and
// the filters. Kept apart from the database code so it can be tested.
//   Urgent        - a Meta event within 24 h of its 7-day limit; a delivery
//                   past the customer's own date.
//   Needs action  - any other eligible Meta event.
//   Waiting on customer - an order not yet confirmed (2+ days old moves to Urgent).
//   Needs review  - an order whose advert source needs evidence checking.
//   Completed     - only what the records say happened (sent, delivered).

export type WorkType = 'meta_send' | 'confirm_order' | 'overdue_delivery' | 'source_review'
export type WorkGroup = 'urgent' | 'action' | 'waiting' | 'review' | 'completed'

export interface WorkItem {
  type: WorkType
  group: WorkGroup
  id: string
  /** The order's short code, never a customer's name or contact. */
  code: string
  href: string
  what: string
  why: string
  action: string
  deadline: string | null
  ageDays?: number
  doneAt?: string | null
  source: 'meta' | 'order'
}

export const WORK_GROUPS: { key: WorkGroup; label: string }[] = [
  { key: 'urgent', label: 'Urgent' },
  { key: 'action', label: 'Needs action' },
  { key: 'waiting', label: 'Waiting on customer' },
  { key: 'review', label: 'Needs review' },
  { key: 'completed', label: 'Completed (7 days)' },
]

export const WORK_TYPES: { key: WorkType; label: string }[] = [
  { key: 'meta_send', label: 'Meta event' },
  { key: 'confirm_order', label: 'Confirm order' },
  { key: 'overdue_delivery', label: 'Delivery' },
  { key: 'source_review', label: 'Source review' },
]

export function classifyWork(item: Omit<WorkItem, 'group'>, now: number): WorkItem {
  const left = item.deadline ? Date.parse(item.deadline) - now : null
  let group: WorkGroup
  if (item.type === 'meta_send') group = left !== null && left < 24 * 3600000 ? 'urgent' : 'action'
  else if (item.type === 'overdue_delivery') group = 'urgent'
  else if (item.type === 'confirm_order') group = (item.ageDays ?? 0) >= 2 ? 'urgent' : 'waiting'
  else group = 'review'
  return { ...item, group }
}

export interface WorkFilters { group: WorkGroup | 'open'; type: WorkType | 'all'; q: string }

export function parseWorkFilters(sp: Record<string, string | string[] | undefined>): WorkFilters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
  const g = one(sp.group)
  const t = one(sp.type)
  return {
    group: (WORK_GROUPS.some(x => x.key === g) ? g : 'open') as WorkFilters['group'],
    type: (WORK_TYPES.some(x => x.key === t) ? t : 'all') as WorkFilters['type'],
    q: one(sp.q).replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase(),
  }
}

/** Open jobs first by group, soonest deadline first; Completed only when asked for. */
export function filterWork(items: WorkItem[], f: WorkFilters): WorkItem[] {
  const order = WORK_GROUPS.map(g => g.key)
  return items
    .filter(i => (f.group === 'open' ? i.group !== 'completed' : i.group === f.group))
    .filter(i => f.type === 'all' || i.type === f.type)
    .filter(i => !f.q || i.code.startsWith(f.q))
    .sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group)
      || (a.deadline && b.deadline ? Date.parse(a.deadline) - Date.parse(b.deadline) : a.deadline ? -1 : b.deadline ? 1 : 0)
      || (b.ageDays ?? 0) - (a.ageDays ?? 0))
}
