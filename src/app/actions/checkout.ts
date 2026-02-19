// src/app/actions/checkout.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Define the shape of our cart items for the action
export type CartItem = {
  variant_id: string
  quantity: number
  price: number
}

export async function submitCodOrder(formData: FormData, cartItems: CartItem[], totalAmount: number) {
  const supabase = createClient()

  // 1. Extract customer details from the form
  const customerName = formData.get('name') as string
  const customerPhone = formData.get('phone') as string
  const shippingAddress = formData.get('address') as string

  if (!customerName || !customerPhone || !shippingAddress || cartItems.length === 0) {
    return { error: 'Missing required fields or empty cart.' }
  }

  // 2. Insert the main Order record
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name: customerName,
      customer_phone: customerPhone,
      shipping_address: shippingAddress,
      total_amount: totalAmount,
      status: 'pending_cod'
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return { error: 'Failed to create order. Please try again.' }
  }

  // 3. Prepare and insert the Order Items
  const orderItemsData = cartItems.map(item => ({
    order_id: order.id,
    variant_id: item.variant_id,
    quantity: item.quantity,
    price_at_time_of_purchase: item.price
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsData)

  if (itemsError) {
    return { error: 'Order created, but failed to save items.' }
  }

  // Optional: Clear cached pages if needed
  revalidatePath('/admin/orders')

  return { success: true, orderId: order.id }
}