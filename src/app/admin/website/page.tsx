// src/app/admin/website/page.tsx
//
// Admin -> Website (Run 4, 14 Nov 2026): what shoppers did on the site, in
// plain words, for a period, device and source - and where they stopped.
//
// Every number is DISTINCT SESSIONS observed by the first-party tracker
// (admin_website_summary in the database), never events and never "visitors".
// It is not total site traffic: people who block the tracker, leave before it
// loads, or carry on on another device are not in it. Business facts (orders,
// enquiries) come from the order and enquiry tables, real orders only.
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { requireAdmin } from '@/utils/auth'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { getShopSettings } from '@/utils/shopSettingsServer'
import { seasonBar, seasonPhase } from '@/utils/seasonal'
import { dualTimeText } from '@/utils/adminTime'
import {
  SOURCE_LABEL, parseDevice, parsePeriod, parseSource, rate, withParams,
} from '@/utils/websiteReport'
import { Metric, PageHeader, Panel, Pill } from '@/components/Admin/ui/AdminUi'
import PeriodFilters from '@/components/Admin/ui/PeriodFilters'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Website' }

type Totals = Record<string, number>
type Segment = { label: string; sessions: number; cart: number; delivery: number; cart_then_delivery: number; place: number; whatsapp: number; confirmed: number }
type Summary = {
  totals: Totals
  by_device: Segment[]
  by_source: Segment[]
  products: { title: string; slug: string; viewed: number; added: number; whatsapp: number }[]
  landing: { path: string; sessions: number }[]
  first_event_at: string | null
  last_event_at: string | null
  tracking_since: string | null
  rollup_latest?: string | null
}

const n = (v: number | undefined | null) => (v ?? 0).toLocaleString('en-GB')

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <span aria-hidden="true" className="block h-2 w-full rounded-pill bg-calico-100">
      <span className="block h-2 rounded-pill bg-ember-500" style={{ width: `${pct}%` }} />
    </span>
  )
}

export default async function WebsitePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin()
  const sp = await searchParams
  const period = parsePeriod(sp)
  const device = parseDevice(sp.device)
  const source = parseSource(sp.source)
  const params = { period: period.preset, from: period.preset === 'custom' ? period.fromDay : undefined, to: period.preset === 'custom' ? period.toDay : undefined, device: device ?? undefined, source: source ?? undefined }
  const db = createUntypedAdminClient()
  const startIso = period.start.toISOString()
  const endIso = period.end.toISOString()

  const [summaryRes, ordersRes, enquiriesRes, convertedRes, settings] = await Promise.all([
    db.rpc('admin_website_summary', { p_from: startIso, p_to: endIso, p_device: device, p_source: source }),
    db.from('orders').select('status, channel, source').eq('is_test', false).gte('created_at', startIso).lt('created_at', endIso).limit(5000),
    // Counted in the database, not fetched: a long period has more rows than one response carries.
    db.from('whatsapp_enquiries').select('id', { count: 'exact', head: true }).gte('created_at', startIso).lt('created_at', endIso),
    db.from('whatsapp_enquiries').select('id', { count: 'exact', head: true }).gte('created_at', startIso).lt('created_at', endIso).not('converted_order_id', 'is', null),
    getShopSettings(),
  ])
  const summary = (summaryRes.data ?? null) as Summary | null
  const t: Totals = summary?.totals ?? {}
  const orders = (ordersRes.data ?? []) as { status: string | null; channel: string | null; source: string | null }[]
  const enquiryCount = enquiriesRes.error ? null : enquiriesRes.count ?? 0
  const convertedCount = convertedRes.error ? null : convertedRes.count ?? 0
  const statusCount = (s: string) => orders.filter(o => (o.status ?? 'pending_cod') === s).length
  const phase = seasonPhase(new Date())
  const barWithOffer = seasonBar(phase, true)
  const barWithout = seasonBar(phase, false)
  const journeysLink = `/admin/journeys?from=${period.fromDay}&to=${period.toDay}${device ? `&device=${device}` : ''}${source ? `&source=${source}` : ''}`

  const funnel: { stage: string; value: number; of?: number; ofLabel?: string; note: string }[] = [
    { stage: 'Viewed a product', value: t.product_sessions ?? 0, note: 'Opened at least one product page.' },
    { stage: 'Added to basket', value: t.added_sessions ?? 0, of: t.product_sessions, ofLabel: 'of product viewers', note: 'The basket accepted an item.' },
    { stage: 'Opened the basket', value: t.cart_sessions ?? 0, note: 'Saw the first checkout step.' },
    { stage: 'Reached delivery details', value: t.cart_then_delivery ?? 0, of: t.cart_sessions, ofLabel: 'of basket openers', note: 'Same session went from basket to the delivery form.' },
    { stage: 'Started typing details', value: t.delivery_typed ?? 0, of: t.delivery_sessions, ofLabel: 'of delivery viewers', note: 'Typed in at least one field.' },
    { stage: 'Pressed Place order', value: t.delivery_then_place ?? 0, of: t.delivery_sessions, ofLabel: 'of delivery viewers', note: 'Same session.' },
    { stage: 'Website order saved', value: t.order_saved_sessions ?? 0, note: 'The order reached the database.' },
  ]
  const maxStage = Math.max(1, ...funnel.map(f => f.value))

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Website"
        lead={<>What shoppers did on the site and where they stopped. Counts are <strong>sessions observed by our own tracker</strong>{summary?.tracking_since ? ` (recording since ${new Date(summary.tracking_since).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, kept 90 days)` : ''}: not every visitor, and never ad-platform numbers.</>}
        actions={<a href="https://www.uksofashop.co.uk/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-md border border-calico-300 bg-white px-3 text-sm font-semibold text-ink-900 hover:bg-calico-50">Open the shop</a>}
      />

      <PeriodFilters base="/admin/website" period={period} params={params} device={device} source={source} />

      {summaryRes.error && <p role="alert" className="rounded-md border border-ember-500 bg-calico-100 p-4 text-sm">The website figures could not be loaded just now. Nothing below is a zero; it is unknown.</p>}
      {summary && <p className="m-0 text-xs text-ink-500">Figures refresh every 15 minutes (latest activity included: {summary.rollup_latest ? dualTimeText(summary.rollup_latest) : 'none yet'}). Sessions count on the UK day they started; only shoppers who accepted analytics are recorded.</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Headline figures">
        <Metric label="Sessions" value={summaryRes.error ? null : n(t.sessions)} note={`${n(t.page_views)} page views`} />
        <Metric label="Viewed a product" value={summaryRes.error ? null : n(t.product_sessions)} note={`${rate(t.product_sessions, t.sessions)} of sessions`} />
        <Metric label="Tapped WhatsApp" value={summaryRes.error ? null : n(t.whatsapp_sessions)} note={`${n(t.whatsapp_then_confirmed)} of these sessions later had a confirmed order`} href="/admin/leads?tab=enquiries" />
        <Metric label="Website orders saved" value={summaryRes.error ? null : n(t.order_saved_sessions)} note={`${n(t.order_confirmed_sessions)} sessions linked to a confirmed order (any route)`} href={withParams('/admin/orders', {}, { status: 'all' })} />
      </section>

      <Panel title="Buying journey on the website (same session)" aside={<Link href={journeysLink} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-indigo-700 underline">Investigate raw events <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-wider text-ink-500"><th scope="col" className="pb-2 pr-3">Stage</th><th scope="col" className="pb-2 pr-3 text-right">Sessions</th><th scope="col" className="w-1/3 pb-2 pr-3">&nbsp;</th><th scope="col" className="pb-2">Progress</th></tr></thead>
            <tbody>
              {funnel.map(f => (
                <tr key={f.stage} className="border-t border-calico-300 align-top">
                  <th scope="row" className="py-2.5 pr-3 font-semibold text-ink-900">{f.stage}<span className="block text-xs font-normal text-ink-500">{f.note}</span></th>
                  <td className="py-2.5 pr-3 text-right tabular-nums font-bold">{n(f.value)}</td>
                  <td className="py-2.5 pr-3 align-middle"><Bar value={f.value} max={maxStage} /></td>
                  <td className="py-2.5 text-ink-700">{f.of !== undefined ? <><strong className="tabular-nums">{rate(f.value, f.of)}</strong> <span className="text-ink-500">{f.ofLabel}</span></> : <span className="text-ink-500">–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-calico-300 bg-calico-50 p-3 text-sm">
            <p className="m-0 font-bold text-ink-900">{n(t.delivery_left_untouched)} left the delivery form untouched</p>
            <p className="m-0 mt-1 text-xs text-ink-500">Saw delivery details, typed nothing, no WhatsApp, no order in that session.</p>
          </div>
          <div className="rounded-md border border-calico-300 bg-calico-50 p-3 text-sm">
            <p className="m-0 font-bold text-ink-900">{n(t.checkout_whatsapp_sessions)} switched to WhatsApp from checkout</p>
            <p className="m-0 mt-1 text-xs text-ink-500">A chosen route, not a loss: WhatsApp orders are taken by staff.</p>
          </div>
          <div className="rounded-md border border-calico-300 bg-calico-50 p-3 text-sm">
            <p className="m-0 font-bold text-ink-900">{n(t.validation_error_sessions)} met a form error</p>
            <p className="m-0 mt-1 text-xs text-ink-500">Sessions with a checkout validation message.</p>
          </div>
        </div>
        <p className="m-0 mt-3 text-xs text-ink-500">
          Read the stages as &ldquo;this session did it at least once&rdquo;. A session that did not reach the next stage may have come back later, moved to WhatsApp or another device: this is observed behaviour, not proven abandonment.
        </p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        {([['By device', summary?.by_device ?? [], 'device'], ['By source', summary?.by_source ?? [], 'source']] as const).map(([title, rows, key]) => (
          <Panel key={title} title={title}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wider text-ink-500"><th scope="col" className="pb-2 pr-2">{key === 'device' ? 'Device' : 'Source'}</th><th scope="col" className="pb-2 pr-2 text-right">Sessions</th><th scope="col" className="pb-2 pr-2 text-right">Basket</th><th scope="col" className="pb-2 pr-2 text-right">→ Delivery</th><th scope="col" className="pb-2 pr-2 text-right">WhatsApp</th><th scope="col" className="pb-2 text-right">Confirmed</th></tr></thead>
                <tbody>{rows.map(r => (
                  <tr key={r.label} className="border-t border-calico-300">
                    <th scope="row" className="py-2 pr-2"><Link className="font-semibold text-indigo-700 underline" href={withParams('/admin/website', params, { [key]: r.label })}>{key === 'source' ? SOURCE_LABEL[r.label] ?? r.label : r.label}</Link></th>
                    <td className="py-2 pr-2 text-right tabular-nums">{n(r.sessions)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{n(r.cart)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{n(r.cart_then_delivery)} <span className="text-xs text-ink-500">({rate(r.cart_then_delivery, r.cart)})</span></td>
                    <td className="py-2 pr-2 text-right tabular-nums">{n(r.whatsapp)}</td>
                    <td className="py-2 text-right tabular-nums">{n(r.confirmed)}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && <p className="m-0 text-sm text-ink-500">No sessions in this view.</p>}
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Most viewed products">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wider text-ink-500"><th scope="col" className="pb-2 pr-2">Product</th><th scope="col" className="pb-2 pr-2 text-right">Viewed</th><th scope="col" className="pb-2 pr-2 text-right">Added</th><th scope="col" className="pb-2 text-right">WhatsApp</th></tr></thead>
              <tbody>{(summary?.products ?? []).map(p => (
                <tr key={p.slug} className="border-t border-calico-300">
                  <th scope="row" className="py-2 pr-2 font-semibold text-ink-900">{p.title}</th>
                  <td className="py-2 pr-2 text-right tabular-nums">{n(p.viewed)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{n(p.added)} <span className="text-xs text-ink-500">({rate(p.added, p.viewed)})</span></td>
                  <td className="py-2 text-right tabular-nums">{n(p.whatsapp)}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
          <p className="m-0 mt-2 text-xs text-ink-500">Sessions that viewed each product, added it, or tapped WhatsApp on its page.</p>
        </Panel>
        <Panel title="Where sessions started">
          <ul className="m-0 list-none divide-y divide-calico-300 p-0 text-sm">
            {(summary?.landing ?? []).map(l => (
              <li key={l.path} className="flex items-baseline justify-between gap-3 py-2"><span className="min-w-0 break-all text-ink-900">{l.path || '/'}</span><span className="shrink-0 tabular-nums font-semibold">{n(l.sessions)}</span></li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Orders and enquiries in this period">
          <p className="m-0 mb-3 text-xs text-ink-500">From the order and enquiry records, real orders only, by the day the order was created. Not filtered by device or source.</p>
          <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 text-sm">
            {([['Orders placed', orders.length, 'all'], ['Waiting to confirm', statusCount('pending_cod'), 'pending_cod'], ['Confirmed', statusCount('confirmed'), 'confirmed'], ['Delivered', statusCount('delivered'), 'delivered'], ['Cancelled', statusCount('cancelled'), 'cancelled'], ['On hold', statusCount('on_hold'), 'on_hold']] as const).map(([label, value, status]) => (
              <li key={label}><Link href={`/admin/orders?status=${status}`} className="flex min-h-11 items-center justify-between rounded-md border border-calico-300 px-3 hover:bg-calico-50"><span>{label}</span><strong className="tabular-nums">{value}</strong></Link></li>
            ))}
          </ul>
          <p className="m-0 mt-3 text-sm text-ink-700">
            <Link href="/admin/leads?tab=enquiries" className="font-semibold text-indigo-700 underline">{enquiryCount ?? 'Unknown'} WhatsApp enquiries recorded</Link>
            {' '}· {convertedCount ?? 'unknown'} became an order. The order lists show today&apos;s status, not the status on the day.
          </p>
        </Panel>
        <Panel title="Seasonal pages and offer (read only)">
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-ink-500">Season</dt><dd className="m-0">{phase === 'off' ? 'No seasonal message today' : <Pill tone="info">{phase.replace('_', ' ')}</Pill>}</dd>
            <dt className="text-ink-500">Top bar, offer holders</dt><dd className="m-0">{barWithOffer ? `${barWithOffer.lead} · ${barWithOffer.cta} → ${barWithOffer.href}` : 'Standard message'}</dd>
            <dt className="text-ink-500">Top bar, everyone else</dt><dd className="m-0">{barWithout ? `${barWithout.lead} · ${barWithout.cta} → ${barWithout.href}` : 'Standard message'}</dd>
            <dt className="text-ink-500">Visitor offer</dt><dd className="m-0">£{settings.tierAmounts.STANDARD} / £{settings.tierAmounts.ROMA} / £{settings.tierAmounts.ELECTRIC} by sofa tier, {settings.offerWindowHours} hours from first visit, sofas £{settings.offerMinPrice}+</dd>
          </dl>
          <p className="m-0 mt-3 flex flex-wrap gap-2 text-sm">
            {['/black-friday', '/christmas', '/shop/all'].map(href => <a key={href} href={`https://www.uksofashop.co.uk${href}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-md border border-calico-300 px-3 font-semibold text-ink-900 hover:bg-calico-50">Preview {href}</a>)}
          </p>
          <p className="m-0 mt-2 text-xs text-ink-500">Offer amounts and the window are changed only in <Link href="/admin/settings" className="underline">Settings</Link>; nothing here edits prices or offers.</p>
        </Panel>
      </div>
    </div>
  )
}
