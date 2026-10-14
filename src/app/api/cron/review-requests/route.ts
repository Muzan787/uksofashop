// src/app/api/cron/review-requests/route.ts
//
// The post-delivery review request, started by hand or by GitHub with
// CRON_SECRET. The work itself is in utils/jobs/reviewRequests.ts, which the
// database's own schedule (pg_cron -> /api/jobs/review-requests) also runs.
// Protected by CRON_SECRET: the path is guessable and this endpoint sends
// email, so it cannot be left open.

import { NextResponse } from 'next/server'
import { withJobRun } from '@/utils/jobRuns'
import { runReviewRequests } from '@/utils/jobs/reviewRequests'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function unauthorised() {
  return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
}

// Each authorised run is recorded in job_runs for the Status page.
export const GET = (request: Request) => withJobRun('review-requests', request, run)

async function run(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('CRON_SECRET is not set - review request cron refused to run')
    return unauthorised()
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) return unauthorised()

  const outcome = await runReviewRequests()
  return NextResponse.json(outcome.body, { status: outcome.httpStatus })
}
