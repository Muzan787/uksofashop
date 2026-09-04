// src/utils/metaCapi.ts
//
// Meta Conversions API - server-to-server event delivery.
//
// WHY: the browser pixel is the only signal today, and a large share of it
// never arrives. iOS Safari's tracking prevention, ad blockers, and privacy
// extensions between them typically swallow a third of browser events. Those
// are real orders that Meta never learns about, so the campaign that produced
// them is under-credited and the optimiser bids down against it.
//
// DEDUPLICATION: every event carries an `event_id` that the browser and the
// server both send for the same action. Meta keeps whichever arrives first and
// discards the twin, so an event that makes it through both paths is counted
// once. Without a shared id, every order delivered by both paths counts twice
// and reported ROAS doubles - worse than not sending it at all.
//
// PII: Meta matches a server event to a person using hashed identifiers. Email
// and phone must be SHA-256 hashed, lowercased and trimmed first; sending them
// in the clear would both fail matching and hand Meta plaintext customer data.
// Hashing happens here and nothing leaves this module unhashed.
//
// This is a no-op unless META_PIXEL_ID and META_CAPI_ACCESS_TOKEN are set, so
// the site behaves normally before the token is configured.

import 'server-only'
import { createHash } from 'crypto'
import { normaliseUkMobile } from '@/utils/phone'

const API_VERSION = 'v21.0'

const PIXEL_ID = process.env.META_PIXEL_ID
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN
/** Optional. Echoes an event back into Events Manager's Test Events tab. */
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE

export function isCapiConfigured(): boolean {
  return Boolean(PIXEL_ID && ACCESS_TOKEN)
}

/** SHA-256 of a normalised value, as Meta requires. Empty input -> undefined. */
function hash(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const normalised = value.trim().toLowerCase()
  if (!normalised) return undefined
  return createHash('sha256').update(normalised).digest('hex')
}

export interface CapiUser {
  email?: string | null
  /** Any UK format; normalised to 447… before hashing, per Meta's spec. */
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
  postcode?: string | null
  /** From the request headers - both improve match quality materially. */
  clientIp?: string | null
  userAgent?: string | null
  /** _fbp / _fbc cookies, when the browser had them to send. */
  fbp?: string | null
  fbc?: string | null
  /**
   * A stable id for this person on our side - the Supabase user id.
   *
   * Meta treats it as a match key in its own right, and it is the only one
   * that survives a customer changing their email or ordering from a second
   * address. It also joins the events of one account together across the
   * devices they sign in on, which fbp cannot do because fbp is per browser.
   *
   * Hashed like the rest. Meta accepts it either way, but there is no reason
   * to hand over a raw internal identifier when a digest matches just as well.
   */
  externalId?: string | null
}

export interface CapiContent {
  id: string
  quantity: number
  item_price: number
}

export interface CapiEvent {
  eventName: 'Purchase' | 'InitiateCheckout' | 'AddToCart' | 'ViewContent' | 'OrderDelivered'
  /** MUST equal the event_id the browser sent for the same action. */
  eventId: string
  eventSourceUrl?: string
  user: CapiUser
  contents?: CapiContent[]
  value?: number
  currency?: string
  orderId?: string
}

function userData(u: CapiUser): Record<string, unknown> {
  const phone = u.phone ? normaliseUkMobile(u.phone) : null

  const data: Record<string, unknown> = {
    em: hash(u.email),
    ph: hash(phone),
    fn: hash(u.firstName),
    ln: hash(u.lastName),
    // Postcodes match better with whitespace removed.
    zp: hash(u.postcode?.replace(/\s+/g, '')),
    country: hash('gb'),
    external_id: hash(u.externalId),
    // Not hashed - Meta expects these raw.
    client_ip_address: u.clientIp || undefined,
    client_user_agent: u.userAgent || undefined,
    fbp: u.fbp || undefined,
    fbc: u.fbc || undefined,
  }

  for (const k of Object.keys(data)) {
    if (data[k] === undefined) delete data[k]
  }
  return data
}

/**
 * Send one event. Never throws: a failure here must not affect the order that
 * triggered it, so problems are logged and swallowed.
 */
export async function sendCapiEvent(event: CapiEvent): Promise<void> {
  if (!isCapiConfigured()) return

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        event_source_url: event.eventSourceUrl,
        action_source: 'website',
        user_data: userData(event.user),
        custom_data: {
          currency: event.currency ?? 'GBP',
          value: event.value,
          content_type: 'product',
          content_ids: event.contents?.map(c => c.id),
          contents: event.contents,
          order_id: event.orderId,
          num_items: event.contents?.reduce((n, c) => n + c.quantity, 0),
        },
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN!)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )

    if (!res.ok) {
      const body = await res.text()
      console.error(`Meta CAPI ${event.eventName} rejected (${res.status}):`, body.slice(0, 500))
    }
  } catch (err) {
    console.error(`Meta CAPI ${event.eventName} failed to send`, err)
  }
}
