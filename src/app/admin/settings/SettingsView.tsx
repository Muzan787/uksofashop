// src/app/admin/settings/SettingsView.tsx
//
// Admin -> Settings, shown (admin upgrade M1-M4). The page above loads it;
// this draws it from plain data, so it can be checked with made-up figures.
import Link from 'next/link'
import { dualTimeText } from '@/utils/adminTime'
import { gbpFigure, type OfferTier, type ShopSettings } from '@/utils/shopSettings'
import { figuresFromSettings } from '@/utils/shopSettingsForm'
import FiguresForm from './FiguresForm'
import OfferControls from './OfferControls'
import OrderFlowControls from './OrderFlowControls'

export interface OfferCodeRow {
  code: string
  label: string | null
  is_active: boolean
  created_at: string
}

export interface DistanceFee {
  outcode: string
  fee: number
  region: string
  miles: number | null
}

export interface OrderFlowSendRow {
  order_id: string
  sent_at: string
  source: string
  answered_at: string | null
  status_code: number | null
  ok: boolean | null
  outcome: string | null
  message: string | null
  order_number: number | null
  error: string | null
}

export interface OrderFlowStatus {
  connected: boolean
  enabled: boolean
  test_order: { id: string; created_at: string } | null
  sends: OrderFlowSendRow[]
}

export interface SettingsViewProps {
  settings: ShopSettings
  /** True when the row couldn't be read and the boxes show the defaults. */
  settingsMissing: boolean
  updatedAt: string | null
  codes: OfferCodeRow[]
  tierCounts: Record<OfferTier, number>
  fees: DistanceFee[]
  openWindows: number | null
  orderflow: OrderFlowStatus | null
}

const section = 'rounded-md border border-stone-200 bg-white p-4 shadow-sm lg:p-5'
const sectionTitle = 'm-0 text-lg font-bold text-stone-900'
const sectionIntro = 'm-0 mt-1 text-sm text-stone-500'

const SEND_SOURCE: Record<string, string> = {
  change: 'Order change',
  resend: '15-minute re-send',
  by_hand: 'Sent by hand',
  before_recording: 'Before recording began',
}

/** The fee rows, one group per charge and region, dearest last. */
function feeGroups(fees: DistanceFee[]) {
  const groups = new Map<string, { fee: number; region: string; outcodes: string[]; miles: number[] }>()
  for (const f of fees) {
    const key = `${f.fee}|${f.region}`
    const g = groups.get(key) ?? { fee: f.fee, region: f.region, outcodes: [], miles: [] }
    g.outcodes.push(f.outcode)
    if (f.miles !== null) g.miles.push(f.miles)
    groups.set(key, g)
  }
  return [...groups.values()].sort((a, b) => a.fee - b.fee || a.region.localeCompare(b.region))
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export default function SettingsView(props: SettingsViewProps) {
  const { settings, settingsMissing, updatedAt, codes, tierCounts, fees, openWindows, orderflow } = props
  const changed = dualTimeText(updatedAt)
  const groups = feeGroups(fees)

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-in fade-in duration-500">
      <header>
        <h1 className="m-0 text-2xl font-bold tracking-tight text-stone-900 lg:text-3xl">Settings</h1>
        <p className="m-0 mt-1 text-sm text-stone-500">
          The figures checkout charges, the visitor offer and OrderFlow.
          {changed && <> Last changed {changed}.</>}
        </p>
      </header>

      {settingsMissing && (
        <p role="alert" className="m-0 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          The settings couldn&apos;t be read just now, so these boxes show the shop&apos;s defaults. Reload before saving.
        </p>
      )}

      {/* ── M1: the figures ─────────────────────────────────────────────── */}
      <section className={section} aria-labelledby="figures-heading">
        <h2 id="figures-heading" className={sectionTitle}>Figures</h2>
        <p className={sectionIntro}>
          Checkout charges these, and every page that quotes a figure says them. Change one and the next quote uses it.
        </p>
        <div className="mt-4">
          <FiguresForm initial={figuresFromSettings(settings)} tierCounts={tierCounts} />
        </div>
      </section>

      {/* ── M2 and M3: the offer switch and codes ───────────────────────── */}
      <section className={section} aria-labelledby="offer-heading">
        <h2 id="offer-heading" className={sectionTitle}>Visitor offer</h2>
        <p className={sectionIntro}>
          Each new visitor gets a {settings.offerWindowHours}-hour window with money off ({gbpFigure(settings.tierAmounts.ELECTRIC)}, {gbpFigure(settings.tierAmounts.ROMA)} or {gbpFigure(settings.tierAmounts.STANDARD)} by tier). A window never moves and never comes back once it ends.
        </p>
        <div className="mt-4">
          <OfferControls enabled={settings.offerEnabled} openWindows={openWindows} codes={codes} />
        </div>
      </section>

      {/* ── M1: distance fees, shown ────────────────────────────────────── */}
      <section className={section} aria-labelledby="fees-heading">
        <h2 id="fees-heading" className={sectionTitle}>Distance delivery fees</h2>
        <p className={sectionIntro}>
          Delivery is free within 250 miles of Blackburn. {groups.length > 0
            ? `These ${plural(fees.length, 'postcode district pays', 'postcode districts pay')} extra, added at checkout from the postcode.`
            : 'No postcode district pays extra.'}
        </p>
        {groups.length > 0 && (
          <ul className="m-0 mt-3 list-none divide-y divide-stone-100 p-0">
            {groups.map(g => (
              <li key={`${g.fee}-${g.region}`}>
                <details>
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block font-semibold text-stone-900">{g.region}</span>
                      <span className="block text-xs text-stone-500">
                        {plural(g.outcodes.length, 'district', 'districts')}
                        {g.miles.length > 0 && ` · ${Math.min(...g.miles)}-${Math.max(...g.miles)} miles`}
                      </span>
                    </span>
                    <span className="shrink-0 font-bold tabular-nums text-stone-900">{gbpFigure(g.fee)}</span>
                  </summary>
                  <p className="m-0 pb-3 font-mono text-xs leading-relaxed text-stone-600">{g.outcodes.join(' ')}</p>
                </details>
              </li>
            ))}
          </ul>
        )}
        <p className="m-0 mt-3 text-xs text-stone-500">Shown here to check. A change to these is made by hand in Supabase for now.</p>
      </section>

      {/* ── M4: OrderFlow ───────────────────────────────────────────────── */}
      <section className={section} aria-labelledby="orderflow-heading">
        <h2 id="orderflow-heading" className={sectionTitle}>OrderFlow</h2>
        {orderflow === null ? (
          <p className="m-0 mt-2 text-sm text-red-700">OrderFlow&apos;s state couldn&apos;t be read just now. Reload to try again.</p>
        ) : (
          <>
            <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-stone-500">Connected</dt>
              <dd className="m-0 font-semibold">
                {orderflow.connected
                  ? <span className="text-green-800">Yes: its address and key are in Supabase Vault</span>
                  : <span className="text-red-700">No: its address and key aren&apos;t in Supabase Vault</span>}
              </dd>
              <dt className="text-stone-500">Sending</dt>
              <dd className="m-0 font-semibold">
                {orderflow.enabled
                  ? <span className="text-green-800">On: every order goes to OrderFlow</span>
                  : <span className="text-amber-800">Off: orders are kept here but not sent</span>}
              </dd>
            </dl>

            <div className="mt-4">
              <OrderFlowControls
                connected={orderflow.connected}
                enabled={orderflow.enabled}
                testOrderCode={orderflow.test_order ? orderflow.test_order.id.slice(0, 8).toUpperCase() : null}
              />
            </div>

            <h3 className="m-0 mt-5 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Latest sends</h3>
            {orderflow.sends.length === 0 ? (
              <p className="m-0 mt-2 text-sm text-stone-500">Nothing sent yet.</p>
            ) : (
              <ul className="m-0 mt-1 list-none divide-y divide-stone-100 p-0 text-sm">
                {orderflow.sends.map((s, i) => (
                  <li key={`${s.order_id}-${s.sent_at}-${i}`}>
                    <Link href={`/admin/orders/${s.order_id}`} className="flex min-h-12 items-start justify-between gap-2 py-2 hover:bg-stone-50">
                      <span className="min-w-0">
                        <span className="block font-semibold text-stone-900">
                          <span className="font-mono">{s.order_id.slice(0, 8).toUpperCase()}</span>
                          {s.order_number ? <span className="font-normal text-stone-500"> · OrderFlow #{s.order_number}</span> : null}
                        </span>
                        <span className="block break-words text-xs text-stone-500">
                          {dualTimeText(s.sent_at)} · {SEND_SOURCE[s.source] ?? s.source}
                          {s.answered_at !== null && !s.ok && (s.message || s.error) ? ` · ${s.message ?? s.error}` : ''}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-pill border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.answered_at === null ? 'border-stone-200 bg-stone-50 text-stone-600' : s.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                        {s.answered_at === null ? 'Waiting' : s.ok ? (s.outcome === 'created' ? 'Added' : s.outcome === 'updated' ? 'Updated' : 'OK') : 'Refused'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  )
}
