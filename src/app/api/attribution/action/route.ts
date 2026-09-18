// src/app/api/attribution/action/route.ts
//
// First-party operational funnel writer. This endpoint is intentionally
// separate from /api/meta/event: advertising consent controls Pixel/CAPI, not
// the storefront's ability to link its own anonymous visit, basket and
// checkout records. No Meta/Google identifiers or customer data are accepted.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies, headers } from 'next/headers'
import { callerKey, rateLimit } from '@/utils/rateLimit'
import { createAdminClient } from '@/utils/supabase/admin'
import { isSensitiveUrl } from '@/utils/redactUrl'
import { isProductionRequestHost, isServerTrackingEnabled } from '@/utils/trackingEnv'

export const dynamic = 'force-dynamic'

const schema = z.object({
  action: z.enum([
    'product_view', 'add_to_cart', 'checkout_start', 'call_click',
    'offer_prompt_shown', 'offer_prompt_dismissed', 'offer_code_copied',
    'builder_started', 'builder_size_selected', 'builder_design_selected',
    'builder_fabric_selected', 'builder_feet_selected', 'builder_piping_selected',
    'builder_custom_details_completed', 'builder_summary_viewed',
    'builder_add_to_cart', 'builder_whatsapp_click',
  ]),
  actionId: z.string().uuid(),
  path: z.string().max(1024),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  metadata: z.object({
    step: z.string().max(64).optional(),
    value: z.string().max(160).optional(),
  }).optional(),
})

const noContent = (status: number) => new NextResponse(null, { status })
const joinKey = z.string().uuid()

/**
 * Remove the public catalogue variant selector before the path is stored.
 *
 * The general analytics guard correctly rejects UUIDs because several routes
 * use one as an access credential. Product variant UUIDs are different: they
 * are public catalogue retailer_ids and the dedicated variant_id column is
 * their reporting home. Removing only a valid `variant` parameter lets a
 * signed catalogue PDP retain first-party offer events without weakening the
 * guard for confirmation paths, review tokens or any other query parameter.
 */
function safeLedgerPath(raw: string): string | null {
  const url = new URL(raw, 'https://uksofashop.invalid')
  if (url.searchParams.has('variant')) {
    const variant = joinKey.safeParse(url.searchParams.get('variant'))
    if (!variant.success) return null
    url.searchParams.delete('variant')
  }
  const clean = `${url.pathname}${url.search}`
  return isSensitiveUrl(clean) ? null : clean
}

export async function POST(request: Request) {
  if (!isServerTrackingEnabled()) return noContent(204)

  const hdrs = await headers()
  if (!isProductionRequestHost(hdrs.get('host'))) return noContent(204)

  const limit = rateLimit(callerKey(hdrs, 'attribution-action'), 180, 60 * 1000)
  if (!limit.ok) return noContent(429)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return noContent(400)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return noContent(400)
  const event = parsed.data
  if (!event.path.startsWith('/') || event.path.startsWith('//')) return noContent(400)
  const pageUrl = safeLedgerPath(event.path)
  if (!pageUrl) return noContent(204)

  const jar = await cookies()
  const visitorId = joinKey.safeParse(jar.get('uksofashop_vid')?.value)
  const sessionId = joinKey.safeParse(jar.get('uksofashop_sid')?.value)
  const arrivalId = joinKey.safeParse(jar.get('uksofashop_aid')?.value)

  // An action without the three first-party join keys cannot contribute to
  // attribution and would only create an orphaned reporting row.
  if (!visitorId.success || !sessionId.success || !arrivalId.success) return noContent(204)

  try {
    const admin = createAdminClient()

    // AttributionBoot persists the full arrival and action components fire in
    // parallel. On a first landing the action request can therefore reach the
    // database a few milliseconds before the arrival row, leaving a temporary
    // reporting orphan. Establish only the three anonymous join keys here, without
    // overwriting an existing arrival. The arrival writer then enriches this
    // same row with touch, landing and platform identifiers. This is not a
    // second tracking path: it is the minimum parent row required by the one
    // first-party ledger, and the stable action UUID still provides idempotency.
    const { error: joinError } = await admin.from('attribution_sessions').upsert({
      visitor_id: visitorId.data,
      session_id: sessionId.data,
      arrival_id: arrivalId.data,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'arrival_id', ignoreDuplicates: true })
    if (joinError) {
      console.error(`Failed to establish attribution action join: ${joinError.message}`)
      return noContent(204)
    }

    const { error } = await admin.from('attribution_actions').upsert({
      id: event.actionId,
      visitor_id: visitorId.data,
      session_id: sessionId.data,
      arrival_id: arrivalId.data,
      action_type: event.action,
      page_url: pageUrl,
      product_id: event.productId ?? null,
      variant_id: event.variantId ?? null,
      metadata: {
        data_class: /(?:^|[?&=/_-])(qa|test|debug|probe)(?:[=&/_-]|$)/i.test(event.path)
          ? 'qa_test'
          : 'unclassified',
        ...(event.metadata ?? {}),
      },
    }, { onConflict: 'id', ignoreDuplicates: true })
    if (error) {
      console.error(`Failed to write attribution action ${event.action}: ${error.message}`)
    }
  } catch (err) {
    console.error(`Failed to write attribution action ${event.action}`, err)
  }

  return noContent(204)
}
