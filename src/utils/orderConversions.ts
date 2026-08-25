// src/utils/orderConversions.ts
//
// Reports an order's conversion to Meta and GA4, server-side.
//
// WHY SERVER-SIDE, AND WHY AT CONFIRMATION
//
// About a quarter of cash-on-delivery orders are never completed. Firing
// Purchase when the checkout form submits therefore overstated revenue by
// roughly a third, and - worse - told both platforms to optimise for people
// who fill in a form rather than people who pay.
//
// Confirmation happens within minutes of the order, so moving the event there
// removes most of that noise without the two costs that firing on DELIVERY
// would carry: conversions landing outside Meta's 7-day click window (delivery
// runs 2-4 days, 5-7 to Wales and Scotland), and an ad set never accumulating
// the ~50 conversions per week it needs to leave the learning phase.
//
// Confirmation is an admin action, long after the customer closed the tab, so
// there is no browser to send from. Hence the Conversions API and the GA4
// Measurement Protocol, using the identifiers saved on the order at checkout.
//
// A separate 'OrderDelivered' event reports what was actually collected. That
// is the true-revenue number for reporting; Purchase remains the optimisation
// signal. Comparing the two counts is what reveals the real completion rate.

import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { sendCapiEvent } from '@/utils/metaCapi'
import { sendGa4Event, clientIdFromGaCookie } from '@/utils/ga4Server'
import { SITE_URL } from '@/constants/site'

type Client = SupabaseClient<Database>

export type ConversionKind = 'purchase' | 'delivered'

/** Which column guards each event against being sent twice. */
const SENT_COLUMN = {
  purchase: 'purchase_event_sent_at',
  delivered: 'delivered_event_sent_at',
} as const

/**
 * Report one conversion for one order, at most once ever.
 *
 * Idempotent by design: an admin can move an order between statuses freely,
 * and the customer-facing confirmation link can be opened repeatedly. Each
 * conversion is still reported exactly once, because the guard column is
 * claimed with a conditional update before anything is sent.
 *
 * Never throws. A reporting failure must not be able to fail the status change
 * that triggered it.
 */
export async function reportOrderConversion(
  supabase: Client,
  orderId: string,
  kind: ConversionKind,
): Promise<void> {
  try {
    const sentColumn = SENT_COLUMN[kind]

    // One string literal, not a concatenation: Supabase infers the row type by
    // parsing this at compile time, and a joined string is just `string` to it,
    // which collapses every field below to an error type.
    const { data: order } = await supabase
      .from('orders')
      .select('id, customer_name, customer_email, customer_phone, shipping_address, total_amount, purchase_event_id, ga_client_id, meta_fbp, meta_fbc, customer_user_agent, customer_ip, purchase_event_sent_at, delivered_event_sent_at')
      .eq('id', orderId)
      .single()

    if (!order) return

    const alreadySent = (order as Record<string, unknown>)[sentColumn]
    if (alreadySent) return

    // Claim it BEFORE sending. The `is null` predicate means two concurrent
    // requests cannot both win, so a double-click in the admin panel reports
    // one conversion rather than two.
    const { data: claimed } = await supabase
      .from('orders')
      .update({ [sentColumn]: new Date().toISOString() })
      .eq('id', orderId)
      .is(sentColumn, null)
      .select('id')

    if (!claimed || claimed.length === 0) return

    const { data: lines } = await supabase
      .from('order_items')
      .select('variant_id, quantity, price_at_time_of_purchase')
      .eq('order_id', orderId)

    // Same variant ids the pixel, the sitemap and the Merchant feed use, so a
    // dynamic ad can match this conversion to the catalogue item.
    const contents = (lines ?? []).map(l => ({
      id: l.variant_id as string,
      quantity: Number(l.quantity),
      item_price: Number(l.price_at_time_of_purchase),
    }))

    // Delivery-inclusive, as the database computed it.
    const value = Number(order.total_amount)
    const shortCode = orderId.substring(0, 8).toUpperCase()
    const name = (order.customer_name ?? '').trim()

    await Promise.all([
      sendCapiEvent({
        // Purchase is the standard event the optimiser bids against.
        // OrderDelivered is a custom event, for true-revenue reporting.
        eventName: kind === 'purchase' ? 'Purchase' : 'OrderDelivered',
        eventId:
          kind === 'purchase'
            ? (order.purchase_event_id as string)
            : `${order.purchase_event_id as string}-delivered`,
        eventSourceUrl: `${SITE_URL}/checkout`,
        user: {
          email: order.customer_email,
          phone: order.customer_phone,
          firstName: name.split(/\s+/)[0] || null,
          lastName: name.split(/\s+/).slice(1).join(' ') || null,
          postcode: order.shipping_address?.split(',').pop()?.trim() ?? null,
          fbp: order.meta_fbp,
          fbc: order.meta_fbc,
          // Captured with the request that PLACED the order, not this one.
          // Meta lists client_user_agent as required for website events, and
          // both improve match quality - but at confirmation time the only
          // headers going are the admin's, which would attribute the sale to
          // the shop owner's device.
          userAgent: order.customer_user_agent,
          clientIp: order.customer_ip,
        },
        contents,
        value,
        currency: 'GBP',
        orderId: shortCode,
      }),

      // GA4 only gets a purchase. A second monetary event for the same order
      // would double the revenue in the Monetisation reports.
      kind === 'purchase' && order.ga_client_id
        ? sendGa4Event({
            clientId: clientIdFromGaCookie(order.ga_client_id) ?? order.ga_client_id,
            name: 'purchase',
            params: {
              transaction_id: shortCode,
              currency: 'GBP',
              value,
              items: contents.map(c => ({
                item_id: c.id,
                price: c.item_price,
                quantity: c.quantity,
              })),
            },
          })
        : Promise.resolve(),
    ])
  } catch (err) {
    console.error(`Failed to report ${kind} conversion for order ${orderId}`, err)
  }
}
