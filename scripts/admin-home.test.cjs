// Home, the delivery note and the weekly summary (admin upgrade Phase 7).
//
//   * the "Waiting for you" strip: one chip per kind with something waiting,
//     in words, opening the right screen; nothing when nothing waits;
//   * the driver's note never prints a default as fact on an order taken by
//     hand (src/utils/deliveryNote.ts);
//   * the Monday email's confirmed orders by source: staff's word first, then
//     the ad click, then how it was taken (src/utils/digestSources.ts);
//   * Home and the note read what they should (source checks).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

function load(file) {
  const module = { exports: {} }
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(js, { module, exports: module.exports })
  return module.exports
}

/** Values made inside the vm sandbox, brought into this realm for deepEqual. */
const plain = value => JSON.parse(JSON.stringify(value))

test('the waiting strip says what is waiting, in words, and opens the right screen', () => {
  const { waitingChips } = load('src/utils/adminWaiting.ts')
  assert.deepEqual(plain(waitingChips({ samples: 0, messages: null, reviews: 0, reminders: 0, enquiries: null })), [])
  const chips = plain(waitingChips({ samples: 2, messages: 1, reviews: 3, reminders: 4, enquiries: 1 }))
  assert.deepEqual(chips.map(c => c.label), ['2 samples to post', '1 message', '3 reviews to check', '4 basket reminders', '1 new WhatsApp enquiry'])
  assert.deepEqual(chips.map(c => c.href), ['/admin/swatches', '/admin/leads?tab=messages', '/admin/reviews', '/admin/leads', '/admin/leads?tab=enquiries'])
  assert.deepEqual(plain(waitingChips({ samples: 1, messages: null, reviews: 0, reminders: 2, enquiries: null })).map(c => c.label), ['1 sample to post', '2 basket reminders'])
  // A kind that can't be counted yet never shows, even by accident.
  assert.deepEqual(plain(waitingChips({ samples: NaN, messages: null, reviews: -1, reminders: 0, enquiries: null })), [])
})

test('the delivery note never prints a default as fact on an order taken by hand', () => {
  const { deliveryNoteAccess } = load('src/utils/deliveryNote.ts')
  const values = o => plain(deliveryNoteAccess(o)).map(l => l.value)
  const base = { source: 'website', delivery_floor: 0, delivery_has_lift: false, wants_assembly: false, wants_sofa_removal: false, sofa_removal_seats: null }
  assert.deepEqual(values(base), ['Ground floor', 'No', 'No'])
  assert.deepEqual(values({ ...base, delivery_floor: 3 }), ['Floor 3, no lift', 'No', 'No'])
  assert.deepEqual(values({ ...base, delivery_floor: 2, delivery_has_lift: true, wants_assembly: true, wants_sofa_removal: true, sofa_removal_seats: 3 }),
    ['Floor 2, lift available', 'Yes, assemble on delivery', 'Yes, take away the old sofa (3 seats)'])
  assert.deepEqual(values({ ...base, source: 'whatsapp' }), ['As agreed by phone', 'As agreed by phone', 'As agreed by phone'])
  assert.deepEqual(values({ ...base, source: 'whatsapp', wants_sofa_removal: true }), ['As agreed by phone', 'As agreed by phone', 'Yes, take away the old sofa'])
  assert.deepEqual(plain(deliveryNoteAccess(base)).map(l => l.label), ['Floor and lift', 'Assembly', 'Old sofa removal'])
})

test('confirmed orders are counted by where they came from', () => {
  const { orderSource, summariseConfirmed } = load('src/utils/digestSources.ts')
  const blank = {
    total_amount: 100, source: 'website', channel: null, manual_acquisition_source: null, utm_source: null, utm_campaign: null,
    utm_content: null, fbclid: null, meta_fbc: null, gclid: null, gbraid: null, wbraid: null,
  }
  assert.equal(orderSource(blank), 'direct')
  assert.equal(orderSource({ ...blank, utm_source: 'meta' }), 'meta')
  assert.equal(orderSource({ ...blank, utm_source: 'Facebook' }), 'meta')
  assert.equal(orderSource({ ...blank, meta_fbc: 'fb.1.x' }), 'meta')
  assert.equal(orderSource({ ...blank, gclid: 'g' }), 'google')
  assert.equal(orderSource({ ...blank, source: 'whatsapp', channel: 'whatsapp' }), 'whatsapp')
  assert.equal(orderSource({ ...blank, source: 'whatsapp', channel: 'phone' }), 'phone')
  // A chat that began from an ad counts for the ad; staff's word beats both.
  assert.equal(orderSource({ ...blank, source: 'whatsapp', channel: 'whatsapp', fbclid: 'x' }), 'meta')
  assert.equal(orderSource({ ...blank, fbclid: 'x', manual_acquisition_source: 'referral' }), 'referral')
  assert.equal(orderSource({ ...blank, manual_acquisition_source: 'google' }), 'google')

  const s = plain(summariseConfirmed([
    { ...blank, total_amount: '1299.50', utm_source: 'meta', utm_campaign: 'Autumn', utm_content: 'Reel 3' },
    { ...blank, total_amount: 800, utm_source: 'meta', utm_campaign: 'Autumn', utm_content: 'Reel 3' },
    { ...blank, total_amount: 650, fbclid: 'x' },
    { ...blank, total_amount: 400, source: 'whatsapp', channel: 'phone' },
    { ...blank, total_amount: null },
  ]))
  assert.equal(s.orders, 5)
  assert.equal(s.value, 3149.5)
  assert.deepEqual(s.bySource.map(r => [r.key, r.orders, r.value]), [
    ['meta', 3, 2749.5], ['google', 0, 0], ['whatsapp', 0, 0], ['phone', 1, 400], ['direct', 1, 0], ['referral', 0, 0], ['other', 0, 0],
  ])
  assert.deepEqual(s.metaAds, [
    { campaign: 'Autumn', ad: 'Reel 3', orders: 2, value: 2099.5 },
    { campaign: 'not recorded', ad: 'not recorded', orders: 1, value: 650 },
  ])
  assert.deepEqual(plain(summariseConfirmed([])).bySource.map(r => r.orders), [0, 0, 0, 0, 0, 0, 0])
})

test('the weekly summary counts confirmed, real, not-cancelled orders and keeps everything it had', () => {
  const job = read('src/utils/jobs/weeklyDigest.ts')
  assert.match(job, /\.eq\('is_test', false\)\s*\.neq\('status', 'cancelled'\)\s*\.gte\('confirmed_at', f\)\s*\.lt\('confirmed_at', t\)/)
  const email = read('src/utils/email.ts')
  for (const kept of ["section('Traffic')", "section('Funnel')", "section('Contact')", "section('Where Meta ads landed')", "row('Order value'"]) {
    assert.ok(email.includes(kept), kept)
  }
  assert.ok(email.includes("section('Where confirmed orders came from')"))
  assert.ok(email.includes("section('Meta, by campaign and ad')"))
})

test('Home counts real orders and the note prints alone', () => {
  const home = read('src/app/admin/page.tsx') + read('src/app/admin/HomeView.tsx')
  assert.match(home, /from\('orders'\)\.select\('total_amount, status'\)\.eq\('is_test', false\)/)
  assert.match(home, /\.eq\('status', 'active'\)\.eq\('data_class', 'production_real'\)/, 'the reminders chip counts what the Leads page lists')
  for (const kept of ['/admin/inventory/new', 'Get Back to Leads', '<HealthCard', '/admin/orders?new=1']) assert.ok(home.includes(kept), kept)
  const note = read('src/app/admin/orders/[id]/delivery-note/DeliveryNote.tsx')
  assert.match(note, /body \* \{ visibility: hidden !important; \}/)
  assert.match(note, /#delivery-note, #delivery-note \* \{ visibility: visible !important; \}/)
  assert.ok(note.includes('id="delivery-note"'))
  // The invoice is untouched and still beside it.
  assert.ok(read('src/app/admin/orders/[id]/OrderView.tsx').includes('<DirectPrintButton order={order} />'))
  assert.ok(read('src/app/admin/orders/DirectPrintButton.tsx').includes('Total Due'))
})
