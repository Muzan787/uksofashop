// src/app/api/attribution/whatsapp-click/route.ts
//
// Persists one row of whatsapp_enquiries for a reference minted client-side
// by utils/attribution/useWhatsAppCTA.ts, just before the visitor leaves for
// WhatsApp - see supabase/migrations/20260906110000_whatsapp_enquiries.sql.
//
// The client sends only what it cannot know server-side: the reference
// itself, the page URL/context, and which product/variant (if any) the
// button was on. Attribution (visitor/session/arrival ids, click ids, UTMs,
// _ga/_fbp/_fbc) is read from the request's own cookies here, the same way
// /api/attribution/arrival/route.ts does it - never trusted from the body.
//
// Gated the same way as the arrival route: no write outside a Vercel
// Production deployment, and none for a request whose Host is not a live
// production domain. A rejected/gated call still returns 204 - the browser
// beacon is fire-and-forget and must never surface an error to the visitor.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies, headers } from 'next/headers'
import { rateLimit, callerKey } from '@/utils/rateLimit'
import { isServerTrackingEnabled, isProductionRequestHost } from '@/utils/trackingEnv'
import { isValidWhatsAppReference } from '@/utils/attribution/whatsapp'
import { createAdminClient } from '@/utils/supabase/admin'
import { metaFbcFromTouch } from '@/utils/attribution/fbc'

export const dynamic = 'force-dynamic'

const schema = z.object({
  reference: z.string().max(32),
  pageUrl: z.string().max(2048),
  pageContext: z.string().max(64),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  productName: z.string().max(200).optional(),
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

  // Generous: a real visitor fires this at most a handful of times per
  // session. Stops a script from flooding whatsapp_enquiries with junk rows.
  const limit = rateLimit(callerKey(hdrs, 'whatsapp-click'), 30, 60 * 1000)
  if (!limit.ok) return noContent(429)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return noContent(400)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return noContent(400)
  const { reference, pageUrl, pageContext, productId, variantId, productName } = parsed.data

  if (!isValidWhatsAppReference(reference)) return noContent(400)

  // The page URL must be this site's own - never an arbitrary string forwarded
  // into a database row from an untrusted client.
  let path: string
  try {
    const url = new URL(pageUrl)
    if (!isProductionRequestHost(url.host)) return noContent(400)
    path = url.pathname + url.search
  } catch {
    return noContent(400)
  }

  const jar = await cookies()
  const firstTouch = readTouch(jar.get('uksofashop_ft')?.value)
  const lastTouch = readTouch(jar.get('uksofashop_lt')?.value)
  const cookieFbc = jar.get('_fbc')?.value ?? null
  const derivedFbc = metaFbcFromTouch(lastTouch) ?? metaFbcFromTouch(firstTouch)

  try {
    const supabase = createAdminClient()
    await supabase.from('whatsapp_enquiries').insert({
      reference: reference.trim().toUpperCase(),
      visitor_id: jar.get('uksofashop_vid')?.value ?? null,
      session_id: jar.get('uksofashop_sid')?.value ?? null,
      arrival_id: jar.get('uksofashop_aid')?.value ?? null,

      page_url: path,
      page_context: pageContext,

      product_id: productId ?? null,
      variant_id: variantId ?? null,
      product_name: productName ?? null,

      gclid: lastTouch.gclid ?? firstTouch.gclid ?? null,
      gbraid: lastTouch.gbraid ?? firstTouch.gbraid ?? null,
      wbraid: lastTouch.wbraid ?? firstTouch.wbraid ?? null,
      fbclid: lastTouch.fbclid ?? firstTouch.fbclid ?? null,

      utm_source: lastTouch.source ?? firstTouch.source ?? null,
      utm_medium: lastTouch.medium ?? firstTouch.medium ?? null,
      utm_campaign: lastTouch.campaign ?? firstTouch.campaign ?? null,
      utm_content: lastTouch.content ?? firstTouch.content ?? null,
      utm_term: lastTouch.term ?? firstTouch.term ?? null,

      ga_client_id: jar.get('_ga')?.value ?? null,
      meta_fbp: jar.get('_fbp')?.value ?? null,
      meta_fbc: cookieFbc ?? derivedFbc,
    })

    // Best-effort action-ledger row alongside the enquiry itself. Never
    // allowed to fail the enquiry write above - each insert stands alone.
    await supabase.from('attribution_actions').insert({
      visitor_id: jar.get('uksofashop_vid')?.value ?? null,
      session_id: jar.get('uksofashop_sid')?.value ?? null,
      arrival_id: jar.get('uksofashop_aid')?.value ?? null,
      action_type: 'whatsapp_click',
      page_url: path,
      product_id: productId ?? null,
      variant_id: variantId ?? null,
      whatsapp_reference: reference.trim().toUpperCase(),
      metadata: { page_context: pageContext },
    })
  } catch (err) {
    // A unique-constraint violation here means the same reference was posted
    // twice (a double-click opening two tabs) - not an error worth logging
    // loudly, since the beacon is fire-and-forget by design either way.
    console.error('Failed to persist whatsapp_enquiries row', err)
  }

  return noContent(204)
}
