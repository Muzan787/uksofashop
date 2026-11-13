// Admin -> order evidence trail (utils/orderEvidence.ts).
//
// WhatsApp is a contact channel, not an acquisition source; touches come only
// from the order's own visitor; first / assist / last stay separate; a Meta
// and a Google click on one order are never silently credited to one side.
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
  vm.runInNewContext(js, { module, exports: module.exports, require, Date, Number, Math, Set, Boolean }, { filename: file })
  return module.exports
}

const { buildEvidence, contactChannelOf } = load('src/utils/orderEvidence.ts')

const T0 = Date.parse('2026-11-10T12:00:00Z')
const at = (mins) => new Date(T0 + mins * 60000).toISOString()
const order = (over = {}) => ({
  id: 'o1', created_at: at(0), source: 'website', channel: null, visitor_id: 'v1', whatsapp_reference: null,
  utm_source: null, utm_campaign: null, manual_acquisition_source: null,
  gclid: null, gbraid: null, wbraid: null, fbclid: null, meta_fbc: null, visit_matched_at: null, ...over,
})
const session = (mins, over = {}) => ({
  created_at: at(mins), visitor_id: 'v1', first_touch_source: null, first_touch_campaign: null,
  last_touch_source: null, last_touch_campaign: null, gclid: null, gbraid: null, wbraid: null, fbclid: null, ...over,
})
const enquiry = (mins, over = {}) => ({
  reference: 'WA-1', created_at: at(mins), visitor_id: 'v1', fbclid: null, gclid: null, gbraid: null, wbraid: null,
  utm_source: null, utm_campaign: null, product_name: 'Roma', ...over,
})

test('WhatsApp is the contact channel, never the acquisition source', () => {
  const e = buildEvidence(order({ source: 'whatsapp', channel: 'whatsapp', whatsapp_reference: 'WA-1' }), enquiry(-10), [])
  assert.equal(e.contactChannel, 'whatsapp')
  assert.equal(e.platform, 'unattributed')
  assert.match(e.headline, /No advertising source recorded, contacted on WhatsApp/)
})

test('a WhatsApp tap 10 minutes earlier links inside the 30-minute window', () => {
  const e = buildEvidence(order({ source: 'whatsapp', fbclid: 'x' }), enquiry(-10), [])
  assert.equal(e.whatsapp.withinLinkWindow, true)
  assert.equal(e.whatsapp.lagMinutes, 10)
  assert.equal(e.confidence, 'high')
})

test('a tap hours earlier is still linked by reference but is weaker evidence', () => {
  const e = buildEvidence(order({ source: 'whatsapp', fbclid: 'x' }), enquiry(-300), [])
  assert.equal(e.whatsapp.withinLinkWindow, false)
  assert.equal(e.confidence, 'medium')
  assert.ok(e.gaps.some(g => /outside the 30-minute link window/.test(g)))
})

test('an order recorded before its own WhatsApp tap is flagged, not trusted', () => {
  const e = buildEvidence(order({ source: 'whatsapp' }), enquiry(20), [])
  assert.equal(e.whatsapp.withinLinkWindow, false)
  assert.ok(e.gaps.some(g => /before the WhatsApp tap/.test(g)))
})

test('first, assisting and last touch stay separate, and platforms are not merged', () => {
  const e = buildEvidence(order({ gclid: 'g1' }), null, [
    session(-60 * 24 * 5, { fbclid: 'f1', last_touch_campaign: 'oct' }),
    session(-60 * 24 * 2, { fbclid: 'f2' }),
    session(-30, { gclid: 'g1' }),
  ])
  assert.equal(JSON.stringify(e.touches.map(t => [t.role, t.platform])), JSON.stringify([['first', 'meta'], ['assist', 'meta'], ['last', 'google']]))
  assert.ok(e.gaps.some(g => /both a Meta and a Google ad/.test(g)))
})

test('touches come only from the order visitor: another visitor is never merged in', () => {
  const e = buildEvidence(order(), null, [session(-30, { visitor_id: 'someone-else', fbclid: 'f1' })])
  assert.equal(e.touches.length, 0)
  assert.ok(e.gaps.some(g => /No advertising click is recorded/.test(g)))
})

test('visits older than the 30-day internal lookback, or after the order, are ignored', () => {
  const e = buildEvidence(order(), null, [session(-60 * 24 * 31, { fbclid: 'old' }), session(60, { fbclid: 'later' })])
  assert.equal(e.touches.length, 0)
})

test('with no visitor the card says so instead of guessing', () => {
  const e = buildEvidence(order({ visitor_id: null }), null, [session(-30, { fbclid: 'f1' })])
  assert.equal(e.touches.length, 0)
  assert.ok(e.gaps.some(g => /No website visitor is linked/.test(g)))
})

test('a Meta and a Google click on the order itself is unresolved, never auto-credited', () => {
  const e = buildEvidence(order({ fbclid: 'f', gclid: 'g' }), null, [])
  assert.equal(e.platform, 'both_clicks')
  assert.equal(e.confidence, 'low')
})

test('a campaign tag without a click id is low confidence and says the platform cannot match it', () => {
  const e = buildEvidence(order({ utm_source: 'fb' }), null, [])
  assert.equal(e.platform, 'meta')
  assert.equal(e.basis, 'campaign_tag_only')
  assert.equal(e.confidence, 'low')
  assert.ok(e.gaps.some(g => /no ad click id/.test(g)))
})

test('a staff override wins and is high confidence without rewriting the raw click data', () => {
  const e = buildEvidence(order({ manual_acquisition_source: 'google', fbclid: 'f' }), null, [])
  assert.equal(e.platform, 'google')
  assert.equal(e.basis, 'staff_override')
  assert.equal(e.confidence, 'high')
})

test('phone and website channels are named correctly', () => {
  assert.equal(contactChannelOf({ source: 'website', channel: 'phone' }), 'phone')
  assert.equal(contactChannelOf({ source: 'website', channel: null }), 'website')
  assert.equal(contactChannelOf({ source: 'whatsapp', channel: null }), 'whatsapp')
})
