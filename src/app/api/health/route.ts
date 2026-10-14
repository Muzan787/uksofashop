// src/app/api/health/route.ts
//
// The address UptimeRobot watches (admin upgrade Q4).
//
//   200 {"ok":true,"problems":0}    everything the hourly check saw was fine
//   503 {"ok":false,"problems":N}   N checks are red, or the hourly check
//                                   itself has stopped (counted as one)
//
// It reads the hourly health check's last result rather than running every
// check on each request: a public address must stay cheap, and it says only
// how many problems there are, never which. The details are on the Status
// page, behind the admin sign-in. Rate-limited per caller, never cached.
//
// If the site itself is down, UptimeRobot gets no answer at all - which is
// the other thing it is there to notice.

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/utils/supabase/admin'
import { rateLimit, callerKey } from '@/utils/rateLimit'

export const dynamic = 'force-dynamic'

/** The hourly check runs at :07; two hours without a finished run means it has stopped. */
const STALE_AFTER_MS = 2 * 60 * 60 * 1000

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  const limit = rateLimit(callerKey(await headers(), 'health'), 30, 10 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { ...NO_STORE, 'Retry-After': String(limit.retryAfter) } })
  }

  let problems = 0
  try {
    const { data, error } = await createAdminClient()
      .from('job_runs')
      .select('status, finished_at, detail')
      .eq('job', 'health-check')
      .neq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)

    const finished = data?.finished_at ? Date.parse(data.finished_at) : NaN
    const stopped = !data || Number.isNaN(finished) || Date.now() - finished > STALE_AFTER_MS || data.status === 'failed'
    const detail = (data?.detail ?? {}) as { red?: unknown }
    const red = typeof detail.red === 'number' ? detail.red : 0
    problems = red + (stopped ? 1 : 0)
  } catch (err) {
    console.error('[health] could not read the last check:', err instanceof Error ? err.message : err)
    problems = 1
  }

  return NextResponse.json(
    { ok: problems === 0, problems },
    { status: problems === 0 ? 200 : 503, headers: NO_STORE },
  )
}
