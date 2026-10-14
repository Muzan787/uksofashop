// src/utils/health/alerts.ts
//
// When the hourly health check emails the owner (admin upgrade Q3):
//
//   * once when a check turns red,
//   * again if it is still red a day later (and every day after that),
//   * once when it is fixed.
//
// Amber never emails: "not set up yet" is a to-do, not an emergency. A check
// that goes red and recovers within the hour is caught only if the hourly run
// happens to see it red - that is the trade an hourly check makes.
//
// Pure: it takes the report and what was told last time, and returns what to
// say now and what to remember. The job (utils/jobs/healthCheck.ts) sends the
// email and saves `next` only if the email went, so a failed send is retried
// the next hour rather than lost.

import type { CheckState, HealthCheck, HealthReport } from './checks'

export interface AlertMemory {
  check_key: string
  state: string
  red_since: string | null
  last_alert_at: string | null
}

export interface AlertPlan {
  /** Turned red since the last run. */
  broke: HealthCheck[]
  /** Still red, and the last email about it was a day or more ago. */
  still: HealthCheck[]
  /** Red last time, not red now. */
  fixed: HealthCheck[]
  /** What to remember for the next run. */
  next: AlertMemory[]
}

const DAY_MS = 24 * 60 * 60 * 1000

export function planHealthAlerts(report: HealthReport, previous: AlertMemory[], now: Date): AlertPlan {
  const at = now.toISOString()
  const before = new Map(previous.map(p => [p.check_key, p]))
  const plan: AlertPlan = { broke: [], still: [], fixed: [], next: [] }

  for (const check of report.checks) {
    const prev = before.get(check.key)
    const wasRed = prev?.state === 'red'

    if (check.state === 'red') {
      if (!wasRed) {
        plan.broke.push(check)
        plan.next.push({ check_key: check.key, state: 'red', red_since: at, last_alert_at: at })
      } else if (!prev?.last_alert_at || now.getTime() - Date.parse(prev.last_alert_at) >= DAY_MS) {
        plan.still.push(check)
        plan.next.push({ check_key: check.key, state: 'red', red_since: prev?.red_since ?? at, last_alert_at: at })
      } else {
        plan.next.push({ check_key: check.key, state: 'red', red_since: prev?.red_since ?? at, last_alert_at: prev.last_alert_at })
      }
      continue
    }

    if (wasRed) plan.fixed.push(check)
    plan.next.push({
      check_key: check.key,
      state: check.state satisfies CheckState,
      red_since: null,
      last_alert_at: wasRed ? at : prev?.last_alert_at ?? null,
    })
  }

  return plan
}

export function hasAlerts(plan: AlertPlan): boolean {
  return plan.broke.length + plan.still.length + plan.fixed.length > 0
}
