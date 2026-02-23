// src/app/actions/orders.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendOrderStatusUpdate } from '@/utils/email'
export async function updateOrderStatus(formData: FormData) {
  const supabase = await createClient()
  
  const orderId = formData.get('orderId') as string
  const newStatus = formData.get('status') as string

  if (!orderId || !newStatus) {
    return { error: 'Missing order ID or status' }
  }

  // Fetch the order details first to get the customer email
  const { data: order } = await supabase
    .from('orders')
    .select('customer_email, customer_name')
    .eq('id', orderId)
    .single()

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  if (error) {
    return { error: 'Failed to update order status.' }
  }

  // --- ADD THIS EMAIL TRIGGER ---
  if (order && order.customer_email) {
    try {
      await sendOrderStatusUpdate(order.customer_email, order.customer_name, orderId, newStatus)
    } catch (err) {
      console.error('Failed to send status update email', err)
    }
  }

  revalidatePath('/admin/orders')
  return { success: true }
}

export async function trackOrderByShortCode(shortCode: string) {
  const supabase = await createClient()

  // 1. Clean the input and convert to lowercase hex
  const hexCode = shortCode.trim().toLowerCase();
  
  // 2. Validate that it is exactly 8 valid hexadecimal characters (0-9, a-f)
  // This prevents Postgres from throwing a 500 error if a user types "XYZ12345"
  if (!/^[0-9a-f]{8}$/.test(hexCode)) {
    return { error: "Please enter a valid 8-character order reference (letters A-F and numbers only)." }
  }

  // 3. Create the absolute minimum and maximum possible UUIDs for this short code
  const minUuid = `${hexCode}-0000-0000-0000-000000000000`;
  const maxUuid = `${hexCode}-ffff-ffff-ffff-ffffffffffff`;

  // 4. Use >= and <= operators. This avoids all casting issues and is 
  // incredibly fast because it uses the native Primary Key index!
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
    .gte('id', minUuid)
    .lte('id', maxUuid)
    .single()

  if (error || !data) {
    // Logging the error to your terminal so you can see if something else is wrong
    console.error("Supabase Tracking Error:", error?.message || "No data returned"); 
    return { error: "We couldn't find an order matching that reference code." }
  }

  return { success: true, order: data }
}

export async function confirmCustomerOrder(orderId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('orders')
    .update({ status: 'confirmed' })
    .eq('id', orderId)

  if (error) {
    return { error: 'Failed to confirm order. Please contact support.' }
  }

  // Refresh the confirmation page and admin panel to show the new status
  revalidatePath(`/confirm-order/${orderId}`)
  revalidatePath('/admin/orders')
  return { success: true }
}