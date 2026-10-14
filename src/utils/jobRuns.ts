// src/utils/jobRuns.ts
//
// Records each run of a scheduled job in job_runs, so the Status page can say
// when it last ran and what it reported (admin upgrade Phase 3) - before this,
// a job that stopped or failed told nobody.
//
// Wraps a cron route's handler without changing it: only a request carrying
// the right CRON_SECRET is recorded (a stranger hitting the URL is refused by
// the route as before and leaves no row), the run's JSON reply becomes the
// row's detail, and a status of 400 or more marks it failed. Recording never
// changes what the job does or returns, and a failure to record is logged and
// ignored.

import 'server-only'
import { createAdminClient } from '@/utils/supabase/admin'
import type { Json } from '@/types/supabase'

type Handler = (request: Request) => Promise<Response>

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

async function start(job: string): Promise<number | null> {
  try {
    const { data, error } = await createAdminClient().from('job_runs').insert({ job }).select('id').single()
    if (error) throw new Error(error.message)
    return data.id
  } catch (err) {
    console.error(`[jobs] could not record the start of ${job}:`, err instanceof Error ? err.message : err)
    return null
  }
}

async function finish(job: string, id: number | null, status: 'ok' | 'failed' | 'skipped', detail: Json): Promise<void> {
  if (id === null) return
  try {
    const { error } = await createAdminClient()
      .from('job_runs')
      .update({ status, detail, finished_at: new Date().toISOString() })
      .eq('id', id)
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
    await finish(job, id, 'failed', { error: err instanceof Error ? err.message : String(err) })
    throw err
  }

  let detail: Json = { status: response.status }
  try {
    detail = (await response.clone().json()) as Json
  } catch {
    // Not JSON; the status code is all there is to record.
  }
  const skipped = typeof detail === 'object' && detail !== null && !Array.isArray(detail) && detail.skipped === true
  await finish(job, id, !response.ok ? 'failed' : skipped ? 'skipped' : 'ok', detail)
  return response
}
