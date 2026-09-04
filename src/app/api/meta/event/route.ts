// src/app/api/meta/event/route.ts
//
// The browser's half of the funnel, sent a second time from the server.
//
// WHY. utils/orderConversions.ts already reports Purchase through the
// Conversions API, because by the time an order is confirmed there is no
// browser left to report from. ViewContent, AddToCart and InitiateCheckout had
// no such path: they existed only as pixel calls, and a pixel call is the one
// thing a visitor's browser can refuse. Safari's tracking prevention, uBlock
// and every privacy extension block connect.facebook.net outright, so roughly
// a third of the funnel never arrived - and it is not a random third. It is
// skewed towards iPhone owners, who are also the people most likely to buy a
// sofa on credit.
//
// This endpoint is on our own domain, so those same blockers do not touch it.
// The browser sends the event here as well as to the pixel; whichever arrives
// first is the one Meta keeps.
//
// DEDUPLICATION IS THE WHOLE TRICK. Both copies carry the same event_id -
// generated once in utils/tracking.ts and used for the fbq call and this
// request alike. Meta discards the twin. Without that shared id every event
// that got through both paths would be counted twice, which is a worse
// distortion than the missing third this exists to recover.
//
// CONSENT. utils/tracking.ts only calls this once the cookie banner has been
// answered 'granted' - the same gate the Pixel itself is behind. There is no
// server-readable consent cookie to check here (the answer lives in
// localStorage), so this endpoint trusts its caller, exactly as the Pixel does.
// Nothing reaches it from a visitor who declined, because nothing on the page
// calls it.
//
// WHAT IT WILL NOT ACCEPT. The browser sends a path, never a URL, and never any
// figure that decides a price. Value and contents are advertising data: wrong
// numbers here mis-report ROAS, they cannot mis-charge anybody. The order
// Purchase - the one number that has to be right - is still read from the
// database in utils/orderConversions.ts and never from a request body.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies, headers } from 'next/headers'
import { rateLimit, callerKey } from '@/utils/rateLimit'
import { isCapiConfigured, sendCapiEvent } from '@/utils/metaCapi'
import { createClient } from '@/utils/supabase/server'
import { isSensitiveUrl } from '@/utils/redactUrl'
import { SITE_URL } from '@/constants/site'

export const dynamic = 'force-dynamic'

const schema = z.object({
  event: z.enum(['ViewContent', 'AddToCart', 'InitiateCheckout']),
  /** Must equal the eventID the same call passed to fbq. */
  eventId: z.string().min(8).max(64),
  /** A path with its query, as location.pathname + location.search gives it. */
  path: z.string().max(1024),
  value: z.number().nonnegative().max(1_000_000).optional(),
  currency: z.string().length(3).optional(),
  contents: z.array(z.object({
    id: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
    item_price: z.number().nonnegative().max(1_000_000),
  })).max(50).optional(),
  /**
   * Advanced matching, when the page knows who this is - which today means
   * the checkout form, after it has been filled in and validated.
   */
  user: z.object({
    email: z.string().email().max(254).optional(),
    phone: z.string().max(40).optional(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    postcode: z.string().max(16).optional(),
  }).optional(),
})

/** Accepted, ignored, or rejected - the browser is told nothing either way. */
const noContent = (status: number) => new NextResponse(null, { status })

export async function POST(request: Request) {
  // Before the token is configured this is a no-op, like every other optional
  // integration here. 204 rather than an error: the caller is fire-and-forget
  // and there is nothing it could usefully do about it.
  if (!isCapiConfigured()) return noContent(204)

  const hdrs = await headers()

  // Generous, because a real session legitimately fires several of these per
  // page. Low enough that a loop cannot use this endpoint to pump junk into
  // the ad account, which is the only thing abusing it could achieve.
  const limit = rateLimit(callerKey(hdrs, 'meta-capi'), 120, 60 * 1000)
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

  // A path, not a URL: the browser cannot name the host this event claims to
  // have happened on. And the same suppression the Pixel gets in
  // components/UI/TrackingScripts.tsx - an order uuid or a postcode in the
  // address must not reach Meta by this route either.
  if (!event.path.startsWith('/') || event.path.startsWith('//')) return noContent(400)
  if (isSensitiveUrl(event.path)) return noContent(204)

  const jar = await cookies()

  // The signed-in customer, when there is one.
  //
  // getUser() makes no network call for a visitor with no session cookie, so
  // the cost of this is paid only by account holders - which is exactly who it
  // pays off for. Their email and id match events across every device they
  // sign in on, which _fbp cannot do because _fbp is per browser.
  let externalId: string | null = null
  let sessionEmail: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      externalId = user.id
      sessionEmail = user.email ?? null
    }
  } catch {
    // Anonymous, or auth is having a bad day. Neither is a reason to lose the
    // event - fbp, fbc, the IP and the user agent still match it.
  }

  await sendCapiEvent({
    eventName: event.event,
    eventId: event.eventId,
    eventSourceUrl: `${SITE_URL}${event.path}`,
    user: {
      // What the page typed in wins over the session: someone signed in as one
      // address routinely orders to another, and the delivery address is the
      // one Meta will see on the Purchase.
      email: event.user?.email ?? sessionEmail,
      phone: event.user?.phone,
      firstName: event.user?.firstName,
      lastName: event.user?.lastName,
      postcode: event.user?.postcode,
      externalId,
      fbp: jar.get('_fbp')?.value ?? null,
      fbc: jar.get('_fbc')?.value ?? null,
      userAgent: hdrs.get('user-agent'),
      clientIp:
        hdrs.get('x-forwarded-for')?.split(',')[0].trim() ||
        hdrs.get('x-real-ip') ||
        null,
    },
    contents: event.contents,
    value: event.value,
    currency: event.currency ?? 'GBP',
  })

  return noContent(204)
}
