// src/utils/jobs/healthCheck.ts
//
// The hourly health check (admin upgrade Q3). Started by pg_cron through
// /api/jobs/health-check. It builds the same report as the Status page, with
// the service role, and emails the shop when a check turns red, is still red
// a day on, or is fixed (rules in utils/health/alerts.ts).
//
// What it remembers is saved only after the email has gone, so a failed send
// is tried again the next hour instead of being lost. Its own result - the
// count of red and amber checks - is what /api/health reads.

import 'server-only'
import { createAdminClient } from '@/utils/supabase/admin'
import { loadHealthReport } from '@/utils/health/loadHealth'
import { hasAlerts, planHealthAlerts } from '@/utils/health/alerts'
import { sendHealthAlert } from '@/utils/email'
import type { JobOutcome } from '@/utils/jobRuns'

export async function runHealthCheck(): Promise<JobOutcome> {
  const db = createAdminClient()
  const report = await loadHealthReport(db)
  const red = report.checks.filter(c => c.state === 'red').map(c => c.key)
  const amber = report.checks.filter(c => c.state === 'amber').map(c => c.key)

  const { data: previous, error: readError } = await db
    .from('health_alerts')
    .select('check_key, state, red_since, last_alert_at')
  if (readError) {
    return { status: 'failed', httpStatus: 500, body: { error: `Could not read the last alerts: ${readError.message}`, state: report.state, red: red.length } }
  }

  const now = new Date()
  const plan = planHealthAlerts(report, previous ?? [], now)

  let emailed = false
  if (hasAlerts(plan)) {
    try {
      await sendHealthAlert({ broke: plan.broke, still: plan.still, fixed: plan.fixed, headline: report.headline })
      emailed = true
    } catch (err) {
      return {
        status: 'failed',
        httpStatus: 500,
        body: { error: `Alert email failed: ${err instanceof Error ? err.message : String(err)}`, state: report.state, red: red.length },
      }
    }
  }

  const { error: saveError } = await db
    .from('health_alerts')
    .upsert(plan.next.map(m => ({ ...m, updated_at: now.toISOString() })), { onConflict: 'check_key' })
  if (saveError) console.error('[health] could not save alert memory:', saveError.message)

  return {
    status: 'ok',
    httpStatus: 200,
    body: {
      state: report.state,
      red: red.length,
      amber: amber.length,
      red_checks: red,
      broke: plan.broke.map(c => c.key),
      still: plan.still.map(c => c.key),
      fixed: plan.fixed.map(c => c.key),
      emailed,
    },
  }
}
