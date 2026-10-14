// src/app/api/jobs/[job]/route.ts
//
// Where the database starts a scheduled job that needs the site (admin
// upgrade Q2). pg_cron runs private.start_site_job(job), which records the
// run with a one-time ticket and posts it here. The ticket is the only
// credential: it is accepted once, for this job, within 15 minutes, and is
// worthless after. There is no shared secret to leak or rotate.
//
// The reply goes back at once (202) and the job runs after it, so pg_net's
// request never waits on email sending. The result is written onto the run's
// row in job_runs, which the Status page reads; a run that never reports
// back is marked failed by the database after 30 minutes.

import { NextResponse, after } from 'next/server'
import { headers } from 'next/headers'
import { claimJobTicket, finishJobRun, type JobOutcome } from '@/utils/jobRuns'
import { runReviewRequests } from '@/utils/jobs/reviewRequests'
import { runWeeklyDigest } from '@/utils/jobs/weeklyDigest'
import { runHealthCheck } from '@/utils/jobs/healthCheck'
import { rateLimit, callerKey } from '@/utils/rateLimit'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Jobs that run on the site. Recovery clean-up runs inside the database. */
const JOBS: Record<string, () => Promise<JobOutcome>> = {
  'review-requests': runReviewRequests,
  'weekly-digest': runWeeklyDigest,
  'health-check': runHealthCheck,
}

export async function POST(request: Request, { params }: { params: Promise<{ job: string }> }) {
  const { job } = await params
  const run = JOBS[job]
  if (!run) return NextResponse.json({ error: 'Unknown job' }, { status: 404 })

  // A ticket check is one indexed update, but nothing open to the internet
  // should be callable without limit.
  const limit = rateLimit(callerKey(await headers(), 'jobs'), 30, 10 * 60 * 1000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const id = await claimJobTicket(job, request.headers.get('x-job-ticket') ?? '')
  if (id === null) return NextResponse.json({ error: 'Not authorised' }, { status: 401 })

  after(async () => {
    try {
      const outcome = await run()
      await finishJobRun(job, id, outcome.status, outcome.body)
    } catch (err) {
      console.error(`[jobs] ${job} failed:`, err)
      await finishJobRun(job, id, 'failed', { error: err instanceof Error ? err.message : String(err) })
    }
  })

  return NextResponse.json({ accepted: true, run: id }, { status: 202 })
}
