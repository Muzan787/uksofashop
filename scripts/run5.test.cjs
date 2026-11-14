// Run 5 (14 Nov 2026): Leads filters, Journeys chart rules, the Google
// click-only task rule, migrations' grants, and navigation wiring.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
function load(file) {
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const m = { exports: {} }
  vm.runInNewContext(js, { module: m, exports: m.exports, Date, Math, Number, Object, URLSearchParams, Boolean, String }, { filename: file })
  return m.exports
}
const f = load('src/utils/enquiryFilters.ts')
const j = load('src/utils/journeyCharts.ts')
const nav = load('src/utils/adminNav.ts')

test('enquiry filters default to not-yet-ordered taps from the last 7 days', () => {
  const x = f.parseEnquiryFilters({})
  assert.equal(x.status, 'open'); assert.equal(x.period, '7d'); assert.equal(x.source, 'all'); assert.equal(x.q, '')
})

test('a search or the old Show-all link widens status and period instead of hiding results', () => {
  const s = f.parseEnquiryFilters({ q: 'roma' })
  assert.equal(s.status, 'all'); assert.equal(s.period, 'all')
  assert.equal(f.parseEnquiryFilters({ show: 'all' }).period, 'all')
})

test('unknown filter values fall back safely and searches are cleaned', () => {
  const x = f.parseEnquiryFilters({ status: 'x', period: 'y', source: 'z' })
  assert.equal(x.status, 'open'); assert.equal(x.period, '7d'); assert.equal(x.source, 'all')
  assert.doesNotMatch(f.parseEnquiryFilters({ q: "a;b%'c,d()" }).q, /[;%,()]/)
})

test('the statuses are only those the data can support', () => {
  assert.equal(JSON.stringify(f.ENQUIRY_STATUSES.map(s => s.key)), JSON.stringify(['open', 'ordered', 'all']))
})

test('filter links keep the other filters and drop empty ones', () => {
  const x = f.parseEnquiryFilters({ period: '30d', source: 'meta' })
  const href = f.enquiryHref(x, { status: 'ordered', page: null })
  assert.match(href, /^\/admin\/leads\?/)
  for (const part of ['tab=enquiries', 'status=ordered', 'period=30d', 'source=meta']) assert.ok(href.includes(part), part)
  assert.ok(!href.includes('page='))
})

test('period start is null for everything and a real instant otherwise', () => {
  const now = new Date('2026-11-14T12:00:00Z')
  assert.equal(f.periodStart('all', now), null)
  assert.equal(f.periodStart('24h', now), '2026-11-13T12:00:00.000Z')
})

test('journeys: WhatsApp switch-outs are never the biggest loss', () => {
  const loss = j.biggestLoss({ product_sessions: 1000, added_sessions: 100, cart_sessions: 100, cart_then_delivery: 60, delivery_left_untouched: 20, delivery_sessions: 60 })
  assert.equal(loss.key, 'basket_to_delivery')
})

test('journeys: browsing is the fallback only when nothing later has data', () => {
  assert.equal(j.biggestLoss({ product_sessions: 50, added_sessions: 10 }).key, 'product_to_basket')
  assert.equal(j.biggestLoss({}), null)
})

test('Journeys route and its explorer both exist, and Website links to the charts page', () => {
  assert.ok(fs.existsSync(path.join(root, 'src/app/admin/journeys/page.tsx')))
  assert.ok(fs.existsSync(path.join(root, 'src/app/admin/journeys/explorer/page.tsx')))
  assert.ok(fs.existsSync(path.join(root, 'src/app/admin/journeys/export/route.ts')), 'CSV export route kept')
  assert.match(read('src/app/admin/website/page.tsx'), /withParams\('\/admin\/journeys', params, \{\}\)/)
  assert.ok(nav.ADMIN_SECTIONS.some(s => s.key === 'journeys' && s.href === '/admin/journeys'))
})

test('the slow per-request order lookup is gone from the explorer, and charts read only the secure rollup functions', () => {
  assert.doesNotMatch(read('src/app/admin/journeys/explorer/page.tsx'), /loadJourneyLifecycle|journey_session_funnel_v1/)
  const page = read('src/app/admin/journeys/page.tsx')
  assert.match(page, /admin_website_summary/); assert.match(page, /admin_journey_daily/)
  assert.doesNotMatch(page, /journey_events_v1|journey_session_funnel_v1/)
})

test('Google: only a Google-click row can become a staff task; staged internal rows are never counted as uploads', () => {
  const data = read('src/utils/adminTaskData.ts')
  assert.match(data, /a\.gclid \|\| a\.gbraid \|\| a\.wbraid/)
  const sql = read('supabase/migrations/20261114180000_status_google_click_only.sql')
  assert.match(sql, /'pending_google_click', count\(\*\) filter \(where q\.status = 'pending' and q\.has_click\)/)
  assert.match(sql, /'pending_internal_only'/)
  const checks = read('src/utils/health/checks.ts')
  assert.match(checks, /const eligible = n\(q\.pending_google_click\)/)
  assert.doesNotMatch(checks, /waiting to be copied to the Google Sheet by hand/)
})

test('new database functions are service-role only', () => {
  for (const file of ['20261114190000_admin_journey_daily.sql', '20261114200000_admin_orderflow_summary.sql']) {
    const sql = read('supabase/migrations/' + file)
    assert.match(sql, /revoke all on function [^;]*from public, anon, authenticated/, file)
    assert.match(sql, /grant execute on function [^;]*to service_role/, file)
    assert.match(sql, /NOT_AUTHORISED/, file + ' checks the caller itself')
  }
})

test('Advertising links is named for what it is and explains itself', () => {
  assert.ok(nav.ADMIN_SECTIONS.some(s => s.key === 'adlinks' && /Advertising links/.test(s.label)))
  assert.match(read('src/app/admin/ad-links/AdLinksView.tsx'), /This page does not publish an ad/)
  assert.match(read('src/app/admin/ad-links/AdLinksView.tsx'), /marks any order as a <em>test<\/em>/)
})

test('Black Friday paths lead to the made-to-order collection, never the mixed shop listing', () => {
  const seasonal = read('src/utils/seasonal.ts')
  assert.match(seasonal, /MADE_TO_ORDER_HREF = '\/collection\/made-to-order-sofas'/)
  assert.doesNotMatch(seasonal, /href: '\/shop\/all'/)
  assert.doesNotMatch(read('src/components/Season/SeasonalLanding.tsx'), /href="\/collection"|href="\/shop\/all"/)
})

test('the winter hat is decorative, static, positioned over the icon and seasonal only', () => {
  const hat = read('src/components/Season/SantaHat.tsx')
  assert.match(hat, /aria-hidden="true"/)
  assert.match(hat, /pointer-events-none absolute/)
  assert.doesNotMatch(hat, /animate|transition|@keyframes|setInterval|requestAnimationFrame/)
  for (const f of ['src/components/Chat/ChatWidget.tsx', 'src/components/Chat/AskUsButton.tsx']) {
    const src = read(f)
    assert.match(src, /SantaHat/, f)
    assert.match(src, /useSeasonPhase\(\)/, f)
  }
  // No third floating control: the hat is not a button and ChatWidget still renders one launcher.
  assert.equal((read('src/components/Chat/ChatWidget.tsx').match(/aria-label="Ask us a question"/g) || []).length, 1)
})

test('the CraftStory photo frame is capped to the viewport and the section still clips without scrolling', () => {
  const src = read('src/components/Home/CraftStory.tsx')
  assert.match(src, /sticky top-24 aspect-\[4\/5\] max-h-\[calc\(100svh-8rem\)\]/)
  assert.match(src, /overflow-clip/)
})
