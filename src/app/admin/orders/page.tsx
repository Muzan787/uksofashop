import type { Metadata } from 'next'
// src/app/admin/orders/page.tsx
//
// The orders list (admin upgrade D1-D6). This loads the counts, the search
// and the page of orders; OrdersList.tsx shows them, and each order opens on
// its own page (src/app/admin/orders/[id]/page.tsx).
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { loadPickers } from './orderData'
import OrdersList, { FILTERS, type ListOrder } from './OrdersList'
import { cleanSearch, isOrderCode } from '@/utils/orderSearch'

export const metadata: Metadata = { title: 'Orders' }
export const dynamic = 'force-dynamic'

const PER_PAGE = 20

/**
 * Orders still waiting on you: taken but not acknowledged, or acknowledged but
 * not yet dispatched. This is the default view, because a flat reverse-
 * chronological list buries the two or three that need doing today under
 * everything already delivered.
 */
const NEEDS_ATTENTION = ['pending_cod', 'confirmed', 'processing']
const OPEN = new Set(['pending_cod', 'confirmed', 'processing', 'shipped'])

/** The newest matches a search shows; more than this and the search is too broad. */
const SEARCH_LIMIT = 200

type SearchParams = Promise<{ status?: string; page?: string; q?: string; ref?: string; new?: string; deleted?: string; error?: string }>

export default async function AdminOrdersPage(props: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const sp = await props.searchParams

  // Cleaned here, and again in the database (D3).
  const q = cleanSearch(sp.q)
  // A search looks across every status unless a filter was picked as well.
  const status = FILTERS.some(f => f.key === sp.status) ? sp.status! : q ? 'all' : 'attention'
  // Anything that isn't a positive integer falls back to page 1, rather than
  // reaching range() as NaN.
  const page = /^\d+$/.test(sp.page ?? '') ? Math.max(1, parseInt(sp.page!, 10)) : 1
  const from = (page - 1) * PER_PAGE

  // Lightweight overview for the tiles and filter counts. It intentionally
  // excludes customer details and line items.
  const { data: overviewRows } = await supabase
    .from('orders')
    .select('status, total_amount, preferred_delivery_date, is_test')
    .limit(5000)

  type OverviewRow = { status: string | null; total_amount: number | null; preferred_delivery_date: string | null; is_test: boolean | null }
  const overview = (overviewRows ?? []) as OverviewRow[]
  const statusOf = (row: OverviewRow) => row.status ?? 'pending_cod'
  // Test orders never count as work waiting, or as money to collect.
  const real = overview.filter(row => !row.is_test)
  const counts: Record<string, number> = {
    attention: real.filter(row => NEEDS_ATTENTION.includes(statusOf(row))).length,
    all: overview.length,
    test: overview.length - real.length,
  }
  for (const row of overview) counts[statusOf(row)] = (counts[statusOf(row)] ?? 0) + 1
  const tiles = {
    attention: counts.attention,
    toCollect: real.filter(row => OPEN.has(statusOf(row))).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0),
    processing: real.filter(row => statusOf(row) === 'processing').length,
    shipped: real.filter(row => statusOf(row) === 'shipped').length,
    withPreferredDay: real.filter(row => OPEN.has(statusOf(row)) && row.preferred_delivery_date).length,
  }

  // Search first, then the filter and the page on what it found.
  let matched: string[] | null = null
  let searchTooBroad: number | null = null
  if (q) {
    const { data: ids } = await supabase.rpc('search_orders', { p_query: q })
    const all = ids ?? []
    if (all.length > SEARCH_LIMIT) searchTooBroad = SEARCH_LIMIT
    matched = all.slice(0, SEARCH_LIMIT)
    // An order code or id that finds exactly one order opens it.
    if (isOrderCode(q) && matched.length === 1 && page === 1) redirect(`/admin/orders/${matched[0]}`)
  }

  let query = supabase
    .from('orders')
    .select(
      'id, status, source, channel, utm_source, manual_acquisition_source, gclid, gbraid, wbraid, fbclid, has_made_to_order, is_test, test_reason, customer_name, customer_phone, shipping_address, total_amount, created_at, preferred_delivery_date, order_items ( quantity )',
      { count: 'exact' },
    )

  if (matched) query = query.in('id', matched.length ? matched : ['00000000-0000-0000-0000-000000000000'])
  if (status === 'attention') query = query.in('status', NEEDS_ATTENTION).eq('is_test', false)
  else if (status === 'test') query = query.eq('is_test', true)
  else if (status !== 'all') query = query.eq('status', status)

  const [{ data: orders, error, count }, pickers] = await Promise.all([
    query.order('created_at', { ascending: false }).range(from, from + PER_PAGE - 1),
    loadPickers(supabase),
  ])

  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>

  const total = count ?? 0
  return (
    <OrdersList
      orders={(orders ?? []) as ListOrder[]}
      total={total}
      overall={overview.length}
      status={status}
      q={q}
      searchTooBroad={searchTooBroad}
      page={page}
      lastPage={Math.max(1, Math.ceil(total / PER_PAGE))}
      counts={counts}
      tiles={tiles}
      pickers={pickers}
      openForm={sp.new === '1'}
      reference={(sp.ref ?? '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 40)}
      deleted={(sp.deleted ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}
      error={Boolean(sp.error)}
    />
  )
}
