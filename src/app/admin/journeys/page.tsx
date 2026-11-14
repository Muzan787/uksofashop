// src/app/admin/journeys/page.tsx
//
// Admin -> Journeys (Run 5, 14 Nov 2026): how shoppers move through the site,
// as charts a member of staff can read, for a period, device and source.
//
// Every figure comes from the 15-minute session rollup through two secure
// database functions (admin_website_summary, admin_journey_daily): distinct
// sessions, the same definitions as Admin -> Website, never truncated, never a
// raw event count. The raw events are one click away in the Technical event
// explorer (/admin/journeys/explorer), which keeps search, CSV and timelines.
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Database } from 'lucide-react'
import { requireAdmin } from '@/utils/auth'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { dualTimeText } from '@/utils/adminTime'
import { parseDevice, parsePeriod, parseSource, rate, withParams } from '@/utils/websiteReport'
import { biggestLoss, type DailyRow, type JourneyOutcomes } from '@/utils/journeyCharts'
import { Metric, PageHeader, Panel, Pill } from '@/components/Admin/ui/AdminUi'
import PeriodFilters from '@/components/Admin/ui/PeriodFilters'
import { FunnelChart, RateBars, StackedBar, TrendChart } from '@/components/Admin/ui/Charts'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Journeys' }

type Totals = Record<string, number>
type Segment = { label: string; sessions: number; cart: number; delivery: number; cart_then_delivery: number; place: number; whatsapp: number; confirmed: number }

export default async function JourneysPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin()
  const sp = await searchParams
  const period = parsePeriod(sp)
  const device = parseDevice(sp.device)
  const source = parseSource(sp.source)
  const params = { period: period.preset, from: period.preset === 'custom' ? period.fromDay : undefined, to: period.preset === 'custom' ? period.toDay : undefined, device: device ?? undefined, source: source ?? undefined }
  const db = createUntypedAdminClient()
  const args = { p_from: period.start.toISOString(), p_to: period.end.toISOString(), p_device: device, p_source: source }
  const [summaryRes, dailyRes] = await Promise.all([
    db.rpc('admin_website_summary', args),
    db.rpc('admin_journey_daily', args),
  ])
  const failed = Boolean(summaryRes.error || dailyRes.error)
  const summary = (summaryRes.data ?? {}) as { totals?: Totals; by_device?: Segment[] }
  const t: Totals = summary.totals ?? {}
  const daily = (dailyRes.data ?? {}) as { days?: DailyRow[]; outcomes?: JourneyOutcomes; refresh?: { last_status?: string; last_end?: string } }
  const days = daily.days ?? []
  const o = daily.outcomes
  const loss = biggestLoss(t)
  const explorer = `/admin/journeys/explorer?from=${period.fromDay}&to=${period.toDay}${device ? `&device=${device}` : ''}${source ? `&source=${source}` : ''}`

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Journeys"
        lead="How shoppers move from a product page to an order, step by step. Counts are sessions our own tracker observed (shoppers who allowed analytics): not every visitor, and not ad-platform numbers."
        actions={<Link href={explorer} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-calico-300 bg-white px-3 text-sm font-semibold text-ink-900 hover:bg-calico-50"><Database className="h-4 w-4" aria-hidden="true" /> Technical event explorer</Link>}
      />
      <PeriodFilters base="/admin/journeys" period={period} params={params} device={device} source={source} />
      {failed && <p role="alert" className="rounded-md border border-ember-500 bg-calico-100 p-4 text-sm">The journey figures could not be loaded just now. Nothing below is a zero; it is unknown. Try again in a minute.</p>}
      {!failed && (
        <p className="m-0 text-xs text-ink-500">
          Figures refresh every 15 minutes{daily.refresh?.last_end ? `; last refresh ${dualTimeText(daily.refresh.last_end)} (${daily.refresh.last_status === 'succeeded' ? 'succeeded' : daily.refresh.last_status ?? 'unknown'})` : ''}. A session counts on the UK day it started. Same numbers as <Link href={withParams('/admin/website', params, {})} className="underline">Website</Link>.
        </p>
      )}

      {!failed && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Headline figures">
          <Metric label="Sessions" value={(t.sessions ?? 0).toLocaleString('en-GB')} note={`${rate(t.product_sessions, t.sessions)} viewed a product`} />
          <Metric label="Reached the basket" value={(t.cart_sessions ?? 0).toLocaleString('en-GB')} note={`${rate(t.cart_sessions, t.product_sessions)} of product viewers`} />
          <Metric label="Reached delivery details" value={(t.delivery_sessions ?? 0).toLocaleString('en-GB')} note={`${rate(t.cart_then_delivery, t.cart_sessions)} of basket openers`} />
          <Metric label="Website orders placed" value={(t.order_saved_sessions ?? 0).toLocaleString('en-GB')} note={`${(t.whatsapp_sessions ?? 0).toLocaleString('en-GB')} sessions tapped WhatsApp`} />
        </section>
      )}

      {loss && !failed && (
        <div className="flex flex-wrap items-start gap-3 rounded-lg border border-indigo-300 bg-indigo-50 p-4">
          <Pill tone="info">Biggest observed loss</Pill>
          <p className="m-0 min-w-0 flex-1 text-sm text-ink-900"><strong>{loss.title}</strong> <span className="text-ink-700">{loss.detail}</span></p>
        </div>
      )}

      <Panel title="The buying journey (same session)">
        <FunnelChart
          caption="Each bar is the number of sessions that did this at least once in the period. The percentage uses the stage named beside it, so each step can be compared fairly."
          stages={[
            { label: 'Viewed a product', value: t.product_sessions ?? 0 },
            { label: 'Added to basket', value: t.added_sessions ?? 0, of: { value: t.product_sessions ?? 0, label: 'of product viewers' } },
            { label: 'Opened the basket', value: t.cart_sessions ?? 0, of: { value: t.product_sessions ?? 0, label: 'of product viewers' } },
            { label: 'Reached delivery details', value: t.cart_then_delivery ?? 0, of: { value: t.cart_sessions ?? 0, label: 'of basket openers' } },
            { label: 'Started typing details', value: t.delivery_typed ?? 0, of: { value: t.delivery_sessions ?? 0, label: 'of delivery viewers' } },
            { label: 'Pressed Place order', value: t.delivery_then_place ?? 0, of: { value: t.delivery_sessions ?? 0, label: 'of delivery viewers' } },
            { label: 'Website order saved', value: t.order_saved_sessions ?? 0, of: { value: t.delivery_then_place ?? 0, label: 'of Place order presses' } },
          ]}
        />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="What happened at the delivery step">
          {o && o.reached_delivery > 0 ? (
            <StackedBar
              total={o.reached_delivery}
              caption={`Of ${o.reached_delivery.toLocaleString('en-GB')} sessions that saw the delivery form. Switching to WhatsApp is a working route, not a loss.`}
              segments={[
                { label: 'placed an order', value: o.placed_order, tone: 'sage' },
                { label: 'switched to WhatsApp', value: o.switched_to_whatsapp, tone: 'indigo', note: `${o.whatsapp_then_confirmed} of these later had a confirmed order` },
                { label: 'typed, then stopped', value: o.typed_then_stopped, tone: 'rust' },
                { label: 'left without typing', value: o.left_untouched, tone: 'ember' },
              ]}
            />
          ) : <p className="m-0 text-sm text-ink-500">No session reached the delivery form in this view.</p>}
          {o && o.form_error > 0 && <p className="m-0 mt-2 text-xs text-ink-500">{o.form_error} of these sessions saw a form error message.</p>}
        </Panel>
        <Panel title="Where each device loses shoppers">
          <RateBars
            caption="Basket → delivery and delivery → Place order, each within the same session. Small numbers (a handful of sessions) move a lot; read the counts in brackets."
            rows={(summary.by_device ?? []).map(d => ({
              label: d.label,
              rates: [
                { label: 'Basket → delivery', part: d.cart_then_delivery, whole: d.cart },
                { label: 'Delivery → Place order', part: d.place, whole: d.delivery },
              ],
            }))}
          />
        </Panel>
      </div>

      <Panel title="Day by day">
        {days.length === 0 ? <p className="m-0 text-sm text-ink-500">No sessions in this view.</p> : (
          <div className="grid gap-6 lg:grid-cols-2">
            <TrendChart
              caption="Sessions that started each UK day, and those that viewed a product."
              days={days.map(d => d.day)}
              series={[
                { label: 'Sessions', values: days.map(d => d.sessions), tone: 'ink' },
                { label: 'Viewed a product', values: days.map(d => d.product), tone: 'indigo' },
              ]}
            />
            <TrendChart
              caption="Checkout steps each UK day, same sessions as the funnel above."
              days={days.map(d => d.day)}
              series={[
                { label: 'Opened basket', values: days.map(d => d.cart), tone: 'ember' },
                { label: 'Reached delivery', values: days.map(d => d.delivery), tone: 'indigo' },
                { label: 'Started typing', values: days.map(d => d.typed), tone: 'rust' },
                { label: 'Placed order', values: days.map(d => d.place), tone: 'sage' },
              ]}
            />
          </div>
        )}
      </Panel>

      <Panel title="Reading these figures">
        <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-ink-700">
          <li>Only shoppers who allowed analytics are recorded; a session on another device or browser is a separate session. The figures show what was observed, not every visitor.</li>
          <li>A session that did not reach the next step may have come back later, phoned or carried on in WhatsApp. It is observed behaviour, not proven abandonment.</li>
          <li>The phone delivery step changed on 14 Nov 2026 (reassurance and WhatsApp link above the first field). Compare &ldquo;started typing&rdquo; for two weeks either side before drawing a conclusion.</li>
        </ul>
        <p className="m-0 mt-3 text-sm"><Link href={explorer} className="inline-flex min-h-11 items-center gap-1 font-semibold text-indigo-700 underline">Look at individual sessions in the Technical event explorer <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></p>
      </Panel>
    </div>
  )
}
