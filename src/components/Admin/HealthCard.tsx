// src/components/Admin/HealthCard.tsx
//
// The Home page's health card (admin upgrade C4): only the checks that aren't
// green, in the Status page's own words, or "Everything is working." Built
// from the same report as /admin/status, so the two never disagree.
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { HealthReport } from '@/utils/health/checks'
import { StatePill } from './HealthState'

export default function HealthCard({ report }: { report: HealthReport }) {
  const notGreen = report.checks
    .filter(c => c.state !== 'ok')
    .sort((a, b) => (a.state === b.state ? 0 : a.state === 'red' ? -1 : 1))

  return (
    <section aria-labelledby="health-heading" className="rounded-md border border-stone-200 bg-white p-4 shadow-sm lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="health-heading" className="text-sm font-bold uppercase tracking-wider text-stone-500">Is everything working?</h2>
        <StatePill state={report.state} />
      </div>
      <p className="mt-2 text-base font-semibold text-stone-900">{report.headline}</p>

      {notGreen.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-100 border-t border-stone-100">
          {notGreen.map(c => (
            <li key={c.key} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-900">{c.title}</p>
                <p className="text-sm text-stone-600">{c.summary}</p>
              </div>
              <StatePill state={c.state} />
            </li>
          ))}
        </ul>
      )}

      <Link href="/admin/status" className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700">
        Open Status <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  )
}
