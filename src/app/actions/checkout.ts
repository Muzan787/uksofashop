// src/app/actions/checkout.ts
'use server'

import { createClient } from '@/utils/supabase/server'

export interface CartItem {
  variant_id: string
  quantity: number
  price: number
}

export async function placeOrder(formData: FormData, cartItems: CartItem[], totalAmount: number) {
  const supabase = await createClient()

  const customerName = formData.get('customerName') as string
  const customerEmail = formData.get('customerEmail') as string
  const customerPhone = formData.get('customerPhone') as string
  const shippingAddress = formData.get('shippingAddress') as string

  // 1. Insert the main order record
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      shipping_address: shippingAddress,
      total_amount: totalAmount,
      status: 'pending_cod', // Default status for Cash on Delivery
    })
    .select('id')
    .single()

// ---> UPDATED: Show the exact Supabase error <---
  if (orderError || !order) {
    console.error("Supabase Order Error:", orderError)
    return { error: `Database Error: ${orderError?.message || 'Could not insert order'}` }
  }

  // 2. Insert all the individual items from the cart
  const orderItemsData = cartItems.map((item) => ({
    order_id: order.id,
    variant_id: item.variant_id,
    quantity: item.quantity,
    price_at_time_of_purchase: item.price,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsData)

  if (itemsError) {
    return { error: 'Order created, but failed to save items.' }
  }

  return { success: true, orderId: order.id }
}