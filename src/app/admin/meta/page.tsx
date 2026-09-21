import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock3, Radio, ShoppingCart, Truck } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import MetaConversionButton from '@/app/admin/orders/MetaConversionButton'

export const metadata: Metadata = { title: 'Meta' }

type Stage = 'all' | 'purchase' | 'delivered'
type SignalState = 'all' | 'sent' | 'pending'

type MetaOrder = {
  id: string
  customer_name: string
  status: string | null
  total_amount: number | null
  created_at: string
  confirmed_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  purchase_event_sent_at: string | null
  delivered_event_sent_at: string | null
  utm_source: string | null
  utm_campaign: string | null
  manual_acquisition_source: string | null
  manual_acquisition_note: string | null
  source: string | null
  cancellation_reason: string | null
}

type SearchParams = Promise<{ stage?: string; state?: string }>

const UK_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function isQa(order: MetaOrder): boolean {
  return (
    order.utm_campaign === 'offer-test' ||
    /(?:^|\b)(?:test|testing|qa)(?:\b|$)/i.test(order.cancellation_reason ?? '')
  )
}

function purchaseEligible(order: MetaOrder): boolean {
  return Boolean(order.confirmed_at) && order.status !== 'cancelled' && !isQa(order)
}

function deliveredEligible(order: MetaOrder): boolean {
  return order.status === 'delivered' && Boolean(order.delivered_at) && !isQa(order)
}

function purchasePending(order: MetaOrder): boolean {
  return purchaseEligible(order) && !order.purchase_event_sent_at
}

function deliveredPending(order: MetaOrder): boolean {
  return deliveredEligible(order) && !order.delivered_event_sent_at
}

function metaAttributedForAdmin(order: MetaOrder): boolean {
  return (
    order.utm_source === 'meta' ||
    order.manual_acquisition_source === 'meta' ||
    Boolean(order.purchase_event_sent_at) ||
    Boolean(order.delivered_event_sent_at)
  )
}

function attributionTitle(order: MetaOrder): string {
  if (order.manual_acquisition_source === 'meta') {
    return order.manual_acquisition_note ?? 'Staff-confirmed Meta acquisition source'
  }
  if (order.utm_source === 'meta') return 'Tracked Meta acquisition source'
  if (order.purchase_event_sent_at || order.delivered_event_sent_at) {
    return 'A Meta conversion signal has been sent for this order; raw acquisition tracking may be missing.'
  }
  return 'No Meta attribution or Meta conversion signal is recorded.'
}

function sourceLabel(source: string | null): string {
  if (source === 'whatsapp') return 'WhatsApp'
  if (source === 'website') return 'Website'
  return source || 'Unknown'
}

function shortRef(id: string): string {
  return id.slice(0, 8).toUpperCase()
}

function money(value: number | null): string {
  return '£' + Number(value ?? 0).toFixed(2)
}

function signalTime(value: string | null): string | null {
  if (!value) return null
  return UK_TIME.format(new Date(value)) + ' UK'
}

function signalStatus(
  order: MetaOrder,
  kind: 'purchase' | 'delivered',
): { label: string; tone: string; note: string } {
  const sentAt = kind === 'purchase' ? order.purchase_event_sent_at : order.delivered_event_sent_at
  if (sentAt) {
    return {
      label: 'Sent',
      tone: 'border-green-200 bg-green-50 text-green-700',
      note: signalTime(sentAt) ?? '',
    }
  }

  if (isQa(order)) {
    return {
      label: 'Blocked',
      tone: 'border-violet-200 bg-violet-50 text-violet-700',
      note: 'QA / test order',
    }
  }

  if (order.status === 'cancelled') {
    return {
      label: 'Blocked',
      tone: 'border-red-200 bg-red-50 text-red-700',
      note: 'Cancelled order',
    }
  }

  if (kind === 'purchase') {
    return purchaseEligible(order)
      ? {
          label: 'Pending',
          tone: 'border-amber-200 bg-amber-50 text-amber-700',
          note: 'Confirmed and ready to send',
        }
      : {
          label: 'Not ready',
          tone: 'border-stone-200 bg-stone-50 text-stone-600',
          note: 'Confirm the order first',
        }
  }

  return deliveredEligible(order)
    ? {
        label: 'Pending',
        tone: 'border-amber-200 bg-amber-50 text-amber-700',
        note: 'Delivered and ready to send',
      }
    : {
        label: 'Not ready',
        tone: 'border-stone-200 bg-stone-50 text-stone-600',
        note: 'Mark the order Delivered first',
      }
}

export default async function MetaAdminPage(props: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const sp = await props.searchParams

  const stage: Stage =
    sp.stage === 'purchase' || sp.stage === 'delivered' ? sp.stage : 'all'
  const state: SignalState =
    stage !== 'all' && (sp.state === 'sent' || sp.state === 'pending') ? sp.state : 'all'

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, customer_name, status, total_amount, created_at, confirmed_at, delivered_at, cancelled_at, purchase_event_sent_at, delivered_event_sent_at, utm_source, utm_campaign, manual_acquisition_source, manual_acquisition_note, source, cancellation_reason',
    )
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    return (
      <div className="rounded-sm border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        Could not load Meta conversion state: {error.message}
      </div>
    )
  }

  const orders = (data ?? []) as MetaOrder[]

  const purchaseSent = orders.filter(o => Boolean(o.purchase_event_sent_at))
  const purchasePendingRows = orders.filter(purchasePending)
  const deliveredSent = orders.filter(o => Boolean(o.delivered_event_sent_at))
  const deliveredPendingRows = orders.filter(deliveredPending)

  let visible = orders.filter(order => {
    if (stage === 'purchase') {
      if (state === 'sent') return Boolean(order.purchase_event_sent_at)
      if (state === 'pending') return purchasePending(order)
      return purchaseEligible(order) || Boolean(order.purchase_event_sent_at)
    }

    if (stage === 'delivered') {
      if (state === 'sent') return Boolean(order.delivered_event_sent_at)
      if (state === 'pending') return deliveredPending(order)
      return deliveredEligible(order) || Boolean(order.delivered_event_sent_at)
    }

    return true
  })

  // In the all view, the things needing action rise to the top. Inside a
  // signal-specific view, newest-first is easier to scan.
  if (stage === 'all') {
    visible = [...visible].sort((a, b) => {
      const rank = (order: MetaOrder) =>
        deliveredPending(order) ? 0 : purchasePending(order) ? 1 : 2
      const rankDiff = rank(a) - rank(b)
      if (rankDiff !== 0) return rankDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  const stageHref = (nextStage: Stage) =>
    nextStage === 'all' ? '/admin/meta' : `/admin/meta?stage=${nextStage}`
  const stateHref = (nextState: SignalState) =>
    `/admin/meta?stage=${stage}&state=${nextState}`

  return (
    <div className="mx-auto max-w-6xl space-y-6 lg:space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Radio className="h-6 w-6 text-blue-700" />
          <h1 className="m-0 text-2xl font-bold tracking-tight text-stone-900 lg:text-3xl">
            Meta
          </h1>
        </div>
        <p className="m-0 mt-2 max-w-3xl text-sm leading-relaxed text-stone-500">
          Order-linked Meta conversion control. Purchase becomes eligible only after the order is confirmed.
          Delivered becomes eligible only after the order is actually delivered.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/admin/meta"
          className="rounded-md border border-stone-200 bg-white p-4 transition hover:border-stone-300"
        >
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">All orders</p>
          <p className="m-0 mt-2 text-2xl font-bold text-stone-900">{orders.length}</p>
          <p className="m-0 mt-1 text-xs text-stone-500">Full order-linked Meta view</p>
        </Link>

        <Link
          href="/admin/meta?stage=purchase&state=pending"
          className={`rounded-md border p-4 transition ${
            purchasePendingRows.length
              ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
              : 'border-stone-200 bg-white hover:border-stone-300'
          }`}
        >
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Meta purchase pending</p>
          <p className="m-0 mt-2 text-2xl font-bold text-stone-900">{purchasePendingRows.length}</p>
          <p className="m-0 mt-1 text-xs text-stone-600">Confirmed but Purchase not sent</p>
        </Link>

        <Link
          href="/admin/meta?stage=delivered&state=pending"
          className={`rounded-md border p-4 transition ${
            deliveredPendingRows.length
              ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
              : 'border-stone-200 bg-white hover:border-stone-300'
          }`}
        >
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Meta delivered pending</p>
          <p className="m-0 mt-2 text-2xl font-bold text-stone-900">{deliveredPendingRows.length}</p>
          <p className="m-0 mt-1 text-xs text-stone-600">Delivered but OrderDelivered not sent</p>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Purchase signals</p>
              <p className="m-0 mt-1 text-sm font-semibold text-stone-800">
                {purchaseSent.length} sent · {purchasePendingRows.length} pending
              </p>
            </div>
            <ShoppingCart className="h-5 w-5 text-blue-700" />
          </div>
        </div>
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-green-700">Delivered signals</p>
              <p className="m-0 mt-1 text-sm font-semibold text-stone-800">
                {deliveredSent.length} sent · {deliveredPendingRows.length} pending
              </p>
            </div>
            <Truck className="h-5 w-5 text-green-700" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          {([
            ['all', 'All'],
            ['purchase', 'Purchase'],
            ['delivered', 'Delivered'],
          ] as const).map(([key, label]) => (
            <Link
              key={key}
              href={stageHref(key)}
              className={`shrink-0 rounded-sm px-4 py-2.5 text-xs font-bold transition ${
                stage === key
                  ? 'bg-stone-900 text-white'
                  : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {stage !== 'all' && (
          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {([
              ['all', 'All'],
              ['sent', 'Sent'],
              ['pending', 'Pending'],
            ] as const).map(([key, label]) => (
              <Link
                key={key}
                href={stateHref(key)}
                className={`shrink-0 rounded-pill px-3.5 py-2 text-xs font-bold transition ${
                  state === key
                    ? stage === 'purchase'
                      ? 'bg-blue-700 text-white'
                      : 'bg-green-700 text-white'
                    : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {visible.map(order => {
          const purchase = signalStatus(order, 'purchase')
          const delivered = signalStatus(order, 'delivered')
          const attributed = metaAttributedForAdmin(order)

          return (
            <div
              key={order.id}
              className={`rounded-md border bg-white p-4 shadow-sm sm:p-5 ${
                deliveredPending(order)
                  ? 'border-amber-300'
                  : purchasePending(order)
                    ? 'border-blue-200'
                    : 'border-stone-200'
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-stone-500">#{shortRef(order.id)}</span>
                    <span className="rounded-pill border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                      {sourceLabel(order.source)}
                    </span>
                    {attributed && (
                      <span
                        title={attributionTitle(order)}
                        className="rounded-pill border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700"
                      >
                        Meta attributed
                      </span>
                    )}
                    {isQa(order) && (
                      <span className="rounded-pill border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                        QA / test
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="m-0 text-lg font-bold text-stone-900">{order.customer_name}</p>
                    <p className="m-0 text-lg font-bold text-stone-900">{money(order.total_amount)}</p>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                    <span className="font-semibold capitalize text-stone-700">
                      {(order.status ?? 'pending_cod').replace('_', ' ')}
                    </span>
                    <span>{UK_TIME.format(new Date(order.created_at))} UK</span>
                  </div>
                </div>

                <Link
                  href={`/admin/orders?status=all#${order.id}`}
                  className="shrink-0 text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  Open in Orders →
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-sm border border-stone-200 bg-stone-50 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
                        <ShoppingCart className="h-4 w-4 text-blue-700" /> Purchase
                      </p>
                      <p className="m-0 mt-1 text-[11px] leading-relaxed text-stone-500">{purchase.note}</p>
                    </div>
                    <span className={`rounded-pill border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${purchase.tone}`}>
                      {purchase.label}
                    </span>
                  </div>

                  {purchasePending(order) && (
                    <div className="mt-3">
                      <MetaConversionButton
                        orderId={order.id}
                        kind="purchase"
                        label="Send Purchase to Meta"
                        className="w-full rounded-sm bg-blue-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  )}

                  {order.purchase_event_sent_at && order.status === 'cancelled' && (
                    <div className="mt-3 flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-red-800">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Purchase was sent before cancellation. Do not count it as current revenue.
                    </div>
                  )}
                </div>

                <div className="rounded-sm border border-stone-200 bg-stone-50 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
                        <Truck className="h-4 w-4 text-green-700" /> Delivered
                      </p>
                      <p className="m-0 mt-1 text-[11px] leading-relaxed text-stone-500">{delivered.note}</p>
                    </div>
                    <span className={`rounded-pill border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${delivered.tone}`}>
                      {delivered.label}
                    </span>
                  </div>

                  {deliveredPending(order) && (
                    <div className="mt-3">
                      <MetaConversionButton
                        orderId={order.id}
                        kind="delivered"
                        label="Send Delivered to Meta"
                        className="w-full rounded-sm bg-green-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      {!order.purchase_event_sent_at && (
                        <p className="m-0 mt-1.5 text-[10px] leading-relaxed text-stone-500">
                          Purchase is still unsent. This action sends Purchase first, then OrderDelivered.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {visible.length === 0 && (
          <div className="rounded-md border border-stone-200 bg-white py-12 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
            <p className="m-0 mt-3 text-lg font-bold text-stone-900">Nothing pending here</p>
            <p className="m-0 mt-1 text-sm text-stone-500">
              This filter has no orders requiring a Meta action.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-md border border-stone-200 bg-stone-50 p-4 text-xs leading-relaxed text-stone-600">
        <p className="m-0 flex items-start gap-2">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
          <span>
            <strong className="text-stone-800">Pending means eligible but unsent.</strong>{' '}
            A fresh COD submission is not a Purchase just because an order row exists. Purchase becomes actionable
            after confirmation; OrderDelivered becomes actionable after delivery. This keeps the Meta queue aligned
            with the real business funnel.
          </span>
        </p>
      </div>
    </div>
  )
}
