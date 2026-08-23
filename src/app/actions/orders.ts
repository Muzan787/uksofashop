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

  // 3. Look up via a database function - it only ever returns the single order
  // matching this exact short code, so the anon key can't be used to browse
  // every order in the table.
  const { data, error } = await supabase.rpc('track_order_by_shortcode', {
    p_shortcode: hexCode,
  })

  if (error || !data) {
    // Logging the error to your terminal so you can see if something else is wrong
    console.error("Supabase Tracking Error:", error?.message || "No data returned"); 
    return { error: "We couldn't find an order matching that reference code." }
  }

  return { success: true, order: data }
}

export async function confirmCustomerOrder(orderId: string) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('confirm_order', { p_order_id: orderId })

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

  // 1. Remove all spaces from whatever the user typed and make it uppercase
  const noSpace = postcode.replace(/\s+/g, '').toUpperCase();
  
  // Basic validation (shortest UK postcode without spaces is 5 chars, e.g. M11AA, but checking 4 is a safe baseline)
  if (noSpace.length < 4) {
    return { error: "Please enter a valid UK postcode." }
  }

  // 2. Reconstruct the standard spaced format mathematically.
  // The inward code (end) is ALWAYS exactly 3 characters.
  // e.g., "SW1A1AA" becomes "SW1A 1AA"
  const withSpace = `${noSpace.slice(0, -3)} ${noSpace.slice(-3)}`;

  // 3. Search via a database function for EITHER the spaceless version OR the
  // spaced version - it returns only curated order-progress fields, never the
  // full table, so the anon key can't be used to browse every customer's orders.
  const { data: rpcData, error } = await supabase.rpc('track_orders_by_postcode', {
    p_nospace: noSpace,
    p_spaced: withSpace,
  })
  const data = rpcData as unknown as any[] | null

  if (error) {
    console.error("Supabase Tracking Error:", error.message);
    return { error: "We encountered an issue fetching your orders. Please try again." }
  }

  if (!data || data.length === 0) {
    return { error: "We couldn't find any orders matching that postcode." }
  }

  return { success: true, orders: data }
}