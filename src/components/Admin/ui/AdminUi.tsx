// src/components/Admin/ui/AdminUi.tsx
//
// The admin's shared building blocks (redesign, 14 Nov 2026): one page header,
// one panel, one metric, one status pill. Built on the shop's own tokens
// (calico ground, ink type, ember accent, sage = good, indigo = information),
// so the admin reads as the same business as the storefront.
//
// Rules the pieces enforce: figures are tabular, a metric with no value says
// "Unknown" rather than 0, status colour never carries meaning alone (every
// pill has words), and touch targets are at least 44px.
import type { ReactNode } from 'react'
import Link from 'next/link'

export function PageHeader({ title, lead, actions }: { title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="m-0 text-2xl font-bold tracking-tight text-ink-900 lg:text-3xl">{title}</h1>
        {lead && <p className="m-0 mt-1 max-w-3xl text-sm leading-relaxed text-ink-500">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 print:hidden">{actions}</div>}
    </header>
  )
}

export function Panel({ title, aside, children, id }: { title?: string; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={title ? `${id ?? title}-h` : undefined} className="rounded-lg border border-calico-300 bg-white p-4 shadow-sm lg:p-5">
      {(title || aside) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          {title && <h2 id={`${id ?? title}-h`} className="m-0 text-xs font-bold uppercase tracking-wider text-ink-500">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  )
}

export function Metric({ label, value, note, href, tone = 'plain' }: {
  label: string; value: ReactNode; note?: ReactNode; href?: string; tone?: 'plain' | 'attention' | 'good'
}) {
  const color = tone === 'attention' ? 'text-ember-700' : tone === 'good' ? 'text-sage-700' : 'text-ink-900'
  const body = (
    <>
      <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`m-0 mt-1.5 text-3xl font-bold tabular-nums ${color}`}>{value ?? 'Unknown'}</p>
      {note && <p className="m-0 mt-1 text-xs text-ink-500">{note}</p>}
    </>
  )
  const cls = 'block min-w-0 rounded-lg border border-calico-300 bg-white p-4 shadow-sm'
  return href
    ? <Link href={href} className={`${cls} transition hover:border-ink-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-700`}>{body}</Link>
    : <div className={cls}>{body}</div>
}

const PILL_TONE = {
  good: 'border-sage-300 bg-sage-50 text-sage-700',
  info: 'border-indigo-300 bg-indigo-50 text-indigo-700',
  attention: 'border-ember-500 bg-calico-100 text-ember-700',
  quiet: 'border-calico-300 bg-calico-100 text-ink-500',
} as const

export function Pill({ tone = 'quiet', children }: { tone?: keyof typeof PILL_TONE; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-pill border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${PILL_TONE[tone]}`}>{children}</span>
}
