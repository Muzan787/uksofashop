// src/app/api/cron/weekly-digest/route.ts
//
// The Monday email, started by hand or by GitHub with CRON_SECRET. The work
// itself is in utils/jobs/weeklyDigest.ts, which the database's own schedule
// (pg_cron -> /api/jobs/weekly-digest) also runs.
// Protected by CRON_SECRET like the other crons: the path is guessable and
// nothing about it should be triggerable by a stranger, even if all it does
// is send the owner an email.

import { NextResponse } from 'next/server'
import { withJobRun } from '@/utils/jobRuns'
import { runWeeklyDigest } from '@/utils/jobs/weeklyDigest'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function unauthorised() {
  return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
}

// Each authorised run is recorded in job_runs for the Status page.
export const GET = (request: Request) => withJobRun('weekly-digest', request, run)

async function run(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('CRON_SECRET is not set - weekly digest refused to run')
    return unauthorised()
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) return unauthorised()

  const outcome = await runWeeklyDigest()
  return NextResponse.json(outcome.body, { status: outcome.httpStatus })
}
