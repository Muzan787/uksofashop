import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/utils/auth'
import { aggregateJourneys, loadJourneyReport, loadJourneyLifecycle, stageOf } from '@/utils/journeyReport'
import { JOURNEY_KINDS, PAGE_TYPES } from '@/utils/journeyContract'
export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Journey Analytics',robots:{index:false,follow:false}}
export default async function Journeys({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  await requireAdmin()
  const sp=await searchParams
  const report=await loadJourneyReport(sp)
  const rows=report.rows, sessions=new Set(rows.map(r=>r.session_key)).size
  const lifecycle=await loadJourneyLifecycle(rows)
  const funnelCount=(key:'cart_attempted'|'cart_updated'|'checkout_started'|'whatsapp_clicked'|'enquiry_recorded'|'order_linked'|'order_confirmed'|'order_delivered')=>new Set(lifecycle.rows.filter(r=>r[key]).map(r=>r.session_key)).size
  const groups=[
    ['Source / campaign',aggregateJourneys(rows,r=>r.source+' / '+(r.campaign||'unattributed'))],
    ['Product engagement',aggregateJourneys(rows,r=>r.product_id||'No product context')],
    ['CTA position and outcome',aggregateJourneys(rows.filter(r=>r.cta_position),r=>r.cta_position+' / '+r.event)],
    ['Scroll depth',aggregateJourneys(rows.filter(r=>r.scroll_percent),r=>r.page_path+' / '+r.scroll_percent+'%')],
    ['Fabric / configuration',aggregateJourneys(rows.filter(r=>stageOf(r.event)==='configuration'),r=>r.event+' / '+(r.option_code||'no catalogue code'))],
    ['Cart progression',aggregateJourneys(rows.filter(r=>stageOf(r.event)==='cart'),r=>r.event+' / '+(r.cta_position||'other'))],
    ['Checkout progression',aggregateJourneys(rows.filter(r=>stageOf(r.event)==='checkout'),r=>r.event+' / '+(r.step||r.error_code||''))],
    ['WhatsApp / phone',aggregateJourneys(rows.filter(r=>stageOf(r.event)==='enquiry'),r=>r.event+' / '+(r.cta_position||'other'))],
    ['Device',aggregateJourneys(rows,r=>r.device)],
    ['Navigation',aggregateJourneys(rows.filter(r=>r.destination),r=>r.page_path+' → '+r.destination)],
  ] as const
  const select=(name:string,values:readonly string[])=>(
    <label className="flex flex-col gap-1 text-sm" key={name}>{name.replace('_',' ')}
      <select name={name} defaultValue={sp[name]||''} className="rounded border p-2">
        <option value="">All</option>{values.map(v=><option key={v}>{v}</option>)}
      </select>
    </label>)
  const query=new URLSearchParams(Object.entries(sp).filter((e):e is [string,string]=>!!e[1]))
  return <div className="space-y-6">
    <h1 className="text-3xl font-bold">Journey Analytics</h1>
    <p>Consented website interactions, retained for 90 days. Dates use Pakistan time. Staff tests are excluded. Earlier missing events were not previously instrumented; no history has been invented.</p>
    <form method="get" className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-3">
      <label>From<input className="block w-full rounded border p-2" type="date" name="from" defaultValue={report.from}/></label>
      <label>To<input className="block w-full rounded border p-2" type="date" name="to" defaultValue={report.to}/></label>
      {select('source',['google','meta','direct_or_unattributed','other'])}
      {select('device',['mobile','tablet','desktop'])}{select('page_type',PAGE_TYPES)}
      {select('event',JOURNEY_KINDS)}{select('stage',['engagement','configuration','cart','checkout','enquiry','order'])}
      {['campaign','product','session'].map(name=><label key={name}>{name}<input name={name} defaultValue={sp[name]||''} className="block w-full rounded border p-2"/></label>)}
      <button className="rounded bg-zinc-900 p-3 text-white">Apply filters</button>
    </form>
    {report.error && <p role="alert">{report.error}</p>}
    {report.truncated && <p role="status">Limited to the first 5,000 events. Narrow the date or source filter before interpreting totals.</p>}
    <p>{rows.length.toLocaleString()} events · {sessions.toLocaleString()} masked sessions · {new Set(rows.map(r=>r.page_view_key)).size} page views.
      <Link className="ml-3 underline" href={'/admin/journeys/export?'+query}>Download filtered CSV</Link></p>
    <p>Rates below use observed consented sessions, not all visitors. Session linkage is limited to the established browser identity; cross-device continuity is not inferred.</p>
    <section className="rounded border bg-white p-4"><h2 className="text-lg font-semibold">Session funnel and lawful order association</h2>
      <p>These are established browser-session associations across retained history, not a claim that an interaction caused an order. Confirmed orders are not delivered revenue.</p>
      {lifecycle.error && <p role="status">{lifecycle.error}</p>}
      {lifecycle.limited && <p>Associations cover the first 300 selected sessions. Narrow the filter for complete coverage.</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-4">{(['cart_attempted','cart_updated','checkout_started','whatsapp_clicked','enquiry_recorded','order_linked','order_confirmed','order_delivered'] as const).map(key=><p key={key}>{key.replaceAll('_',' ')}: <strong>{funnelCount(key)}</strong></p>)}</div>
    </section>
    <div className="grid gap-4 lg:grid-cols-2">{groups.map(([title,buckets])=><section key={title} className="overflow-auto rounded border bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <table className="w-full text-sm"><thead><tr><th className="text-left">Interaction</th><th>Events</th><th>Sessions</th><th>% sessions</th></tr></thead>
        <tbody>{buckets.map(b=><tr key={b.label} className="border-t"><td className="break-all py-2">{b.label}</td><td className="text-center">{b.events}</td><td className="text-center">{b.sessions}</td><td className="text-center">{sessions?(100*b.sessions/sessions).toFixed(1):'0'}%</td></tr>)}</tbody>
      </table>{!buckets.length && <p>No measured events in this selection.</p>}
    </section>)}</div>
    <section className="overflow-auto rounded border bg-white p-4"><h2 className="text-lg font-semibold">Masked journey sequence</h2>
      <p>Select a masked session below for its full measured path. An exit is an observation, not proof of permanent abandonment.</p>
      <table className="w-full text-sm"><thead><tr><th>PKT</th><th>Session</th><th>Page</th><th>Event</th><th>Detail</th></tr></thead><tbody>
        {rows.slice(0,200).map((r,i)=><tr key={i} className="border-t"><td className="p-2">{new Date(r.created_at).toLocaleString('en-GB',{timeZone:'Asia/Karachi'})}</td>
          <td><Link className="underline" href={'?'+new URLSearchParams({...Object.fromEntries(query),session:r.session_key})}>{r.session_key}</Link></td>
          <td>{r.page_path}</td><td>{r.event}</td><td>{r.option_code||r.step||r.cta_position||r.section||r.outcome||''}</td></tr>)}
      </tbody></table>
    </section>
  </div>
}
