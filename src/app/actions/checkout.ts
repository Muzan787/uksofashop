'use server'

import { after } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { sendOrderConfirmation, sendAdminOrderNotification } from '@/utils/email'
import { deliveryBreakdown, NO_EXTRAS, type DeliveryOptions } from '@/constants/delivery'
import { isValidUkMobile, UK_MOBILE_ERROR } from '@/utils/phone'
import { z } from 'zod'
import { cookies, headers } from 'next/headers'
import { rateLimit, callerKey } from '@/utils/rateLimit'

/** What the browser is allowed to tell us: what was ordered, never what it costs. */
export interface CartItem {
  variant_id: string
  quantity: number
  /** Made-to-order lines only. The database re-reads the name from this id. */
  fabric_id?: string | null
}

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Full name must be at least 2 characters.'),
  customerEmail: z.string().email('Please provide a valid email address.'),
  // A UK mobile specifically: the driver calls before delivery, and the admin
  // WhatsApp link can only be built from a mobile.
  customerPhone: z.string().refine(isValidUkMobile, UK_MOBILE_ERROR),
  shippingAddress: z.string().min(10, 'Please provide a complete shipping address.'),
  specialInstructions: z.string().optional(),
})

const extrasSchema = z.object({
  floor: z.number().int().min(0).max(20),
  hasLift: z.boolean(),
  assembly: z.boolean(),
  sofaRemoval: z.boolean(),
})

const itemsSchema = z.array(z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  fabric_id: z.string().uuid().nullish(),
})).min(1, 'Your cart is empty.')

interface PlacedOrder {
  id: string
  items_subtotal: number
  delivery_total: number
  total_amount: number
}

export async function placeOrder(
  formData: FormData,
  cartItems: CartItem[],
  expectedTotal: number,
  extras: DeliveryOptions = NO_EXTRAS,
) {
  // place_order is anon-callable and sends two emails per successful call,
  // through the same mailbox that has a daily cap. Ten orders per hour from
  // one address is well beyond any real customer and far below the cap.
  const limit = rateLimit(callerKey(await headers(), 'order'), 10, 60 * 60 * 1000)
  if (!limit.ok) {
    return { error: 'Too many orders from this connection. Please call us on 07476 616022 and we will take it over the phone.' }
  }

  const supabase = await createClient()

  const validatedData = checkoutSchema.safeParse({
    customerName: formData.get('customerName'),
    customerEmail: formData.get('customerEmail'),
    customerPhone: formData.get('customerPhone'),
    shippingAddress: formData.get('shippingAddress'),
    specialInstructions: formData.get('specialInstructions'),
  })
  if (!validatedData.success) {
    return { error: validatedData.error.issues[0].message }
  }

  const validatedItems = itemsSchema.safeParse(cartItems)
  if (!validatedItems.success) {
    return { error: validatedItems.error.issues[0].message }
  }

  const validatedExtras = extrasSchema.safeParse(extras)
  if (!validatedExtras.success) {
    return { error: 'Those delivery options are not valid. Please review them and try again.' }
  }

  const { customerName, customerEmail, customerPhone, shippingAddress, specialInstructions } = validatedData.data
  const opts = validatedExtras.data

  const { data, error: orderError } = await supabase.rpc('place_order', {
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_customer_phone: customerPhone,
    p_shipping_address: shippingAddress,
    p_special_instructions: specialInstructions || '',
    // Ids and quantities only. Prices are looked up in the database.
    p_items: validatedItems.data.map(item => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
      // Just the id. The fabric's name and code are snapshotted onto the order
      // by place_order, from the database's own row rather than the browser's.
      fabric_id: item.fabric_id ?? null,
    })),
    p_expected_total: expectedTotal,
    p_delivery_floor: opts.floor,
    p_delivery_has_lift: opts.hasLift,
    p_wants_assembly: opts.assembly,
    p_wants_sofa_removal: opts.sofaRemoval,
  })

  if (orderError || !data) {
    console.error('Supabase Order Error:', orderError)
    const message = orderError?.message ?? ''

    if (message.includes('PRICE_MISMATCH')) {
      return { error: 'Prices have changed since you added these items. Please refresh the page and check your total before ordering.' }
    }
    if (message.includes('UNAVAILABLE_ITEMS')) {
      return { error: 'One of the items in your basket is no longer available. Please remove it and try again.' }
    }
    if (message.includes('EMPTY_CART')) {
      return { error: 'Your cart is empty.' }
    }
    if (message.includes('UNAVAILABLE_FABRIC')) {
      return { error: 'One of the fabrics in your basket is no longer available. Please choose another and try again.' }
    }
    return { error: 'We could not place your order. Please try again, or call us on 07476 616022.' }
  }

  // Totals as the database computed them, not as the browser reported them, so
  // the confirmation email can never disagree with the order record.
  const order = data as unknown as PlacedOrder
  const shortCode = order.id.substring(0, 8).toUpperCase()
  const breakdown = deliveryBreakdown(opts)

  // Sent after the response goes back to the customer. The order is already
  // committed at this point, so a slow or unreachable mail server delays a
  // notification rather than the confirmation screen - previously these two
  // awaits sat between the customer clicking Place Order and seeing it work.
  after(async () => {
    try {
      await Promise.all([
        sendOrderConfirmation(
          customerEmail, customerName, shortCode, order.id,
          Number(order.total_amount), Number(order.items_subtotal), breakdown,
        ),
        sendAdminOrderNotification(
          customerName, customerEmail, customerPhone, shortCode, order.id,
          Number(order.total_amount), Number(order.items_subtotal), breakdown,
        ),
      ])
    } catch (err) {
      // The order is safe either way; this only loses the emails.
      console.error(`Failed to send confirmation emails for order ${shortCode}`, err)
    }
  })

  // Advertising identifiers, saved for later.
  //
  // The Purchase conversion is no longer reported here - it fires when the
  // order reaches 'confirmed', minutes later, from the admin panel. By then
  // the customer's browser is gone, so anything that ties the conversion back
  // to the ad click has to be captured now and stored on the order.
  //
  // Only present when the visitor accepted cookies; the tags that write these
  // do not run otherwise.
  const jar = await cookies()
  const hdrs = await headers()

  const attribution = {
    ga_client_id: jar.get('_ga')?.value ?? null,
    meta_fbp: jar.get('_fbp')?.value ?? null,
    meta_fbc: jar.get('_fbc')?.value ?? null,
    // Meta requires client_user_agent for website events, and the IP
    // materially improves match quality. They have to be taken from THIS
    // request: at confirmation time the only headers available belong to the
    // admin, and sending those would attribute the sale to their device.
    customer_user_agent: hdrs.get('user-agent'),
    customer_ip:
      hdrs.get('x-forwarded-for')?.split(',')[0].trim() ||
      hdrs.get('x-real-ip') ||
      null,
  }

  if (attribution.ga_client_id || attribution.meta_fbp || attribution.meta_fbc) {
    after(async () => {
      const { error: attrError } = await supabase
        .from('orders')
        .update(attribution)
        .eq('id', order.id)
      if (attrError) {
        // Costs attribution quality on this one order, nothing more.
        console.error(`Could not store attribution ids for order ${shortCode}`, attrError)
      }
    })
  }

  return { success: true, orderId: shortCode, total: Number(order.total_amount) }
}
