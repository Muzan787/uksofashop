// src/app/api/cron/conversions/route.ts
//
// Conversion audit endpoint.
//
// Order status and advertising reporting are intentionally separate actions.
// Confirming or delivering an order no longer pushes an event to Meta by
// itself. This route therefore does NOT send anything; it only identifies
// recent sold/delivered orders whose explicit conversion button has not yet
// been used. It is kept as a protected diagnostic endpoint for operations.
//
// The scheduled Vercel cron entry was removed when manual sending became the
// source of truth. If this endpoint is called directly it is protected by
// CRON_SECRET and is read-only with respect to ad-platform conversions.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

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
    .not('confirmed_at', 'is', null)
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

  // Deliberately audit-only. Status changes no longer send advertising
  // conversions automatically; the admin order card is the single place where
  // a human explicitly sends Purchase / OrderDelivered.
  if (purchases.length || deliveries.length) {
    console.warn(
      `Conversion audit: ${purchases.length} sold order(s) still need Purchase and ` +
      `${deliveries.length} delivered order(s) still need OrderDelivered.`,
    )
  }

  return NextResponse.json({
    windowHours: WINDOW_HOURS,
    purchasesWaiting: purchases.length,
    deliveriesWaiting: deliveries.length,
  })
}
