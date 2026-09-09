import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies, headers } from 'next/headers'
import { createAdminClient } from '@/utils/supabase/admin'
import { rateLimit, callerKey } from '@/utils/rateLimit'
import { classifyPaidLanding } from '@/utils/offers/paidTraffic'
import {
  OFFER_ENTITLEMENT_COOKIE,
  OFFER_ENTITLEMENT_MAX_AGE_S,
} from '@/utils/offers/constants'
import { INACTIVE_OFFER_ENTITLEMENT, type PublicOfferEntitlement } from '@/types/offerEntitlement'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  landingPath: z.string().min(1).max(2048),
})
const uuidSchema = z.string().uuid()
const issueSchema = z.object({
  token: z.string().uuid(),
  source: z.enum(['google_ads', 'meta_ads']),
  started_at: z.string(),
  expires_at: z.string(),
})

function json(state: PublicOfferEntitlement, status = 200) {
  const response = NextResponse.json(state, { status })
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  return response
}

export async function POST(request: Request) {
  const hdrs = await headers()
  const limit = rateLimit(callerKey(hdrs, 'offer-qualify'), 30, 60 * 1000)
  if (!limit.ok) return json(INACTIVE_OFFER_ENTITLEMENT, 429)

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json(INACTIVE_OFFER_ENTITLEMENT, 400)
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return json(INACTIVE_OFFER_ENTITLEMENT, 400)

  const { landingPath } = parsed.data
  if (!landingPath.startsWith('/') || landingPath.startsWith('//')) {
    return json(INACTIVE_OFFER_ENTITLEMENT, 400)
  }

  // A client boolean such as isPaidVisitor is never accepted. The same-origin
  // browser Referer establishes which storefront URL initiated this request;
  // only its explicit click ids / controlled paid UTMs are classified. This is
  // not using a google.com/facebook.com referrer as financial proof.
  const requestUrl = new URL(request.url)
  const refererRaw = hdrs.get('referer')
  let referer: URL
  let submitted: URL
  try {
    if (!refererRaw) return json(INACTIVE_OFFER_ENTITLEMENT, 400)
    referer = new URL(refererRaw)
    submitted = new URL(landingPath, requestUrl.origin)
  } catch {
    return json(INACTIVE_OFFER_ENTITLEMENT, 400)
  }

  if (referer.origin !== requestUrl.origin || submitted.pathname !== referer.pathname) {
    return json(INACTIVE_OFFER_ENTITLEMENT, 400)
  }

  // Query-string encoding can be normalised differently by URLSearchParams
  // (for example %20 versus +). Classify the browser's actual Referer query
  // rather than trusting the JSON copy supplied by React.
  const paidSource = classifyPaidLanding(`${referer.pathname}${referer.search}`)
  if (!paidSource) return json(INACTIVE_OFFER_ENTITLEMENT, 400)

  const jar = await cookies()
  const visitor = uuidSchema.safeParse(jar.get('uksofashop_vid')?.value)
  if (!visitor.success) return json(INACTIVE_OFFER_ENTITLEMENT, 409)

  const arrival = uuidSchema.safeParse(jar.get('uksofashop_aid')?.value)
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('issue_paid_offer_entitlement', {
    p_visitor_id: visitor.data,
    p_source: paidSource,
    p_arrival_id: arrival.success ? arrival.data : null,
  })

  const issued = issueSchema.safeParse(data)
  if (error || !issued.success) {
    console.error('Paid offer entitlement issuance failed:', error ?? issued.error)
    return json(INACTIVE_OFFER_ENTITLEMENT, 503)
  }

  const response = json({
    active: true,
    source: paidSource,
    startedAt: issued.data.started_at,
    expiresAt: issued.data.expires_at,
    offerAvailable: true,
  })

  response.cookies.set(OFFER_ENTITLEMENT_COOKIE, issued.data.token, {
    httpOnly: true,
    secure: requestUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: OFFER_ENTITLEMENT_MAX_AGE_S,
  })

  return response
}
