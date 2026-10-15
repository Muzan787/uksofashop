// src/app/admin/meta/TrackingSections.tsx
//
// The tracking sections of Admin -> Meta (admin upgrade N1, N2, N4-N7), drawn
// from plain data so they can be checked with made-up events. The page loads
// them; everything else on it is unchanged.
import Link from 'next/link'
import { AlertTriangle, Check, Minus, X } from 'lucide-react'
import { dualTimeText } from '@/utils/adminTime'
import type { MetaReply } from '@/utils/metaReply'
import type { SetupItem } from '@/utils/trackingSetup'
import type { TrackingMode } from '@/utils/shopSettings'
import TrackingModeSwitch from './TrackingModeSwitch'
import StaffDeviceSwitch from './StaffDeviceSwitch'

export interface LoggedEvent {
  id: number
  created_at: string
  platform: string
  event_name: string
  mode: string
  outcome: string
  order_ref: string | null
  payload: unknown
}

export interface CancelledSentOrder {
  id: string
  customer_name: string
  total_amount: number | null
  purchase_event_sent_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
}

const REPLY_TONE: Record<MetaReply['tone'], string> = {
  ok: 'text-green-800',
  bad: 'text-red-700',
  unclear: 'text-amber-800',
  none: 'text-stone-600',
}

const MODE_LABEL: Record<string, string> = { live: 'Live', test: 'Test', dry_run: 'Dry run' }

const card = 'rounded-md border border-stone-200 bg-white shadow-sm'

/** Meta's reply to the latest attempt, and how many attempts there were (N4). */
export function ReplyLine({ reply }: { reply: MetaReply }) {
  return (
    <p className={`m-0 mt-2 text-[11px] font-semibold leading-relaxed ${REPLY_TONE[reply.tone]}`}>
      {reply.text}
      <span className="font-normal text-stone-500"> {reply.attempts === 1 ? '1 attempt' : `${reply.attempts} attempts`}</span>
    </p>
  )
}

/** N5: Purchases Meta counted for orders cancelled since. */
export function CancelledAfterSending({ orders }: { orders: CancelledSentOrder[] }) {
  if (orders.length === 0) return null
  return (
    <section className="rounded-md border border-red-300 bg-red-50 p-4" aria-labelledby="cancelled-sent-heading">
      <h2 id="cancelled-sent-heading" className="m-0 flex items-center gap-2 text-base font-bold text-red-900">
        <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
        Cancelled after sending ({orders.length})
      </h2>
      <p className="m-0 mt-1 text-sm leading-relaxed text-red-800">
        Meta counted these Purchases before the orders were cancelled, and can’t take them back. Leave them out when you read Meta’s revenue.
      </p>
      <ul className="m-0 mt-3 list-none divide-y divide-red-200 p-0">
        {orders.map(order => (
          <li key={order.id}>
            <Link href={`/admin/orders/${order.id}`} className="block min-h-11 py-2 text-sm text-red-900 hover:underline">
              <span className="font-mono font-bold">{order.id.slice(0, 8).toUpperCase()}</span> · {order.customer_name} · £{Number(order.total_amount ?? 0).toFixed(2)}
              <span className="block text-xs text-red-800">
                Sent {dualTimeText(order.purchase_event_sent_at)} · cancelled {dualTimeText(order.cancelled_at)}
                {order.cancellation_reason ? ` · ${order.cancellation_reason}` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** N2 and N6: the mode, and this device. */
export function ModeAndDevice({ mode, liveServer }: { mode: TrackingMode; liveServer: boolean }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
      <section className={`${card} p-4`} aria-labelledby="mode-heading">
        <h2 id="mode-heading" className="m-0 text-base font-bold text-stone-900">Mode</h2>
        {!liveServer && (
          <p className="m-0 mt-1 text-sm text-amber-800">This server isn’t the live one, so nothing is sent from here in any mode.</p>
        )}
        <div className="mt-3">
          <TrackingModeSwitch mode={mode} />
        </div>
      </section>
      <section className={`${card} p-4`} aria-labelledby="device-heading">
        <h2 id="device-heading" className="m-0 mb-2 text-base font-bold text-stone-900">This device</h2>
        <StaffDeviceSwitch />
      </section>
    </div>
  )
}

/** N1: what's set up, as ticks. */
export function SetupCard({ setup }: { setup: SetupItem[] }) {
  const ready = setup.filter(s => s.state === true).length
  const warn = setup.filter(s => s.state === 'warn').length
  return (
    <details className={card}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="text-base font-bold text-stone-900">What’s set up</span>
        <span className="text-right text-sm text-stone-500">
          {ready} of {setup.length} ready{warn ? ` · ${warn} to look at` : ''}
        </span>
      </summary>
      <ul className="m-0 list-none divide-y divide-stone-100 border-t border-stone-100 p-0">
        {setup.map(item => (
          <li key={item.key} className="flex gap-3 px-4 py-3">
            <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${item.state === true ? 'bg-green-100 text-green-800' : item.state === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'}`}>
              {item.state === true ? <Check className="h-4 w-4" aria-label="Set up" /> : item.state === 'warn' ? <Minus className="h-4 w-4" aria-label="Look at this" /> : <X className="h-4 w-4" aria-label="Not set up" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-stone-900">{item.label}</span>
              <span className="block text-xs leading-relaxed text-stone-600">{item.note}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 border-t border-stone-100 px-4 py-3 text-xs text-stone-500">Ticks only: no ID, token or code is ever shown here.</p>
    </details>
  )
}

const GOOD = new Set(['accepted', 'transport_accepted', 'validated'])
const BAD = new Set(['rejected', 'failed'])

/** N7: the latest events, exactly as built. */
export function LatestEvents({ events }: { events: LoggedEvent[] }) {
  return (
    <details className={card}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="text-base font-bold text-stone-900">Latest events</span>
        <span className="text-sm text-stone-500">{events.length === 40 ? 'Last 40' : events.length} · kept 30 days</span>
      </summary>
      <p className="m-0 border-t border-stone-100 px-4 py-3 text-xs leading-relaxed text-stone-600">
        Every event the server built for Meta and GA4, exactly as built. Personal details are hashed: Meta’s match keys as Meta asks, and the IP address, browser, cookies and GA4 client id in this copy. The tags in a visitor’s browser send their own copies, which Meta’s Events Manager shows.
      </p>
      {events.length === 0 ? (
        <p className="m-0 border-t border-stone-100 px-4 py-3 text-sm text-stone-500">Nothing yet. Events appear here from the first one built after 15 Oct 2026.</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-stone-100 border-t border-stone-100 p-0">
          {events.map(e => (
            <li key={e.id}>
              <details>
                <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-sm">
                  <span className="font-semibold text-stone-900">{e.platform === 'meta' ? 'Meta' : 'GA4'} {e.event_name}</span>
                  {e.order_ref && <span className="font-mono text-xs text-stone-500">{e.order_ref}</span>}
                  <span className={`rounded-pill border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${e.mode === 'live' ? 'border-stone-200 bg-stone-50 text-stone-600' : 'border-violet-200 bg-violet-50 text-violet-700'}`}>{MODE_LABEL[e.mode] ?? e.mode}</span>
                  <span className={`text-xs font-semibold ${GOOD.has(e.outcome) ? 'text-green-800' : BAD.has(e.outcome) ? 'text-red-700' : 'text-stone-600'}`}>{e.outcome.replace(/_/g, ' ')}</span>
                  <span className="w-full text-xs text-stone-500">{dualTimeText(e.created_at)}</span>
                </summary>
                <pre className="m-0 max-h-80 overflow-auto whitespace-pre bg-stone-50 px-4 py-3 text-[11px] leading-relaxed text-stone-800">{JSON.stringify(e.payload, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
