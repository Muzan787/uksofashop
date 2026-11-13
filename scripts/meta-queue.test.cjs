// Admin -> Meta queue reasons (utils/metaQueue.ts).
//
// The queue must say "Eligible to send" only for events the sender would
// really send: consent recorded, within Meta's 7-day limit, not held, not
// Google origin. Everything else names its reason, and Purchase is judged on
// confirmation while OrderDelivered is judged on the real delivery time.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.join(__dirname, '..')
function load(file) {
  const js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  const req = spec => {
    const base = spec.startsWith('@/') ? path.join('src', spec.slice(2)) : spec.startsWith('.') ? path.join(path.dirname(file), spec) : null
    if (base) return load(`${base}.ts`)
    return require(spec)
  }
  vm.runInNewContext(js, { module, exports: module.exports, require: req, Date, Number, JSON })
  return module.exports
}

const { classifyMetaEvent, META_EVENT_MAX_AGE_MS } = load('src/utils/metaQueue.ts')
const NOW = Date.parse('2026-11-14T00:00:00Z')
const hoursAgo = h => new Date(NOW - h * 3600e3).toISOString()
const order = (over = {}) => ({
  status: 'confirmed', utm_source: 'fb', manual_acquisition_source: null, gclid: null, gbraid: null, wbraid: null,
  fbclid: 'x', confirmed_at: hoursAgo(10), delivered_at: null, purchase_event_sent_at: null,
  delivered_event_sent_at: null, utm_campaign: null, cancellation_reason: null, is_test: false, meta_signal_holds: null,
  ...over,
})
const accepted = [{ order_id: 'o', event_name: 'Purchase', status: 'sent', created_at: hoursAgo(1), response_metadata: { outcome: 'accepted' } }]

test('recorded consent inside 7 days is eligible, with a send-by deadline from the confirmation time', () => {
  const item = classifyMetaEvent(order(), 'purchase', 'recorded_grant', [], NOW)
  assert.equal(item.state, 'eligible')
  assert.equal(Date.parse(item.sendBy), Date.parse(hoursAgo(10)) + META_EVENT_MAX_AGE_MS)
})

test('an unsent Purchase confirmed more than 7 days ago is too old and never eligible', () => {
  assert.equal(classifyMetaEvent(order({ confirmed_at: hoursAgo(24 * 8) }), 'purchase', 'recorded_grant', [], NOW).state, 'too_old')
})

test('OrderDelivered uses the real delivery time, not confirmation', () => {
  const o = order({ status: 'delivered', confirmed_at: hoursAgo(24 * 10), delivered_at: hoursAgo(24 * 2), purchase_event_sent_at: hoursAgo(24 * 9) })
  assert.equal(classifyMetaEvent(o, 'delivered', 'recorded_grant', [], NOW).state, 'eligible')
  assert.equal(classifyMetaEvent(o, 'purchase', 'recorded_grant', accepted, NOW).state, 'accepted')
})

test('consent reasons map to awaiting evidence or consent unavailable', () => {
  assert.equal(classifyMetaEvent(order(), 'purchase', 'missing_identity', [], NOW).state, 'awaiting_evidence')
  assert.equal(classifyMetaEvent(order(), 'purchase', 'missing_choice', [], NOW).state, 'consent_unavailable')
  assert.equal(classifyMetaEvent(order(), 'purchase', 'denied_or_withdrawn', [], NOW).state, 'consent_unavailable')
  assert.equal(classifyMetaEvent(order(), 'purchase', null, [], NOW).state, 'consent_unavailable')
})

test('holds, Google origin, cancellations and sent events are never eligible', () => {
  assert.equal(classifyMetaEvent(order({ meta_signal_holds: { state: 'dont_send' } }), 'purchase', 'recorded_grant', [], NOW).state, 'held')
  assert.equal(classifyMetaEvent(order({ utm_source: 'google', manual_acquisition_source: 'google', fbclid: null, gclid: 'g' }), 'purchase', 'recorded_grant', [], NOW).state, 'google_origin')
  assert.equal(classifyMetaEvent(order({ status: 'cancelled' }), 'purchase', 'recorded_grant', [], NOW).state, 'blocked')
  assert.equal(classifyMetaEvent(order({ purchase_event_sent_at: hoursAgo(2) }), 'purchase', 'recorded_grant', accepted, NOW).state, 'accepted')
  assert.equal(classifyMetaEvent(order({ purchase_event_sent_at: hoursAgo(2) }), 'purchase', 'recorded_grant', [], NOW).state, 'sent_unconfirmed')
})

test('Delivered is not ready until the order is actually delivered', () => {
  assert.equal(classifyMetaEvent(order(), 'delivered', 'recorded_grant', [], NOW).state, 'not_ready')
})

test('Admin -> Meta reads Meta’s replies with the server-side client: the admin session has no SELECT grant on conversion_events', () => {
  // Found live on 14 Nov 2026: with the session client every sent event showed
  // "reply unclear" and "Already accepted" read 0, although the ledger held
  // 106 accepted replies. The reply read must stay behind requireAdmin().
  const page = fs.readFileSync(path.join(root, 'src/app/admin/meta/page.tsx'), 'utf8')
  assert.match(page, /await requireAdmin\(\)/)
  assert.match(page, /createUntypedAdminClient\(\)\s*\.from\('conversion_events'\)/)
  assert.doesNotMatch(page, /supabase\s*\.from\('conversion_events'\)/)
  assert.match(page, /attemptsFailed/)
})
