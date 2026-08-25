// src/app/actions/orders.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { reportOrderConversion } from '@/utils/orderConversions'
import { sendOrderStatusUpdate, sendAdminOrderStatusNotification } from '@/utils/email'
import { requireAdmin } from '@/utils/auth'
import type { TrackedOrder } from '@/types/orders'

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
  const { data: order } = await supabase
    .from('orders')
    .select('customer_email, customer_name, customer_phone, shipping_address')
    .eq('id', orderId)
    .single()

  // delivered_at is stamped the first time an order reaches 'delivered' and
  // never moved again, so the review-request delay is measured from the real
  // delivery rather than from a later status correction.
  const patch: { status: string; delivered_at?: string } =
    newStatus === 'delivered'
      ? { status: newStatus, delivered_at: new Date().toISOString() }
      : { status: newStatus }

  const { error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)

  if (error) {
    return { error: 'Failed to update order status.' }
  }

  // --- TRIGGER EMAILS ---
  if (order && order.customer_email) {
    try {
      const shortCode = orderId.substring(0, 8).toUpperCase()
      const postcode = extractPostcode(order.shipping_address)

      // 1. Send the automated generic update to the customer
      await sendOrderStatusUpdate(
        order.customer_email,
        order.customer_name,
        orderId,
        newStatus,
        postcode
      )

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

  // --- CONVERSION REPORTING ---
  // Deferred so a slow call to Meta or Google cannot hold up the admin panel,
  // and reported at 'confirmed' rather than at order placement - see
  // utils/orderConversions.ts for why. Both are idempotent, so moving an order
  // back and forth between statuses does not report anything twice.
  if (newStatus === 'confirmed' || newStatus === 'delivered') {
    after(() =>
      reportOrderConversion(
        supabase,
        orderId,
        newStatus === 'confirmed' ? 'purchase' : 'delivered',
      ),
    )
  }

  revalidatePath('/admin/orders')
  return { success: true }
}

export async function confirmCustomerOrder(orderId: string) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('confirm_order', { p_order_id: orderId })

  if (error) {
    return { error: 'Failed to confirm order. Please contact support.' }
  }

  // The customer confirming from their email reaches 'confirmed' too, so the
  // Purchase conversion has to be reported here as well. The guard column
  // means whichever path gets there first is the only one that reports.
  after(() => reportOrderConversion(supabase, orderId, 'purchase'))

  // Refresh the confirmation page and admin panel to show the new status
  revalidatePath(`/confirm-order/${orderId}`)
  revalidatePath('/admin/orders')
  return { success: true }
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
