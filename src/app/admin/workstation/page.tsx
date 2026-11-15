// src/app/admin/workstation/page.tsx
//
// Workstation (Run 8): one line per job, grouped Urgent / Needs action /
// Waiting on customer / Needs review / Completed, with filters. Each line opens
// the exact record where the existing guarded action is done. See
// utils/workstation.ts for what it reads and what it will never do.
import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { PageHeader, Panel, Pill } from '@/components/Admin/ui/AdminUi'
import { loadWorkstation } from '@/utils/workstation'
import { dualTimeText } from '@/utils/adminTime'
import { WORK_GROUPS, WORK_TYPES, filterWork, parseWorkFilters, type WorkGroup, type WorkItem } from '@/utils/workstationRules'

export const dynamic = 'force-dynamic'

const TONE: Record<WorkGroup, 'attention' | 'info' | 'quiet' | 'good' | 'blocked'> = {
  urgent: 'blocked', action: 'attention', waiting: 'info', review: 'quiet', completed: 'good',
}

/** UK and Pakistan times, the admin's standard (utils/adminTime). */
function when(iso: string | null | undefined): string {
  return iso ? dualTimeText(iso) ?? '' : ''
}

function chip(href: string, label: string, on: boolean, count?: number) {
  return (
    <Link key={href} href={href} aria-current={on ? 'true' : undefined}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3 text-sm font-semibold no-underline ${on ? 'border-indigo-700 bg-indigo-700 text-calico-50' : 'border-calico-300 bg-white text-ink-700 hover:border-ink-400'}`}>
      {label}{count !== undefined && <span className={`tabular-nums ${on ? 'text-calico-200' : 'text-ink-500'}`}>{count}</span>}
    </Link>
  )
}

export default async function WorkstationPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await props.searchParams
  const f = parseWorkFilters(sp)
  const data = await loadWorkstation()
  const shown = filterWork(data.items, f)
  const href = (over: Partial<{ group: string; type: string; q: string }>) => {
    const p = new URLSearchParams()
    const g = over.group ?? f.group; const t = over.type ?? f.type; const q = over.q ?? f.q
    if (g !== 'open') p.set('group', g)
    if (t !== 'all') p.set('type', t)
    if (q) p.set('q', q)
    const s = p.toString()
    return `/admin/workstation${s ? `?${s}` : ''}`
  }
  const inGroup = (g: WorkGroup) => data.items.filter(i => i.group === g && (f.type === 'all' || i.type === f.type)).length
  const open = data.items.filter(i => i.group !== 'completed' && (f.type === 'all' || i.type === f.type)).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Workstation"
        lead="Every open job, one line each, with what to do and by when. Each button opens the exact order or page where the job is done with the usual safeguards; nothing is sent or changed from here."
      />

      {data.failed.length > 0 && (
        <p role="status" className="m-0 rounded-md border border-mulberry-700/30 bg-mulberry-50 px-4 py-3 text-sm text-mulberry-700">
          Could not load: {data.failed.join(', ')}. Those jobs are missing from the list below, not zero.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2" aria-label="Group">
        {chip(href({ group: 'open' }), 'All open', f.group === 'open', open)}
        {WORK_GROUPS.map(g => chip(href({ group: g.key }), g.label, f.group === g.key, inGroup(g.key)))}
      </div>
      <div className="flex flex-wrap items-center gap-2" aria-label="Type">
        {chip(href({ type: 'all' }), 'Every type', f.type === 'all')}
        {WORK_TYPES.map(t => chip(href({ type: t.key }), t.label, f.type === t.key))}
        <form method="get" action="/admin/workstation" className="ml-auto flex items-center gap-2" role="search">
          {f.group !== 'open' && <input type="hidden" name="group" value={f.group} />}
          {f.type !== 'all' && <input type="hidden" name="type" value={f.type} />}
          <label htmlFor="ws-q" className="sr-only">Order code</label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input id="ws-q" name="q" defaultValue={f.q} placeholder="Order code" className="min-h-9 w-40 rounded-md border border-calico-300 bg-white pl-8 pr-2 text-sm" />
          </div>
        </form>
      </div>

      <Panel title={`${shown.length} ${shown.length === 1 ? 'job' : 'jobs'}`}>
        {shown.length === 0 ? (
          <p className="m-0 text-sm text-ink-500">Nothing here{f.q || f.type !== 'all' || f.group !== 'open' ? ' for these filters' : ''}.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-calico-300 p-0">
            {shown.map((i: WorkItem) => (
              <li key={i.id} className="grid grid-cols-1 items-center gap-3 py-3 lg:grid-cols-[8rem_1fr_auto]">
                <div className="flex items-center gap-2">
                  <Pill tone={TONE[i.group]}>{WORK_GROUPS.find(g => g.key === i.group)?.label}</Pill>
                </div>
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold text-ink-900">
                    <span className="font-data tracking-wide text-indigo-700">{i.code}</span> · {i.what}
                  </p>
                  <p className="m-0 mt-0.5 text-xs text-ink-500">
                    {i.why}
                    {i.deadline && i.group !== 'completed' && <> · <span className="font-semibold text-ember-700">by {when(i.deadline)}</span></>}
                    {i.doneAt && <> · {when(i.doneAt)}</>}
                  </p>
                </div>
                <Link href={i.href} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-indigo-700 px-3 text-sm font-semibold text-indigo-700 no-underline hover:bg-indigo-50">
                  {i.action} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Counted on their own pages">
        <ul className="m-0 grid list-none gap-2 p-0 text-sm sm:grid-cols-3">
          <li><Link href="/admin/leads?tab=reminders">Baskets waiting for a reminder: <strong>{data.leadsWaiting ?? 'unknown'}</strong></Link></li>
          <li><Link href="/admin/google">Google-click rows not verified in Google Ads: <strong>{data.googleUnverified ?? 'unknown'}</strong></Link></li>
          <li><Link href="/admin/status">Emails not sent (7 days): <strong>{data.failedEmails ?? 'unknown'}</strong></Link></li>
        </ul>
      </Panel>
    </div>
  )
}
