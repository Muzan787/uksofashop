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
  action: z.enum(['product_view', 'add_to_cart', 'checkout_start', 'call_click']),
  actionId: z.string().uuid(),
  path: z.string().max(1024),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
})

const noContent = (status: number) => new NextResponse(null, { status })

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
  if (isSensitiveUrl(event.path)) return noContent(204)

  const jar = await cookies()
  const visitorId = jar.get('uksofashop_vid')?.value
  const sessionId = jar.get('uksofashop_sid')?.value
  const arrivalId = jar.get('uksofashop_aid')?.value

  // An action without the three first-party join keys cannot contribute to
  // attribution and would only create an orphaned reporting row.
  if (!visitorId || !sessionId || !arrivalId) return noContent(204)

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('attribution_actions').upsert({
      id: event.actionId,
      visitor_id: visitorId,
      session_id: sessionId,
      arrival_id: arrivalId,
      action_type: event.action,
      page_url: event.path,
      product_id: event.productId ?? null,
      variant_id: event.variantId ?? null,
      metadata: {
        data_class: /(?:^|[?&/_-])(qa|test|debug|probe)(?:[=&/_-]|$)/i.test(event.path)
          ? 'qa_test'
          : 'unclassified',
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
