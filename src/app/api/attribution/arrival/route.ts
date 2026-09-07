// src/app/api/attribution/arrival/route.ts
//
// Persists one row of attribution_sessions per genuinely new arrival - see
// utils/attribution/capture.ts for what counts as one, and
// supabase/migrations/20260906100000_attribution_sessions.sql for the table.
//
// Reads visitor/session/arrival ids and first/last-touch attribution straight
// off the request's own cookies (uksofashop_vid/_sid/_aid/_ft/_lt, written by
// utils/attribution/ids.ts) rather than trusting anything in the POST body,
// the same way _fbp/_fbc are already read server-side elsewhere in this
// codebase - a request cannot claim an attribution it did not actually carry.
//
// Production-gated twice over: isServerTrackingEnabled() (no writes outside a
// Vercel Production deployment) and isProductionRequestHost() (no writes for
// a request whose Host header is not one of the live domains, independent of
// which deployment happens to be serving it).

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies, headers } from 'next/headers'
import { rateLimit, callerKey } from '@/utils/rateLimit'
import { isServerTrackingEnabled, isProductionRequestHost } from '@/utils/trackingEnv'
import { createAdminClient } from '@/utils/supabase/admin'
import { metaFbcFromTouch } from '@/utils/attribution/fbc'

export const dynamic = 'force-dynamic'

const schema = z.object({
  visitorId: z.string().uuid(),
  sessionId: z.string().uuid(),
  arrivalId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  landingPath: z.string().max(2048).optional(),
  referrer: z.string().max(2048).optional(),
})

const noContent = (status: number) => new NextResponse(null, { status })

function readTouch(raw: string | undefined): Record<string, string | undefined> {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function POST(request: Request) {
  const hdrs = await headers()
  if (!isServerTrackingEnabled()) return noContent(204)
  if (!isProductionRequestHost(hdrs.get('host'))) return noContent(204)

  const limit = rateLimit(callerKey(hdrs, 'attribution-arrival'), 60, 60 * 1000)
  if (!limit.ok) return noContent(429)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return noContent(400)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return noContent(400)
  const { visitorId, sessionId, arrivalId, productId, variantId, landingPath, referrer } = parsed.data

  if (landingPath && (!landingPath.startsWith('/') || landingPath.startsWith('//'))) return noContent(400)

  const jar = await cookies()
  const firstTouch = readTouch(jar.get('uksofashop_ft')?.value)
  const lastTouch = readTouch(jar.get('uksofashop_lt')?.value)

  const cookieFbc = jar.get('_fbc')?.value ?? null
  const derivedFbc = metaFbcFromTouch(lastTouch) ?? metaFbcFromTouch(firstTouch)

  try {
    const supabase = createAdminClient()
    await supabase.from('attribution_sessions').upsert(
      {
        visitor_id: visitorId,
        session_id: sessionId,
        arrival_id: arrivalId,
        last_seen_at: new Date().toISOString(),

        first_touch_source: firstTouch.source ?? null,
        first_touch_medium: firstTouch.medium ?? null,
        first_touch_campaign: firstTouch.campaign ?? null,
        first_touch_content: firstTouch.content ?? null,
        first_touch_term: firstTouch.term ?? null,

        last_touch_source: lastTouch.source ?? null,
        last_touch_medium: lastTouch.medium ?? null,
        last_touch_campaign: lastTouch.campaign ?? null,
        last_touch_content: lastTouch.content ?? null,
        last_touch_term: lastTouch.term ?? null,

        gclid: lastTouch.gclid ?? firstTouch.gclid ?? null,
        gbraid: lastTouch.gbraid ?? firstTouch.gbraid ?? null,
        wbraid: lastTouch.wbraid ?? firstTouch.wbraid ?? null,
        fbclid: lastTouch.fbclid ?? firstTouch.fbclid ?? null,

        ga_client_id: jar.get('_ga')?.value ?? null,
        meta_fbp: jar.get('_fbp')?.value ?? null,
        meta_fbc: cookieFbc ?? derivedFbc,

        landing_page: landingPath ?? firstTouch.landingPage ?? null,
        referrer: referrer ?? null,

        initial_product_id: productId ?? null,
        initial_variant_id: variantId ?? null,
      },
      { onConflict: 'arrival_id' },
    )
  } catch (err) {
    console.error('Failed to persist attribution_sessions row', err)
  }

  return noContent(204)
}
