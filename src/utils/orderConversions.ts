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
// runs 2-4 working days across UK Mainland), and an ad set never accumulating
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
import { sendCapiEvent } from '@/utils/metaCapi'
import { sendGa4Event, clientIdFromGaCookie } from '@/utils/ga4Server'
import { SITE_URL } from '@/constants/site'
import { isServerTrackingEnabled } from '@/utils/trackingEnv'
import { createAdminClient } from '@/utils/supabase/admin'

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
  orderId: string,
  kind: ConversionKind,
): Promise<void> {
  try {
    // Production gate (utils/trackingEnv.ts). Placed BEFORE the guard column
    // is claimed below, deliberately: an order confirmed in a preview
    // deployment or during local testing must report nothing at all, and
    // because the guard column is never claimed here, the same order still
    // reports correctly later if it turns out to belong to production after
    // all - see the note on isServerTrackingEnabled for why that matters.
    if (!isServerTrackingEnabled()) return

    const sentColumn = SENT_COLUMN[kind]
    // Conversion reporting is a server-side business operation, not a caller-
    // scoped customer query. Using one service-role client here avoids the
    // anonymous customer-confirmation RLS dead end that previously returned
    // before Meta, GA4, the audit ledger or Google staging could run.
    const admin = createAdminClient()

    // One string literal, not a concatenation: Supabase infers the row type by
    // parsing this at compile time, and a joined string is just `string` to it,
    // which collapses every field below to an error type.
    const { data: order } = await admin
      .from('orders')
      .select('id, customer_name, customer_email, customer_phone, shipping_address, total_amount, purchase_event_id, ga_client_id, meta_fbp, meta_fbc, customer_user_agent, customer_ip, purchase_event_sent_at, delivered_event_sent_at, source, gclid, gbraid, wbraid, visitor_id, confirmed_at, delivered_at')
      .eq('id', orderId)
      .single()

    if (!order) return

    // Never invent the business-event time for a historical row. Future
    // app confirmations stamp these first; a legacy/null timestamp must be
    // corrected explicitly before any Purchase/Delivered conversion runs.
    const conversionTime = kind === 'purchase' ? order.confirmed_at : order.delivered_at
    if (!conversionTime) return

    const alreadySent = (order as Record<string, unknown>)[sentColumn]
    if (alreadySent) return

    // Claim it BEFORE sending. The `is null` predicate means two concurrent
    // requests cannot both win, so a double-click in the admin panel reports
    // one conversion rather than two.
    const { data: claimed } = await admin
      .from('orders')
      .update({ [sentColumn]: new Date().toISOString() })
      .eq('id', orderId)
      .is(sentColumn, null)
      .select('id')

    if (!claimed || claimed.length === 0) return

    const { data: lines } = await admin
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

    /**
     * An order agreed in a WhatsApp conversation, not on a page.
     *
     * It has no _fbp, no _fbc, no browser and no URL, because there was no
     * browser involved - the columns holding those are null on every manual
     * order. Reporting it as a website event would therefore be a claim we
     * cannot support, and worse than merely unmatched: Meta would read the
     * absence of every browser identifier on a website event as a badly
     * implemented pixel rather than as a sale that happened somewhere else.
     *
     * So it goes as ‘chat’, with the identifiers it genuinely has - the
     * hashed name, phone, email and postcode taken during the conversation.
     * The phone number is the strong one here, because on WhatsApp it is
     * how the customer reached us in the first place.
     */
    const fromChat = order.source === 'whatsapp'

    await Promise.all([
      sendCapiEvent({
        // Purchase is the standard event the optimiser bids against.
        // OrderDelivered is a custom event, for true-revenue reporting.
        eventName: kind === 'purchase' ? 'Purchase' : 'OrderDelivered',
        eventId:
          kind === 'purchase'
            ? (order.purchase_event_id as string)
            : `${order.purchase_event_id as string}-delivered`,
        // No page to name for a chat order; Meta treats the field as
        // optional and a fabricated URL would only be noise in the reports.
        eventSourceUrl: fromChat ? undefined : `${SITE_URL}/checkout`,
        actionSource: fromChat ? 'chat' : 'website',
        user: {
          email: order.customer_email,
          phone: order.customer_phone,
          firstName: name.split(/\s+/)[0] || null,
          lastName: name.split(/\s+/).slice(1).join(' ') || null,
          postcode: order.shipping_address?.split(',').pop()?.trim() ?? null,
          // A WhatsApp order may still have originated from a tracked website
          // visit. If a linked enquiry supplied _fbp/_fbc, keep them: action
          // source remains 'chat', but the browser identifiers materially
          // improve match quality and are genuine customer-side evidence.
          fbp: order.meta_fbp,
          fbc: order.meta_fbc,
          // Captured with the request that PLACED the order, not this one.
          // Meta lists client_user_agent as required for website events, and
          // both improve match quality - but at confirmation time the only
          // headers going are the admin's, which would attribute the sale to
          // the shop owner's device.
          userAgent: fromChat ? null : order.customer_user_agent,
          clientIp: fromChat ? null : order.customer_ip,
          externalId: order.visitor_id,
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

    // Audit trail and offline-conversion staging both go through the
    // service-role client, deliberately independent of whichever `supabase`
    // was passed in above: this function is called from three places (the
    // admin panel's own session, an unauthenticated customer confirming their
    // own order, and the cron backstop's own admin client), and only the
    // last of those already carries admin privileges. Recording that a
    // conversion was sent has no meaningful caller identity to check - the
    // same reasoning utils/supabase/admin.ts documents - so every caller
    // gets the same, consistent write rather than three different outcomes.
    // Best-effort and never allowed to affect anything above - both sends
    // already happened by this point. sendCapiEvent/sendGa4Event never throw
    // and report nothing about success beyond a console.error, so 'sent' here
    // means "the attempt completed", not "Meta/Google accepted it" - see
    // utils/metaCapi.ts and utils/ga4Server.ts for the actual acceptance
    // logging.
    await admin.from('conversion_events').insert([
      {
        order_id: orderId,
        platform: 'meta' as const,
        event_name: kind === 'purchase' ? 'Purchase' : 'OrderDelivered',
        event_id: kind === 'purchase' ? order.purchase_event_id : `${order.purchase_event_id}-delivered`,
        sent_at: new Date().toISOString(),
        status: 'sent' as const,
      },
      ...(kind === 'purchase' && order.ga_client_id
        ? [{
            order_id: orderId,
            platform: 'ga4' as const,
            event_name: 'purchase',
            event_id: shortCode,
            sent_at: new Date().toISOString(),
            status: 'sent' as const,
          }]
        : []),
    ])

    // Stage a row for a FUTURE, separate Google Ads offline/enhanced
    // conversion import - see docs/TRACKING_V2_EXPORT_CONTRACT.md. Nothing
    // here uploads to Google. Idempotent via the (order_id, conversion_stage)
    // unique constraint: onConflict + ignoreDuplicates means a repeated
    // confirmed->shipped->confirmed toggle never creates a second row.
    const postcode = order.shipping_address?.split(',').pop()?.trim() ?? null
    const conversionStage = kind === 'purchase' ? 'confirmed' : 'delivered'
    const { error: stagingError } = await admin
      .from('google_offline_conversions')
      .upsert(
        {
          order_id: orderId,
          conversion_stage: conversionStage,
          conversion_time: conversionTime,
          value,
          currency: 'GBP',
          gclid: order.gclid,
          gbraid: order.gbraid,
          wbraid: order.wbraid,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          customer_first_name: name.split(/\s+/)[0] || null,
          customer_last_name: name.split(/\s+/).slice(1).join(' ') || null,
          customer_postcode: postcode,
        },
        { onConflict: 'order_id,conversion_stage', ignoreDuplicates: true },
      )

    const stagingAttemptAt = new Date().toISOString()
    await admin.from('conversion_events').insert({
      order_id: orderId,
      platform: 'google_offline_staging' as const,
      event_name: conversionStage,
      event_id: `${shortCode}-${conversionStage}`,
      sent_at: stagingError ? null : stagingAttemptAt,
      status: stagingError ? 'failed' as const : 'sent' as const,
      error_metadata: stagingError ? { message: stagingError.message } : null,
    })
  } catch (err) {
    console.error(`Failed to report ${kind} conversion for order ${orderId}`, err)
  }
}
