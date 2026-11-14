// src/app/admin/business/page.tsx
//
// Admin -> Business (Run 4, 14 Nov 2026): what the orders say about the
// business for a period. Real orders only (test orders excluded).
//
// Honesty rules: order value is what the customer agreed to pay, not cash
// collected and not profit. There is no supplier cost, delivery cost, ad spend
// or payment ledger in this system, so no margin or profit is shown - the page
// says so instead of estimating one.
import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/utils/auth'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { parsePeriod } from '@/utils/websiteReport'
import { automaticSource, reviewReason, type ReviewOrder } from '@/utils/sourceReview'
import { contactChannelOf } from '@/utils/orderEvidence'
import { Metric, PageHeader, Panel } from '@/components/Admin/ui/AdminUi'
import PeriodFilters from '@/components/Admin/ui/PeriodFilters'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Business' }

type Row = ReviewOrder & { id: string; total_amount: number | null; created_at: string; delivered_at: string | null; cancellation_reason: string | null; channel: string | null; source: string | null }

const money = (v: number) => `£${Math.round(v).toLocaleString('en-GB')}`
const SOURCE_FROM_OVERRIDE: Record<string, string> = { meta: 'Meta (staff reviewed)', google: 'Google (staff reviewed)', direct: 'Direct (staff reviewed)', referral: 'Recommendation (staff reviewed)', other: 'Other (staff reviewed)' }

function groupOf(o: Row): string {
  if (o.manual_acquisition_source) return SOURCE_FROM_OVERRIDE[o.manual_acquisition_source] ?? 'Staff reviewed'
  const a = automaticSource(o)
  if (a === 'Meta click' || a === 'Meta tag only') return 'Meta'
  if (a === 'Google click' || a === 'Google tag only') return 'Google'
  if (a === 'Meta + Google clicks') return 'Meta + Google (unresolved)'
  if (a.startsWith('Tagged:')) return 'Other tagged source'
  if (a === 'Unknown') return 'Unknown'
  return 'No advert recorded'
}

export default async function BusinessPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin()
  const sp = await searchParams
  const period = parsePeriod({ period: sp.period ?? '30d', from: sp.from, to: sp.to })
  const params = { period: period.preset, from: period.preset === 'custom' ? period.fromDay : undefined, to: period.preset === 'custom' ? period.toDay : undefined }
  const db = createUntypedAdminClient()
  const cols = 'id,status,is_test,manual_acquisition_source,utm_source,gclid,gbraid,wbraid,fbclid,meta_fbc,visitor_id,whatsapp_reference,total_amount,created_at,delivered_at,cancellation_reason,channel,source'
  const [placedRes, deliveredRes] = await Promise.all([
    db.from('orders').select(cols).eq('is_test', false).gte('created_at', period.start.toISOString()).lt('created_at', period.end.toISOString()).limit(5000),
    db.from('orders').select('total_amount').eq('is_test', false).eq('status', 'delivered').gte('delivered_at', period.start.toISOString()).lt('delivered_at', period.end.toISOString()).limit(5000),
  ])
  const placed = (placedRes.data ?? []) as unknown as Row[]
  const delivered = (deliveredRes.data ?? []) as { total_amount: number | null }[]
  const failed = Boolean(placedRes.error || deliveredRes.error)
  const sum = (rows: { total_amount: number | null }[]) => rows.reduce((t, r) => t + Number(r.total_amount ?? 0), 0)
  const by = (s: string) => placed.filter(o => (o.status ?? 'pending_cod') === s)
  const kept = placed.filter(o => o.status !== 'cancelled')
  const cancelled = by('cancelled')

  // Contact channel x acquisition source, kept as two separate things.
  const channels = ['whatsapp', 'website', 'phone'] as const
  const groups = new Map<string, Record<string, number> & { orders: number; confirmedOrDelivered: number; cancelled: number }>()
  for (const o of placed) {
    const g = groupOf(o)
    const row = groups.get(g) ?? { orders: 0, confirmedOrDelivered: 0, cancelled: 0, whatsapp: 0, website: 0, phone: 0 }
    row.orders++
    row[contactChannelOf(o)]++
    if (o.status === 'confirmed' || o.status === 'delivered' || o.status === 'on_hold') row.confirmedOrDelivered++
    if (o.status === 'cancelled') row.cancelled++
    groups.set(g, row)
  }
  const groupRows = [...groups.entries()].sort((a, b) => b[1].orders - a[1].orders)

  const reasons = new Map<string, number>()
  for (const o of cancelled) {
    const key = (o.cancellation_reason ?? '').trim() || 'No reason recorded'
    reasons.set(key, (reasons.get(key) ?? 0) + 1)
  }
  const reasonRows = [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  const toReview = placed.filter(o => reviewReason(o)).length

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Business" lead="Orders, outcomes and where they came from, for a period. Real orders only. Order value is the agreed price, not cash collected and not profit." />
      <PeriodFilters base="/admin/business" period={period} params={params} showSegments={false} />
      {failed && <p role="alert" className="rounded-md border border-ember-500 bg-calico-100 p-4 text-sm">Some order figures could not be loaded. Treat what is shown as incomplete.</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Headline figures">
        <Metric label="Orders placed" value={placed.length} note={`${money(sum(placed))} agreed value`} href="/admin/orders?status=all" />
        <Metric label="Still going ahead" value={kept.length} note={`${money(sum(kept))} · not cancelled`} />
        <Metric label="Cancelled" value={cancelled.length} note={`${placed.length ? Math.round(cancelled.length / placed.length * 100) : 0}% of orders placed in the period`} href="/admin/orders?status=cancelled" tone={cancelled.length ? 'attention' : 'plain'} />
        <Metric label="Delivered in period" value={delivered.length} note={`${money(sum(delivered))} order value delivered`} href="/admin/orders?status=delivered" tone="good" />
      </section>

      <Panel title="Where today's orders stand (placed in this period)">
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 text-sm sm:grid-cols-5">
          {([['Waiting to confirm', 'pending_cod'], ['Confirmed', 'confirmed'], ['On hold', 'on_hold'], ['Delivered', 'delivered'], ['Cancelled', 'cancelled']] as const).map(([label, s]) => (
            <li key={s}><Link href={`/admin/orders?status=${s}`} className="flex min-h-14 flex-col justify-center rounded-md border border-calico-300 px-3 hover:bg-calico-50"><span className="text-xs text-ink-500">{label}</span><strong className="tabular-nums">{by(s).length} · {money(sum(by(s)))}</strong></Link></li>
          ))}
        </ul>
      </Panel>

      <Panel title="Where orders came from, and how they reached us" aside={toReview > 0 ? <Link href="/admin/source-review" className="text-sm font-semibold text-indigo-700 underline">{toReview} need a source review</Link> : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-wider text-ink-500"><th scope="col" className="pb-2 pr-2">Advertising source (evidence)</th><th scope="col" className="pb-2 pr-2 text-right">Orders</th><th scope="col" className="pb-2 pr-2 text-right">Going ahead</th><th scope="col" className="pb-2 pr-2 text-right">Cancelled</th>{channels.map(c => <th key={c} scope="col" className="pb-2 pr-2 text-right capitalize">via {c}</th>)}</tr></thead>
            <tbody>{groupRows.map(([g, r]) => (
              <tr key={g} className="border-t border-calico-300">
                <th scope="row" className="py-2 pr-2 font-semibold text-ink-900">{g}</th>
                <td className="py-2 pr-2 text-right tabular-nums">{r.orders}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{r.confirmedOrDelivered}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{r.cancelled}</td>
                {channels.map(c => <td key={c} className="py-2 pr-2 text-right tabular-nums">{r[c] ?? 0}</td>)}
              </tr>))}
            </tbody>
          </table>
        </div>
        <p className="m-0 mt-2 text-xs text-ink-500">Source is the strongest evidence on the order: a staff review first, then an ad click id, then an ad tag. &ldquo;Via WhatsApp&rdquo; is how the customer got in touch, never by itself the advert. Going ahead = confirmed, on hold or delivered today.</p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Why orders were cancelled">
          {reasonRows.length === 0 ? <p className="m-0 text-sm text-ink-500">No cancellations in this period.</p> : (
            <ul className="m-0 list-none divide-y divide-calico-300 p-0 text-sm">
              {reasonRows.map(([reason, count]) => <li key={reason} className="flex items-baseline justify-between gap-3 py-2"><span className="min-w-0 text-ink-900">{reason}</span><span className="shrink-0 tabular-nums font-semibold">{count}</span></li>)}
            </ul>
          )}
          <p className="m-0 mt-2 text-xs text-ink-500">As staff wrote them when cancelling.</p>
        </Panel>
        <Panel title="Money, costs and profit">
          <p className="m-0 text-sm text-ink-900"><strong>Not yet available.</strong></p>
          <p className="m-0 mt-2 text-sm text-ink-700">The system holds agreed order values and deposits, but no supplier costs, delivery costs, ad spend or a record of cash actually collected. Profit or margin would be a guess, so it is not shown. Ad spend is in Meta and Google, not here.</p>
        </Panel>
      </div>
    </div>
  )
}
