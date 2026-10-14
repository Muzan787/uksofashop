import type { Metadata } from 'next'
// src/app/admin/status/page.tsx
//
// Is everything working? One card per part of the shop - green (OK), amber
// (not set up yet) or red (problem) - in words as well as colour, with a
// sentence you can act on and a few supporting facts. The verdicts come from
// utils/health/checks.ts, the same function behind the Home health card.
import { createClient } from '@/utils/supabase/server'
import { loadHealthReport } from '@/utils/health/loadHealth'
import { dualTimeText } from '@/utils/adminTime'
import { StatePill, STATE_EDGE } from '@/components/Admin/HealthState'

export const metadata: Metadata = { title: 'Status' }
export const dynamic = 'force-dynamic'

export default async function AdminStatusPage() {
  const supabase = await createClient()
  const report = await loadHealthReport(supabase)
  const counts = {
    red: report.checks.filter(c => c.state === 'red').length,
    amber: report.checks.filter(c => c.state === 'amber').length,
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Status</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 lg:text-3xl">{report.headline}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatePill state={report.state} />
          {counts.red > 0 && <span className="text-sm text-stone-600">{counts.red} {counts.red === 1 ? 'problem' : 'problems'}</span>}
          {counts.amber > 0 && <span className="text-sm text-stone-600">{counts.amber} not set up yet</span>}
          <span className="text-xs text-stone-400">Checked {dualTimeText(new Date())}</span>
        </div>
      </header>

      <ul className="space-y-3">
        {report.checks.map(c => (
          <li key={c.key} id={c.key} className={`scroll-mt-6 rounded-md border border-l-4 border-stone-200 bg-white p-4 shadow-sm ${STATE_EDGE[c.state]}`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-bold text-stone-900">{c.title}</h2>
              <StatePill state={c.state} />
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-700">{c.summary}</p>
            {c.details.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-stone-100 pt-2 text-xs leading-relaxed text-stone-500">
                {c.details.map((d, i) => <li key={i} className="break-words">{d}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
