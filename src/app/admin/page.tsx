import type { Metadata } from 'next'
// src/app/admin/page.tsx
//
// Home (admin upgrade C1-C5): take an order, the four tiles, what is waiting
// for someone, the health card and the latest five orders. Tiles and the strip
// count real orders only; the latest orders show tests too, tagged.
import { createClient } from '@/utils/supabase/server'
import { loadHealthReport } from '@/utils/health/loadHealth'
import { waitingChips } from '@/utils/adminWaiting'
import { newEnquiriesSince } from '@/utils/leadsTabs'
import HomeView from './HomeView'

export const metadata: Metadata = { title: 'Overview' }
export const dynamic = 'force-dynamic'

/** Taken but not yet on its way: the same rule as the orders list's default view. */
const NEEDS_ATTENTION = ['pending_cod', 'confirmed', 'processing']
/** Not yet delivered or cancelled, so the money is still to be collected. */
const OPEN = ['pending_cod', 'confirmed', 'processing', 'shipped']
/**
 * Money from orders the customer has said yes to. Unconfirmed cash-on-delivery
 * orders are left out (about a quarter are never completed) and so are
 * cancelled ones.
 */
const COUNTS_AS_REVENUE = ['confirmed', 'processing', 'shipped', 'delivered']

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Everything at once, under the admin's own session: each table admits
  // admins through RLS.
  const [
    { data: orders },
    { count: productCount },
    { count: samples },
    { count: reviews },
    { count: reminders },
    { count: messages },
    { count: enquiries },
    { data: latest },
    health,
  ] = await Promise.all([
    // Test orders are never work to do or money to collect.
    supabase.from('orders').select('total_amount, status').eq('is_test', false),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('swatch_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    // The same rows the Leads page lists: waiting, and real shoppers only.
    supabase.from('checkout_recovery_leads').select('id', { count: 'exact', head: true })
      .eq('status', 'active').eq('data_class', 'production_real'),
    supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    // The Enquiries tab's count: the last 24 hours' taps not yet an order.
    supabase.from('whatsapp_enquiries').select('id', { count: 'exact', head: true })
      .gte('created_at', newEnquiriesSince()).is('converted_order_id', null),
    supabase.from('orders').select('id, status, is_test, customer_name, total_amount, created_at')
      .order('created_at', { ascending: false }).limit(5),
    // The same report the Status page shows; the card lists only what isn't green.
    loadHealthReport(supabase),
  ])

  const real = orders ?? []
  const statusOf = (o: { status: string | null }) => o.status ?? 'pending_cod'
  const needsAttention = real.filter(o => NEEDS_ATTENTION.includes(statusOf(o))).length
  const waitingToConfirm = real.filter(o => statusOf(o) === 'pending_cod').length
  const toCollect = real.filter(o => OPEN.includes(statusOf(o))).reduce((sum, o) => sum + Number(o.total_amount), 0)
  const confirmedRevenue = real.filter(o => COUNTS_AS_REVENUE.includes(statusOf(o))).reduce((sum, o) => sum + Number(o.total_amount), 0)
  const leadsWaiting = reminders ?? 0

  const chips = waitingChips({ samples: samples ?? 0, messages: messages ?? 0, reviews: reviews ?? 0, reminders: leadsWaiting, enquiries: enquiries ?? 0 })

  return (
    <HomeView
      needsAttention={needsAttention}
      waitingToConfirm={waitingToConfirm}
      toCollect={toCollect}
      productsOnSale={productCount ?? 0}
      confirmedRevenue={confirmedRevenue}
      chips={chips}
      leadsWaiting={leadsWaiting}
      latest={latest ?? []}
      health={health}
    />
  )
}
