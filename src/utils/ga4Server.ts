// src/utils/ga4Server.ts
//
// GA4 Measurement Protocol - server-to-server events.
//
// Exists so GA4 and Meta can agree on what a purchase IS. The Purchase
// conversion now fires when an order is confirmed, which happens in the admin
// panel long after the customer has closed the tab, so there is no browser to
// send it from. Reporting it to Meta only would leave GA4 counting orders at
// placement and Meta counting them at confirmation - two different numbers for
// the same week, and hours wasted reconciling them.
//
// client_id matters: GA4 stitches this event to the visitor's earlier session
// using the value in their _ga cookie. Without it the purchase lands as a
// brand-new anonymous user and the acquisition report credits it to
// (direct)/(none) rather than to the campaign that earned it. The cookie is
// captured at checkout and stored on the order for exactly this reason.
//
// No-ops unless GA4_MEASUREMENT_ID and GA4_API_SECRET are set.

import 'server-only'
import { isServerTrackingEnabled } from '@/utils/trackingEnv'
import { getTrackingMode } from '@/utils/trackingMode'
import { ga4PayloadForLog, logTrackingEvent } from '@/utils/trackingLog'
import type { TrackingMode } from '@/utils/shopSettings'

const MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID
const API_SECRET = process.env.GA4_API_SECRET

export function isGa4ServerConfigured(): boolean {
  return Boolean(MEASUREMENT_ID && API_SECRET)
}


interface Ga4Event {
  /** From the _ga cookie. Falls back to a synthetic id if unavailable. */
  clientId: string
  name: string
  params: Record<string, unknown>
  timestampMicros?: number
  consent?: {ad_user_data:'granted'|'denied';ad_personalization:'granted'|'denied'}
  /**
   * Admin -> Meta's mode (admin upgrade N2); read from the settings when left
   * out. Live sends as before; Test sends to Google's validator only; Dry run
   * builds and logs the event and sends nothing.
   */
  mode?: TrackingMode
  /** The order's code, for the log only. */
  orderRef?: string
}

/**
 * The _ga cookie looks like `GA1.1.873389952.1787618269`. GA4 wants the last
 * two fields joined - `873389952.1787618269` - not the whole string.
 */
export function clientIdFromGaCookie(cookieValue: string | null | undefined): string | null {
  if (!cookieValue) return null
  const parts = cookieValue.split('.')
  if (parts.length < 4) return null
  return `${parts[2]}.${parts[3]}`
}

/** Never throws: a reporting failure must not affect the order behind it. */
export async function sendGa4Event(event: Ga4Event): Promise<'transport_accepted'|'failed'|'disabled'|'validated'|'dry_run'> {
  if (!isGa4ServerConfigured()) return 'disabled'
  // Production gate (utils/trackingEnv.ts) - see the matching note in
  // utils/metaCapi.ts.
  if (!isServerTrackingEnabled()) return 'disabled'

  const mode = event.mode ?? await getTrackingMode()
  const body = {
    client_id: event.clientId,
    // Without this GA4 treats a server event as a new session and the
    // engagement metrics for the visit are distorted.
    non_personalized_ads: event.consent ? event.consent.ad_personalization !== 'granted' : false,
    ...(event.timestampMicros ? {timestamp_micros:event.timestampMicros} : {}),
    ...(event.consent ? {consent:{ad_user_data:event.consent.ad_user_data.toUpperCase(),ad_personalization:event.consent.ad_personalization.toUpperCase()}} : {}),
    events: [{ name: event.name, params: event.params }],
  }
  // Every event is logged as it was built, the client id hashed (N7).
  const log = (outcome: string) => logTrackingEvent({
    platform: 'ga4', event_name: event.name, event_id: null, mode, outcome,
    order_ref: event.orderRef ?? null, payload: ga4PayloadForLog(body),
  })
  if (mode === 'dry_run') {
    await log('dry_run')
    return 'dry_run'
  }

  // Test goes to the validator, which checks the event and records nothing.
  const url =
    `https://www.google-analytics.com/${mode === 'test' ? 'debug/mp/collect' : 'mp/collect'}` +
    `?measurement_id=${encodeURIComponent(MEASUREMENT_ID!)}` +
    `&api_secret=${encodeURIComponent(API_SECRET!)}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // The Measurement Protocol answers 204 on success and, unhelpfully, also
    // accepts malformed payloads silently. Only transport errors show here;
    // use the DebugView endpoint if an event does not appear in GA4.
    if (!res.ok) {
      console.error(`GA4 MP ${event.name} rejected (${res.status})`)
      await log('failed')
      return 'failed'
    }
    await log(mode === 'test' ? 'validated' : 'transport_accepted')
    return mode === 'test' ? 'validated' : 'transport_accepted'
  } catch (err) {
    console.error(`GA4 MP ${event.name} failed to send`, err)
    await log('failed')
    return 'failed'
  }
}
