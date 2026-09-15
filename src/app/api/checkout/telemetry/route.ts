// src/app/api/checkout/telemetry/route.ts
//
// Privacy-safe first-party checkout diagnostics. This endpoint deliberately
// accepts only enums, counters and booleans. It never accepts names, emails,
// phone numbers, postcodes, addresses, offer codes, free text, or typed values.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies, headers } from 'next/headers'
import { callerKey, rateLimit } from '@/utils/rateLimit'
import { createAdminClient } from '@/utils/supabase/admin'
import { isProductionRequestHost, isServerTrackingEnabled } from '@/utils/trackingEnv'

export const dynamic = 'force-dynamic'

const checkoutAction = z.enum([
  'checkout_step_viewed',
  'checkout_field_started',
  'checkout_field_completed',
  'checkout_validation_error',
  'postcode_lookup_attempt',
  'postcode_lookup_result',
  'address_results_returned',
  'address_selected',
  'delivery_extra_toggled',
  'offer_code_attempt',
  'offer_code_result',
  'place_order_clicked',
  'place_order_failed',
  'checkout_back_to_cart',
  'checkout_quote_whatsapp_click',
  'checkout_exit',
])

const metadataSchema = z.object({
  step: z.enum(['cart', 'delivery', 'success']).optional(),
  field: z.enum([
    'name', 'email', 'phone', 'postcode', 'address', 'special_instructions',
  ]).optional(),
  error_code: z.enum([
    'required', 'invalid_format', 'invalid_mobile', 'invalid_postcode',
    'address_missing', 'delivery_unavailable', 'server_error', 'unknown',
  ]).optional(),
  attempt: z.number().int().min(1).max(50).optional(),
  outcome: z.enum([
    'submitted', 'mainland_success', 'custom_quote', 'invalid', 'not_found',
    'network_error', 'available', 'selected', 'valid', 'success', 'error',
  ]).optional(),
  extra: z.enum(['upstairs', 'lift', 'assembly', 'sofa_removal']).optional(),
  enabled: z.boolean().optional(),
}).strict()

const schema = z.object({
  action: checkoutAction,
  actionId: z.string().uuid(),
  metadata: metadataSchema.optional(),
}).strict()

const joinKey = z.string().uuid()
const noContent = (status: number) => new NextResponse(null, { status })

export async function POST(request: Request) {
  if (!isServerTrackingEnabled()) return noContent(204)

  const hdrs = await headers()
  if (!isProductionRequestHost(hdrs.get('host'))) return noContent(204)

  const limit = rateLimit(callerKey(hdrs, 'checkout-telemetry'), 240, 60 * 1000)
  if (!limit.ok) return noContent(429)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return noContent(400)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return noContent(400)

  const jar = await cookies()
  const visitorId = joinKey.safeParse(jar.get('uksofashop_vid')?.value)
  const sessionId = joinKey.safeParse(jar.get('uksofashop_sid')?.value)
  const arrivalId = joinKey.safeParse(jar.get('uksofashop_aid')?.value)
  if (!visitorId.success || !sessionId.success || !arrivalId.success) return noContent(204)

  const event = parsed.data

  try {
    const admin = createAdminClient()

    // Match the main attribution action writer: checkout UI can become
    // interactive a few milliseconds before the full arrival row is enriched.
    const { error: joinError } = await admin.from('attribution_sessions').upsert({
      visitor_id: visitorId.data,
      session_id: sessionId.data,
      arrival_id: arrivalId.data,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'arrival_id', ignoreDuplicates: true })
    if (joinError) {
      console.error(`Failed to establish checkout telemetry join: ${joinError.message}`)
      return noContent(204)
    }

    const { error } = await admin.from('attribution_actions').upsert({
      id: event.actionId,
      visitor_id: visitorId.data,
      session_id: sessionId.data,
      arrival_id: arrivalId.data,
      action_type: event.action,
      page_url: '/checkout',
      metadata: {
        ...(event.metadata ?? {}),
        data_class: 'unclassified',
        privacy: 'no_form_values',
      },
    }, { onConflict: 'id', ignoreDuplicates: true })

    if (error) console.error(`Failed to write checkout telemetry ${event.action}: ${error.message}`)
  } catch (err) {
    console.error(`Failed to write checkout telemetry ${event.action}`, err)
  }

  return noContent(204)
}
