// src/utils/jobRuns.ts
//
// Records each run of a scheduled job in job_runs, so the Status page can say
// when it last ran and what it reported - before this, a job that stopped or
// failed told nobody.
//
// Two ways a job starts:
//
//   * The database (pg_cron), admin upgrade Phase 4. It writes the run with a
//     one-time ticket - only the ticket's SHA-256 is stored - and posts the
//     ticket to /api/jobs/[job]. claimJobTicket() accepts it once, for that
//     job, within 15 minutes; the job runs; finishJobRun() reports back. No
//     shared secret exists anywhere: the ticket is the only credential and it
//     is worthless once claimed. A run that never reports back is marked
//     failed after 30 minutes by the database.
//
//   * By hand or by GitHub, through the old /api/cron/* routes with
//     CRON_SECRET. withJobRun() records those runs without changing what the
//     route does or returns.
//
// Recording never changes what a job does, and a failure to record is logged
// and ignored.

import 'server-only'
import { createHash } from 'crypto'
import { createAdminClient } from '@/utils/supabase/admin'
import type { Json } from '@/types/supabase'

export type JobStatus = 'ok' | 'failed' | 'skipped'

/** What a job's work returns: its verdict, and the reply its route sends. */
export interface JobOutcome {
  status: JobStatus
  httpStatus: number
  body: { [key: string]: Json | undefined }
}

type Handler = (request: Request) => Promise<Response>

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

async function start(job: string): Promise<number | null> {
  try {
    const { data, error } = await createAdminClient()
      .from('job_runs')
      .insert({ job, trigger: 'cron_secret' })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return data.id
  } catch (err) {
    console.error(`[jobs] could not record the start of ${job}:`, err instanceof Error ? err.message : err)
    return null
  }
}

/** Marks a run finished. Only a run still marked running is changed. */
export async function finishJobRun(job: string, id: number | null, status: JobStatus, detail: Json): Promise<void> {
  if (id === null) return
  try {
    const { error } = await createAdminClient()
      .from('job_runs')
      .update({ status, detail, finished_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'running')
    if (error) throw new Error(error.message)
  } catch (err) {
    console.error(`[jobs] could not record the end of ${job}:`, err instanceof Error ? err.message : err)
  }
}

/** Runs `handler` for `job`, recording the run. Returns exactly what the handler returns. */
export async function withJobRun(job: string, request: Request, handler: Handler): Promise<Response> {
  if (!authorised(request)) return handler(request)

  const id = await start(job)
  let response: Response
  try {
    response = await handler(request)
  } catch (err) {
    await finishJobRun(job, id, 'failed', { error: err instanceof Error ? err.message : String(err) })
    throw err
  }

  let detail: Json = { status: response.status }
  try {
    detail = (await response.clone().json()) as Json
  } catch {
    // Not JSON; the status code is all there is to record.
  }
  const skipped = typeof detail === 'object' && detail !== null && !Array.isArray(detail) && detail.skipped === true
  await finishJobRun(job, id, !response.ok ? 'failed' : skipped ? 'skipped' : 'ok', detail)
  return response
}

export function ticketHash(ticket: string): string {
  return createHash('sha256').update(ticket, 'utf8').digest('hex')
}

/**
 * Accepts a database-issued ticket for `job`: once, unexpired, unclaimed.
 * Returns the run's id, or null for anything else. One UPDATE does the
 * check and the claim together, so two callers with the same ticket cannot
 * both get it.
 */
export async function claimJobTicket(job: string, ticket: string): Promise<number | null> {
  if (!/^[0-9a-f]{64}$/.test(ticket)) return null
  const { data, error } = await createAdminClient()
    .from('job_runs')
    .update({ claimed_at: new Date().toISOString() })
    .eq('job', job)
    .eq('ticket_hash', ticketHash(ticket))
    .eq('status', 'running')
    .is('claimed_at', null)
    .gt('ticket_expires_at', new Date().toISOString())
    .select('id')
  if (error) {
    console.error(`[jobs] ticket check for ${job} failed:`, error.message)
    return null
  }
  return data?.[0]?.id ?? null
}
