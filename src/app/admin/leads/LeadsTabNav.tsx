// src/app/admin/leads/LeadsTabNav.tsx
//
// The Leads page's tabs, each with its count. On a phone they scroll sideways.
import Link from 'next/link'
import { LEADS_TABS, leadsHref, type LeadsCounts, type LeadsTabKey } from '@/utils/leadsTabs'

/** What each tab's number counts, for screen readers and the title tooltip. */
const COUNTED: Record<LeadsTabKey, string> = {
  samples: 'waiting to be posted',
  messages: 'new',
  enquiries: 'in the last 24 hours, not yet ordered',
  reminders: 'waiting',
  newsletter: 'confirmed',
}

export default function LeadsTabNav({ tab, counts }: { tab: LeadsTabKey; counts: LeadsCounts }) {
  return (
    <nav aria-label="Leads" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
      {LEADS_TABS.map(t => (
        <Link
          key={t.key}
          href={leadsHref(t.key)}
          aria-current={tab === t.key ? 'page' : undefined}
          title={`${counts[t.key]} ${COUNTED[t.key]}`}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-sm px-3.5 text-sm font-bold transition ${
            tab === t.key ? 'bg-zinc-900 text-white' : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
          }`}
        >
          {t.label}
          <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${tab === t.key ? 'bg-white/15 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
            {counts[t.key]}
            <span className="sr-only"> {COUNTED[t.key]}</span>
          </span>
        </Link>
      ))}
    </nav>
  )
}
