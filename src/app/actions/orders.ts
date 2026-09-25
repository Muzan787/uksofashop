// src/app/actions/orders.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { reportOrderConversion } from '@/utils/orderConversions'
import { sendOrderStatusUpdate, sendAdminOrderStatusNotification, sendAdminOrderConfirmedNotification } from '@/utils/email'
import { requireAdmin } from '@/utils/auth'
import { createAdminClient } from '@/utils/supabase/admin'
import { z } from 'zod'
import { isValidUkMobile, UK_MOBILE_ERROR } from '@/utils/phone'
import type { ConfirmationOrder, TrackedOrder } from '@/types/orders'

/**
 * Pull the postcode off the end of a stored shipping address.
 * Checkout appends ", POSTCODE" when the order is placed, so it is the last
 * thing in the string. Returns '' when the address doesn't end in something
 * postcode-shaped, in which case tracking links are sent without it.
 */
function extractPostcode(address: string | null): string {
  if (!address) return ''
  const match = address
    .toUpperCase()
    .match(/([A-Z]{1,2}[0-9][A-Z0-9]?)\s*([0-9][A-Z]{2})\s*$/)
  return match ? `${match[1]} ${match[2]}` : ''
}

export async function updateOrderStatus(formData: FormData) {
  // Throws rather than returning an error: the admin orders page discards this
  // action's return value, so an { error } object would be swallowed silently.
  await requireAdmin()

  const supabase = await createClient()

  const orderId = formData.get('orderId') as string
  const newStatus = formData.get('status') as string

  if (!orderId || !newStatus) {
    return { error: 'Missing order ID or status' }
  }

  // shipping_address is fetched so the tracking link in the status email can
  // carry the postcode - tracking now needs the reference AND the postcode.
  // confirmed_at/cancelled_at are fetched so they can be stamped once, the
  // first time an order reaches that status, and never overwritten after -
  // the same "first time only" guarantee delivered_at already has.
  const { data: order } = await supabase
    .from('orders')
    .select('customer_email, customer_name, customer_phone, shipping_address, confirmed_at, processing_at, shipped_at, delivered_at, cancelled_at')
    .eq('id', orderId)
    .single()

  // delivered_at is stamped the first time an order reaches 'delivered' and
  // never moved again, so the review-request delay is measured from the real
  // delivery rather than from a later status correction.
  const patch: {
    status: string
    delivered_at?: string
    confirmed_at?: string
    processing_at?: string
    shipped_at?: string
    cancelled_at?: string
    cancellation_reason?: string
  } = { status: newStatus }

  if (newStatus === 'delivered' && !order?.delivered_at) patch.delivered_at = new Date().toISOString()
  if (newStatus === 'confirmed' && !order?.confirmed_at) patch.confirmed_at = new Date().toISOString()
  if (newStatus === 'processing' && !order?.processing_at) patch.processing_at = new Date().toISOString()
  if (newStatus === 'shipped' && !order?.shipped_at) patch.shipped_at = new Date().toISOString()
  if (newStatus === 'cancelled' && !order?.cancelled_at) {
    patch.cancelled_at = new Date().toISOString()
    const reason = formData.get('cancellationReason')
    if (typeof reason === 'string' && reason.trim()) patch.cancellation_reason = reason.trim()
  }

  const { error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)

  if (error) {
    return { error: 'Failed to update order status.' }
  }

  // --- TRIGGER EMAILS ---
  //
  // Two independent sends. The customer's update needs an email address; a
  // WhatsApp order often has none, and it used to take the shop's own
  // WhatsApp prompt down with it - so an order with only a phone number got
  // no nudge at any stage. The prompt goes whenever there is a number.
  if (order) {
    const shortCode = orderId.substring(0, 8).toUpperCase()

    // 1. The customer's update, when there is somewhere to send it.
    if (order.customer_email) {
      try {
        const postcode = extractPostcode(order.shipping_address)
        const { trustpilotInvited } = await sendOrderStatusUpdate(
          order.customer_email,
          order.customer_name,
          orderId,
          newStatus,
          postcode
        )

        // The delivered email went to Trustpilot's invitation service as well,
        // so this customer is being asked for a review. Stamp the order so the
        // review-request cron (api/cron/review-requests) does not ask a second
        // time three days later. One customer, one ask.
        if (trustpilotInvited) {
          await supabase
            .from('orders')
            .update({ review_request_sent_at: new Date().toISOString() })
            .eq('id', orderId)
            .is('review_request_sent_at', null)
        }
      } catch (err) {
        console.error('Failed to send the customer status email', err)
      }
    }

    // 2. The shop's WhatsApp prompt for this stage, whenever there is a number.
    if (order.customer_phone) {
      try {
        await sendAdminOrderStatusNotification(
          order.customer_name,
          order.customer_phone,
          shortCode,
          newStatus
        )
      } catch (err) {
        console.error('Failed to send the admin status notification', err)
      }
    }
  }

  // Conversion reporting is deliberately manual from the admin panel.
  // Changing operational status must never silently tell an ad platform that
  // money changed hands. The order card exposes an explicit, idempotent
  // "Send Purchase" / "Send Delivered" action after the relevant status exists.

  revalidatePath('/admin/orders')
  revalidatePath('/admin/meta')
  return { success: true }
}


/**
 * Explicit advertising conversion action for the admin order card.
 *
 * Status is business truth. Advertising is a second, deliberate action.
 * This prevents tests, mistaken confirmations and status corrections from
 * silently training Meta. reportOrderConversion remains idempotent, so a
 * double-click cannot produce a duplicate event.
 */
export async function sendOrderConversion(formData: FormData) {
  await requireAdmin()

  const orderId = String(formData.get('orderId') ?? '')
  const kind = String(formData.get('kind') ?? '') as 'purchase' | 'delivered'
  if (!orderId || (kind !== 'purchase' && kind !== 'delivered')) {
    return { error: 'Missing order or conversion type.' }
  }

  const supabase = await createClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, confirmed_at, delivered_at, purchase_event_sent_at, delivered_event_sent_at, utm_campaign, cancellation_reason')
    .eq('id', orderId)
    .single()

  if (error || !order) return { error: 'Order could not be loaded.' }

  const looksLikeQa =
    order.utm_campaign === 'offer-test' ||
    /(?:^|\b)(?:test|testing|qa)(?:\b|$)/i.test(order.cancellation_reason ?? '')

  if (looksLikeQa) {
    return { error: 'This order is classified as test/QA. Advertising conversion blocked.' }
  }

  if (order.status === 'cancelled') {
    return { error: 'Cancelled orders cannot send advertising conversion events.' }
  }

  if (kind === 'purchase' && !order.confirmed_at) {
    return { error: 'Confirm the order first, then send the Purchase event.' }
  }

  if (kind === 'delivered' && (!order.delivered_at || order.status !== 'delivered')) {
    return { error: 'Mark the order Delivered first.' }
  }

  // A delivered sale should never have the deeper signal without the standard
  // Purchase. If somebody skipped the earlier button, repair the sequence here.
  if (kind === 'delivered' && !order.purchase_event_sent_at) {
    await reportOrderConversion(orderId, 'purchase')
  }
  await reportOrderConversion(orderId, kind)

  const sentColumn = kind === 'purchase' ? 'purchase_event_sent_at' : 'delivered_event_sent_at'
  const { data: verified } = await supabase
    .from('orders')
    .select('purchase_event_sent_at, delivered_event_sent_at')
    .eq('id', orderId)
    .single()

  if (!verified?.[sentColumn]) {
    return { error: 'The conversion was not marked as sent. Please retry or inspect tracking logs.' }
  }

  revalidatePath('/admin/orders')
  revalidatePath('/admin/meta')
  return { success: true }
}

// ─── Editing an order ─────────────────────────────────────────────────────────

const editLineSchema = z.object({
  /** The existing line's id, so its /build customisation survives the edit. */
  item_id: z.string().uuid().nullish(),
  variant_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  unit_price: z.number().nonnegative().max(1_000_000),
  fabric_id: z.string().uuid().nullish(),
})

const editSchema = z.object({
  orderId: z.string().uuid(),
  customerName: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
  customerEmail: z.union([z.string().trim().email('That email address is not valid.'), z.literal('')]),
  customerPhone: z.string().trim().refine(isValidUkMobile, UK_MOBILE_ERROR),
  shippingAddress: z.string().trim().min(6, 'Please give a delivery address.'),
  postcode: z.string().trim().min(5, 'Please give a valid UK postcode.').max(16),
  specialInstructions: z.string().trim().max(1000).optional(),
  /** YYYY-MM-DD or empty. Any date: an old order may legitimately carry a day that has passed. */
  preferredDeliveryDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.'), z.literal('')]),
  deliveryTotal: z.number().nonnegative().max(10_000),
  items: z.array(editLineSchema).min(1, 'An order needs at least one line.'),
})

export type EditOrderInput = z.input<typeof editSchema>

/**
 * Change an existing order from the admin panel - customer, address, notes,
 * the agreed delivery day and charge, the lines. Silent on purpose: no
 * status change, no email, no conversion event; only the record changes.
 * The database function recomputes the totals and swaps the lines in one
 * transaction (see 20260920120000_update_order_details.sql).
 */
export async function updateOrderDetails(input: EditOrderInput): Promise<{ success: true; total: number } | { error: string }> {
  await requireAdmin()

  const parsed = editSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the order details.' }
  }
  const v = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('update_order_details', {
    p_order_id: v.orderId,
    p_customer_name: v.customerName,
    p_customer_email: v.customerEmail || null,
    p_customer_phone: v.customerPhone,
    // Postcode on the end, as every other writer stores it - tracking and
    // conversion matching both read it back from there.
    p_shipping_address: `${v.shippingAddress.replace(/[,\s]+$/, '')}, ${v.postcode.toUpperCase()}`,
    p_special_instructions: v.specialInstructions || '',
    p_preferred_delivery_date: v.preferredDeliveryDate || null,
    p_delivery_total: v.deliveryTotal,
    p_items: v.items.map(i => ({
      item_id: i.item_id ?? null,
      variant_id: i.variant_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      fabric_id: i.fabric_id ?? null,
    })),
  })

  if (error || !data) {
    console.error('update_order_details failed:', error)
    const message = error?.message ?? ''
    if (message.includes('NOT_AUTHORISED')) return { error: 'You are not authorised to edit orders.' }
    if (message.includes('NOT_FOUND')) return { error: 'That order no longer exists.' }
    if (message.includes('UNAVAILABLE_ITEMS')) return { error: 'One of those sofas could not be found in the catalogue.' }
    if (message.includes('UNAVAILABLE_FABRIC')) return { error: 'One of those fabrics could not be found.' }
    return { error: 'Could not save the changes. Please try again.' }
  }

  revalidatePath('/admin/orders')
  revalidatePath('/admin/meta')
  revalidatePath('/admin')
  const result = data as unknown as { total_amount: number }
  return { success: true, total: Number(result.total_amount) }
}

/**
 * Delete an order outright - line items, its tracking rows, the lot.
 *
 * For test orders and mistakes, not for orders that went wrong: those are
 * cancelled with a reason, so the record of what happened survives. There is
 * no undo, which is why the button that calls this asks twice.
 *
 * Service role, because attribution_actions, conversion_events and
 * google_offline_conversions have no admin write policy of their own and
 * their foreign keys are NO ACTION - the order cannot go until they have.
 * Leads and reviews that pointed at the order are set null by their own
 * foreign keys; a WhatsApp enquiry that converted into it is unlinked here.
 */
export async function deleteOrder(orderId: string): Promise<{ success: true } | { error: string }> {
  await requireAdmin()
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return { error: 'That order id is not valid.' }

  const db = createAdminClient()
  const steps = [
    db.from('attribution_actions').delete().eq('order_id', orderId),
    db.from('conversion_events').delete().eq('order_id', orderId),
    db.from('google_offline_conversions').delete().eq('order_id', orderId),
    db.from('whatsapp_enquiries').update({ converted_order_id: null }).eq('converted_order_id', orderId),
  ]
  for (const step of steps) {
    const { error } = await step
    if (error) {
      console.error('deleteOrder: could not clear a dependent row', error)
      return { error: 'Could not delete the order: a linked record refused. Nothing was removed.' }
    }
  }

  const { error } = await db.from('orders').delete().eq('id', orderId)
  if (error) {
    console.error('deleteOrder failed', error)
    return { error: 'Could not delete the order.' }
  }

  revalidatePath('/admin/orders')
  revalidatePath('/admin/meta')
  revalidatePath('/admin')
  return { success: true }
}

/** What the confirm button's form reports back. Null once it has worked. */
export type ConfirmOrderState = { error: string } | null

/**
 * The customer confirming their own order, from the button on
 * /confirm-order/[id].
 *
 * On POST, never on GET. The page used to confirm the order by being loaded,
 * which meant the confirmation could be given by whatever pre-fetched the link
 * - a mail provider's scanner, a security appliance, WhatsApp drawing a
 * preview card - rather than by the customer reading the order. Same reasoning
 * as newsletter double opt-in; see actions/newsletter-confirm.ts.
 *
 * confirm_order is guarded on pending_cod, so this is safe to press twice and
 * cannot move an order backwards out of processing, shipped or cancelled.
 *
 * A confirmation that actually moves the order emails the shop, because
 * nothing else announces it - the admin panel just changes colour, which is no
 * help to somebody who is not looking at it. The shop is NOT emailed when it
 * confirms an order itself from the order card; see the note on
 * sendAdminOrderConfirmedNotification.
 *
 * Conversion reporting stays deliberately manual: an admin sends the Purchase
 * signal from the order card. A customer tapping a link never trains Meta.
 */
export async function confirmCustomerOrder(
  _previous: ConfirmOrderState,
  formData: FormData,
): Promise<ConfirmOrderState> {
  const orderId = String(formData.get('orderId') ?? '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    return { error: 'That link is not valid. Please open the link we sent you, or message us on WhatsApp.' }
  }

  const supabase = await createClient()

  // Read before writing. confirm_order returns the order in its POST-update
  // state, so the only way to tell a real confirmation from somebody opening
  // their link again a week later is to look first - and the shop's email
  // must go out on the tap that moved the order, not on every revisit.
  // It also saves a second round trip: this read carries everything the email
  // needs. Two taps inside the same second could still send twice; a duplicate
  // notification is a far smaller problem than a missed one.
  const { data: before } = await supabase.rpc('order_for_confirmation', { p_order_id: orderId })
  const order = before as unknown as ConfirmationOrder | null
  const wasAwaiting = order?.status === 'pending_cod'

  const { error } = await supabase.rpc('confirm_order', { p_order_id: orderId })

  if (error) {
    console.error('confirmCustomerOrder failed', error)
    return { error: 'We could not confirm your order just then. Please try again — or message us on WhatsApp and we will confirm it for you.' }
  }

  // Tell the shop, after the customer's redirect has gone out. The order is
  // committed by now, so a slow mail server delays a notification rather than
  // the page the customer is waiting on.
  if (wasAwaiting && order) {
    after(async () => {
      try {
        await sendAdminOrderConfirmedNotification(
          order.customer_name,
          order.customer_phone,
          orderId.substring(0, 8).toUpperCase(),
          Number(order.total_amount),
          order.shipping_address,
          order.preferred_delivery_date,
        )
      } catch (err) {
        // The confirmation itself is safe; this only loses the nudge.
        console.error(`Could not tell the shop that order ${orderId} was confirmed`, err)
      }
    })
  }

  revalidatePath(`/confirm-order/${orderId}`)
  revalidatePath('/admin/orders')
  // The conversion centre lists what is eligible for a Purchase signal, and a
  // just-confirmed order has become eligible.
  revalidatePath('/admin/meta')
  revalidatePath('/admin')

  // Redirect rather than rely on the action's own re-render: the page has to
  // come back in its confirmed state whatever happens, and `?confirmed=1` is
  // what lets it thank them for confirming rather than simply report that the
  // order is confirmed, which is what a later visit to the same link sees.
  redirect(`/confirm-order/${orderId}?confirmed=1`)
}

/**
 * Look up a single order for the public tracking page.
 *
 * Requires both the order reference and the delivery postcode. The database
 * function re-validates both and matches the postcode against the end of the
 * stored address, so these checks are a convenience for the UI rather than the
 * security boundary - a direct call to the REST endpoint is held to the same
 * rules.
 */
export async function trackOrder(reference: string, postcode: string) {
  const supabase = await createClient()

  const cleanRef = reference.replace(/[^0-9a-fA-F]/g, '').toLowerCase()
  const cleanPostcode = postcode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

  if (!/^[0-9a-f]{8}$/.test(cleanRef)) {
    return { error: 'Please enter your 8-character order reference, for example 5D786B72.' }
  }

  if (cleanPostcode.length < 5 || cleanPostcode.length > 8) {
    return { error: 'Please enter the delivery postcode for this order.' }
  }

  const { data, error } = await supabase.rpc('track_order', {
    p_reference: cleanRef,
    p_postcode: cleanPostcode,
  })

  if (error) {
    console.error('Supabase Tracking Error:', error.message)
    return { error: 'We had trouble looking that up. Please try again in a moment.' }
  }

  if (!data) {
    // Deliberately one message for both a wrong reference and a wrong postcode,
    // so the page can't be used to test references against random postcodes.
    return { error: "We couldn't find an order with that reference and postcode. Please check both and try again." }
  }

  return { success: true, order: data as unknown as TrackedOrder }
}
