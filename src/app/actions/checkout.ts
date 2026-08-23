'use server'

import { createClient } from '@/utils/supabase/server'
import { sendOrderConfirmation, sendAdminOrderNotification } from '@/utils/email'
import { z } from 'zod'

export interface CartItem {
  variant_id: string
  quantity: number
  price: number
}

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Full name must be at least 2 characters.'),
  customerEmail: z.string().email('Please provide a valid email address.'),
  customerPhone: z.string().min(8, 'Please provide a valid phone number.'),
  shippingAddress: z.string().min(10, 'Please provide a complete shipping address.'),
  specialInstructions: z.string().optional(),
})

export async function placeOrder(formData: FormData, cartItems: CartItem[], totalAmount: number) {
  const supabase = await createClient()

  const rawData = {
    customerName: formData.get('customerName'),
    customerEmail: formData.get('customerEmail'),
    customerPhone: formData.get('customerPhone'),
    shippingAddress: formData.get('shippingAddress'),
    specialInstructions: formData.get('specialInstructions'),
  }

  const validatedData = checkoutSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.issues[0].message }
  }

  const { customerName, customerEmail, customerPhone, shippingAddress, specialInstructions } = validatedData.data

  const { data: orderId, error: orderError } = await supabase.rpc('place_order', {
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_customer_phone: customerPhone,
    p_shipping_address: shippingAddress,
    p_special_instructions: specialInstructions || '',
    p_total_amount: totalAmount,
    p_items: cartItems.map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.price,
    })),
  })

  if (orderError || !orderId) {
    console.error("Supabase Order Error:", orderError)
    return { error: 'Database Error: Could not insert order.' }
  }

  const order = { id: orderId }

  // Return only the first 8 characters for the user-facing short code
  const shortCode = order.id.substring(0, 8).toUpperCase()

  // --- ADD THIS EMAIL TRIGGER ---
  try {
    // 1. Send email to customer to confirm
    await sendOrderConfirmation(customerEmail, customerName, shortCode, order.id, totalAmount)
    
    // 2. Extract phone number from form data to pass to the admin email
    const customerPhone = formData.get('phone') as string || ''; 

    // 3. Send email to admin with the WhatsApp Link
    await sendAdminOrderNotification(
      customerName, 
      customerEmail, 
      customerPhone, // <-- newly added
      shortCode, 
      order.id,      // <-- newly added
      totalAmount
    )
  } catch (err) {
    console.error("Failed to send confirmation emails", err)
  }

  return { success: true, orderId: shortCode }
}