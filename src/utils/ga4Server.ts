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

const MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID
const API_SECRET = process.env.GA4_API_SECRET

export function isGa4ServerConfigured(): boolean {
  return Boolean(MEASUREMENT_ID && API_SECRET)
}

export interface Ga4Item {
  item_id: string
  item_name: string
  price: number
  quantity: number
}

export interface Ga4Event {
  /** From the _ga cookie. Falls back to a synthetic id if unavailable. */
  clientId: string
  name: string
  params: Record<string, unknown>
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
export async function sendGa4Event(event: Ga4Event): Promise<void> {
  if (!isGa4ServerConfigured()) return

  const url =
    `https://www.google-analytics.com/mp/collect` +
    `?measurement_id=${encodeURIComponent(MEASUREMENT_ID!)}` +
    `&api_secret=${encodeURIComponent(API_SECRET!)}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: event.clientId,
        // Without this GA4 treats a server event as a new session and the
        // engagement metrics for the visit are distorted.
        non_personalized_ads: false,
        events: [{ name: event.name, params: event.params }],
      }),
    })

    // The Measurement Protocol answers 204 on success and, unhelpfully, also
    // accepts malformed payloads silently. Only transport errors show here;
    // use the DebugView endpoint if an event does not appear in GA4.
    if (!res.ok) {
      console.error(`GA4 MP ${event.name} rejected (${res.status})`)
    }
  } catch (err) {
    console.error(`GA4 MP ${event.name} failed to send`, err)
  }
}
