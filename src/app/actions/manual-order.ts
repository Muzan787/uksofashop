'use server'

// src/app/actions/manual-order.ts
//
// Taking an order that was agreed in a WhatsApp conversation.
//
// WHY IT EXISTS. Click-to-WhatsApp campaigns send people into a chat, and Meta
// counts the chat. Until now nothing ever told it which chats became sales, so
// it has been optimising for people who message rather than people who buy -
// the same mistake, one channel over, that utils/orderConversions.ts exists to
// correct for the website. It could not be told, because a WhatsApp sale was
// not recorded anywhere: the orders table had exactly one writer, place_order,
// called from the website checkout.
//
// So this is first an operational record - a reference, a delivery address, a
// status the driver's day is planned from - and second an advertising signal.
// It earns its place on the first count alone.
//
// PRICING. place_order prices the basket itself and refuses any other figure,
// because it is callable by anyone. That guard cannot be relaxed, so the
// negotiated price goes through place_manual_order instead, which refuses
// anyone who is not an admin before it reads a thing. See the migration
// 20260904120000_whatsapp_orders.sql for the reasoning in full.
//
// NO EMAIL IS SENT. The website flow emails a confirmation because the customer
// has just typed their details into a form and left. Here the shop is already
// mid-conversation with them on WhatsApp, which is a better channel than an
// email they did not ask for - and the confirmation email carries a link that
// CONFIRMS the order, which is not something to hand out unprompted.

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { isValidUkMobile, UK_MOBILE_ERROR } from '@/utils/phone'

const itemSchema = z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  /**
   * The agreed per-unit price, or null to charge the catalogue price.
   *
   * Null rather than a pre-filled number, so "no discount" is recorded as a
   * decision to sell at list price rather than as a figure that happened to be
   * typed - and so a price change in the catalogue is not silently frozen into
   * an order taken before it.
   */
  unit_price: z.number().nonnegative().max(1_000_000).nullable(),
  fabric_id: z.string().uuid().nullish(),
})

const schema = z.object({
  customerName: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
  /**
   * Optional, unlike the website.
   *
   * On WhatsApp the number is what you have and the email is what you might
   * get. Requiring one would mean either inventing it or not recording the
   * order - and an order with a phone number is a perfectly good order. It is
   * worth asking for, though: a hashed email is the single strongest thing
   * Meta can match a person on.
   */
  customerEmail: z.union([z.string().trim().email('That email address is not valid.'), z.literal('')]),
  customerPhone: z.string().trim().refine(isValidUkMobile, UK_MOBILE_ERROR),
  shippingAddress: z.string().trim().min(6, 'Please give a delivery address.'),
  postcode: z.string().trim().min(5, 'Please give a valid UK postcode.').max(16),
  specialInstructions: z.string().trim().max(1000).optional(),
  /** One negotiated figure. There is no extras matrix on a phone call. */
  deliveryCharge: z.number().nonnegative().max(10_000),
  items: z.array(itemSchema).min(1, 'Add at least one sofa.'),
})

export type ManualOrderInput = z.input<typeof schema>

export type ManualOrderResult =
  | { success?: undefined; error: string }
  | { success: true; error?: undefined; orderId: string; total: number }

export async function createWhatsAppOrder(input: ManualOrderInput): Promise<ManualOrderResult> {
  // Checked here as well as inside place_manual_order. The database check is
  // the boundary that matters - a Server Action compiles to a public endpoint -
  // and this one exists so the form gets a sentence back rather than a raised
  // Postgres exception.
  if (!(await isAdmin())) {
    return { error: 'You are not authorised to take orders.' }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the order details.' }
  }
  const v = parsed.data

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('place_manual_order', {
    p_customer_name: v.customerName,
    // The column is nullable and the CAPI helper drops empty values, so an
    // absent email has to be absent rather than an empty string.
    p_customer_email: v.customerEmail || null,
    p_customer_phone: v.customerPhone,
    // Postcode appended, exactly as the website checkout does it: /track-order
    // matches the postcode against the END of the stored address, and
    // orderConversions.ts reads it back off the end for Meta's `zp`.
    p_shipping_address: `${v.shippingAddress}, ${v.postcode.toUpperCase()}`,
    p_special_instructions: v.specialInstructions || '',
    p_items: v.items.map(i => ({
      variant_id: i.variant_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      fabric_id: i.fabric_id ?? null,
    })),
    p_delivery_charge: v.deliveryCharge,
    p_source: 'whatsapp',
  })

  if (error || !data) {
    console.error('place_manual_order failed:', error)
    const message = error?.message ?? ''

    if (message.includes('NOT_AUTHORISED')) {
      return { error: 'You are not authorised to take orders.' }
    }
    if (message.includes('UNAVAILABLE_ITEMS')) {
      return { error: 'One of those sofas is no longer active in the catalogue.' }
    }
    if (message.includes('UNAVAILABLE_FABRIC')) {
      return { error: 'That fabric has been withdrawn. Pick another.' }
    }
    if (message.includes('EMPTY_CART')) {
      return { error: 'Add at least one sofa.' }
    }
    return { error: 'Could not save the order. Please try again.' }
  }

  const order = data as unknown as { id: string; total_amount: number }

  revalidatePath('/admin/orders')

  // Deliberately NOT reported to Meta here.
  //
  // It lands as 'pending_cod', like every website order, and the Purchase is
  // reported when it reaches 'confirmed' - the same guarded, idempotent path in
  // utils/orderConversions.ts, which now sends it as action_source 'chat'. A
  // conversation that produces an order is not yet a sale on cash on delivery,
  // and reporting one here would re-introduce exactly the overstatement that
  // moving Purchase off the checkout form removed.
  return {
    success: true,
    // The short reference, as the rest of the site uses it.
    orderId: order.id.substring(0, 8).toUpperCase(),
    total: Number(order.total_amount),
  }
}
