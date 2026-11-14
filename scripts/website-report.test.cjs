// Admin -> Website / Business periods and filters (utils/websiteReport.ts) and
// Admin -> Source review rules (utils/sourceReview.ts).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.join(__dirname, '..')
function load(file) {
  const js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const m = { exports: {} }
  vm.runInNewContext(js, { module: m, exports: m.exports, Intl, Date, Math, Number, Object, encodeURIComponent }, { filename: file })
  return m.exports
}
const w = load('src/utils/websiteReport.ts')
const r = load('src/utils/sourceReview.ts')
const NOW = new Date('2026-11-14T10:00:00Z')

test('7 days means today and the six UK days before it, counted as whole UK days', () => {
  const p = w.parsePeriod({}, NOW)
  assert.equal(p.preset, '7d')
  assert.equal(p.fromDay, '2026-11-08')
  assert.equal(p.toDay, '2026-11-14')
  assert.equal(p.days, 7)
  assert.equal(p.start.toISOString(), '2026-11-08T00:00:00.000Z', 'GMT in November')
  assert.equal(p.end.toISOString(), '2026-11-15T00:00:00.000Z')
})

test('in British Summer Time a UK day starts at 23:00 UTC the evening before', () => {
  assert.equal(w.ukDayStart('2026-07-01').toISOString(), '2026-06-30T23:00:00.000Z')
})

test('today and 30 days', () => {
  assert.equal(w.parsePeriod({ period: 'today' }, NOW).days, 1)
  const p = w.parsePeriod({ period: '30d' }, NOW)
  assert.equal(p.days, 30)
  assert.equal(p.fromDay, '2026-10-16')
})

test('custom dates are checked: reversed, missing or too long falls back to 7 days with a message', () => {
  assert.equal(w.parsePeriod({ period: 'custom', from: '2026-11-10', to: '2026-11-12' }, NOW).days, 3)
  assert.match(w.parsePeriod({ period: 'custom', from: '2026-11-12', to: '2026-11-10' }, NOW).error, /start first/)
  assert.match(w.parsePeriod({ period: 'custom', from: '2026-01-01', to: '2026-11-10' }, NOW).error, /92 days/)
  assert.equal(w.parsePeriod({ period: 'custom', from: 'x', to: 'y' }, NOW).preset, '7d')
})

test('a custom end in the future is capped at today', () => {
  assert.equal(w.parsePeriod({ period: 'custom', from: '2026-11-10', to: '2026-12-01' }, NOW).toDay, '2026-11-14')
})

test('filters accept only known devices and sources', () => {
  assert.equal(w.parseDevice('mobile'), 'mobile')
  assert.equal(w.parseDevice('phone'), null)
  assert.equal(w.parseSource('meta'), 'meta')
  assert.equal(w.parseSource("meta' or 1=1"), null)
})

test('a rate needs a real denominator', () => {
  assert.equal(w.rate(33, 86), '38%')
  assert.equal(w.rate(0, 0), '–')
  assert.equal(w.rate(null, 10), '–')
})

test('filter links keep the other filters', () => {
  assert.equal(w.withParams('/admin/website', { period: '30d', device: 'mobile' }, { source: 'meta' }), '/admin/website?period=30d&device=mobile&source=meta')
  assert.equal(w.withParams('/admin/website', { period: '30d', device: 'mobile' }, { device: undefined }), '/admin/website?period=30d')
})

const order = (over = {}) => ({ status: 'confirmed', is_test: false, manual_acquisition_source: null, utm_source: null, gclid: null, gbraid: null, wbraid: null, fbclid: null, meta_fbc: null, visitor_id: null, whatsapp_reference: null, ...over })

test('source review lists conflicts, tag-only and no-evidence orders only', () => {
  assert.equal(r.reviewReason(order({ fbclid: 'f', gclid: 'g' })), 'conflict')
  assert.equal(r.reviewReason(order({ utm_source: 'fb' })), 'tag_only')
  assert.equal(r.reviewReason(order()), 'no_evidence')
})

test('a blank manual override is NOT a reason to review when there is click evidence', () => {
  assert.equal(r.reviewReason(order({ fbclid: 'f' })), null)
  assert.equal(r.reviewReason(order({ gclid: 'g' })), null)
  assert.equal(r.reviewReason(order({ visitor_id: 'v' })), null)
  assert.equal(r.reviewReason(order({ whatsapp_reference: 'UKSS-WA-1' })), null)
  assert.equal(r.reviewReason(order({ utm_source: 'newsletter' })), null)
})

test('reviewed and test orders never appear', () => {
  assert.equal(r.reviewReason(order({ manual_acquisition_source: 'direct' })), null)
  assert.equal(r.reviewReason(order({ is_test: true })), null)
})

test('the automatic source says what the evidence is, not a guess', () => {
  assert.equal(r.automaticSource(order({ fbclid: 'f' })), 'Meta click')
  assert.equal(r.automaticSource(order({ visitor_id: 'v' })), 'Website visit, no ad')
  assert.equal(r.automaticSource(order()), 'Unknown')
})

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

test('CraftStory: the section clips without becoming a scroll container, so the photo can pin on desktop', () => {
  const src = read('src/components/Home/CraftStory.tsx')
  assert.match(src, /overflow-clip/)
  assert.doesNotMatch(src, /className="grad-indigo grain relative isolate overflow-hidden/)
  assert.match(src, /sticky top-24/)
  // All three photographs are still there, and mobile keeps its accordion.
  assert.equal((src.match(/res\.cloudinary\.com\/dmlna04yk\/image\/upload\/v178225517\d\/Home-Page-Furniture-Background-Image-\d/g) || []).length, 3)
  assert.match(src, /aria-expanded=\{isOpen\}/)
})

test('checkout: the reassurance is first on the delivery step and every field, the WhatsApp route and Place Order remain', () => {
  const src = read('src/components/Checkout/CheckoutClient.tsx')
  const strip = src.indexOf('data-checkout-reassurance')
  const panel = src.search(/<OrderOnWhatsApp\s+variant="panel"/)
  assert.ok(strip > 0 && panel > strip, 'reassurance comes before the WhatsApp panel')
  assert.match(src, /No payment on this page\./)
  for (const name of ['customerName', 'customerEmail', 'customerPhone', 'postcode', 'shippingAddress']) assert.match(src, new RegExp(`name="${name}"`))
  assert.match(src, /Place Order/)
  assert.match(src, /pageContext="checkout_details_whatsapp_order"/)
})

test('admin: new pages are behind requireAdmin and read the journey summary only server-side', () => {
  for (const page of ['src/app/admin/website/page.tsx', 'src/app/admin/business/page.tsx', 'src/app/admin/source-review/page.tsx']) {
    assert.match(read(page), /await requireAdmin\(\)/, page)
  }
  const migration = read('supabase/migrations/20261114150000_journey_session_rollup.sql')
  assert.match(migration, /revoke all on public\.journey_session_rollup from public, anon, authenticated/)
  assert.match(migration, /revoke all on public\.journey_session_products from public, anon, authenticated/)
  assert.match(migration, /data_class' = 'consented_journey'/)
  assert.match(migration, /revoke all on function public\.admin_website_summary[^;]*from public, anon, authenticated/)
  assert.match(migration, /grant execute on function public\.admin_website_summary[^;]*to service_role/)
})

test('orders: "All" and the status tabs count real orders only; test orders keep their own tab', () => {
  const src = read('src/app/admin/orders/page.tsx')
  assert.match(src, /all: real\.length/)
  assert.match(src, /for \(const row of real\)/)
})
