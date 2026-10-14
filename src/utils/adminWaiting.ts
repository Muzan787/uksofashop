// src/utils/adminWaiting.ts
//
// Home's "Waiting for you" strip (admin upgrade C3): one chip for each kind
// of thing someone is waiting on, saying how many in words, and opening the
// screen where it gets done. A kind with nothing waiting has no chip, and
// with no chips at all the strip isn't shown.
//
// A count of null means the kind can't be counted yet: messages and WhatsApp
// enquiries have no tab to open until Phase 8, so they stay null until then.

export interface WaitingCounts {
  samples: number | null
  messages: number | null
  reviews: number | null
  reminders: number | null
  enquiries: number | null
}

export interface WaitingChip {
  key: keyof WaitingCounts
  count: number
  label: string
  href: string
}

const KINDS: { key: keyof WaitingCounts; one: string; many: string; href: string }[] = [
  { key: 'samples', one: 'sample to post', many: 'samples to post', href: '/admin/swatches' },
  { key: 'messages', one: 'message', many: 'messages', href: '/admin/leads?tab=messages' },
  { key: 'reviews', one: 'review to check', many: 'reviews to check', href: '/admin/reviews' },
  { key: 'reminders', one: 'basket reminder', many: 'basket reminders', href: '/admin/leads' },
  { key: 'enquiries', one: 'new WhatsApp enquiry', many: 'new WhatsApp enquiries', href: '/admin/leads?tab=enquiries' },
]

/** "2 samples to post", "1 message"… in a fixed order, only those with something waiting. */
export function waitingChips(counts: WaitingCounts): WaitingChip[] {
  return KINDS.flatMap(kind => {
    const count = counts[kind.key]
    if (count === null || !Number.isFinite(count) || count <= 0) return []
    return [{ key: kind.key, count, label: `${count} ${count === 1 ? kind.one : kind.many}`, href: kind.href }]
  })
}
