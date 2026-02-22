// src/app/actions/checkout.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

export interface CartItem {
  variant_id: string
  quantity: number
  price: number
}

// 1. Define the validation schema
const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Full name must be at least 2 characters.'),
  customerEmail: z.string().email('Please provide a valid email address.'),
  customerPhone: z.string().min(8, 'Please provide a valid phone number.'),
  shippingAddress: z.string().min(10, 'Please provide a complete shipping address.'),
})

export async function placeOrder(formData: FormData, cartItems: CartItem[], totalAmount: number) {
  const supabase = await createClient()

  // 2. Extract and parse data safely
  const rawData = {
    customerName: formData.get('customerName'),
    customerEmail: formData.get('customerEmail'),
    customerPhone: formData.get('customerPhone'),
    shippingAddress: formData.get('shippingAddress'),
  }

  const validatedData = checkoutSchema.safeParse(rawData)

  // 3. Return exact error messages to the frontend if validation fails
  if (!validatedData.success) {
    return { error: validatedData.error.issues[0].message }
  }

  // Use the cleanly parsed and typed data
  const { customerName, customerEmail, customerPhone, shippingAddress } = validatedData.data

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      shipping_address: shippingAddress,
      total_amount: totalAmount,
      status: 'pending_cod',
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error("Supabase Order Error:", orderError)
    return { error: 'Database Error: Could not insert order.' }
  }

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