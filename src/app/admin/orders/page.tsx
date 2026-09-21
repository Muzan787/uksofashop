import type { Metadata } from 'next'
// src/app/admin/orders/page.tsx
import { createClient } from '@/utils/supabase/server'
import { Package, Inbox, MapPin, User, Truck, CalendarDays, Clock3, Radio, AlertTriangle } from 'lucide-react'
import { updateOrderStatus } from '@/app/actions/orders'
import DirectPrintButton from './DirectPrintButton'
import CopyOrderButton from './CopyOrderButton'
import DeleteOrderButton from './DeleteOrderButton'
import EditOrderForm from './EditOrderForm'
import MetaConversionButton from './MetaConversionButton'
import NewWhatsAppOrder from './NewWhatsAppOrder'
import Link from 'next/link'

import { whatsAppLink } from '@/utils/phone'
import { asBuildSnapshot, describeBuild } from '@/types/build'
import { trustpilotInviteLink } from '@/constants/trustpilot'
import { formatPreferredDeliveryDate } from '@/utils/delivery'

/**
 * The WhatsApp message that asks a delivered customer for a Trustpilot
 * review. Most orders are WhatsApp orders with no email address, so the
 * automatic invitation (BCC on the delivered email) never reaches them -
 * this button is the ask for everyone else, one tap after each delivery.
 * The link is the dashboard's invitation link when TRUSTPILOT_INVITE_LINK
 * is set (reviews through it count as invited), otherwise the public
 * review page.
 */
function reviewAskLink(customerName: string, customerPhone: string): string | null {
  const firstName = (customerName || '').trim().split(/\s+/)[0] || 'there'
  return whatsAppLink(
    customerPhone,
    `Hi ${firstName}, we hope the sofa has settled in well! If you have a minute, a quick review on Trustpilot would help the next person decide - it takes about a minute: ${trustpilotInviteLink()}

Thank you from all of us at UK Sofa Shop.`,
  )
}


export const metadata: Metadata = { title: 'Orders' }

const UK_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
})
const PK_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Karachi',
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

function dualTime(value: string | null | undefined): { uk: string; pk: string } | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return { uk: UK_TIME.format(d), pk: PK_TIME.format(d) }
}

function SourceBadge({ source }: { source: string | null }) {
  const label = source === 'whatsapp' ? 'WhatsApp' : source === 'website' ? 'Website' : source || 'Unknown'
  return (
    <span className="rounded-pill border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-600">
      {label}
    </span>
  )
}

function manualAcquisition(order: unknown): { source: string | null; note: string | null } {
  const row = order as { manual_acquisition_source?: string | null; manual_acquisition_note?: string | null }
  return {
    source: row.manual_acquisition_source ?? null,
    note: row.manual_acquisition_note ?? null,
  }
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending_cod: 'bg-stone-100 text-stone-600 border-stone-200',
    confirmed: 'bg-amber-100 text-amber-700 border-amber-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    shipped: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    delivered: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  }
  const activeStyle = styles[status] || styles.pending_cod

  return (
    <span className={`px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-pill border ${activeStyle}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

const PER_PAGE = 20

/**
 * Orders still waiting on you: taken but not acknowledged, or acknowledged but
 * not yet dispatched. This is the default view, because a flat reverse-
 * chronological list buries the two or three that need doing today under
 * everything already delivered.
 */
const NEEDS_ATTENTION = ['pending_cod', 'confirmed', 'processing']

const FILTERS = [
  { key: 'attention', label: 'Needs attention' },
  { key: 'all',       label: 'All' },
  { key: 'pending_cod', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped',   label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
] as const

const STATUS_RANK: Record<string, number> = {
  pending_cod: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
}

const NEXT_STATUS: Record<string, { value: string; label: string }> = {
  pending_cod: { value: 'confirmed', label: 'Confirm order' },
  confirmed: { value: 'processing', label: 'Start processing' },
  processing: { value: 'shipped', label: 'Mark shipped' },
  shipped: { value: 'delivered', label: 'Mark delivered' },
}

type OperationalOrder = {
  status?: string | null
  confirmed_at?: string | null
  processing_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
}

function furthestRecordedStage(order: OperationalOrder): { status: string; label: string; at: string } | null {
  const stages = [
    { status: 'confirmed', label: 'Confirmed', at: order.confirmed_at },
    { status: 'processing', label: 'Processing', at: order.processing_at },
    { status: 'shipped', label: 'Shipped', at: order.shipped_at },
    { status: 'delivered', label: 'Delivered', at: order.delivered_at },
  ]
  return stages.reduce<{ status: string; label: string; at: string } | null>(
    (latest, stage) => stage.at ? { ...stage, at: stage.at } : latest,
    null,
  )
}

function recordedStageAheadOfStatus(order: OperationalOrder): { status: string; label: string; at: string } | null {
  if (!order.status || order.status === 'cancelled') return null
  const recorded = furthestRecordedStage(order)
  if (!recorded) return null
  return (STATUS_RANK[recorded.status] ?? -1) > (STATUS_RANK[order.status] ?? -1) ? recorded : null
}

type SearchParams = Promise<{ status?: string; page?: string }>

export default async function AdminOrdersPage(props: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const sp = await props.searchParams

  const status = FILTERS.some(f => f.key === sp.status) ? sp.status! : 'attention'
  // Anything that isn't a positive integer falls back to page 1, rather than
  // reaching range() as NaN.
  const page = /^\d+$/.test(sp.page ?? '') ? Math.max(1, parseInt(sp.page!, 10)) : 1
  const from = (page - 1) * PER_PAGE

  // Lightweight operational overview for workload cards and filter counts.
  // It intentionally excludes customer details and line items.
  const { data: overviewRows } = await supabase
    .from('orders')
    .select('status, total_amount, preferred_delivery_date')
    .limit(5000)

  type OverviewRow = {
    status: string | null
    total_amount: number | null
    preferred_delivery_date: string | null
  }

  const overview = (overviewRows ?? []) as OverviewRow[]
  const statusCounts = overview.reduce<Record<string, number>>((counts, row) => {
    const key = row.status ?? 'pending_cod'
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
  const attentionCount = NEEDS_ATTENTION.reduce((sum, key) => sum + (statusCounts[key] ?? 0), 0)
  const openStatuses = new Set(['pending_cod', 'confirmed', 'processing', 'shipped'])
  const openValue = overview
    .filter(row => openStatuses.has(row.status ?? 'pending_cod'))
    .reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)
  const selectedDeliveryDates = overview.filter(
    row => openStatuses.has(row.status ?? 'pending_cod') && row.preferred_delivery_date,
  ).length

  const countForFilter = (key: string): number => {
    if (key === 'all') return overview.length
    if (key === 'attention') return attentionCount
    return statusCounts[key] ?? 0
  }

  // This used to select every order ever placed, with all their line items and
  // nested product rows, on every load. Paged now, and counted server-side.
  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id, variant_id, fabric_id, quantity, price_at_time_of_purchase,
        fabric_code, fabric_name, fabric_collection, customisation,
        product_variants ( sku, color, products ( title ) )
      )
    `, { count: 'exact' })

  if (status === 'attention') query = query.in('status', NEEDS_ATTENTION)
  else if (status !== 'all') query = query.eq('status', status)

  const { data: orders, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PER_PAGE - 1)

  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>

  // The two lists the WhatsApp order form picks from. Fetched here rather
  // than in the component because this page is already a server component
  // with a client - and because pulling a Supabase client into the browser
  // for a form that is closed by default is exactly the cost commit 7eef61e
  // took out of the storefront.
  const [{ data: variantRows }, { data: fabricRows }] = await Promise.all([
    supabase
      .from('product_variants')
      .select('id, color, material, price_adjustment, products!inner ( title, base_price, is_active )')
      .eq('products.is_active', true),
    supabase
      .from('fabrics')
      .select('id, code, name, is_active, fabric_collections ( name )')
      .eq('is_active', true)
      .order('sort'),
  ])

  type VariantRow = {
    id: string
    color: string | null
    material: string | null
    price_adjustment: number | null
    products: { title: string; base_price: number } | null
  }
  type FabricRow = {
    id: string
    code: string
    name: string
    fabric_collections: { name: string } | null
  }

  const pickerVariants = ((variantRows ?? []) as unknown as VariantRow[])
    .filter(v => v.products)
    .map(v => ({
      id: v.id,
      // Colour and material, because a title on its own does not tell you
      // which of the six Veronas the customer means.
      label: [v.products!.title, [v.color, v.material].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(' · '),
      price: Number(v.products!.base_price) + Number(v.price_adjustment ?? 0),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const pickerFabrics = ((fabricRows ?? []) as unknown as FabricRow[]).map(f => ({
    id: f.id,
    label: `${f.fabric_collections?.name ?? 'Fabric'} ${f.name} (${f.code})`,
  }))

  const total = count ?? 0
  const overallTotal = overview.length
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE))
  const href = (s: string, p = 1) => `/admin/orders?status=${s}${p > 1 ? `&page=${p}` : ''}`

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-stone-900 tracking-tight">Order Management</h1>
        <span className="text-sm text-stone-500">
          {overallTotal} total · {total} in this view
        </span>
      </div>

      <NewWhatsAppOrder variants={pickerVariants} fabrics={pickerFabrics} />

      {/* At-a-glance workload. These are operational counts, not ad reporting. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href={href('attention')} className="rounded-md border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-300">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Needs attention</p>
          <p className="m-0 mt-2 text-2xl font-bold text-stone-900">{attentionCount}</p>
          <p className="m-0 mt-1 text-xs text-stone-600">Pending, confirmed or processing</p>
        </Link>
        <Link href={href('attention')} className="rounded-md border border-stone-200 bg-white p-4 transition hover:border-stone-300">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">Open order value</p>
          <p className="m-0 mt-2 text-2xl font-bold text-stone-900">£{openValue.toFixed(2)}</p>
          <p className="m-0 mt-1 text-xs text-stone-500">Excludes delivered and cancelled</p>
        </Link>
        <Link href={href('processing')} className="rounded-md border border-blue-200 bg-blue-50 p-4 transition hover:border-blue-300">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Processing</p>
          <p className="m-0 mt-2 text-2xl font-bold text-stone-900">{statusCounts.processing ?? 0}</p>
          <p className="m-0 mt-1 text-xs text-stone-600">Preparing for dispatch</p>
        </Link>
        <Link href={href('shipped')} className="rounded-md border border-indigo-200 bg-indigo-50 p-4 transition hover:border-indigo-300">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700">In transit</p>
          <p className="m-0 mt-2 text-2xl font-bold text-stone-900">{statusCounts.shipped ?? 0}</p>
          <p className="m-0 mt-1 text-xs text-stone-600">
            {selectedDeliveryDates} open {selectedDeliveryDates === 1 ? 'order has' : 'orders have'} a preferred date
          </p>
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(f => (
          <Link
            key={f.key}
            href={href(f.key)}
            className={`shrink-0 px-3.5 py-2 rounded-sm text-xs font-bold transition ${
              status === f.key
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
            }`}
          >
            <span>{f.label}</span>
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
              status === f.key ? 'bg-white/15 text-white' : 'bg-stone-100 text-stone-500'
            }`}>
              {countForFilter(f.key)}
            </span>
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {orders?.map((order) => (
          <div key={order.id} className="bg-white rounded-md p-5 shadow-sm border border-stone-200 flex flex-col">
            
            {/* Operational header: reference, source, money, state and dual clocks. */}
            <div className="mb-4 flex flex-col gap-3 border-b border-stone-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="m-0 text-xs font-mono text-stone-500">#{order.id.split('-')[0].toUpperCase()}</p>
                  <SourceBadge source={order.source} />
                  {(order.utm_source === 'meta' || manualAcquisition(order).source === 'meta') && (
                    <span
                      title={manualAcquisition(order).source === 'meta'
                        ? (manualAcquisition(order).note ?? 'Staff-confirmed acquisition source')
                        : 'Tracked Meta acquisition source'}
                      className="rounded-pill border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700"
                    >
                      Meta attributed
                    </span>
                  )}
                  {order.purchase_event_sent_at && (
                    <span className="rounded-pill border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Meta purchase sent
                    </span>
                  )}
                  {order.delivered_event_sent_at && (
                    <span className="rounded-pill border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
                      Meta delivery sent
                    </span>
                  )}
                  {order.utm_campaign === 'offer-test' && (
                    <span className="rounded-pill border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                      QA / test
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold text-stone-900 mt-2">£{order.total_amount.toFixed(2)}</p>
                {(Number(order.discount_amount ?? 0) > 0 || Number(order.delivery_total ?? 0) > 0) && (
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    £{Number(order.items_subtotal ?? 0).toFixed(2)} subtotal
                    {Number(order.discount_amount ?? 0) > 0 && (
                      <> − £{Number(order.discount_amount).toFixed(2)} offer</>
                    )}
                    {Number(order.delivery_total ?? 0) > 0 && (
                      <> + £{Number(order.delivery_total).toFixed(2)} extras</>
                    )}
                  </p>
                )}
                {order.promotion_code && (
                  <p className="mt-1 text-[11px] font-semibold text-amber-700">
                    {order.promotion_code} · {order.offer_source?.replace('_', ' ') ?? 'offer'} · {order.discount_tier ?? 'EXCLUDED'}
                  </p>
                )}
                {dualTime(order.created_at) && (
                  <div className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-stone-500">
                    <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong className="font-semibold text-stone-700">Placed</strong>{' '}
                      {dualTime(order.created_at)!.uk} UK
                      <span className="mx-1.5 text-stone-300">|</span>
                      {dualTime(order.created_at)!.pk} PK
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <StatusBadge status={order.status || 'pending_cod'} />
                {/* Not a status of its own - see the note on orders.has_made_to_order.
                    It is a reminder that this one needs a phone call before it is
                    built, which the status machine has no opinion about. */}
                {order.has_made_to_order && (
                  <span className="rounded-pill border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 sm:text-xs">
                    Call to confirm
                  </span>
                )}
              </div>
            </div>

            {recordedStageAheadOfStatus(order) && (
              <div className="mb-4 flex items-start gap-2 rounded-sm border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>Status history needs a check.</strong>{' '}
                  {recordedStageAheadOfStatus(order)!.label} was recorded
                  {dualTime(recordedStageAheadOfStatus(order)!.at) ? (
                    <> on {dualTime(recordedStageAheadOfStatus(order)!.at)!.uk} UK</>
                  ) : null},
                  but the current status is {String(order.status).replace('_', ' ')}.
                  Use the next-step button below to restore the operational state, or keep it only if the rollback was intentional.
                </span>
              </div>
            )}

            {/* Customer Details */}
            <div className="bg-stone-50 rounded-sm p-4 space-y-3 mb-4">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-stone-900">{order.customer_name}</p>
                  <p className="text-stone-500">{order.customer_email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                <p className="text-sm text-stone-600 line-clamp-2">{order.shipping_address}</p>
              </div>
              {/* The day the customer asked for. Shown only when they chose
                  one - most orders are "as soon as possible", and a line
                  saying so on every card would bury the ones that are not. */}
              {order.preferred_delivery_date && (
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-stone-900">
                    <span className="font-semibold">Wants delivery on {formatPreferredDeliveryDate(order.preferred_delivery_date)}</span>
                    <span className="text-stone-500"> — confirm the slot on the call</span>
                  </p>
                </div>
              )}

              {/* What the driver needs to do on arrival, and what to collect for it. */}
              {Number(order.delivery_total ?? 0) > 0 && (
                <div className="flex items-start gap-3 pt-3 border-t border-stone-200">
                  <Truck className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                  <div className="text-sm space-y-1">
                    {Number(order.fee_upstairs ?? 0) > 0 && (
                      <p className="text-stone-700">
                        <span className="font-semibold">Upstairs delivery</span>
                        <span className="text-stone-500">
                          {' '}— {order.delivery_has_lift ? 'lift available' : `floor ${order.delivery_floor}, no lift`} · £{Number(order.fee_upstairs).toFixed(2)}
                        </span>
                      </p>
                    )}
                    {order.wants_assembly && (
                      <p className="text-stone-700">
                        <span className="font-semibold">Assembly</span>
                        <span className="text-stone-500"> — £{Number(order.fee_assembly).toFixed(2)}</span>
                      </p>
                    )}
                    {order.wants_sofa_removal && (
                      <p className="text-stone-700">
                        <span className="font-semibold">Old sofa removal</span>
                        <span className="text-stone-500">
                          {' '}— {order.sofa_removal_seats ? `${order.sofa_removal_seats} seats · ` : ''}£{Number(order.fee_sofa_removal).toFixed(2)} (confirm if oversized)
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Business timeline. One timestamp is stored in UTC; the panel renders
                it in both UK and Pakistan time so the operations team and Hassan
                can talk about the same moment without mental conversion. */}
            <div className="mb-4 grid gap-2 rounded-sm border border-stone-200 bg-white px-4 py-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Placed', order.created_at],
                ['Confirmed', order.confirmed_at],
                ['Processing', order.processing_at],
                ['Shipped', order.shipped_at],
                ['Delivered', order.delivered_at],
                ['Cancelled', order.cancelled_at],
              ].map(([label, value]) => {
                const t = dualTime(value)
                if (!t) return null
                return (
                  <div key={label} className="min-w-0">
                    <p className="m-0 font-bold uppercase tracking-wider text-stone-500">{label}</p>
                    <p className="m-0 mt-1 font-medium text-stone-800">{t.uk} UK</p>
                    <p className="m-0 mt-0.5 text-stone-500">{t.pk} PK</p>
                  </div>
                )
              })}
            </div>

            {/* Quick Actions (WhatsApp, copy, print, edit). Wraps so the edit
                form, when open, takes a full line under the buttons. */}
            <div className="mb-4 flex flex-wrap gap-2">
              {/* Hidden when the stored number is not a UK mobile, rather than
                  rendering a wa.me link that goes nowhere. */}
              {whatsAppLink(order.customer_phone) && (
              <a
                href={whatsAppLink(order.customer_phone)!}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#128C7E] py-2.5 rounded-sm text-sm font-bold hover:bg-[#25D366]/20 transition"
              >
                {/* Custom WhatsApp SVG Icon */}
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 3.825 0 6.938 3.112 6.938 6.937 0 3.825-3.113 6.938-6.938 6.938z"/></svg>
                WhatsApp
              </a>
              )}

              <CopyOrderButton order={order} />

              <DirectPrintButton order={order} />

              <EditOrderForm order={order} variants={pickerVariants} fabrics={pickerFabrics} />

            </div>

            {/* Delivered orders only: the review ask, pre-written, to the
                customer's own WhatsApp. Sits under the quick actions rather
                than among them so it reads as the next step, not another
                way to open the chat. */}
            {order.status === 'delivered' && reviewAskLink(order.customer_name, order.customer_phone) && (
              <a
                href={reviewAskLink(order.customer_name, order.customer_phone)!}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 flex items-center justify-center gap-2 rounded-sm border border-[#00b67a]/40 bg-[#00b67a]/10 py-2.5 text-sm font-bold text-[#007a52] transition hover:bg-[#00b67a]/20"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.7 7.1.6-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7L2 9.3l7.1-.6L12 2z"/></svg>
                Ask for a Trustpilot review on WhatsApp
              </a>
            )}

            {/* Advertising conversion control. Operational status and ad-platform
                reporting are deliberately separate human actions. */}
            <div className="mb-4 rounded-sm border border-stone-200 bg-stone-50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
                    <Radio className="h-4 w-4 text-blue-600" /> Meta conversion
                  </p>
                  <p className="m-0 mt-1 text-[11px] leading-relaxed text-stone-500">
                    Changing order status does not send an ad conversion. Send it here only after the business event is real.
                  </p>
                </div>
              </div>

              {order.utm_campaign === 'offer-test' ? (
                <div className="flex items-start gap-2 rounded-sm border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span><strong>QA/test order.</strong> Meta conversion sending is blocked.</span>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-sm border border-stone-200 bg-white p-3">
                    <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-stone-500">Purchase</p>
                    {order.purchase_event_sent_at ? (
                      <div className="mt-1.5">
                        <p className="m-0 text-sm font-bold text-green-700">Sent to Meta</p>
                        {dualTime(order.purchase_event_sent_at) && (
                          <p className="m-0 mt-0.5 text-[11px] text-stone-500">
                            {dualTime(order.purchase_event_sent_at)!.uk} UK · {dualTime(order.purchase_event_sent_at)!.pk} PK
                          </p>
                        )}
                        {order.status === 'cancelled' && (
                          <p className="m-0 mt-2 text-[11px] font-semibold leading-relaxed text-red-700">
                            This Purchase was sent before the order was cancelled. Do not count it as current revenue.
                          </p>
                        )}
                      </div>
                    ) : order.confirmed_at && order.status !== 'cancelled' ? (
                      <div className="mt-2">
                        <MetaConversionButton
                          orderId={order.id}
                          kind="purchase"
                          label="Send Purchase event to Meta"
                          className="w-full rounded-sm bg-blue-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    ) : (
                      <p className="m-0 mt-1.5 text-xs text-stone-500">
                        {order.status === 'cancelled' ? 'Cancelled — nothing to send.' : 'Confirm the order first.'}
                      </p>
                    )}
                  </div>

                  <div className="rounded-sm border border-stone-200 bg-white p-3">
                    <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-stone-500">Delivered</p>
                    {order.delivered_event_sent_at ? (
                      <div className="mt-1.5">
                        <p className="m-0 text-sm font-bold text-green-700">OrderDelivered sent</p>
                        {dualTime(order.delivered_event_sent_at) && (
                          <p className="m-0 mt-0.5 text-[11px] text-stone-500">
                            {dualTime(order.delivered_event_sent_at)!.uk} UK · {dualTime(order.delivered_event_sent_at)!.pk} PK
                          </p>
                        )}
                      </div>
                    ) : order.status === 'delivered' && order.delivered_at ? (
                      <div className="mt-2">
                        <MetaConversionButton
                          orderId={order.id}
                          kind="delivered"
                          label="Send Delivered event to Meta"
                          className="w-full rounded-sm bg-green-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        {!order.purchase_event_sent_at && (
                          <p className="m-0 mt-1.5 text-[10px] leading-relaxed text-stone-500">
                            Purchase has not been sent; this action will send Purchase first, then OrderDelivered.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="m-0 mt-1.5 text-xs text-stone-500">Mark the order Delivered first.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Expandable Items */}
            <details className="group/details mb-6">
              <summary className="text-xs font-bold text-orange-600 cursor-pointer hover:text-orange-700 flex items-center gap-1 list-none bg-orange-50 px-3 py-2 rounded-sm">
                <Package className="w-4 h-4" /> 
                {order.order_items.length} Item(s) in Order (Tap to expand)
              </summary>
              <div className="mt-2 space-y-2 px-1">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-stone-100 last:border-0">
                    <div className="flex flex-col">
                      <span className="font-semibold text-stone-800">{item.quantity}x {item.product_variants?.products?.title}</span>
                      {/* The variant colour is the photograph; once a fabric
                          is chosen it is not printed, so the line reads as
                          one colour, not two - see utils/orderFinish.ts. */}
                      <span className="text-stone-500 text-xs">
                        {[!item.fabric_code && item.product_variants?.color, `SKU: ${item.product_variants?.sku}`]
                          .filter(Boolean)
                          .join(' • ')}
                      </span>
                      {/* What it actually gets built in. The code is the one
                          the purchase order to R&S needs. */}
                      {item.fabric_code && (
                        <span className="mt-1 text-xs font-semibold text-amber-700">
                          {item.fabric_collection} {item.fabric_name}
                          <span className="ml-1 font-mono text-stone-400">{item.fabric_code}</span>
                        </span>
                      )}
                      {/* A sofa from /build: feet, piping, custom size and the
                          customer's own notes. Every line is something to
                          confirm on the phone before it goes to the workshop. */}
                      {asBuildSnapshot(item.customisation) && (
                        <ul className="mt-1.5 list-none space-y-0.5 rounded-sm border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-stone-700">
                          <li className="font-bold uppercase tracking-wide text-amber-800">Built to order — confirm on the phone</li>
                          {describeBuild(asBuildSnapshot(item.customisation)).map(line => (
                            <li key={line.label}>
                              <span className="font-semibold text-stone-900">{line.label}:</span> {line.value}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <span className="font-medium text-stone-900">£{item.price_at_time_of_purchase.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </details>

            {/* The normal path is one deliberate next-step button. The full
                dropdown remains available below for corrections and cancellations,
                but is no longer the easiest way to accidentally move backwards. */}
            <div className="mt-auto border-t border-stone-100 pt-4">
              {NEXT_STATUS[order.status ?? 'pending_cod'] ? (
                <form action={async (formData) => {
                    "use server"
                    await updateOrderStatus(formData)
                  }}
                >
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="status" value={NEXT_STATUS[order.status ?? 'pending_cod'].value} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-sm bg-stone-900 p-3 text-sm font-bold text-white transition hover:bg-stone-800 active:scale-[0.99]"
                  >
                    {NEXT_STATUS[order.status ?? 'pending_cod'].label}
                    <span aria-hidden="true">→</span>
                  </button>
                </form>
              ) : (
                <p className="m-0 rounded-sm bg-stone-50 px-3 py-2.5 text-center text-xs font-semibold text-stone-500">
                  {order.status === 'cancelled' ? 'Cancelled order — no next operational step.' : 'Order workflow complete.'}
                </p>
              )}

              <details className="group/status mt-2 rounded-sm border border-stone-200 bg-white">
                <summary className="cursor-pointer list-none px-3 py-2.5 text-center text-xs font-bold text-stone-600 transition hover:bg-stone-50 hover:text-stone-900">
                  Change status manually or cancel
                </summary>
                <form action={async (formData) => {
                    "use server"
                    await updateOrderStatus(formData)
                  }}
                  className="flex flex-col gap-2 border-t border-stone-200 p-3 sm:flex-row"
                >
                  <input type="hidden" name="orderId" value={order.id} />
                  <select
                    name="status"
                    defaultValue={order.status ?? 'pending_cod'}
                    className="flex-1 rounded-sm border-2 border-stone-200 bg-white p-3 text-sm font-medium text-stone-700 outline-none focus:border-orange-500 focus:ring-0"
                  >
                    <option value="pending_cod">Pending (COD)</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <input
                    type="text"
                    name="cancellationReason"
                    placeholder="Reason, if cancelling"
                    className="flex-1 rounded-sm border-2 border-stone-200 bg-white p-3 text-sm outline-none focus:border-orange-500 focus:ring-0"
                  />
                  <button type="submit" className="rounded-sm bg-stone-700 p-3 text-sm font-bold text-white transition hover:bg-stone-800 active:scale-[0.98]">
                    Apply correction
                  </button>
                </form>
                {/* Below the correction form, inside the same fold, so it is
                    two deliberate taps away and never next to the WhatsApp
                    or print buttons. */}
                <div className="border-t border-stone-200 p-3">
                  <DeleteOrderButton orderId={order.id} reference={order.id.substring(0, 8).toUpperCase()} />
                </div>
              </details>
            </div>
            
          </div>
        ))}

        {(!orders || orders.length === 0) && (
          <div className="py-12 flex flex-col items-center justify-center bg-white rounded-lg border border-stone-200 shadow-sm">
            <Inbox className="w-12 h-12 text-stone-300 mb-3" />
            <p className="text-lg font-bold text-stone-900">
              {status === 'attention' ? 'Nothing needs your attention' : 'No orders here'}
            </p>
            <p className="text-stone-500 text-sm mt-1">
              {status === 'attention'
                ? 'Every order is either dispatched or done.'
                : 'Try a different filter.'}
            </p>
          </div>
        )}
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          {page > 1 ? (
            <Link href={href(status, page - 1)} className="px-4 py-2.5 rounded-sm text-xs font-bold bg-white border border-stone-200 text-stone-700 hover:border-stone-300 transition">
              ← Newer
            </Link>
          ) : <span />}

          <span className="text-xs text-stone-500 font-medium">
            Page {page} of {lastPage}
          </span>

          {page < lastPage ? (
            <Link href={href(status, page + 1)} className="px-4 py-2.5 rounded-sm text-xs font-bold bg-white border border-stone-200 text-stone-700 hover:border-stone-300 transition">
              Older →
            </Link>
          ) : <span />}
        </div>
      )}
    </div>
  )
}
