// src/app/admin/HomeView.tsx
//
// Home (admin upgrade C1-C5), given what page.tsx loaded: take an order, the
// four tiles, what is waiting for someone, the health card and the latest
// five orders.
import { PackagePlus, ArrowRight, MessageCircle, Clock3 } from 'lucide-react'
import Link from 'next/link'
import HealthCard from '@/components/Admin/HealthCard'
import type { HealthReport } from '@/utils/health/checks'
import { StatusBadge, WhatsAppMark, money, shortCode } from '@/app/admin/orders/OrderBits'
import { dualTimeText } from '@/utils/adminTime'
import type { WaitingChip } from '@/utils/adminWaiting'

export interface HomeViewProps {
  needsAttention: number
  waitingToConfirm: number
  toCollect: number
  productsOnSale: number
  confirmedRevenue: number
  chips: WaitingChip[]
  leadsWaiting: number
  latest: { id: string; status: string | null; is_test: boolean; customer_name: string; total_amount: number; created_at: string | null }[]
  health: HealthReport
}

export default function HomeView({
  needsAttention, waitingToConfirm, toCollect, productsOnSale, confirmedRevenue, chips, leadsWaiting, latest, health,
}: HomeViewProps) {
  const tile = 'block min-w-0 rounded-md border p-4 transition lg:rounded-lg lg:p-6'
  const tileLabel = 'm-0 text-[10px] font-bold uppercase tracking-[0.16em] lg:text-xs'

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <header>
        <h1 className="text-2xl lg:text-4xl font-bold text-zinc-900 tracking-tight">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your storefront and orders.</p>
      </header>

      {/* C1: the thing most often done from here. */}
      <Link
        href="/admin/orders?new=1"
        className="flex min-h-14 items-center justify-center gap-2 rounded-sm bg-[#128C7E] px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-[#0e7469] active:scale-[0.99] sm:inline-flex"
      >
        <WhatsAppMark /> Take a WhatsApp or phone order
      </Link>

      {/* C2: four tiles, each a link. Real orders only. */}
      <div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
          <Link href="/admin/orders?status=attention" className={`${tile} border-zinc-900 bg-zinc-900 shadow-lg hover:bg-zinc-800`}>
            <p className={`${tileLabel} text-orange-400`}>Needs attention</p>
            <p className="m-0 mt-2 text-3xl font-bold text-white lg:text-4xl">{needsAttention}</p>
            <p className="m-0 mt-1 text-xs text-zinc-400">Waiting, confirmed or on hold</p>
          </Link>
          <Link href="/admin/orders?status=pending_cod" className={`${tile} border-zinc-200 bg-white shadow-sm hover:border-zinc-300`}>
            <p className={`${tileLabel} text-zinc-500`}>Waiting to confirm</p>
            <p className={`m-0 mt-2 text-3xl font-bold lg:text-4xl ${waitingToConfirm > 0 ? 'text-orange-500' : 'text-zinc-900'}`}>{waitingToConfirm}</p>
            <p className="m-0 mt-1 text-xs text-zinc-500">Not yet confirmed by the customer</p>
          </Link>
          <Link href="/admin/orders?status=attention" className={`${tile} border-zinc-200 bg-white shadow-sm hover:border-zinc-300`}>
            <p className={`${tileLabel} text-zinc-500`}>To collect</p>
            <p className="m-0 mt-2 break-words text-xl font-bold tabular-nums text-zinc-900 lg:text-3xl">{money(toCollect)}</p>
            <p className="m-0 mt-1 text-xs text-zinc-500">On orders not yet delivered</p>
          </Link>
          <Link href="/admin/inventory" className={`${tile} border-zinc-200 bg-white shadow-sm hover:border-zinc-300`}>
            <p className={`${tileLabel} text-zinc-500`}>Products on sale</p>
            <p className="m-0 mt-2 text-3xl font-bold text-zinc-900 lg:text-4xl">{productsOnSale}</p>
            <p className="m-0 mt-1 text-xs text-zinc-500">Showing in the shop</p>
          </Link>
        </div>
        {/* What the old Total Revenue tile showed, kept in a line. */}
        <p className="m-0 mt-3 text-xs text-zinc-500">
          <span className="font-semibold tabular-nums text-zinc-700">{money(confirmedRevenue)}</span> in confirmed orders to date (confirmed, on hold and delivered).
        </p>
      </div>

      {/* C3: only when something is waiting. */}
      {chips.length > 0 && (
        <section aria-labelledby="waiting-heading">
          <h2 id="waiting-heading" className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Waiting for you</h2>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {chips.map(chip => (
              <li key={chip.key}>
                <Link
                  href={chip.href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
                >
                  {chip.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* C4 */}
      <HealthCard report={health} />

      {/* C5: the last five, tests included and tagged. */}
      <section aria-labelledby="latest-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="latest-heading" className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Latest orders</h2>
          <Link href="/admin/orders?status=all" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-zinc-700 hover:text-zinc-900">
            All orders <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="m-0 rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-500">No orders yet. They appear here as soon as one is placed.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-zinc-100 overflow-hidden rounded-md border border-zinc-200 bg-white p-0 shadow-sm">
            {latest.map(order => (
              <li key={order.id}>
                <Link href={`/admin/orders/${order.id}`} className="block px-4 py-3 transition hover:bg-zinc-50">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-zinc-900">#{shortCode(order.id)}</span>
                    <StatusBadge status={order.status} />
                    {order.is_test && (
                      <span className="inline-flex items-center rounded-pill border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-800">Test</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-start justify-between gap-3">
                    <p className="m-0 min-w-0 truncate text-sm font-semibold text-zinc-900">{order.customer_name}</p>
                    <p className="m-0 shrink-0 text-sm font-bold tabular-nums text-zinc-900">{money(order.total_amount)}</p>
                  </div>
                  {dualTimeText(order.created_at) && (
                    <p className="m-0 mt-1 flex items-start gap-1.5 text-xs text-zinc-500">
                      <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {dualTimeText(order.created_at)}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick actions - ergonomic touch targets for mobile */}
      <div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/admin/inventory/new"
            className="flex items-center justify-center gap-2 bg-orange-500 text-white px-5 py-4 rounded-sm font-medium hover:bg-orange-600 active:scale-[0.98] transition-all shadow-sm">
            <PackagePlus className="w-5 h-5" />
            Add New Product
          </Link>

          <Link href="/admin/leads?tab=reminders"
            className="flex items-center justify-between sm:justify-center gap-2 bg-white text-zinc-900 border border-zinc-200 px-5 py-4 rounded-sm font-medium hover:bg-zinc-50 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-whatsapp-dark" />
              <span>Get Back to Leads</span>
              {leadsWaiting > 0 && (
                <span className="grid h-6 min-w-6 place-items-center rounded-pill bg-whatsapp-dark px-1.5 text-xs font-bold text-white">
                  {leadsWaiting}
                </span>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 sm:hidden" />
          </Link>
        </div>
      </div>

    </div>
  )
}
