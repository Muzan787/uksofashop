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