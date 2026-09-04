// src/app/api/cron/conversions/route.ts
//
// Reports conversions for orders that reached a selling status without going
// through the admin panel.
//
// WHY THIS EXISTS. reportOrderConversion is called from exactly two places:
// updateOrderStatus (the admin dropdown) and confirmCustomerOrder (the link in
// the confirmation email). Neither of them runs when a status is edited
// directly in the Supabase dashboard, and the row changes just the same - so
// the order is confirmed, the money is real, and Meta and GA4 are never told.
//
// That is not hypothetical. Two orders sat at 'confirmed' with
// purchase_event_sent_at still null, and the failure is invisible: nothing in
// the admin panel distinguishes an order whose conversion reported from one
// whose conversion did not. This is the backstop that closes it.
//
// SAFE TO RUN REPEATEDLY, by construction. reportOrderConversion claims its
// guard column with a conditional update BEFORE it sends anything, so an order
// picked up here cannot be reported twice, and cannot race the admin panel
// doing it at the same moment.
//
// WHY THE WINDOW IS SHORT. Neither sendCapiEvent nor sendGa4Event carries the
// order's own timestamp - both stamp the event at the moment they send. A
// backfilled conversion is therefore dated today, not the day it was agreed.
// Over a day or two that is a rounding error; over a week it would move revenue
// into the wrong reporting period and, for Meta, fall outside the 7-day limit
// on event_time entirely. So this catches the recent miss it exists for and
// deliberately leaves older orders alone rather than misdating them.
//
// Scheduled in vercel.json. Protected by CRON_SECRET, like the review cron: the
// path is guessable and this one reports revenue to two ad platforms.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { reportOrderConversion } from '@/utils/orderConversions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** How far back to look. See the note above on why this is not longer. */
const WINDOW_HOURS = 48

/**
 * Statuses that mean the sale happened.
 *
 * Everything at or beyond 'confirmed', because an order edited by hand may
 * have been moved straight to 'shipped' and the purchase is no less real for
 * having skipped a step. 'pending_cod' is not a sale yet and 'cancelled' never
 * became one.
 */
const SOLD = ['confirmed', 'processing', 'shipped', 'delivered']

/** Cap per run, so a bad window cannot fire a hundred conversions at once. */
const BATCH = 25

function unauthorised() {
  return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('CRON_SECRET is not set - conversion backfill refused to run')
    return unauthorised()
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return unauthorised()

  const supabase = createAdminClient()
  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  // Purchases that were never reported.
  const { data: unreported, error: purchaseError } = await supabase
    .from('orders')
    .select('id')
    .in('status', SOLD)
    .is('purchase_event_sent_at', null)
    .gte('created_at', since)
    .limit(BATCH)

  // Deliveries that were never reported. Keyed on delivered_at rather than
  // created_at: an order placed three days ago and delivered this morning is
  // exactly the case this should catch.
  const { data: undelivered, error: deliveredError } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'delivered')
    .is('delivered_event_sent_at', null)
    .gte('delivered_at', since)
    .limit(BATCH)

  if (purchaseError || deliveredError) {
    console.error('Conversion backfill could not read orders', purchaseError ?? deliveredError)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const purchases = unreported ?? []
  const deliveries = undelivered ?? []

  // Sequentially, not in parallel: this is a backstop that runs once a day
  // against a handful of rows, and two ad platforms per order. There is nothing
  // to gain from hammering them and something to lose if one rate-limits.
  for (const order of purchases) {
    await reportOrderConversion(supabase, order.id, 'purchase')
  }
  for (const order of deliveries) {
    await reportOrderConversion(supabase, order.id, 'delivered')
  }

  if (purchases.length || deliveries.length) {
    console.warn(
      `Conversion backfill reported ${purchases.length} purchase(s) and ` +
      `${deliveries.length} delivery(ies) that the admin panel had missed. ` +
      `Statuses changed outside the admin panel do not report on their own.`,
    )
  }

  return NextResponse.json({
    windowHours: WINDOW_HOURS,
    purchasesReported: purchases.length,
    deliveriesReported: deliveries.length,
  })
}
