import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { callerKey, rateLimit } from '@/utils/rateLimit'
import { COOKIE } from '@/utils/attribution/ids'
import { OFFER_ENTITLEMENT_COOKIE } from '@/utils/offers/constants'
import { createAdminClient } from '@/utils/supabase/admin'
import { isProductionRequestHost, isServerTrackingEnabled } from '@/utils/trackingEnv'

export const dynamic = 'force-dynamic'

const uuidSchema = z.string().uuid()
const noContent = (status: number) => new NextResponse(null, { status })

export async function POST() {
  if (!isServerTrackingEnabled()) return noContent(204)
  const hdrs = await headers()
  if (!isProductionRequestHost(hdrs.get('host'))) return noContent(204)
  const limit = rateLimit(callerKey(hdrs, 'offer-qualified-event'), 30, 60 * 1000)
  if (!limit.ok) return noContent(429)

  const jar = await cookies()
  const entitlement = uuidSchema.safeParse(jar.get(OFFER_ENTITLEMENT_COOKIE)?.value)
  const visitor = uuidSchema.safeParse(jar.get(COOKIE.visitor)?.value)
  const session = uuidSchema.safeParse(jar.get(COOKIE.session)?.value)
  const arrival = uuidSchema.safeParse(jar.get(COOKIE.arrival)?.value)
  if (!entitlement.success || !visitor.success || !session.success || !arrival.success) {
    return noContent(204)
  }

  try {
    const admin = createAdminClient()
    const { data: authority, error: authorityError } = await admin
      .from('offer_entitlements')
      .select('source, expires_at, revoked_at')
      .eq('token', entitlement.data)
      .eq('visitor_id', visitor.data)
      .maybeSingle()

    if (
      authorityError || !authority || authority.revoked_at ||
      Date.parse(authority.expires_at) <= Date.now()
    ) {
      return noContent(204)
    }

    const { error } = await admin.from('attribution_actions').upsert({
      // The entitlement token changes only when a new entitlement version is
      // issued. Re-checks of the same active authority therefore cannot add a
      // second qualification row.
      id: entitlement.data,
      visitor_id: visitor.data,
      session_id: session.data,
      arrival_id: arrival.data,
      action_type: 'offer_qualified',
      page_url: null,
      metadata: {
        source: authority.source,
        data_class: 'unclassified',
      },
    }, { onConflict: 'id', ignoreDuplicates: true })
    if (error) console.error('Failed to record offer qualification:', error.message)
  } catch (error) {
    console.error('Failed to record offer qualification:', error)
  }

  return noContent(204)
}

