// The Status page's verdicts (admin upgrade P1/P2).
//
// One pure function, src/utils/health/checks.ts, decides green / amber / red
// for the Status page, the Home health card and the hourly alert. These tests
// start from a shop where everything works, then break one thing at a time
// and check that exactly the right check changes - the "break a setting on
// purpose and watch it turn red" of the Phase 3 brief, without touching the
// live site.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function load(file) {
  const module = { exports: {} }
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(js, { module, exports: module.exports, Date, Infinity })
  return module.exports
}

const { buildHealthReport, ago } = load('src/utils/health/checks.ts')
const plain = v => JSON.parse(JSON.stringify(v))

const NOW = new Date('2026-10-15T12:00:00Z')
const hoursAgo = h => new Date(NOW.getTime() - h * 3600_000).toISOString()

function healthy() {
  return {
    now: NOW,
    env: {
      production: true,
      siteUrl: 'https://www.uksofashop.co.uk',
      searchEnginesAllowed: true,
      build: 'abc123',
      serverKey: { set: true, works: true },
      email: { configured: true, transport: 'hostinger', adminInboxSet: true },
      addressLookup: true,
      photoUploads: true,
      tracking: { trackingEnv: 'production', vercelEnvProduction: false, metaPixel: true, metaCapi: true },
      ga4: true,
      trustpilotInvites: true,
      cronSecret: true,
    },
    snapshot: {
      database: { migrations: 92, latest_version: '20261014211622', latest_name: 'status_snapshot' },
      catalogue: { on_sale: 76 },
      orders: { real: 55, test: 1, waiting: 0, latest_at: hoursAgo(5) },
      email: { logged: 40, sent_24h: 6, failed_24h: 0, skipped_24h: 0, last_sent_at: hoursAgo(1), last_failure: null },
      jobs: [
        { job: 'review-requests', started_at: hoursAgo(3), finished_at: hoursAgo(3), status: 'ok', last_ok_at: hoursAgo(3) },
        { job: 'recovery-cleanup', started_at: hoursAgo(4), finished_at: hoursAgo(4), status: 'ok', last_ok_at: hoursAgo(4) },
        { job: 'weekly-digest', started_at: hoursAgo(50), finished_at: hoursAgo(50), status: 'ok', last_ok_at: hoursAgo(50) },
      ],
      cron: [
        { name: 'orderflow-resend-recent', active: true, last_status: 'succeeded', last_start: hoursAgo(0.1) },
        { name: 'orderflow-collect-answers', active: true, last_status: 'succeeded', last_start: hoursAgo(0.05) },
      ],
      orderflow: {
        configured: true, recording_since: hoursAgo(30), sends_24h: 280, accepted_24h: 280, refused_24h: 0,
        unanswered: 0, last_accepted_at: hoursAgo(0.1), orders_refused_now: 0, recent_refusals: [],
      },
      tracking: { meta_sent_7d: 14, failed_7d: 0, last_meta_sent_at: hoursAgo(2), last_failure: null },
      ga4: { accepted_7d: 12, problems_7d: 0, last_at: hoursAgo(2) },
      google_offline: { pending: 0, oldest_pending_at: null, held: 0, synced: 10, last_sync_started_at: hoursAgo(20), last_sync_status: 'verified', sync_runs: 4 },
      trustpilot: { delivered_30d: 17, asked_30d: 15, invites_sent_30d: 15, invites_failed_7d: 0 },
      feeds: [{ feed: 'meta-catalog', fetcher: 'meta', last_at: hoursAgo(3), fetches_7d: 40 }],
    },
  }
}

/** A copy of the healthy shop with one change applied. */
function broken(change) {
  const input = healthy()
  change(input)
  return buildHealthReport(input)
}

const stateOf = (report, key) => report.checks.find(c => c.key === key).state

test('a healthy shop is all green, with the brief\'s headline', () => {
  const report = buildHealthReport(healthy())
  const notGreen = report.checks.filter(c => c.state !== 'ok').map(c => `${c.key}: ${c.summary}`)
  assert.deepEqual(plain(notGreen), [])
  assert.equal(report.state, 'ok')
  assert.equal(report.headline, 'Everything is working.')
  for (const c of report.checks) assert.ok(c.summary.length > 5, `${c.key} has a sentence`)
})

const RED = {
  database: i => { i.snapshot = null; i.snapshotError = 'connection refused' },
  'server-key': i => { i.env.serverKey = { set: true, works: false, error: 'Invalid API key' } },
  email: i => { i.snapshot.email.failed_24h = 2; i.snapshot.email.last_failure = { at: hoursAgo(1), kind: 'order-confirmation', error: 'Greeting never received' } },
  orderflow: i => { i.snapshot.orderflow.orders_refused_now = 1; i.snapshot.orderflow.refused_24h = 3 },
  jobs: i => { i.snapshot.jobs[0].status = 'failed' },
  tracking: i => { i.snapshot.tracking.failed_7d = 1 },
  ga4: i => { i.snapshot.ga4.problems_7d = 2 },
  'google-ads': i => { Object.assign(i.snapshot.google_offline, { pending: 19, oldest_pending_at: hoursAgo(24 * 11) }) },
  trustpilot: i => { i.snapshot.trustpilot.invites_failed_7d = 1 },
  feed: i => { i.snapshot.feeds[0].last_at = hoursAgo(30) },
}

for (const [key, change] of Object.entries(RED)) {
  test(`breaking ${key} turns its check red and the headline to "Something needs attention."`, () => {
    const report = broken(change)
    assert.equal(stateOf(report, key), 'red')
    assert.equal(report.state, 'red')
    assert.equal(report.headline, 'Something needs attention.')
    const others = report.checks.filter(c => c.key !== key && c.state !== 'ok' && !(key === 'database'))
    assert.deepEqual(plain(others.map(c => c.key)), [], 'nothing else changed')
  })
}

test('more ways each check goes red', () => {
  assert.equal(stateOf(broken(i => { i.env.serverKey = { set: false, works: false } }), 'server-key'), 'red')
  assert.equal(stateOf(broken(i => { i.env.email.configured = false }), 'email'), 'red')
  assert.equal(stateOf(broken(i => { i.snapshot.orderflow.unanswered = 2 }), 'orderflow'), 'red')
  assert.equal(stateOf(broken(i => { i.snapshot.cron[0].active = false }), 'orderflow'), 'red', 'the re-send job paused')
  assert.equal(stateOf(broken(i => { Object.assign(i.snapshot.jobs[1], { status: 'running', started_at: hoursAgo(2), finished_at: null }) }), 'jobs'), 'red', 'started and never reported back')
  assert.equal(stateOf(broken(i => { Object.assign(i.snapshot.jobs[0], { last_ok_at: hoursAgo(30), started_at: hoursAgo(30), finished_at: hoursAgo(30) }) }), 'jobs'), 'red', 'a daily job missed a day')
  assert.equal(stateOf(broken(i => { i.env.cronSecret = false }), 'jobs'), 'red')
  assert.equal(stateOf(broken(i => { i.snapshot.cron[1].last_status = 'failed' }), 'jobs'), 'red', 'a database job failed')
})

test('amber means "not set up yet", and says so', () => {
  const amber = (change, key) => {
    const report = broken(change)
    assert.equal(stateOf(report, key), 'amber', key)
    assert.equal(report.headline, "Working. Some parts aren't set up yet.")
  }
  amber(i => { i.env.tracking = { ...i.env.tracking, trackingEnv: null, vercelEnvProduction: true } }, 'tracking')
  amber(i => { i.env.addressLookup = false }, 'address-lookup')
  amber(i => { i.env.photoUploads = false }, 'photo-uploads')
  amber(i => { i.snapshot.orderflow.configured = false }, 'orderflow')
  amber(i => { i.snapshot.feeds = [] }, 'feed')
  amber(i => { i.env.trustpilotInvites = false }, 'trustpilot')
  amber(i => { i.env.email.adminInboxSet = false }, 'email')
  amber(i => { i.snapshot.catalogue.on_sale = 0 }, 'catalogue')
  amber(i => { i.snapshot.jobs = [] }, 'jobs')
  amber(i => { i.env.ga4 = false }, 'ga4')
  // Refused, then accepted on a later try: worth knowing, not an emergency.
  amber(i => { i.snapshot.orderflow.refused_24h = 7 }, 'orderflow')
  const tracking = broken(i => { i.env.tracking = { ...i.env.tracking, trackingEnv: null, vercelEnvProduction: true } })
  assert.match(tracking.checks.find(c => c.key === 'tracking').summary, /TRACKING_ENV=production/)
})

test('OrderFlow refusals are listed with OrderFlow\'s own reply', () => {
  const report = broken(i => {
    i.snapshot.orderflow.refused_24h = 2
    i.snapshot.orderflow.orders_refused_now = 1
    i.snapshot.orderflow.recent_refusals = [
      { at: hoursAgo(0.5), order_ref: 'B24C0B48', status_code: 500, message: 'ingest failed', source: 'resend' },
      { at: hoursAgo(9), order_ref: null, status_code: 500, message: 'ingest failed', source: 'before_recording' },
    ]
  })
  const of = report.checks.find(c => c.key === 'orderflow')
  assert.ok(of.details.some(d => d.includes('#B24C0B48') && d.includes('500 ingest failed')), plain(of.details).join(' | '))
  assert.ok(of.details.some(d => d.startsWith('Order unknown (before recording)')))
})

test('no check ever shows a secret, only whether it is set', () => {
  const input = healthy()
  const text = JSON.stringify(buildHealthReport(input))
  assert.doesNotMatch(text, /eyJ|sk_|Bearer|password/i)
})

test('ago reads naturally', () => {
  assert.equal(ago(hoursAgo(0.01), NOW), 'just now')
  assert.equal(ago(hoursAgo(0.5), NOW), '30 minutes ago')
  assert.equal(ago(hoursAgo(1), NOW), '1 hour ago')
  assert.equal(ago(hoursAgo(30), NOW), '30 hours ago')
  assert.equal(ago(hoursAgo(24 * 11), NOW), '11 days ago')
  assert.equal(ago(null, NOW), 'never')
})
