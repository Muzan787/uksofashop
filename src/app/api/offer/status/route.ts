import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies, headers } from 'next/headers'
import { externalOrigin } from '@/utils/requestOrigin'
import { createAdminClient } from '@/utils/supabase/admin'
import { OFFER_ENTITLEMENT_COOKIE } from '@/utils/offers/constants'
import { INACTIVE_OFFER_ENTITLEMENT, type PublicOfferEntitlement } from '@/types/offerEntitlement'

export const dynamic = 'force-dynamic'

const tokenSchema = z.string().uuid()

function json(state: PublicOfferEntitlement, status = 200) {
  const response = NextResponse.json(state, { status })
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  return response
}

function clearCookie(response: NextResponse, secure: boolean) {
  response.cookies.set(OFFER_ENTITLEMENT_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function GET() {
  const jar = await cookies()
  // This used to read `new URL(request.url).protocol`, which is http behind a
  // reverse proxy - so on a live https site the clearing cookie went out
  // WITHOUT Secure, and a cookie whose attributes do not match the original
  // may not replace it. The entitlement could survive its own revocation.
  const secure = (externalOrigin(await headers()) ?? 'https:').startsWith('https:')
  const parsed = tokenSchema.safeParse(jar.get(OFFER_ENTITLEMENT_COOKIE)?.value)

  if (!parsed.success) {
    const response = json(INACTIVE_OFFER_ENTITLEMENT)
    if (jar.get(OFFER_ENTITLEMENT_COOKIE)) clearCookie(response, secure)
    return response
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('offer_entitlements')
    .select('source, started_at, expires_at, revoked_at')
    .eq('token', parsed.data)
    .maybeSingle()

  if (error) {
    console.error('Offer entitlement status failed:', error)
    return json(INACTIVE_OFFER_ENTITLEMENT, 503)
  }

  const expiresAt = data?.expires_at ? Date.parse(data.expires_at) : Number.NaN
  if (!data || data.revoked_at || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    const response = json(INACTIVE_OFFER_ENTITLEMENT)
    clearCookie(response, secure)
    return response
  }

  return json({
    active: true,
    source: data.source === 'google_ads' || data.source === 'meta_ads' || data.source === 'meta_catalog'
      ? data.source
      : null,
    startedAt: data.started_at,
    expiresAt: data.expires_at,
    offerAvailable: true,
  })
}
