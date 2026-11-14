// src/app/admin/orders/OrdersList.tsx
//
// The orders list (admin upgrade D1-D6), given what page.tsx loaded: the four
// tiles, search, filters with counts, and one slim card per order that opens
// the order's own page, where everything else now lives.
import Link from 'next/link'
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Inbox, Search } from 'lucide-react'
import NewWhatsAppOrder, { type PickerFabric, type PickerVariant } from './NewWhatsAppOrder'
import LegacyHashRedirect from './LegacyHashRedirect'
import { OrderTags, StatusBadge, WhatsAppMark, money, shortCode } from './OrderBits'
import { whatsAppLink } from '@/utils/phone'
import { formatPreferredDeliveryDate } from '@/utils/delivery'
import { dualTime } from '@/utils/adminTime'
import { firstName, postcodeOf } from '@/utils/orderWhatsApp'

export const FILTERS = [
  { key: 'attention', label: 'Needs attention' },
  { key: 'all', label: 'All' },
  { key: 'pending_cod', label: 'Waiting' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'on_hold', label: 'On hold' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'test', label: 'Test' },
] as const

export interface ListOrder {
  id: string
  status: string | null
  source: string | null
  utm_source: string | null
  manual_acquisition_source: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  fbclid: string | null
  channel: string | null
  has_made_to_order: boolean | null
  is_test: boolean | null
  test_reason: string | null
  customer_name: string
  customer_phone: string
  shipping_address: string
  total_amount: number
  created_at: string | null
  preferred_delivery_date: string | null
  order_items: { quantity: number }[]
}

export interface OrdersListProps {
  orders: ListOrder[]
  /** Orders in this view (all pages), and in the whole shop. */
  total: number
  overall: number
  status: string
  q: string
  /** More matches than the list shows: the search needs narrowing. */
  searchTooBroad: number | null
  page: number
  lastPage: number
  counts: Record<string, number>
  tiles: { attention: number; toCollect: number; confirmed: number; onHold: number; withPreferredDay: number }
  /** Deposit already taken, in pounds, by order id. Only orders that have one. */
  deposits: Record<string, number>
  pickers: { variants: PickerVariant[]; fabrics: PickerFabric[] }
  /** A WhatsApp reference to open the new-order form with (?ref=). */
  reference: string
  /** Open the new-order form straight away (?new=1, from Home). */
  openForm: boolean
  /** The code of an order just deleted, for the banner. */
  deleted: string
  error: boolean
}

export default function OrdersList({
  orders, total, overall, status, q, searchTooBroad, page, lastPage, counts, tiles, deposits, pickers, reference, openForm, deleted, error,
}: OrdersListProps) {
  const href = (s: string, p = 1) => {
    const params = new URLSearchParams()
    params.set('status', s)
    if (q) params.set('q', q)
    if (p > 1) params.set('page', String(p))
    return `/admin/orders?${params.toString()}`
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-in fade-in duration-500 lg:space-y-6">
      <LegacyHashRedirect />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="m-0 text-2xl font-bold tracking-tight text-ink-900 lg:text-3xl">Orders</h1>
        <span className="text-sm text-ink-500">{overall} real orders in all · {total} in this view</span>
      </div>

      {/* D6: after a delete. */}
      {deleted && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Order #{deleted} deleted.
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> That didn&apos;t work. Open the order and try again.
        </div>
      )}

      <NewWhatsAppOrder variants={pickers.variants} fabrics={pickers.fabrics} initialReference={reference} initialOpen={openForm} />

      {/* D2: at-a-glance workload. Operational counts, not ad reporting; test orders are left out. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href={href('attention')} className="min-w-0 rounded-md border border-amber-200 bg-amber-50 p-3.5 transition hover:border-amber-300 lg:p-4">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Needs attention</p>
          <p className="m-0 mt-2 text-2xl font-bold text-ink-900">{tiles.attention}</p>
          <p className="m-0 mt-1 text-xs text-ink-700">Waiting, confirmed or on hold</p>
        </Link>
        <Link href={href('attention')} className="min-w-0 rounded-md border border-calico-300 bg-white p-3.5 transition hover:border-calico-300 lg:p-4">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">To collect</p>
          <p className="m-0 mt-2 break-words text-xl font-bold tabular-nums text-ink-900 lg:text-2xl">{money(tiles.toCollect)}</p>
          <p className="m-0 mt-1 text-xs text-ink-500">On orders not yet delivered</p>
        </Link>
        <Link href={href('confirmed')} className="min-w-0 rounded-md border border-amber-200 bg-amber-50 p-3.5 transition hover:border-amber-300 lg:p-4">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Confirmed</p>
          <p className="m-0 mt-2 text-2xl font-bold text-ink-900">{tiles.confirmed}</p>
          <p className="m-0 mt-1 text-xs text-ink-700">
            {tiles.withPreferredDay} open {tiles.withPreferredDay === 1 ? 'order has' : 'orders have'} a preferred day
          </p>
        </Link>
        <Link href={href('on_hold')} className="min-w-0 rounded-md border border-orange-200 bg-orange-50 p-3.5 transition hover:border-orange-300 lg:p-4">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700">On hold</p>
          <p className="m-0 mt-2 text-2xl font-bold text-ink-900">{tiles.onHold}</p>
          <p className="m-0 mt-1 text-xs text-ink-700">Paused; to rebook</p>
        </Link>
      </div>

      {/* D3: search. The same cleaning happens again in the database. */}
      <form action="/admin/orders" method="get" role="search" className="flex gap-2">
        {status !== 'attention' && status !== 'all' && <input type="hidden" name="status" value={status} />}
        <label htmlFor="order-search" className="sr-only">Search orders</label>
        <input
          id="order-search"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={80}
          autoComplete="off"
          placeholder="Code, name, postcode or phone"
          className="min-h-11 min-w-0 flex-1 rounded-sm border border-calico-300 bg-white px-3 py-2.5 text-base text-ink-900 focus:border-ink-900 focus:outline-none"
        />
        <button type="submit" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm bg-ink-900 px-4 text-sm font-bold text-white hover:bg-ink-700">
          <Search className="h-4 w-4" aria-hidden="true" /> Search
        </button>
      </form>
      {q && (
        <p className="m-0 -mt-2 flex flex-wrap items-center gap-x-3 text-sm text-ink-700">
          <span>
            {total} {total === 1 ? 'order matches' : 'orders match'} &ldquo;{q}&rdquo;
            {searchTooBroad && ` (the newest ${searchTooBroad} shown; type more to narrow it)`}
          </span>
          <Link href={status !== 'attention' && status !== 'all' ? `/admin/orders?status=${status}` : '/admin/orders'} className="inline-flex min-h-11 items-center font-semibold text-ink-900 underline">
            Clear search
          </Link>
        </p>
      )}

      {/* D1: filters with counts. On phones they scroll sideways. */}
      <nav aria-label="Filter orders" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
        {FILTERS.map(f => (
          <Link
            key={f.key}
            href={href(f.key)}
            aria-current={status === f.key ? 'page' : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-sm px-3.5 text-xs font-bold transition ${
              status === f.key ? 'bg-ink-900 text-white' : 'border border-calico-300 bg-white text-ink-700 hover:border-calico-300'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${status === f.key ? 'bg-white/15 text-white' : 'bg-calico-100 text-ink-500'}`}>
              {counts[f.key] ?? 0}
            </span>
          </Link>
        ))}
      </nav>

      {/* D5: one slim card per order. */}
      {orders.length > 0 && (
        <ul className="m-0 list-none space-y-3 p-0">
          {orders.map(order => {
            const items = order.order_items.reduce((sum, line) => sum + line.quantity, 0)
            const postcode = postcodeOf(order.shipping_address)
            const placed = dualTime(order.created_at)
            const chat = whatsAppLink(order.customer_phone)
            return (
              <li key={order.id} className="overflow-hidden rounded-md border border-calico-300 bg-white shadow-sm transition hover:border-calico-300">
                <Link href={`/admin/orders/${order.id}`} className="block p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-ink-900">#{shortCode(order.id)}</span>
                    <StatusBadge status={order.status} />
                    <OrderTags order={order} />
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 truncate text-base font-semibold text-ink-900">{order.customer_name}</p>
                      <p className="m-0 text-sm text-ink-500">
                        {[postcode, `${items} ${items === 1 ? 'item' : 'items'}`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="m-0 text-lg font-bold tabular-nums text-ink-900">{money(order.total_amount)}</p>
                      {deposits[order.id] > 0 && (
                        <p className="m-0 text-xs font-semibold tabular-nums text-green-700">
                          {money(deposits[order.id])} deposit paid
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-ink-500">
                    {placed && (
                      <p className="m-0 flex items-start gap-1.5">
                        <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{placed.uk} UK <span className="text-calico-300">|</span> {placed.pk} PK</span>
                      </p>
                    )}
                    {order.preferred_delivery_date && (
                      <p className="m-0 flex items-start gap-1.5 font-semibold text-ink-900">
                        <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                        Wants {formatPreferredDeliveryDate(order.preferred_delivery_date)}
                      </p>
                    )}
                  </div>
                </Link>
                {chat && (
                  <a
                    href={chat}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center justify-center gap-2 border-t border-calico-100 bg-[#25D366]/10 px-4 py-2.5 text-sm font-bold text-[#128C7E] transition hover:bg-[#25D366]/20"
                  >
                    <WhatsAppMark /> WhatsApp {firstName(order.customer_name)}
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* D6: the empty state. */}
      {orders.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-calico-300 bg-white px-4 py-12 text-center shadow-sm">
          <Inbox className="mb-3 h-12 w-12 text-calico-300" aria-hidden="true" />
          <p className="m-0 text-lg font-bold text-ink-900">
            {q ? 'No orders match that search' : status === 'attention' ? 'Nothing needs your attention' : 'No orders here'}
          </p>
          <p className="m-0 mt-1 text-sm text-ink-500">
            {q ? 'Try the order code, a surname, or the postcode.' : status === 'attention' ? 'Every order is either on its way or done.' : 'Try a different filter.'}
          </p>
        </div>
      )}

      {/* D4: 20 a page, Newer and Older. */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between gap-4 pt-1">
          {page > 1 ? (
            <Link href={href(status, page - 1)} className="inline-flex min-h-11 items-center rounded-sm border border-calico-300 bg-white px-4 text-xs font-bold text-ink-700 transition hover:border-calico-300">
              ← Newer
            </Link>
          ) : <span />}
          <span className="text-xs font-medium text-ink-500">Page {page} of {lastPage}</span>
          {page < lastPage ? (
            <Link href={href(status, page + 1)} className="inline-flex min-h-11 items-center rounded-sm border border-calico-300 bg-white px-4 text-xs font-bold text-ink-700 transition hover:border-calico-300">
              Older →
            </Link>
          ) : <span />}
        </div>
      )}
    </div>
  )
}
