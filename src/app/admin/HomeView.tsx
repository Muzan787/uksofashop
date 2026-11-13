// src/app/admin/HomeView.tsx
//
// Home (admin upgrade C1-C5), given what page.tsx loaded: take an order, the
// four tiles, what is waiting for someone, the health card and the latest
// five orders.
import { PackagePlus, ArrowRight, MessageCircle, Clock3, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import HealthCard from '@/components/Admin/HealthCard'
import type { HealthReport } from '@/utils/health/checks'
import { StatusBadge, WhatsAppMark, money, shortCode } from '@/app/admin/orders/OrderBits'
import { dualTimeText } from '@/utils/adminTime'
import type { WaitingChip } from '@/utils/adminWaiting'
import type { AdminTask } from '@/utils/adminTasks'
import { Metric, PageHeader, Panel, Pill } from '@/components/Admin/ui/AdminUi'

export interface HomeViewProps {
  needsAttention: number
  waitingToConfirm: number
  toCollect: number
  productsOnSale: number
  confirmedRevenue: number
  chips: WaitingChip[]
  tasks: AdminTask[]
  leadsWaiting: number
  latest: { id: string; status: string | null; is_test: boolean; customer_name: string; total_amount: number; created_at: string | null }[]
  health: HealthReport
}

export default function HomeView({
  needsAttention, waitingToConfirm, toCollect, productsOnSale, confirmedRevenue, chips, tasks, leadsWaiting, latest, health,
}: HomeViewProps) {
  const TASK_TONE = { urgent: 'attention', attention: 'attention', info: 'info' } as const
  const TASK_WORD = { urgent: 'Do today', attention: 'Needs you', info: 'To check' } as const

  return (
    <div className="mx-auto max-w-6xl space-y-6 lg:space-y-8">

      <PageHeader
        title="Today"
        lead="What needs doing, in order, and where to do it. Figures count real orders only."
        actions={
          <Link
            href="/admin/orders?new=1"
            className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#128C7E] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0e7469] active:scale-[0.99]"
          >
            <WhatsAppMark /> Take a WhatsApp or phone order
          </Link>
        }
      />

      {/* The queue. A task with nothing to do is absent; one that could not
          be checked says so instead of showing a calm zero. */}
      <Panel title="Needs doing" id="needs-doing">
        {tasks.length === 0 ? (
          <p className="m-0 flex items-center gap-2 text-sm text-ink-700">
            <CheckCircle2 className="h-5 w-5 text-sage-700" aria-hidden="true" /> Nothing is waiting on you right now.
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-calico-300 p-0">
            {tasks.map(task => (
              <li key={task.key}>
                <Link href={task.href} className="flex min-h-14 items-start justify-between gap-3 py-3 transition hover:bg-calico-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-700">
                  <span className="min-w-0">
                    <span className="mb-1 flex flex-wrap items-center gap-2"><Pill tone={TASK_TONE[task.tone]}>{TASK_WORD[task.tone]}</Pill></span>
                    <span className="block text-sm font-bold text-ink-900">{task.title}</span>
                    <span className="mt-0.5 block text-xs text-ink-500">{task.detail}</span>
                  </span>
                  <ArrowRight className="mt-6 h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Metric label="Needs attention" value={needsAttention} note="Waiting, confirmed or on hold" href="/admin/orders?status=attention" tone={needsAttention > 0 ? 'attention' : 'plain'} />
          <Metric label="Waiting to confirm" value={waitingToConfirm} note="Not yet confirmed by the customer" href="/admin/orders?status=pending_cod" tone={waitingToConfirm > 0 ? 'attention' : 'plain'} />
          <Metric label="To collect" value={money(toCollect)} note="On orders not yet delivered" href="/admin/orders?status=attention" />
          <Metric label="Products on sale" value={productsOnSale} note="Showing in the shop" href="/admin/inventory" />
        </div>
        {/* What the old Total Revenue tile showed, kept in a line. */}
        <p className="m-0 mt-3 text-xs text-ink-500">
          <span className="font-semibold tabular-nums text-ink-700">{money(confirmedRevenue)}</span> in confirmed orders to date (confirmed, on hold and delivered).
        </p>
      </div>

      {/* C3: only when something is waiting. */}
      {chips.length > 0 && (
        <section aria-labelledby="waiting-heading">
          <h2 id="waiting-heading" className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Waiting for you</h2>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {chips.map(chip => (
              <li key={chip.key}>
                <Link
                  href={chip.href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-ember-500 bg-calico-100 px-4 text-sm font-bold text-ember-700 transition hover:bg-calico-200"
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
          <h2 id="latest-heading" className="text-sm font-bold text-ink-500 uppercase tracking-wider">Latest orders</h2>
          <Link href="/admin/orders?status=all" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ink-700 hover:text-ink-900">
            All orders <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="m-0 rounded-lg border border-calico-300 bg-white p-4 text-sm text-ink-500">No orders yet. They appear here as soon as one is placed.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-calico-300 overflow-hidden rounded-lg border border-calico-300 bg-white p-0 shadow-sm">
            {latest.map(order => (
              <li key={order.id}>
                <Link href={`/admin/orders/${order.id}`} className="block px-4 py-3 transition hover:bg-calico-50">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-ink-900">#{shortCode(order.id)}</span>
                    <StatusBadge status={order.status} />
                    {order.is_test && (
                      <span className="inline-flex items-center rounded-pill border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-800">Test</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-start justify-between gap-3">
                    <p className="m-0 min-w-0 truncate text-sm font-semibold text-ink-900">{order.customer_name}</p>
                    <p className="m-0 shrink-0 text-sm font-bold tabular-nums text-ink-900">{money(order.total_amount)}</p>
                  </div>
                  {dualTimeText(order.created_at) && (
                    <p className="m-0 mt-1 flex items-start gap-1.5 text-xs text-ink-500">
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
        <h2 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/admin/inventory/new"
            className="flex items-center justify-center gap-2 bg-ember-500 text-ink-900 px-5 py-4 rounded-md font-bold hover:bg-ember-300 active:scale-[0.98] transition-all shadow-sm">
            <PackagePlus className="w-5 h-5" />
            Add New Product
          </Link>

          <Link href="/admin/leads?tab=reminders"
            className="flex items-center justify-between sm:justify-center gap-2 bg-white text-ink-900 border border-calico-300 px-5 py-4 rounded-sm font-medium hover:bg-calico-50 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-whatsapp-dark" />
              <span>Get Back to Leads</span>
              {leadsWaiting > 0 && (
                <span className="grid h-6 min-w-6 place-items-center rounded-pill bg-whatsapp-dark px-1.5 text-xs font-bold text-white">
                  {leadsWaiting}
                </span>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-ink-500 sm:hidden" />
          </Link>
        </div>
      </div>

    </div>
  )
}
