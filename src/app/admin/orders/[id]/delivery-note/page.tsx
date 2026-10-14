import type { Metadata } from 'next'
// src/app/admin/orders/[id]/delivery-note/page.tsx
//
// The driver's delivery note (admin upgrade H1): who and where, the agreed
// day, getting it in, what is on the van, what to collect, and a space for
// the customer's signature. No prices but the one to collect.
//
// It sits beside the invoice print, which is unchanged. This loads the order;
// DeliveryNote.tsx shows it, and only it prints.
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { loadOrder } from '../../orderData'
import { shortCode } from '../../OrderBits'
import DeliveryNote from './DeliveryNote'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { id } = await props.params
  return { title: UUID.test(id) ? `Delivery note #${shortCode(id)}` : 'Delivery note' }
}

export default async function DeliveryNotePage(props: { params: Params }) {
  const { id } = await props.params
  if (!UUID.test(id)) notFound()

  const supabase = await createClient()
  const { data: order } = await loadOrder(supabase, id)
  if (!order) notFound()

  return <DeliveryNote order={order} />
}
