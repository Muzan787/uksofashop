import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { callerKey, rateLimit } from '@/utils/rateLimit'
import { COOKIE } from '@/utils/attribution/ids'
import { issueOfferEntitlement } from '@/utils/offers/issueEntitlement'
import { verifyOfferEntry } from '@/utils/offers/entryToken'
import {
  OFFER_ENTITLEMENT_COOKIE,
  OFFER_ENTITLEMENT_MAX_AGE_S,
} from '@/utils/offers/constants'
import { isProductionRequestHost } from '@/utils/trackingEnv'

export const dynamic = 'force-dynamic'

const uuidSchema = z.string().uuid()
const VISITOR_MAX_AGE_S = 400 * 24 * 60 * 60
const ATTRIBUTION_KEYS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id',
  'adset_id', 'ad_id', 'placement', 'utm_source_platform',
  'gclid', 'gbraid', 'wbraid', 'fbclid',
])

function invalid(): NextResponse {
  return new NextResponse('Invalid offer entry.', {
    status: 404,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const hdrs = await headers()
  if (!isProductionRequestHost(hdrs.get('host'))) return invalid()

  const limit = rateLimit(callerKey(hdrs, 'offer-entry'), 60, 60 * 1000)
  if (!limit.ok) return new NextResponse('Too many requests.', { status: 429 })

  const { token } = await context.params
  const entry = verifyOfferEntry(token)
  if (!entry) return invalid()

  const requestUrl = new URL(request.url)
  const destination = new URL(entry.destination, requestUrl.origin)

  // The signed destination owns its product variant. Genuine attribution
  // fields added by Meta/Google survive the clean redirect, but no inbound
  // query may replace the signed variant or add arbitrary application state.
  for (const [key, value] of requestUrl.searchParams) {
    if (ATTRIBUTION_KEYS.has(key) && !destination.searchParams.has(key)) {
      destination.searchParams.append(key, value)
    }
  }

  const jar = await cookies()
  const visitorCookie = uuidSchema.safeParse(jar.get(COOKIE.visitor)?.value)
  const visitorId = visitorCookie.success ? visitorCookie.data : randomUUID()
  const arrivalCookie = uuidSchema.safeParse(jar.get(COOKIE.arrival)?.value)

  let issued
  try {
    issued = await issueOfferEntitlement(
      visitorId,
      entry.source,
      arrivalCookie.success ? arrivalCookie.data : null,
    )
  } catch (error) {
    console.error('Trusted offer-entry issuance failed:', error)
    return new NextResponse('Offer entry is temporarily unavailable.', { status: 503 })
  }

  const response = NextResponse.redirect(destination, 307)
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  response.cookies.set(COOKIE.visitor, visitorId, {
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: VISITOR_MAX_AGE_S,
  })
  response.cookies.set(OFFER_ENTITLEMENT_COOKIE, issued.token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: OFFER_ENTITLEMENT_MAX_AGE_S,
  })
  return response
}

