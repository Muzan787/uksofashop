import type { Metadata } from 'next'
import { requireAdmin } from '@/utils/auth'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { dualTimeText } from '@/utils/adminTime'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Google conversions', robots: { index: false, follow: false } }

type Order = { id: string; status: string; source: string | null; utm_source: string | null; utm_campaign: string | null }
type Offline = { id: string; order_id: string; stage: string; conversion_time: string; value: number; status: string; google_import_status: string; sheet_synced_at: string | null; orders: Order | Order[] | null }
type Analytics = { order_id: string; conversion_time: string; status: string; error_code: string | null }
const orderOf = (row: Offline) => Array.isArray(row.orders) ? row.orders[0] : row.orders
const reference = (id: string) => id.slice(0, 8).toUpperCase()

export default async function GoogleConversions() {
  await requireAdmin()
  const db = createUntypedAdminClient()
  const [outbox, analytics, holds, sync] = await Promise.all([
    db.from('google_conversion_outbox').select('id,order_id,stage,conversion_time,value,status,google_import_status,sheet_synced_at,orders(id,status,source,utm_source,utm_campaign)').order('conversion_time', { ascending: false }).limit(501),
    db.from('google_ga4_delivery').select('order_id,conversion_time,status,error_code').order('conversion_time', { ascending: false }).limit(501),
    db.from('meta_signal_holds').select('order_id,state').limit(5001),
    db.from('google_sheet_sync_runs').select('completed_at,verified_count').eq('status', 'verified').order('completed_at', { ascending: false }).limit(1),
  ])
  const rows = (outbox.data ?? []) as unknown as Offline[]
  const deliveries = (analytics.data ?? []) as unknown as Analytics[]
  const held = new Map<string, string>((holds.data ?? []).map(r => [r.order_id, r.state]))
  const failed = [outbox, analytics, holds, sync].some(r => r.error)
  const limited = rows.length > 500 || deliveries.length > 500 || held.size > 5000
  const last = sync.data?.[0]
  const blocked = (r: Offline) => held.has(r.order_id) || orderOf(r)?.status === 'cancelled'
  const awaiting = rows.filter(r => r.status === 'pending' && !blocked(r)).length
  return <div className="mx-auto max-w-6xl space-y-6">
    <header><h1 className="text-3xl font-bold">Google conversions</h1>
      <p className="mt-2 text-stone-600">Website and WhatsApp orders share the same consent and conversion-hold checks. A Google click or campaign link is acquisition evidence; it does not prove Google Ads credited the order.</p></header>
    {failed && <p role="alert" className="rounded border border-red-300 bg-red-50 p-4">Some Google records could not be loaded. Counts below may be incomplete; do not treat missing rows as zero.</p>}
    {limited && <p role="status">Showing the latest 500 records per stream. Counts cover this selection only.</p>}
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Reporting summary">
      <div className="rounded border bg-white p-4"><strong className="text-2xl">{awaiting}</strong><p>Pending offline rows, excluding holds and cancellations</p></div>
      <div className="rounded border bg-white p-4"><strong className="text-2xl">{held.size}</strong><p>Orders explicitly held or marked don&apos;t send</p></div>
      <div className="rounded border bg-white p-4"><strong>Last verified sheet sync</strong><p>{last?.completed_at ? dualTimeText(last.completed_at) : 'None recorded'}</p>{last && <p>{last.verified_count} rows verified in that run</p>}</div>
    </section>
    {held.size > 0 && <section className="rounded border bg-white p-4"><h2 className="font-semibold">Explicit conversion holds</h2><ul className="mt-2 space-y-1">{Array.from(held).slice(0, 5000).map(([id, state]) => <li key={id}><strong>{reference(id)}</strong> · {state.replaceAll('_', ' ')}</li>)}</ul></section>}
    <section className="rounded border border-amber-300 bg-amber-50 p-4">
      <h2 className="font-semibold">What these records prove</h2>
      <p>GA4 transport accepted means Google&apos;s endpoint accepted the request, not that a purchase appeared in GA4 or was attributed in Ads. Sheet synced means the row was read back from the import sheet. Verify imported and matched conversions in Google Ads → Goals → Uploads / Data manager.</p>
      <p className="mt-2">Internal import flags, including older “accepted” flags, are not independent Google verification. Sheet updates currently require a verified sync; marking an order delivered does not by itself refresh the Google import sheet.</p>
      <p className="mt-2">Cancelled rows flagged adjustment required need a Google retraction if they were previously imported. Conversion holds prevent future sends; they cannot undo an earlier accepted event.</p>
    </section>
    <section className="overflow-x-auto rounded border bg-white p-4">
      <h2 className="mb-3 text-xl font-semibold">Offline confirmed and delivered orders</h2>
      <table className="w-full text-left text-sm"><thead><tr><th scope="col">Order</th><th scope="col">Stage / time (UK · PK)</th><th scope="col">Value</th><th scope="col">Source evidence</th><th scope="col">Queue / sheet</th><th scope="col">Internal import flag</th></tr></thead>
        <tbody>{rows.slice(0, 500).map(r => { const order = orderOf(r); return <tr className="border-t align-top" key={r.id}>
          <th scope="row" className="py-3 pr-3">{reference(r.order_id)}<span className="block font-normal">{order?.status ?? 'Order unavailable'}</span></th>
          <td className="py-3 pr-3">{r.stage}<span className="block">{dualTimeText(r.conversion_time)}</span></td>
          <td className="py-3 pr-3">{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(r.value))}</td>
          <td className="py-3 pr-3">{order?.utm_source || 'Unattributed'} · {order?.source || 'unknown'}<span className="block break-all">{order?.utm_campaign || 'No campaign recorded'}</span></td>
          <td className="py-3 pr-3">{held.has(r.order_id) ? `Blocked: ${held.get(r.order_id)}` : blocked(r) ? 'Blocked: cancelled' : r.status}<span className="block">{r.sheet_synced_at ? dualTimeText(r.sheet_synced_at) : 'Not synced'}</span></td>
          <td className="py-3">{r.google_import_status.replaceAll('_', ' ')}</td>
        </tr> })}</tbody></table>
      {!rows.length && !outbox.error && <p>No offline conversion records.</p>}
    </section>
    <section className="overflow-x-auto rounded border bg-white p-4"><h2 className="mb-3 text-xl font-semibold">GA4 server purchase transport</h2>
      <table className="w-full text-left text-sm"><thead><tr><th scope="col">Order</th><th scope="col">Conversion time (UK · PK)</th><th scope="col">Transport status</th></tr></thead><tbody>
        {deliveries.slice(0, 500).map(r => <tr className="border-t" key={r.order_id}><th scope="row" className="py-3">{reference(r.order_id)}</th><td>{dualTimeText(r.conversion_time)}</td><td>{r.status.replaceAll('_', ' ')}{r.error_code ? ` · ${r.error_code}` : ''}</td></tr>)}
      </tbody></table>{!deliveries.length && !analytics.error && <p>No GA4 purchase transport records.</p>}
    </section>
  </div>
}
