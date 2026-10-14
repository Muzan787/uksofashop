import type { Metadata } from 'next'
// src/app/admin/orders/[id]/page.tsx
//
// One order, on its own page (admin upgrade E1-E13). This loads the order and
// everything around it; OrderView.tsx shows it.
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { loadOrder, loadPickers } from '../orderData'
import { shortCode } from '../OrderBits'
import { orderReviewLinks } from '@/utils/jobs/reviewRequests'
import OrderView, { type OrderFlowSend } from './OrderView'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>
type SearchParams = Promise<Record<string, string | undefined>>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { id } = await props.params
  return { title: UUID.test(id) ? `Order #${shortCode(id)}` : 'Order' }
}

export default async function AdminOrderPage(props: { params: Params; searchParams: SearchParams }) {
  const { id } = await props.params
  const sp = await props.searchParams
  if (!UUID.test(id)) notFound()

  const supabase = await createClient()
  const { data: order } = await loadOrder(supabase, id)
  if (!order) notFound()

  const [{ data: events }, { data: sends }, pickers, { data: { user } }, reviewLinks] = await Promise.all([
    supabase.from('order_events').select('id, created_at, kind, from_status, to_status, staff_id, note').eq('order_id', id).order('created_at', { ascending: true }),
    supabase.rpc('order_orderflow_sends', { p_order_id: id }),
    loadPickers(supabase),
    supabase.auth.getUser(),
    order.status === 'delivered' ? orderReviewLinks(order.id) : Promise.resolve([]),
  ])

  return (
    <OrderView
      order={order}
      events={events ?? []}
      sends={(sends ?? []) as unknown as OrderFlowSend[]}
      reviewLinks={reviewLinks}
      pickers={pickers}
      userId={user?.id ?? null}
      sp={sp}
    />
  )
}
