// src/utils/trackingLog.ts
//
// The latest events, exactly as they were built (admin upgrade N7). Every Meta
// Conversions API and GA4 Measurement Protocol event the server builds is
// written here with its outcome - sent, refused, a test, or a dry run - and
// shown on Admin -> Meta. Kept for 30 days (a daily database job).
//
// Personal details are hashed before they reach the table. Meta's own match
// keys are already SHA-256 when built; the few that go to Meta raw because
// Meta asks for them raw (the IP address, the browser's user agent, the _fbp
// and _fbc cookies) and GA4's client id are hashed here, in the copy that is
// logged, never in what is sent. Access tokens are in the request address,
// not the body, so they are never logged; the Meta test code is replaced by
// "(set)".
//
// Never throws, and never holds up or changes a send.

import 'server-only'
import { createHash } from 'crypto'
import { createAdminClient } from '@/utils/supabase/admin'
import type { Json } from '@/types/supabase'
import type { TrackingMode } from '@/utils/shopSettings'

/** "sha256:" and the digest, so a hashed value is never mistaken for a raw one. */
export function hashForLog(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return `sha256:${createHash('sha256').update(String(value)).digest('hex')}`
}

const RAW_META_KEYS = ['client_ip_address', 'client_user_agent', 'fbp', 'fbc'] as const

/** A Meta CAPI request body as logged: the raw identifiers hashed, the test code hidden. */
export function metaPayloadForLog(payload: { data: Record<string, unknown>[]; test_event_code?: string }): Json {
  const data = payload.data.map(event => {
    const user = { ...(event.user_data as Record<string, unknown> | undefined) }
    for (const key of RAW_META_KEYS) if (key in user) user[key] = hashForLog(user[key])
    return { ...event, user_data: user }
  })
  return JSON.parse(JSON.stringify({
    data,
    ...(payload.test_event_code ? { test_event_code: '(set)' } : {}),
  })) as Json
}

/** A GA4 Measurement Protocol body as logged: the client id hashed. */
export function ga4PayloadForLog(body: Record<string, unknown>): Json {
  return JSON.parse(JSON.stringify({ ...body, client_id: hashForLog(body.client_id) })) as Json
}

export interface TrackingLogRow {
  platform: 'meta' | 'ga4'
  event_name: string
  event_id?: string | null
  mode: TrackingMode
  outcome: string
  order_ref?: string | null
  payload: Json
}

export async function logTrackingEvent(row: TrackingLogRow): Promise<void> {
  try {
    const { error } = await createAdminClient().from('tracking_event_log').insert(row)
    if (error) console.error(`tracking log write failed: ${error.message}`)
  } catch {
    // The log is for looking back at; it never matters more than the send.
  }
}
