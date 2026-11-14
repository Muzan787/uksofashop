// src/components/Admin/ui/Charts.tsx
//
// Small, dependency-free charts for the admin (Run 5, 14 Nov 2026). Server
// rendered SVG and CSS, in the shop's own tokens. Every chart:
//   - plots only the numbers it is given (no smoothing, no invented points),
//   - starts its value axis at zero,
//   - carries a visually hidden or visible table with the same numbers, so it
//     reads to a screen reader and can be checked by eye.

const fmt = (n: number) => n.toLocaleString('en-GB')
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–')

export interface FunnelStage {
  label: string
  value: number
  /** Denominator for the progress figure and its words, e.g. "of basket openers". */
  of?: { value: number; label: string }
  note?: string
}

/** Horizontal funnel: one bar per stage, scaled to the first stage. */
export function FunnelChart({ stages, caption }: { stages: FunnelStage[]; caption: string }) {
  const max = Math.max(1, ...stages.map(s => s.value))
  return (
    <figure className="m-0">
      <ol className="m-0 list-none space-y-2.5 p-0" aria-label={caption}>
        {stages.map(s => (
          <li key={s.label} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr_9rem]">
            <span className="min-w-0 text-sm font-semibold text-ink-900">
              {s.label}
              {s.note && <span className="block text-xs font-normal text-ink-500">{s.note}</span>}
            </span>
            <span className="relative block h-7 rounded-md bg-calico-100" aria-hidden="true">
              <span className="absolute inset-y-0 left-0 rounded-md bg-ember-500" style={{ width: `${Math.max(1.5, (s.value / max) * 100)}%` }} />
              <span className="absolute inset-y-0 left-2 flex items-center text-xs font-bold tabular-nums text-ink-900">{fmt(s.value)}</span>
            </span>
            <span className="text-right text-xs text-ink-700 sm:text-sm">
              {s.of ? <><strong className="tabular-nums">{pct(s.value, s.of.value)}</strong> <span className="text-ink-500">{s.of.label}</span></> : <span className="text-ink-500">start</span>}
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="mt-3 text-xs text-ink-500">{caption}</figcaption>
    </figure>
  )
}

export interface Series {
  label: string
  values: number[]
  /** A token colour class for the stroke / fill, e.g. 'ember', 'indigo', 'sage', 'ink'. */
  tone: 'ember' | 'indigo' | 'sage' | 'ink' | 'rust'
}

const TONE: Record<Series['tone'], string> = {
  ember: 'var(--color-ember-500)', indigo: 'var(--color-indigo-700)', sage: 'var(--color-sage-700)',
  ink: 'var(--color-ink-900)', rust: 'var(--color-ember-700)',
}

/** Lines over days. One shared zero-based axis; a dot on every real data point. */
export function TrendChart({ days, series, caption, height = 180 }: { days: string[]; series: Series[]; caption: string; height?: number }) {
  const width = 640
  const pad = { l: 36, r: 8, t: 10, b: 24 }
  const max = Math.max(1, ...series.flatMap(s => s.values))
  const niceMax = max <= 5 ? 5 : Math.ceil(max / 5) * 5
  const x = (i: number) => pad.l + (days.length <= 1 ? (width - pad.l - pad.r) / 2 : (i / (days.length - 1)) * (width - pad.l - pad.r))
  const y = (v: number) => pad.t + (1 - v / niceMax) * (height - pad.t - pad.b)
  const ticks = [0, niceMax / 2, niceMax]
  // A UK calendar day as "14 Nov", from the YYYY-MM-DD string itself: no clock time, no zone maths.
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const label = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1] ?? ''}`
  const every = Math.max(1, Math.ceil(days.length / 7))
  return (
    <figure className="m-0">
      <ul className="m-0 mb-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-ink-700">
        {series.map(s => (
          <li key={s.label} className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-2.5 w-4 rounded-sm" style={{ background: TONE[s.tone] }} />{s.label}</li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={caption}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="var(--color-calico-300)" strokeWidth="1" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--color-ink-500)">{fmt(Math.round(t))}</text>
          </g>
        ))}
        {days.map((d, i) => (i % every === 0 || i === days.length - 1) && (
          <text key={d} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--color-ink-500)">{label(d)}</text>
        ))}
        {series.map(s => (
          <g key={s.label}>
            <polyline fill="none" stroke={TONE[s.tone]} strokeWidth="2" strokeLinejoin="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
            {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill={TONE[s.tone]} />)}
          </g>
        ))}
      </svg>
      <details className="mt-2 text-xs text-ink-500">
        <summary className="cursor-pointer">Show the numbers</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr><th scope="col" className="pr-3">Day</th>{series.map(s => <th key={s.label} scope="col" className="pr-3 text-right">{s.label}</th>)}</tr></thead>
            <tbody>{days.map((d, i) => <tr key={d} className="border-t border-calico-300"><th scope="row" className="pr-3 font-normal">{label(d)}</th>{series.map(s => <td key={s.label} className="pr-3 text-right tabular-nums">{fmt(s.values[i] ?? 0)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </details>
      <figcaption className="mt-2 text-xs text-ink-500">{caption}</figcaption>
    </figure>
  )
}

export interface Segment { label: string; value: number; tone: Series['tone']; note?: string }

/** One stacked bar that adds up to a stated whole, with a legend that repeats the numbers. */
export function StackedBar({ segments, total, caption }: { segments: Segment[]; total: number; caption: string }) {
  return (
    <figure className="m-0">
      <div className="flex h-8 w-full overflow-hidden rounded-md bg-calico-100" role="img" aria-label={caption}>
        {segments.filter(s => s.value > 0).map(s => (
          <span key={s.label} className="h-full" style={{ width: `${(s.value / Math.max(1, total)) * 100}%`, background: TONE[s.tone] }} />
        ))}
      </div>
      <ul className="m-0 mt-3 grid list-none gap-2 p-0 text-sm sm:grid-cols-2">
        {segments.map(s => (
          <li key={s.label} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1 inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: TONE[s.tone] }} />
            <span><strong className="tabular-nums">{fmt(s.value)}</strong> <span className="text-ink-500">({pct(s.value, total)})</span> {s.label}{s.note && <span className="block text-xs text-ink-500">{s.note}</span>}</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-2 text-xs text-ink-500">{caption}</figcaption>
    </figure>
  )
}

export interface RateRow { label: string; rates: { label: string; part: number; whole: number }[] }

/** Side-by-side rates (0-100%) per row, with the counts behind each. */
export function RateBars({ rows, caption }: { rows: RateRow[]; caption: string }) {
  const tones: Series['tone'][] = ['indigo', 'ember', 'sage']
  return (
    <figure className="m-0">
      <ul className="m-0 list-none space-y-3 p-0">
        {rows.map(r => (
          <li key={r.label}>
            <p className="m-0 mb-1 text-sm font-semibold capitalize text-ink-900">{r.label}</p>
            <div className="space-y-1">
              {r.rates.map((rate, i) => {
                const share = rate.whole > 0 ? rate.part / rate.whole : 0
                return (
                  <div key={rate.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2 text-xs">
                    <span className="text-ink-700">{rate.label}</span>
                    <span className="block h-3 rounded-sm bg-calico-100" aria-hidden="true"><span className="block h-3 rounded-sm" style={{ width: `${Math.max(rate.part ? 2 : 0, share * 100)}%`, background: TONE[tones[i % tones.length]] }} /></span>
                    <span className="tabular-nums text-ink-900">{pct(rate.part, rate.whole)} <span className="text-ink-500">({fmt(rate.part)}/{fmt(rate.whole)})</span></span>
                  </div>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
      <figcaption className="mt-2 text-xs text-ink-500">{caption}</figcaption>
    </figure>
  )
}
