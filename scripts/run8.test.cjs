// Run 8 (15 Nov 2026): Workstation rules, homepage picks, Christmas showcase
// picks, marquee season lines, the version guard, the ended-offer note, the
// hat on the offer tag, the per-sofa £50 (calculator in mto-offer.test.cjs).
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
const rules = load('src/utils/workstationRules.ts')
const picks = load('src/constants/homePicks.ts')
const seasonal = load('src/utils/seasonal.ts')
const season = load('src/utils/seasonProducts.ts', {
  'next/cache': { unstable_cache: fn => fn },
  '@/utils/supabase/public': { createPublicClient: () => ({}) },
  '@/utils/productUrl': { canonicalProductPath: p => `/shop/x/${p.slug}` },
  '@/utils/seasonal': seasonal,
})
const NOW = Date.parse('2026-11-15T12:00:00Z')

test('workstation: groups follow the real deadline and age', () => {
  const base = { id: 'x', code: 'ABCD1234', href: '/admin/orders/x', what: '', why: '', action: '', source: 'order' }
  assert.equal(rules.classifyWork({ ...base, type: 'meta_send', deadline: new Date(NOW + 5 * 3600000).toISOString() }, NOW).group, 'urgent')
  assert.equal(rules.classifyWork({ ...base, type: 'meta_send', deadline: new Date(NOW + 72 * 3600000).toISOString() }, NOW).group, 'action')
  assert.equal(rules.classifyWork({ ...base, type: 'confirm_order', deadline: null, ageDays: 0 }, NOW).group, 'waiting')
  assert.equal(rules.classifyWork({ ...base, type: 'confirm_order', deadline: null, ageDays: 3 }, NOW).group, 'urgent')
  assert.equal(rules.classifyWork({ ...base, type: 'overdue_delivery', deadline: null }, NOW).group, 'urgent')
  assert.equal(rules.classifyWork({ ...base, type: 'source_review', deadline: null }, NOW).group, 'review')
})

test('workstation: filters are safe and completed is shown only when asked', () => {
  const f = rules.parseWorkFilters({ group: 'nope', type: 'evil', q: "d06'5;087d--x" })
  assert.equal(f.group, 'open'); assert.equal(f.type, 'all'); assert.equal(f.q, 'D065087D')
  const items = [
    { type: 'meta_send', group: 'completed', code: 'AAAA0001', deadline: null },
    { type: 'confirm_order', group: 'waiting', code: 'BBBB0002', deadline: null, ageDays: 1 },
    { type: 'meta_send', group: 'urgent', code: 'CCCC0003', deadline: '2026-11-15T14:00:00Z' },
  ]
  const open = rules.filterWork(items, { group: 'open', type: 'all', q: '' })
  assert.equal(JSON.stringify(open.map(i => i.code)), JSON.stringify(['CCCC0003', 'BBBB0002']))
  assert.equal(rules.filterWork(items, { group: 'completed', type: 'all', q: '' }).length, 1)
  assert.equal(rules.filterWork(items, { group: 'open', type: 'all', q: 'BBBB' }).length, 1)
})

test('workstation sends nothing, shows no customer details, and is admin-only', () => {
  const src = read('src/utils/workstation.ts')
  assert.match(src, /await requireAdmin\(\)/)
  assert.doesNotMatch(src, /customer_name|customer_email|customer_phone|shipping_address/)
  assert.doesNotMatch(src, /sendMetaEvent|\.insert\(|\.update\(|\.delete\(|rpc\(/)
  assert.match(read('src/utils/adminNav.ts'), /key: 'workstation', href: '\/admin\/workstation'/)
  assert.match(read('src/utils/adminTasks.ts'), /\/admin\/workstation\?type=meta_send/)
})

test('homepage rail: Michigan first, then the five made-to-order picks; gaps filled, no repeats', () => {
  assert.equal(picks.HOME_PICKS[0], 'michigan-electric-recliner-3and2-seater')
  assert.equal(picks.HOME_PICKS.length, 6)
  const all = picks.HOME_PICKS.map(slug => ({ slug }))
  const fallback = [{ slug: 'hannah' }, { slug: 'michigan-electric-recliner-3and2-seater' }]
  const shuffled = [...all].reverse()
  assert.equal(JSON.stringify(picks.orderHomePicks(shuffled, fallback).map(p => p.slug)), JSON.stringify([...picks.HOME_PICKS]))
  const missing = picks.orderHomePicks(all.slice(0, 4), fallback)
  assert.equal(missing.length, 5)
  assert.equal(missing[4].slug, 'hannah')
  assert.match(read('src/components/Home/HomeClient.tsx'), /heading="Sofas worth making room for\."/)
})

test('Christmas showcase: three different ranges, one Ashton', () => {
  const row = slug => ({ id: slug, title: slug, slug, base_price: 900, review_count: 0, is_active: true, product_variants: [{ image_url: `i/${slug}`, price_adjustment: 0 }] })
  const rows = ['ashton-high-back-u-shape', 'ashton-high-back-5-seater-corner-2c2', 'ashton-high-back-3and2-seater',
    'salone-5-seater-corner-2c2', 'rio-chesterfield-high-back-3and2-seater', 'sims-high-back-u-shape'].map(row)
  const out = season.pickSeasonProducts(rows, 8).slice(0, 3).map(p => p.slug)
  assert.equal(JSON.stringify(out), JSON.stringify(['ashton-high-back-u-shape', 'salone-5-seater-corner-2c2', 'rio-chesterfield-high-back-3and2-seater']))
  assert.equal(out.filter(s => s.startsWith('ashton')).length, 1)
})

test('marquee: a code only for a live window, never SOFAEXTRA, nothing off season', () => {
  const on = seasonal.marqueeSeasonLines('black_friday', true)
  assert.ok(on[0].includes('BLACKFRIDAY') && on[0].includes('made-to-order'))
  const off = seasonal.marqueeSeasonLines('black_friday', false)
  assert.ok(off.every(l => !/£|BLACKFRIDAY|CHRISTMAS/.test(l)))
  assert.ok(seasonal.marqueeSeasonLines('christmas', true)[0].includes('CHRISTMAS'))
  assert.equal(seasonal.marqueeSeasonLines('off', true).length, 0)
  assert.ok([...on, ...off].every(l => !l.includes('SOFAEXTRA') && l.length <= 48))
  assert.match(read('src/components/Home/TrustMarquee.tsx'), /marqueeSeasonLines\(useSeasonPhase\(\), active\)/)
})

test('version guard: one reload per release, never a loop, never on checkout or admin', () => {
  const g = read('src/components/Layout/VersionGuard.tsx')
  assert.match(g, /if \(done === build\) return/)
  assert.match(g, /MINE === 'none'/)
  assert.match(g, /pathname\.startsWith\('\/checkout'\)/)
  assert.match(read('src/app/api/version/route.ts'), /no-store/)
  const cfg = read('next.config.ts')
  assert.match(cfg, /NEXT_PUBLIC_BUILD_STAMP: BUILD_STAMP/)
  assert.doesNotMatch(cfg.slice(cfg.indexOf('function buildStamp')), /Date\.now\(\)/)
})

test('ended offer: said plainly with its date, never reopened; hat on the offer tag', () => {
  const q = read('src/app/api/offer/qualify/route.ts')
  assert.match(q, /endedAt: issued\.revoked \? null : issued\.expires_at/)
  const strip = read('src/components/Offer/OfferStrip.tsx')
  assert.match(strip, /Your one-time online offer ended on/)
  assert.match(strip, /<LogoHat placement=/)
})

test('phone tree larger and lower; band snow as quiet as the hero; £50 per sofa', () => {
  assert.match(read('src/components/Home/Hero.tsx'), /variant="phone" className="right-1 top-\[88px\] h-\[106px\] w-auto"/)
  assert.match(read('src/components/Season/SeasonalStrip.tsx'), /season-snow--strip h-full/)
  const sql = read('supabase/migrations/20261115210000_mto_offer_per_sofa.sql')
  assert.match(sql, /least\(line_total, v_mto_amount \* qty\)/)
})
