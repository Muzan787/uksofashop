import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies, headers } from 'next/headers'
import { rateLimit, callerKey } from '@/utils/rateLimit'
import { externalOrigin } from '@/utils/requestOrigin'
import { classifyPaidLanding } from '@/utils/offers/paidTraffic'
import { issueOfferEntitlement } from '@/utils/offers/issueEntitlement'
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
  // The origin comes from the forwarded headers, not from `request.url`.
  // Behind a reverse proxy `request.url` carries the internal origin, so the
  // comparison below was false for every real visitor and no paid visitor
  // could ever qualify for an offer. See utils/requestOrigin.
  const origin = externalOrigin(hdrs)
  if (!origin) return json(INACTIVE_OFFER_ENTITLEMENT, 400)

  const refererRaw = hdrs.get('referer')
  let referer: URL
  let submitted: URL
  try {
    if (!refererRaw) return json(INACTIVE_OFFER_ENTITLEMENT, 400)
    referer = new URL(refererRaw)
    submitted = new URL(landingPath, origin)
  } catch {
    return json(INACTIVE_OFFER_ENTITLEMENT, 400)
  }

  if (referer.origin !== origin || submitted.pathname !== referer.pathname) {
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
  let issued
  try {
    issued = await issueOfferEntitlement(
      visitor.data,
      paidSource,
      arrival.success ? arrival.data : null,
    )
  } catch (error) {
    console.error('Paid offer entitlement issuance failed:', error)
    return json(INACTIVE_OFFER_ENTITLEMENT, 503)
  }

  const response = json({
    active: true,
    source: paidSource,
    startedAt: issued.started_at,
    expiresAt: issued.expires_at,
    offerAvailable: true,
  })

  response.cookies.set(OFFER_ENTITLEMENT_COOKIE, issued.token, {
    httpOnly: true,
    // From the forwarded origin, not `request.url`: behind a reverse proxy
    // that protocol reads http, which would issue the entitlement cookie
    // without Secure on a site served entirely over https.
    secure: origin.startsWith('https:'),
    sameSite: 'lax',
    path: '/',
    maxAge: OFFER_ENTITLEMENT_MAX_AGE_S,
  })

  return response
}
