// src/app/checkout/reminders/unsubscribe/route.ts
//
// The unsubscribe link at the foot of the abandoned-checkout reminder.
//
// A GET, because that is what a link in an email is. Mail clients and
// security scanners do prefetch links, so this is deliberately
// non-destructive in the way that matters: it only ever opts somebody OUT.
// A scanner firing it early has the same effect as the customer clicking it,
// which is the outcome the customer is entitled to anyway — the failure mode
// is "stopped receiving an email I had asked for", never the reverse.
//
// It erases the duplicate contact details and basket at the same time, the
// same way the checkout's own untick does, so refusing the message also
// removes the data that message was built from.

import { NextResponse, type NextRequest } from 'next/server'
import { createUntypedAdminClient } from '@/utils/supabase/admin'
import { verifyRecoveryOptOutToken } from '@/utils/recoveryToken'
import { SITE_URL } from '@/constants/site'

export const dynamic = 'force-dynamic'

/** A plain page rather than JSON: a person is reading this, in a browser. */
function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} | UK Sofa Shop</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FBFAF7;
       color:#3B352E;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}
  main{max-width:34rem;text-align:center}
  h1{font-size:1.5rem;color:#191C1B;margin:0 0 .5rem}
  p{margin:0 0 1.5rem;color:#5F574C}
  a{display:inline-block;background:#D4871A;color:#191C1B;text-decoration:none;
    font-weight:700;padding:14px 28px;border-radius:999px}
</style></head>
<body><main><h1>${title}</h1><p>${body}</p>
<a href="${SITE_URL}">Back to the shop</a></main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  )
}

export async function GET(request: NextRequest) {
  const leadId = verifyRecoveryOptOutToken(request.nextUrl.searchParams.get('token'))

  if (!leadId) {
    return page(
      'That link has expired',
      'We could not read that unsubscribe link. Email enquiries@uksofashop.co.uk and we will take you off the list by hand.',
      400,
    )
  }

  const { error } = await createUntypedAdminClient()
    .from('checkout_recovery_leads')
    .update({
      status: 'unsubscribed',
      email: null,
      phone: null,
      email_opt_in: false,
      whatsapp_opt_in: false,
      basket: [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (error) {
    console.error('[recovery] unsubscribe failed for lead', leadId, error)
    return page(
      'Something went wrong',
      'We could not complete that just now. Email enquiries@uksofashop.co.uk and we will take you off the list by hand.',
      500,
    )
  }

  return page(
    'You are unsubscribed',
    'We will not send you any more checkout reminders, and we have deleted the basket and contact details we were holding for it.',
  )
}
