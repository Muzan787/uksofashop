// src/app/api/cron/weekly-digest/route.ts
//
// The Monday email: last week's funnel against the week before.
//
// Everything on the site that the ads are paid to move, in one message to
// the shop's inbox at 8am on Monday: sessions, how many came from Meta and
// Google, how many answered the cookie question (which is how many the
// Pixel could see), product views -> add to cart -> checkout started ->
// orders placed, WhatsApp and phone taps, and the pages the ads landed on
// most. Each figure carries the previous week beside it, so a change made
// on a Tuesday can be read on the Monday after without anyone asking.
//
// Read straight from the first-party ledger (attribution_sessions,
// attribution_actions, orders, whatsapp_enquiries) with the service role,
// because the cron has no user session and those tables have no public
// policy. Nothing is written.
//
// Scheduled in vercel.json (07:00 UTC Monday = 8am BST / 7am GMT; a cron
// on the Hobby plan may run at most once a day, and this runs once a week).
// Protected by CRON_SECRET like the other crons: the path is guessable and
// nothing about it should be triggerable by a stranger, even if all it does
// is send the owner an email.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendWeeklyDigest, type DigestWeek } from '@/utils/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DAY_MS = 24 * 60 * 60 * 1000

function unauthorised() {
  return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
}

type Db = ReturnType<typeof createAdminClient>

/**
 * PostgREST answers at most 1,000 rows per request whatever the query asks
 * for, and a week of ads brings more sessions than that - the first test run
 * reported exactly 1,000 sessions and exactly 1,000 actions, both the cap and
 * neither the truth. So the session rows are read a page at a time until a
 * short page comes back, and the actions are counted by the database.
 */
async function allSessions(db: Db, f: string, t: string) {
  const PAGE = 1000
  const out: { visitor_id: string | null; landing_page: string | null; fbclid: string | null }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('attribution_sessions')
      .select('visitor_id, landing_page, fbclid')
      .gte('created_at', f)
      .lt('created_at', t)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return out
}

/** Counted by the database, so the 1,000-row cap cannot touch it. */
async function countActions(db: Db, f: string, t: string, type: string): Promise<number> {
  const { count } = await db
    .from('attribution_actions')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', f)
    .lt('created_at', t)
    .eq('action_type', type)
  return count ?? 0
}

/** One week of figures, from `from` (inclusive) to `to` (exclusive). */
async function readWeek(db: Db, from: Date, to: Date): Promise<DigestWeek> {
  const f = from.toISOString()
  const t = to.toISOString()

  const [rows, productViews, addToCart, checkoutStarted, callTaps, orders, enquiries] = await Promise.all([
    allSessions(db, f, t),
    countActions(db, f, t, 'product_view'),
    countActions(db, f, t, 'add_to_cart'),
    countActions(db, f, t, 'checkout_start'),
    countActions(db, f, t, 'call_click'),
    db
      .from('orders')
      .select('status, total_amount, source')
      .gte('created_at', f)
      .lt('created_at', t),
    db
      .from('whatsapp_enquiries')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', f)
      .lt('created_at', t),
  ])
  const landedFromMeta = rows.filter(r => /[?&]fbclid=/i.test(r.landing_page ?? ''))
  const landedFromGoogle = rows.filter(r => /[?&](gclid|gbraid|wbraid)=/i.test(r.landing_page ?? ''))
  // The touch cookies are only written once the cookie question is answered
  // "Accept all", so a Meta landing with its fbclid stored is a consented one.
  const metaConsented = landedFromMeta.filter(r => r.fbclid).length

  const landing = new Map<string, number>()
  for (const r of landedFromMeta) {
    const path = (r.landing_page ?? '/').split('?')[0] || '/'
    landing.set(path, (landing.get(path) ?? 0) + 1)
  }
  const topLandingPages = [...landing.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, n]) => ({ path, count: n }))

  const orderRows = orders.data ?? []
  const websiteOrders = orderRows.filter(o => (o.source ?? 'website') === 'website')
  const whatsappOrders = orderRows.filter(o => o.source === 'whatsapp')

  return {
    sessions: rows.length,
    visitors: new Set(rows.map(r => r.visitor_id)).size,
    metaLandings: landedFromMeta.length,
    metaConsented,
    googleLandings: landedFromGoogle.length,
    productViews,
    addToCart,
    checkoutStarted,
    websiteOrders: websiteOrders.length,
    whatsappOrders: whatsappOrders.length,
    orderValue: orderRows
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0),
    whatsappTaps: enquiries.count ?? 0,
    callTaps,
    topLandingPages,
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('CRON_SECRET is not set - weekly digest refused to run')
    return unauthorised()
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) return unauthorised()

  // Monday 00:00 UTC back to the Monday before, and the week before that.
  // Run at 07:00 on Monday, "last week" is the seven days that ended last
  // night; the small UTC/BST offset moves nothing anyone will notice.
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const thisWeekStart = todayUtc
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * DAY_MS)
  const weekBeforeStart = new Date(lastWeekStart.getTime() - 7 * DAY_MS)

  const db = createAdminClient()
  const [lastWeek, weekBefore] = await Promise.all([
    readWeek(db, lastWeekStart, thisWeekStart),
    readWeek(db, weekBeforeStart, lastWeekStart),
  ])

  try {
    await sendWeeklyDigest({ from: lastWeekStart, to: thisWeekStart }, lastWeek, weekBefore)
  } catch (err) {
    console.error('Weekly digest email failed', err)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, lastWeek, weekBefore })
}
