// src/utils/health/checks.ts
//
// Turns the facts about the shop into the checks the Status page shows:
// green (OK), amber (not set up yet) or red (problem), each in words.
//
// Pure: no database, no environment, no clock of its own - everything comes
// in as `HealthInput`. That is what lets the Status page, the Home health
// card and (Phase 4) the hourly alert email all call this one function and
// never disagree, and what lets scripts/health-checks.test.cjs break each
// setting on purpose and watch its check turn red.
//
// The facts come from two places: admin_status_snapshot() in the database
// (counts, last times, failures) and the server's own environment (which
// keys are set, whether the server key really opens the database).

export type CheckState = 'ok' | 'amber' | 'red'

export interface HealthCheck {
  key: string
  title: string
  state: CheckState
  /** One sentence you can act on. */
  summary: string
  /** A few lines of supporting facts. */
  details: string[]
}

export interface HealthReport {
  state: CheckState
  headline: string
  checks: HealthCheck[]
}

/** What the server knows about itself. Booleans only - never a secret's value. */
export interface HealthEnv {
  production: boolean
  siteUrl: string
  searchEnginesAllowed: boolean
  build: string | null
  serverKey: { set: boolean; works: boolean; error?: string | null }
  email: { configured: boolean; transport: 'hostinger' | 'gmail' | 'none'; adminInboxSet: boolean }
  addressLookup: boolean
  photoUploads: boolean
  tracking: { trackingEnv: string | null; vercelEnvProduction: boolean; metaPixel: boolean; metaCapi: boolean }
  ga4: boolean
  trustpilotInvites: boolean
  cronSecret: boolean
}

type Iso = string | null | undefined

/** The JSON admin_status_snapshot() returns. Every part may be missing. */
export interface HealthSnapshot {
  generated_at?: Iso
  database?: { migrations?: number; latest_version?: string | null; latest_name?: string | null }
  catalogue?: { on_sale?: number }
  orders?: { real?: number; test?: number; waiting?: number; latest_at?: Iso }
  email?: {
    logged?: number; sent_24h?: number; failed_24h?: number; skipped_24h?: number
    last_sent_at?: Iso; last_failure?: { at?: Iso; kind?: string; error?: string | null } | null
  }
  jobs?: { job: string; started_at?: Iso; finished_at?: Iso; status?: string; last_ok_at?: Iso }[]
  cron?: { name: string; active?: boolean; last_status?: string | null; last_start?: Iso; last_message?: string | null }[]
  orderflow?: {
    configured?: boolean; recording_since?: Iso; sends_24h?: number; accepted_24h?: number; refused_24h?: number
    unanswered?: number; last_accepted_at?: Iso; orders_refused_now?: number
    recent_refusals?: { at?: Iso; order_ref?: string | null; status_code?: number | null; message?: string | null; source?: string }[]
  }
  tracking?: { meta_sent_7d?: number; failed_7d?: number; last_meta_sent_at?: Iso; last_failure?: { at?: Iso; platform?: string; event?: string; status?: string } | null }
  ga4?: { accepted_7d?: number; problems_7d?: number; last_at?: Iso }
  google_offline?: {
    pending?: number; oldest_pending_at?: Iso; held?: number; synced?: number
    last_sync_started_at?: Iso; last_sync_status?: string | null; sync_runs?: number
  }
  trustpilot?: { delivered_30d?: number; asked_30d?: number; invites_sent_30d?: number; invites_failed_7d?: number }
  feeds?: { feed: string; fetcher: string; last_at?: Iso; fetches_7d?: number }[]
}

export interface HealthInput {
  env: HealthEnv
  /** Null when the database could not be read at all. */
  snapshot: HealthSnapshot | null
  snapshotError?: string | null
  now: Date
}

/** The scheduled jobs the site expects, and how long before a missed run is a problem. */
export const SCHEDULED_JOBS: { job: string; label: string; everyHours: number }[] = [
  { job: 'review-requests', label: 'Review requests', everyHours: 24 },
  { job: 'recovery-cleanup', label: 'Basket reminder clean-up', everyHours: 24 },
  { job: 'weekly-digest', label: 'Monday summary email', everyHours: 24 * 7 },
  { job: 'health-check', label: 'Hourly health check', everyHours: 1 },
]

const HOUR = 60 * 60 * 1000

const HEADLINES: Record<CheckState, string> = {
  ok: 'Everything is working.',
  amber: "Working. Some parts aren't set up yet.",
  red: 'Something needs attention.',
}

export const STATE_WORDS: Record<CheckState, string> = {
  ok: 'OK',
  amber: 'Not set up yet',
  red: 'Problem',
}

function worst(states: CheckState[]): CheckState {
  if (states.includes('red')) return 'red'
  if (states.includes('amber')) return 'amber'
  return 'ok'
}

function hoursSince(value: Iso, now: Date): number | null {
  if (!value) return null
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : (now.getTime() - t) / HOUR
}

/** "just now", "40 minutes ago", "5 hours ago", "3 days ago". */
export function ago(value: Iso, now: Date): string {
  const hours = hoursSince(value, now)
  if (hours === null) return 'never'
  const minutes = Math.round(hours * 60)
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes} minutes ago`
  if (hours < 48) return `${Math.round(hours)} ${Math.round(hours) === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hours / 24)
  return `${days} days ago`
}

const n = (value: number | undefined | null) => value ?? 0
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

function check(key: string, title: string, state: CheckState, summary: string, details: string[] = []): HealthCheck {
  return { key, title, state, summary, details: details.filter(Boolean) }
}

// ── The checks ─────────────────────────────────────────────────────────────

function databaseCheck(input: HealthInput): HealthCheck {
  const s = input.snapshot
  if (!s) {
    return check('database', 'Database', 'red', "The database couldn't be read.", [input.snapshotError ?? ''])
  }
  const db = s.database ?? {}
  return check('database', 'Database', 'ok', 'Connected.', [
    `${n(db.migrations)} migrations applied`,
    db.latest_name ? `Latest: ${db.latest_name} (${db.latest_version})` : '',
  ])
}

function environmentCheck({ env }: HealthInput): HealthCheck {
  return check('environment', 'Environment', 'ok', `${env.production ? 'Live build' : 'Development'} · ${env.siteUrl}`, [
    env.searchEnginesAllowed ? 'Search engines may index the shop (the admin is excluded)' : 'Search engines are blocked',
    env.build ? `Build ${env.build}` : '',
  ])
}

function serverKeyCheck({ env }: HealthInput): HealthCheck {
  const title = 'Server key'
  if (!env.serverKey.set) {
    return check('server-key', title, 'red', 'The server key (SUPABASE_SERVICE_ROLE_KEY) is missing. Order emails, scheduled jobs and conversions need it.')
  }
  if (!env.serverKey.works) {
    return check('server-key', title, 'red', "The server key is set but doesn't open this database.", [env.serverKey.error ?? ''])
  }
  return check('server-key', title, 'ok', 'Opens this database.')
}

function catalogueCheck({ snapshot }: HealthInput): HealthCheck {
  const onSale = n(snapshot?.catalogue?.on_sale)
  return onSale === 0
    ? check('catalogue', 'Catalogue', 'amber', 'No products are on sale.')
    : check('catalogue', 'Catalogue', 'ok', `${plural(onSale, 'product', 'products')} on sale.`)
}

function ordersCheck({ snapshot, now }: HealthInput): HealthCheck {
  const o = snapshot?.orders ?? {}
  return check('orders', 'Orders', 'ok', `${plural(n(o.real), 'real order', 'real orders')}, ${n(o.test)} test, ${n(o.waiting)} waiting to confirm.`, [
    o.latest_at ? `Latest order ${ago(o.latest_at, now)}` : 'No orders yet',
  ])
}

function emailCheck({ env, snapshot, now }: HealthInput): HealthCheck {
  const title = 'Email'
  const e = snapshot?.email ?? {}
  if (!env.email.configured) {
    return check('email', title, 'red', "Email isn't set up: no SMTP password or Gmail login on the server. Customers get no confirmations.")
  }
  const via = env.email.transport === 'hostinger' ? 'Sending through the shop mailbox (Hostinger)' : 'Sending through the old Gmail login'
  if (n(e.failed_24h) > 0) {
    const last = e.last_failure
    return check('email', title, 'red', `${plural(n(e.failed_24h), 'email', 'emails')} failed in the last 24 hours.`, [
      last ? `Latest: ${last.kind ?? 'email'} ${ago(last.at, now)} - ${last.error ?? 'no reason given'}` : '',
      via,
    ])
  }
  if (!env.email.adminInboxSet) {
    return check('email', title, 'amber', "Shop notifications have nowhere to go: ADMIN_EMAIL isn't set.", [via])
  }
  if (n(e.logged) === 0) {
    return check('email', title, 'ok', 'Set up. The log starts with the next email.', [via])
  }
  return check('email', title, 'ok', `${plural(n(e.sent_24h), 'email', 'emails')} sent in the last 24 hours.`, [
    e.last_sent_at ? `Last sent ${ago(e.last_sent_at, now)}` : '',
    n(e.skipped_24h) ? `${n(e.skipped_24h)} skipped` : '',
    via,
  ])
}

function addressLookupCheck({ env }: HealthInput): HealthCheck {
  return env.addressLookup
    ? check('address-lookup', 'Address lookup', 'ok', 'Postcode address lookup is set up.')
    : check('address-lookup', 'Address lookup', 'amber', 'Not set up (NEXT_PUBLIC_HOMEDATA_API_KEY). Customers type their address in full.')
}

function photoUploadsCheck({ env }: HealthInput): HealthCheck {
  return env.photoUploads
    ? check('photo-uploads', 'Photo uploads', 'ok', 'Product, category and video uploads are set up.')
    : check('photo-uploads', 'Photo uploads', 'amber', 'Not set up (CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET). Photos can still be added by link.')
}

function jobsCheck({ env, snapshot, now }: HealthInput): HealthCheck {
  const title = 'Scheduled jobs'
  const details: string[] = []
  const states: CheckState[] = []

  if (!env.cronSecret) {
    states.push('red')
    details.push("CRON_SECRET isn't set, so every scheduled job is refused")
  }

  for (const { job, label, everyHours } of SCHEDULED_JOBS) {
    const run = snapshot?.jobs?.find(j => j.job === job)
    if (!run) {
      states.push('amber')
      details.push(`${label}: hasn't run since recording began`)
      continue
    }
    const startedHours = hoursSince(run.started_at, now)
    if (run.status === 'running' && startedHours !== null && startedHours > 0.5) {
      states.push('red')
      details.push(`${label}: started ${ago(run.started_at, now)} and never reported back`)
    } else if (run.status === 'failed') {
      states.push('red')
      details.push(`${label}: failed ${ago(run.finished_at ?? run.started_at, now)}`)
    } else if ((hoursSince(run.last_ok_at, now) ?? Infinity) > everyHours + 2) {
      states.push('red')
      details.push(`${label}: hasn't run successfully since ${ago(run.last_ok_at, now)}`)
    } else {
      states.push('ok')
      details.push(`${label}: ran ${ago(run.finished_at ?? run.started_at, now)}`)
    }
  }

  for (const c of snapshot?.cron ?? []) {
    const name = c.name
    // job-* entries only start a run; how the run went is in the lines above.
    // They show here only when the starter itself is paused or failing.
    const starter = name.startsWith('job-')
    if (starter && c.active !== false && c.last_status !== 'failed') continue
    if (c.active === false) {
      states.push('amber')
      details.push(`${name} (database): paused`)
    } else if (!c.last_status) {
      states.push('amber')
      details.push(`${name} (database): hasn't run yet`)
    } else if (c.last_status === 'failed') {
      states.push('red')
      details.push(`${name} (database): failed ${ago(c.last_start, now)} - ${c.last_message ?? ''}`)
    } else {
      states.push('ok')
      details.push(`${name} (database): ran ${ago(c.last_start, now)}`)
    }
  }

  const state = worst(states)
  const summary = state === 'red'
    ? 'A scheduled job has failed or stopped.'
    : state === 'amber'
      ? "Some jobs haven't run since recording began."
      : 'Every job ran on time.'
  return check('jobs', title, state, summary, details)
}

function trackingCheck({ env, snapshot, now }: HealthInput): HealthCheck {
  const title = 'Meta tracking'
  const t = snapshot?.tracking ?? {}
  const details = [
    t.last_meta_sent_at ? `Last Purchase sent to Meta ${ago(t.last_meta_sent_at, now)}` : 'No Purchase sent to Meta yet',
    env.tracking.metaPixel ? 'Pixel: set up' : 'Pixel: not set up',
    env.tracking.metaCapi ? 'Conversions API: set up' : 'Conversions API: not set up',
  ]
  if (n(t.failed_7d) > 0) {
    const f = t.last_failure
    return check('tracking', title, 'red', `${plural(n(t.failed_7d), 'conversion', 'conversions')} failed to send in the last 7 days.`, [
      f ? `Latest: ${f.platform} ${f.event} ${ago(f.at, now)} (${f.status})` : '',
      ...details,
    ])
  }
  const live = env.tracking.trackingEnv === 'production'
  if (!live && env.tracking.vercelEnvProduction) {
    return check('tracking', title, 'amber', 'Working, but only because of the old VERCEL_ENV setting. Set TRACKING_ENV=production on Hostinger.', details)
  }
  if (!live) {
    return check('tracking', title, 'amber', 'Server-side tracking is off on this server (TRACKING_ENV is not production).', details)
  }
  if (!env.tracking.metaCapi) {
    return check('tracking', title, 'amber', "The Conversions API token isn't set, so Purchases can't reach Meta.", details)
  }
  return check('tracking', title, 'ok', `${plural(n(t.meta_sent_7d), 'Purchase', 'Purchases')} sent to Meta in the last 7 days.`, details)
}

function ga4Check({ env, snapshot, now }: HealthInput): HealthCheck {
  const g = snapshot?.ga4 ?? {}
  if (!env.ga4) {
    return check('ga4', 'Google Analytics', 'amber', "GA4's server keys (GA4_MEASUREMENT_ID / GA4_API_SECRET) aren't set.")
  }
  if (n(g.problems_7d) > 0) {
    return check('ga4', 'Google Analytics', 'red', `${plural(n(g.problems_7d), 'purchase', 'purchases')} not accepted by GA4 in the last 7 days.`)
  }
  return check('ga4', 'Google Analytics', 'ok', `${plural(n(g.accepted_7d), 'purchase', 'purchases')} accepted by GA4 in the last 7 days.`, [
    g.last_at ? `Latest ${ago(g.last_at, now)}` : '',
  ])
}

function googleAdsCheck({ snapshot, now }: HealthInput): HealthCheck {
  const title = 'Google Ads offline conversions'
  const q = snapshot?.google_offline ?? {}
  const details = [
    n(q.sync_runs) ? `Last copied to the Google Sheet ${ago(q.last_sync_started_at, now)} (${q.last_sync_status ?? 'unknown'})` : 'Never copied to the Google Sheet',
    `${n(q.synced)} synced so far`,
    n(q.held) ? `${n(q.held)} held back (missing consent or details)` : '',
  ]
  const oldest = hoursSince(q.oldest_pending_at, now)
  if (n(q.pending) > 0 && oldest !== null && oldest > 72) {
    return check('google-ads', title, 'red', `${plural(n(q.pending), 'sale is', 'sales are')} waiting to go to Google, the oldest since ${ago(q.oldest_pending_at, now)}. The Sheet sync hasn't run.`, details)
  }
  if (n(q.pending) > 0) {
    return check('google-ads', title, 'ok', `${plural(n(q.pending), 'sale', 'sales')} queued for the next Sheet sync.`, details)
  }
  if (n(q.sync_runs) === 0) {
    return check('google-ads', title, 'amber', 'The Google Sheet sync has never run.', details)
  }
  return check('google-ads', title, 'ok', 'Nothing waiting to go to Google.', details)
}

function trustpilotCheck({ env, snapshot }: HealthInput): HealthCheck {
  const t = snapshot?.trustpilot ?? {}
  if (!env.trustpilotInvites) {
    return check('trustpilot', 'Trustpilot', 'amber', "Invitations aren't set up (TRUSTPILOT_INVITE_BCC). Ask for reviews from the WhatsApp button on delivered orders.")
  }
  if (n(t.invites_failed_7d) > 0) {
    return check('trustpilot', 'Trustpilot', 'red', `${plural(n(t.invites_failed_7d), 'invitation email', 'invitation emails')} failed in the last 7 days.`)
  }
  return check('trustpilot', 'Trustpilot', 'ok', `${plural(n(t.asked_30d), 'customer', 'customers')} asked for a review in the last 30 days.`, [
    `${n(t.delivered_30d)} delivered in the same 30 days`,
  ])
}

function feedCheck({ snapshot, now }: HealthInput): HealthCheck {
  const title = 'Catalogue feed'
  const meta = snapshot?.feeds?.find(f => f.feed === 'meta-catalog' && f.fetcher === 'meta')
  if (!meta?.last_at) {
    return check('feed', title, 'amber', "No fetch by Meta recorded yet. Meta reads it on its own schedule; if the shop doesn't run catalogue ads, this stays amber.")
  }
  const hours = hoursSince(meta.last_at, now) ?? Infinity
  if (hours > 26) {
    return check('feed', title, 'red', `Meta hasn't fetched the catalogue for ${ago(meta.last_at, now).replace(' ago', '')}.`, [`${n(meta.fetches_7d)} fetches in 7 days`])
  }
  return check('feed', title, 'ok', `Meta fetched it ${ago(meta.last_at, now)}.`, [`${n(meta.fetches_7d)} fetches in 7 days`])
}

function orderflowCheck({ snapshot, now }: HealthInput): HealthCheck {
  const title = 'OrderFlow'
  const o = snapshot?.orderflow ?? {}
  const resend = snapshot?.cron?.find(c => c.name === 'orderflow-resend-recent')
  const refusals = (o.recent_refusals ?? []).map(r =>
    `${r.order_ref ? `#${r.order_ref}` : 'Order unknown (before recording)'} ${ago(r.at, now)}: ${r.status_code ?? 'no reply'} ${r.message ?? ''}`.trim())
  const details = [
    `${n(o.accepted_24h)} of ${n(o.sends_24h)} sends accepted in the last 24 hours`,
    o.last_accepted_at ? `Last accepted ${ago(o.last_accepted_at, now)}` : '',
    resend ? `Re-send job: ${resend.active === false ? 'paused' : `ran ${ago(resend.last_start, now)}`}` : 'Re-send job: not found',
    ...refusals,
  ]
  if (!o.configured) {
    return check('orderflow', title, 'amber', "Off: OrderFlow's address and key aren't in Supabase Vault, so orders aren't sent.", details)
  }
  if (n(o.orders_refused_now) > 0) {
    return check('orderflow', title, 'red', `OrderFlow turned away ${plural(n(o.orders_refused_now), 'order', 'orders')} and hasn't accepted ${n(o.orders_refused_now) === 1 ? 'it' : 'them'} since.`, details)
  }
  if (n(o.unanswered) > 0) {
    return check('orderflow', title, 'red', `${plural(n(o.unanswered), 'send', 'sends')} got no reply from OrderFlow.`, details)
  }
  if (resend && (resend.active === false || resend.last_status === 'failed')) {
    return check('orderflow', title, 'red', `The 15-minute re-send job has ${resend.active === false ? 'been paused' : 'failed'}.`, details)
  }
  if (n(o.refused_24h) > 0) {
    return check('orderflow', title, 'amber', `${plural(n(o.refused_24h), 'send was', 'sends were')} turned away in the last 24 hours, each accepted on a later try or from before recording began.`, details)
  }
  return check('orderflow', title, 'ok', 'Every order sent in the last 24 hours was accepted.', details)
}

/** Every check, in the order the Status page shows them. */
export function buildHealthReport(input: HealthInput): HealthReport {
  const checks = [
    databaseCheck(input),
    environmentCheck(input),
    serverKeyCheck(input),
    catalogueCheck(input),
    ordersCheck(input),
    emailCheck(input),
    orderflowCheck(input),
    jobsCheck(input),
    trackingCheck(input),
    ga4Check(input),
    googleAdsCheck(input),
    trustpilotCheck(input),
    feedCheck(input),
    addressLookupCheck(input),
    photoUploadsCheck(input),
  ]
  const state = worst(checks.map(c => c.state))
  return { state, headline: HEADLINES[state], checks }
}
