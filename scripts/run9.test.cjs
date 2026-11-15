// Run 9 (15 Nov 2026): the 7-day window, the bar's lead lines, the
// offer-aware hero chip, the hat on WhatsApp, the quieter seasonal band, the
// Business day-by-day chart, the Journeys comparison and the cohort report.
// The 168-hour database migration is replayed in shop-settings.test.cjs.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
function load(file, stubs = {}) {
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const m = { exports: {} }
  const req = id => { if (id in stubs) return stubs[id]; throw new Error(`unstubbed ${id}`) }
  vm.runInNewContext(js, { module: m, exports: m.exports, require: req, Date, Math, Number, Object, Array, String, Map, Set, Intl }, { filename: file })
  return m.exports
}
const seasonal = load('src/utils/seasonal.ts')
const daily = load('src/utils/businessDaily.ts')

test('7 days everywhere: constant, default, migration; no customer copy says 96 hours', () => {
  assert.match(read('src/utils/offers/constants.ts'), /OFFER_WINDOW_HOURS = 336/)
  const sql = read('supabase/migrations/20261115220000_offer_window_168_hours.sql')
  assert.match(sql, /set default 168/)
  assert.match(sql, /expires_at = started_at \+ interval '96 hours'/)
  assert.match(sql, /set expires_at = started_at \+ interval '168 hours'/)
  for (const f of ['src/components/Offer/OfferStrip.tsx', 'src/components/Season/SeasonalLanding.tsx', 'src/app/black-friday/page.tsx', 'src/app/actions/offer.ts']) {
    assert.doesNotMatch(read(f), /96-hour|96 hours/, f)
  }
})

test('bar: eligible lines lead with the code and £50 OFF and fit a 320px phone; none without a window', () => {
  const on = seasonal.seasonMessages('black_friday', true)
  assert.equal(JSON.stringify(on.map(m => m.short)), JSON.stringify(['BLACKFRIDAY · £50 OFF', 'CHRISTMAS · £50 OFF', '£50 OFF MADE-TO-ORDER']))
  assert.equal(JSON.stringify(on.map(m => m.href)), JSON.stringify(['/black-friday', '/christmas', '/collection/made-to-order-sofas']))
  assert.ok(on.every(m => m.short.length <= 22))
  assert.ok(seasonal.seasonMessages('black_friday', false).every(m => !/£|BLACKFRIDAY|CHRISTMAS ·/.test(m.short + m.lead)))
  assert.ok(on.every(m => !/%/.test(m.short + m.lead)), 'never a percentage')
  assert.match(read('src/components/Season/SeasonRotator.tsx'), /const DWELL_MS = 5000/)
})

test('hero chip: £50 only with a live window on a Made-To-Order sofa, no was-price beside it', () => {
  const chip = read('src/components/Home/HeroPriceChip.tsx')
  assert.match(chip, /const off = madeToOrder && ready && active \? Math\.min\(MTO_OFFER_AMOUNT, fromPrice\) : 0/)
  const offerBranch = chip.slice(chip.indexOf('if (off > 0)'), chip.indexOf('data-hero-offer="active"'))
  assert.doesNotMatch(offerBranch, /<s |wasPrice!/)
  const hero = read('src/components/Home/Hero.tsx')
  assert.match(hero, /<HeroPriceChip/)
  // Run 10: the chip sits below the stage, not on the photograph.
  assert.ok(hero.indexOf('<HeroPriceChip') > hero.indexOf('</Parallax>'))
  assert.doesNotMatch(hero, /absolute bottom-\[26%\] left-4/)
  assert.match(read('src/app/page.tsx'), /main_collections\(slug\)/)
})

test('hat: off both Ask us launchers, on the WhatsApp button', () => {
  assert.doesNotMatch(read('src/components/Chat/ChatWidget.tsx'), /SantaHat|LogoHat/)
  assert.doesNotMatch(read('src/components/Chat/AskUsButton.tsx'), /<SantaHat|<LogoHat/)
  const fab = read('src/components/Layout/WhatsAppFab.tsx')
  assert.match(fab, /import LogoHat/)
  assert.ok(fab.indexOf('<LogoHat') < fab.indexOf('<svg viewBox="0 0 24 24"'))
})

test('seasonal band snow: far layer only and lower than the hero', () => {
  const css = read('src/app/globals.css')
  assert.match(css, /\.season-snow--strip \{ opacity: 0\.16; \}/)
  assert.match(css, /\.season-snow--strip \.snow-mid, \.season-snow--strip \.snow-near \{ display: none !important; \}/)
})

test('business day by day: counts real rows per UK day', () => {
  const days = daily.dayRange('2026-11-13', '2026-11-15')
  assert.equal(JSON.stringify(days), JSON.stringify(['2026-11-13', '2026-11-14', '2026-11-15']))
  const out = daily.ordersByDay(days,
    [{ created_at: '2026-11-14T10:00:00Z', status: 'confirmed' }, { created_at: '2026-11-14T23:30:00Z', status: 'cancelled' }, { created_at: '2026-11-15T00:30:00Z', status: 'pending_cod' }],
    [{ delivered_at: '2026-11-13T15:00:00Z' }, { delivered_at: null }])
  assert.equal(JSON.stringify(out.map(d => [d.placed, d.stillGoing, d.cancelled, d.delivered])), JSON.stringify([[0, 0, 0, 1], [2, 1, 1, 0], [1, 1, 0, 0]]))
})

test('cohort report: read-only, mature, same-browser, service role only', () => {
  const sql = read('supabase/migrations/20261115230000_admin_offer_return_cohorts.sql')
  assert.match(sql, /now\(\) - interval '14 days'/)
  assert.match(sql, /NOT_AUTHORISED/)
  assert.match(sql, /grant execute on function public\.admin_offer_return_cohorts\(\) to service_role/)
  assert.doesNotMatch(sql.replace(/--.*$/gm, ''), /\b(insert|update|delete)\b/i)
  assert.match(read('src/app/admin/website/page.tsx'), /admin_offer_return_cohorts/)
  assert.match(read('src/app/admin/journeys/page.tsx'), /Delivery step: this period vs the one before/)
})
