// src/app/actions/orders.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendOrderStatusUpdate, sendAdminOrderStatusNotification } from '@/utils/email'

export async function updateOrderStatus(formData: FormData) {
  const supabase = await createClient()
  
  const orderId = formData.get('orderId') as string
  const newStatus = formData.get('status') as string

  if (!orderId || !newStatus) {
    return { error: 'Missing order ID or status' }
  }

  // Fetch the order details, INCLUDING customer_phone
  const { data: order } = await supabase
    .from('orders')
    .select('customer_email, customer_name, customer_phone') 
    .eq('id', orderId)
    .single()

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  if (error) {
    return { error: 'Failed to update order status.' }
  }

  // --- TRIGGER EMAILS ---
  if (order && order.customer_email) {
    try {
      const shortCode = orderId.substring(0, 8).toUpperCase();

      // 1. Send the automated generic update to the customer
      await sendOrderStatusUpdate(order.customer_email, order.customer_name, orderId, newStatus)
      
      // 2. Send the highly-personalized WhatsApp prompt to the Admin
      if (order.customer_phone) {
        await sendAdminOrderStatusNotification(
          order.customer_name, 
          order.customer_phone, 
          shortCode, 
          newStatus
        )
      }
    } catch (err) {
      console.error('Failed to send status update emails', err)
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

export async function trackOrdersByPostcode(postcode: string) {
  const supabase = await createClient()

  const cleanPostcode = postcode.trim().toUpperCase();
  
  if (cleanPostcode.length < 4) {
    return { error: "Please enter a valid UK postcode." }
  }

  // Search the shipping address for the postcode (case-insensitive)
  // and order the results so the newest order is first.
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
    .ilike('shipping_address', `%${cleanPostcode}%`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Supabase Tracking Error:", error.message); 
    return { error: "We encountered an issue fetching your orders. Please try again." }
  }

  if (!data || data.length === 0) {
    return { error: "We couldn't find any orders matching that postcode." }
  }

  return { success: true, orders: data }
}