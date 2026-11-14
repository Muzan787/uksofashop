// src/components/Admin/ui/PeriodFilters.tsx
//
// Period presets, a custom date range, and optional device / source chips, as
// plain links and a GET form - every filter is a URL staff can bookmark or
// share, and works without JavaScript.
import Link from 'next/link'
import { DEVICES, SOURCES, SOURCE_LABEL, withParams, type Period } from '@/utils/websiteReport'

const chip = (on: boolean) =>
  `inline-flex min-h-10 items-center rounded-pill border px-3.5 text-sm font-semibold ${on ? 'border-ink-900 bg-ink-900 text-white' : 'border-calico-300 bg-white text-ink-700 hover:bg-calico-50'}`

export default function PeriodFilters({ base, period, params, device, source, showSegments = true }: {
  base: string
  period: Period
  params: Record<string, string | undefined>
  device?: string | null
  source?: string | null
  showSegments?: boolean
}) {
  const presets: [string, string][] = [['today', 'Today'], ['7d', '7 days'], ['30d', '30 days']]
  return (
    <div className="space-y-3 rounded-lg border border-calico-300 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-bold uppercase tracking-wider text-ink-500">Period</span>
        {presets.map(([key, label]) => (
          <Link key={key} href={withParams(base, params, { period: key, from: undefined, to: undefined })} aria-current={period.preset === key ? 'true' : undefined} className={chip(period.preset === key)}>{label}</Link>
        ))}
        <form method="get" action={base} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="period" value="custom" />
          {device && <input type="hidden" name="device" value={device} />}
          {source && <input type="hidden" name="source" value={source} />}
          <label className="sr-only" htmlFor={`${base}-from`}>From</label>
          <input id={`${base}-from`} type="date" name="from" defaultValue={period.fromDay} className="min-h-10 rounded-md border border-calico-300 bg-white px-2 text-sm" />
          <span className="text-sm text-ink-500">to</span>
          <label className="sr-only" htmlFor={`${base}-to`}>To</label>
          <input id={`${base}-to`} type="date" name="to" defaultValue={period.toDay} className="min-h-10 rounded-md border border-calico-300 bg-white px-2 text-sm" />
          <button type="submit" className={chip(period.preset === 'custom')}>Apply dates</button>
        </form>
      </div>
      {showSegments && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-bold uppercase tracking-wider text-ink-500">Device</span>
            <Link href={withParams(base, params, { device: undefined })} className={chip(!device)}>All</Link>
            {DEVICES.map(d => <Link key={d} href={withParams(base, params, { device: d })} className={chip(device === d)}>{d[0].toUpperCase() + d.slice(1)}</Link>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-bold uppercase tracking-wider text-ink-500">Source</span>
            <Link href={withParams(base, params, { source: undefined })} className={chip(!source)}>All</Link>
            {SOURCES.map(s => <Link key={s} href={withParams(base, params, { source: s })} className={chip(source === s)}>{SOURCE_LABEL[s]}</Link>)}
          </div>
        </>
      )}
      {period.error && <p role="alert" className="m-0 text-sm text-ember-700">{period.error} Showing the last 7 days instead.</p>}
      <p className="m-0 text-xs text-ink-500">{period.label} · UK days (Europe/London){period.days > 1 ? ` · ${period.days} days` : ''}</p>
    </div>
  )
}
