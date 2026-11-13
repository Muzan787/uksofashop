import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/utils/auth'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { dualTimeText } from '@/utils/adminTime'
import { GOOGLE_STATE_LABEL, googleRowState, hasGoogleClick, type GoogleRowState } from '@/utils/googleQueue'
import { Metric, PageHeader, Panel, Pill } from '@/components/Admin/ui/AdminUi'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Google conversions', robots: { index: false, follow: false } }

type Order = { id: string; status: string; source: string | null; utm_source: string | null; utm_campaign: string | null; manual_acquisition_source: string | null; gclid: string | null; gbraid: string | null; wbraid: string | null }
type Offline = { id: string; order_id: string; stage: string; conversion_time: string; value: number; status: string; google_import_status: string; sheet_synced_at: string | null; acquisition: { gclid?: string | null; gbraid?: string | null; wbraid?: string | null } | null; orders: Order | Order[] | null }
type Analytics = { order_id: string; conversion_time: string; status: string; error_code: string | null }
const orderOf = (row: Offline) => Array.isArray(row.orders) ? row.orders[0] : row.orders
const reference = (id: string) => id.slice(0, 8).toUpperCase()
const googleOrigin = (order: Order | null) => Boolean(order && (order.manual_acquisition_source === 'google' || (order.utm_source === 'google' && (order.gclid || order.gbraid || order.wbraid))))
const TONE: Record<GoogleRowState, 'good' | 'info' | 'attention' | 'quiet'> = {
  verified: 'good', in_sheet: 'info', waiting: 'info', internal_flag: 'attention', adjustment: 'attention', blocked: 'attention', no_click: 'quiet',
}
const FILTERS: { key: GoogleRowState | 'all'; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'waiting', label: 'Waiting for the Sheet' }, { key: 'in_sheet', label: 'In Sheet, not verified' },
  { key: 'verified', label: 'Verified' }, { key: 'adjustment', label: 'Needs retraction' }, { key: 'blocked', label: 'Blocked' }, { key: 'no_click', label: 'No Google click' },
]
const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

export default async function GoogleConversions({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  await requireAdmin()
  const { state: wanted } = await searchParams
  const db = createUntypedAdminClient()
  const [outbox, analytics, holds, sync] = await Promise.all([
    db.from('google_conversion_outbox').select('id,order_id,stage,conversion_time,value,status,google_import_status,sheet_synced_at,acquisition,orders(id,status,source,utm_source,utm_campaign,manual_acquisition_source,gclid,gbraid,wbraid)').order('conversion_time', { ascending: false }).limit(501),
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
  const stateOf = (r: Offline) => googleRowState(r, blocked(r))
  const shown = rows.slice(0, 500)
  const counts = new Map<GoogleRowState, number>()
  for (const r of shown) counts.set(stateOf(r), (counts.get(stateOf(r)) ?? 0) + 1)
  const active = FILTERS.some(f => f.key === wanted) ? (wanted as GoogleRowState | 'all') : 'all'
  const visible = active === 'all' ? shown : shown.filter(r => stateOf(r) === active)
  const withClick = shown.filter(r => hasGoogleClick(r.acquisition)).length

  return <div className="mx-auto max-w-6xl space-y-6">
    <PageHeader
      title="Google conversions"
      lead="Website and WhatsApp orders share the same consent and hold checks. A Google click is acquisition evidence; it does not prove Google Ads credited the order."
      actions={<>
        <a className="inline-flex min-h-11 items-center rounded-md border border-calico-300 bg-white px-3 text-sm font-semibold text-ink-900 hover:bg-calico-50" href="https://docs.google.com/spreadsheets/d/18rbA__A2xyMk02EjXHqIFCq4g_CRRFlUrdqL9c0butU/edit#gid=2021732675" target="_blank" rel="noopener noreferrer">Open import Sheet</a>
        <a className="inline-flex min-h-11 items-center rounded-md border border-calico-300 bg-white px-3 text-sm font-semibold text-ink-900 hover:bg-calico-50" href="https://ads.google.com/" target="_blank" rel="noopener noreferrer">Open Google Ads</a>
      </>}
    />
    {failed && <p role="alert" className="rounded-md border border-ember-500 bg-calico-100 p-4 text-sm">Some Google records could not be loaded. Counts below may be incomplete; do not treat missing rows as zero.</p>}
    {limited && <p role="status" className="text-sm text-ink-500">Showing the latest 500 records per stream. Counts cover this selection only.</p>}

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Reporting summary">
      <Metric label="Have a Google click" value={withClick} note="Only these can ever be matched in Google Ads" />
      <Metric label="Waiting for the Sheet" value={counts.get('waiting') ?? 0} note="Click id on file, not yet in the import Sheet" />
      <Metric label="In Sheet, not verified" value={counts.get('in_sheet') ?? 0} note="Google Ads has not confirmed them" tone={(counts.get('in_sheet') ?? 0) > 0 ? 'attention' : 'plain'} />
      <Metric label="Held or blocked" value={held.size} note="Explicit holds and don’t-send orders" />
    </section>
    <p className="m-0 text-xs text-ink-500">Last verified Sheet sync: {last?.completed_at ? `${dualTimeText(last.completed_at)} (${last.verified_count} rows verified in that run)` : 'none recorded'}.</p>

    <Panel title="Two separate Google routes">
      <ul className="m-0 list-disc space-y-1.5 pl-5 text-sm text-ink-700">
        <li><strong>Website Purchase tag:</strong> the primary Google Ads action. It fires in the customer’s browser at checkout and is not driven by this page. Check its count in Google Ads; it is not listed here.</li>
        <li><strong>Confirmed / Delivered import:</strong> for orders finished off the website (WhatsApp, phone) that began with a Google click. These are secondary actions and are what the table below tracks. Do not add their value to the website Purchase figure: the same order can appear in both.</li>
        <li><strong>In Sheet is not accepted.</strong> A row read back from the import Sheet only means it is ready. Accepted means Google Ads shows it under Goals → Uploads. Older internal “accepted” flags are shown as internal flags, not Google’s word.</li>
        <li>Cancelled orders already imported need a retraction in Google Ads. Holds stop future sends; they cannot undo an earlier one.</li>
      </ul>
    </Panel>

    {held.size > 0 && <Panel title="Explicit conversion holds"><ul className="m-0 flex list-none flex-wrap gap-2 p-0">{Array.from(held).slice(0, 5000).map(([id, state]) => <li key={id}><Link href={`/admin/orders/${id}`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-calico-300 px-3 text-sm hover:bg-calico-50"><strong>{reference(id)}</strong> {state.replaceAll('_', ' ')}</Link></li>)}</ul></Panel>}

    <Panel title="Offline confirmed and delivered orders">
      <nav aria-label="Filter by state" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const n = f.key === 'all' ? shown.length : counts.get(f.key) ?? 0
          const on = active === f.key
          return <Link key={f.key} href={f.key === 'all' ? '/admin/google' : `/admin/google?state=${f.key}`} aria-current={on ? 'true' : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-pill border px-4 text-sm font-semibold ${on ? 'border-ink-900 bg-ink-900 text-white' : 'border-calico-300 bg-white text-ink-700 hover:bg-calico-50'}`}>{f.label} <span className="tabular-nums opacity-70">{n}</span></Link>
        })}
      </nav>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm"><thead><tr className="text-xs uppercase tracking-wider text-ink-500"><th scope="col" className="pb-2 pr-3">Order</th><th scope="col" className="pb-2 pr-3">Stage / time (UK · PK)</th><th scope="col" className="pb-2 pr-3">Value</th><th scope="col" className="pb-2 pr-3">Source evidence</th><th scope="col" className="pb-2 pr-3">State</th><th scope="col" className="pb-2">Review</th></tr></thead>
          <tbody>{visible.map(r => { const order = orderOf(r); const st = stateOf(r); return <tr className="border-t border-calico-300 align-top" key={r.id}>
            <th scope="row" className="py-3 pr-3 font-mono">{reference(r.order_id)}<span className="block font-sans text-xs font-normal text-ink-500">{order?.status ?? 'Order unavailable'}</span></th>
            <td className="py-3 pr-3 capitalize">{r.stage}<span className="block text-xs normal-case text-ink-500">{dualTimeText(r.conversion_time)}</span></td>
            <td className="py-3 pr-3 tabular-nums">{gbp.format(Number(r.value))}</td>
            <td className="py-3 pr-3">{order?.utm_source || 'Unattributed'} · {order?.source || 'unknown'}{googleOrigin(order) && <span className="block text-xs font-semibold text-indigo-700">Google acquisition identified</span>}<span className="block break-all text-xs text-ink-500">{order?.utm_campaign || 'No campaign recorded'}</span></td>
            <td className="py-3 pr-3"><Pill tone={TONE[st]}>{GOOGLE_STATE_LABEL[st]}</Pill>
              <span className="mt-1 block text-xs text-ink-500">{held.has(r.order_id) ? `Hold: ${held.get(r.order_id)}` : r.sheet_synced_at ? `Sheet ${dualTimeText(r.sheet_synced_at)}` : 'Not in the Sheet'}</span></td>
            <td className="py-3"><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline" href={`/admin/orders/${r.order_id}`}>Evidence trail</Link></td>
          </tr> })}</tbody></table>
      </div>
      {!visible.length && !outbox.error && <p className="m-0 mt-3 text-sm text-ink-500">{active === 'all' ? 'No offline conversion records.' : 'Nothing in this state.'}</p>}
    </Panel>

    <Panel title="GA4 server purchase transport">
      <p className="m-0 mb-3 text-xs text-ink-500">Transport accepted means Google’s endpoint accepted the request, not that a purchase appeared in GA4 or was credited in Ads.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-xs uppercase tracking-wider text-ink-500"><th scope="col" className="pb-2">Order</th><th scope="col" className="pb-2">Conversion time (UK · PK)</th><th scope="col" className="pb-2">Transport status</th></tr></thead><tbody>
        {deliveries.slice(0, 500).map(r => <tr className="border-t border-calico-300" key={r.order_id}><th scope="row" className="py-3 font-mono">{reference(r.order_id)}</th><td>{dualTimeText(r.conversion_time)}</td><td>{r.status.replaceAll('_', ' ')}{r.error_code ? ` · ${r.error_code}` : ''}</td></tr>)}
      </tbody></table></div>{!deliveries.length && !analytics.error && <p className="m-0 mt-3 text-sm text-ink-500">No GA4 purchase transport records.</p>}
    </Panel>
  </div>
}
