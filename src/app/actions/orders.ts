// src/app/actions/orders.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateOrderStatus(formData: FormData) {
  const supabase = await createClient()
  
  const orderId = formData.get('orderId') as string
  const newStatus = formData.get('status') as string

  if (!orderId || !newStatus) {
    return { error: 'Missing order ID or status' }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  if (error) {
    return { error: 'Failed to update order status.' }
  }

  revalidatePath('/admin/orders')
  return { success: true }
}

export async function trackOrderByShortCode(shortCode: string) {
  const supabase = await createClient()

  // Supabase uses PostgREST, allowing us to cast the UUID to text on the fly
  // and use the 'like' operator to match the first 8 characters.
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, created_at, total_amount, shipping_address,
      order_items (
        quantity,
        price_at_time_of_purchase,
        product_variants ( color, products (title) )
      )
    `)
    .filter('id::text', 'like', `${shortCode.toLowerCase()}%`)
    .single()

  if (error || !data) {
    return { error: "We couldn't find an order matching that reference code." }
  }

  return { success: true, order: data }
}