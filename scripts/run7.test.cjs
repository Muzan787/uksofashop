// Run 7 (15 Nov 2026): the £50 Made-To-Order display rules, the rotating bar's
// messages, the seasonal pages on the real collection components, the tree,
// the logo hat, the snow strengths and the admin tokens. The database side of
// the £50 offer is in mto-offer.test.cjs, which replays the real migration.
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
  vm.runInNewContext(js, { module: m, exports: m.exports, require: req, Date, Math, Number, Object, Array, String, Intl }, { filename: file })
  return m.exports
}
const seasonal = load('src/utils/seasonal.ts')
const amount = load('src/utils/offers/amount.ts')
const TIERS = { ELECTRIC: 50, ROMA: 30, STANDARD: 20, EXCLUDED: 0 }

test('£50 on every Made-To-Order product whatever its price; other tiers unchanged', () => {
  assert.equal(amount.MTO_OFFER_AMOUNT, 50)
  for (const price of [149, 399, 449, 849, 1199]) assert.equal(amount.offerAmountFor('MADE_TO_ORDER', price, TIERS, 400), 50)
  assert.equal(amount.offerAmountFor('MADE_TO_ORDER', 30, TIERS, 400), 30, 'never more than the line')
  assert.equal(amount.offerAmountFor('STANDARD', 399, TIERS, 400), 0)
  assert.equal(amount.offerAmountFor('STANDARD', 649, TIERS, 400), 20)
  assert.equal(amount.offerAmountFor('ROMA', 649, TIERS, 400), 30)
  assert.equal(amount.offerAmountFor(null, 649, TIERS, 400), 0)
})

test('the shown code follows the season; SOFAEXTRA is never advertised in season', () => {
  assert.equal(seasonal.seasonCode('run_up'), 'BLACKFRIDAY')
  assert.equal(seasonal.seasonCode('black_friday'), 'BLACKFRIDAY')
  assert.equal(seasonal.seasonCode('christmas'), 'CHRISTMAS')
  assert.equal(seasonal.seasonCode('off'), null)
})

test('rotating bar: three true messages with the right destinations', () => {
  const on = seasonal.seasonMessages('black_friday', true)
  assert.equal(on.length, 3)
  assert.equal(JSON.stringify(on.map(m => m.href)), JSON.stringify(['/black-friday', '/christmas', '/collection/made-to-order-sofas']))
  assert.equal(on[0].code, 'BLACKFRIDAY'); assert.equal(on[1].code, 'CHRISTMAS')
  assert.equal(on[2].countdown, true)
  assert.ok(on.every(m => !JSON.stringify(m).includes('SOFAEXTRA')))
  assert.ok(on.every(m => m.short.length <= 26), 'one line at 320px')
  // without a live window: no code and no money claim at all
  const off = seasonal.seasonMessages('black_friday', false)
  assert.ok(off.every(m => m.code === null && !/£/.test(m.lead + m.short)))
  // Christmas: Christmas first, no Black Friday message after Cyber Monday
  const xmas = seasonal.seasonMessages('christmas', true)
  assert.equal(xmas[0].key, 'christmas')
  assert.ok(!xmas.some(m => m.key === 'black_friday'))
  assert.equal(xmas.length, 3)
  assert.equal(seasonal.seasonMessages('off', true).length, 0)
})

test('rotating bar: pause button, 7 s dwell, reduced motion, quiet while rotating, sticky at the top', () => {
  const src = read('src/components/Season/SeasonRotator.tsx')
  assert.match(src, /const DWELL_MS = 7000/)
  assert.match(src, /'Pause messages'/); assert.match(src, /'Play messages'/)
  assert.match(src, /prefers-reduced-motion: reduce/)
  assert.match(src, /aria-live=\{rotating \? 'off' : 'polite'\}/)
  assert.match(src, /onFocus=/); assert.match(src, /onMouseEnter=/)
  const header = read('src/components/Layout/Header.tsx')
  assert.match(header, /sticky top-0 z-scroll-rail flex h-9/)
  assert.match(header, /annoVisible \? 'top-9' : 'top-0'/)
})

test('seasonal pages are built from the real collection components, not a product grid', () => {
  const src = read('src/components/Season/SeasonalLanding.tsx')
  assert.match(src, /import CollectionHero from '@\/components\/Collection\/CollectionHero'/)
  assert.match(src, /import RangeGrid from '@\/components\/Collection\/RangeGrid'/)
  assert.match(src, /splitCollectionMembers\(members\)/)
  assert.doesNotMatch(src, /ProductCard/)
  const grid = read('src/components/Collection/RangeGrid.tsx')
  assert.match(grid, /import CollectionCard from '@\/components\/Product\/CollectionCard'/)
  assert.match(grid, /eyebrow="Sold as a set"/); assert.match(grid, /heading="The ranges\."/)
  // the collection page uses the very same grid
  assert.match(read('src/app/collection/[slug]/MainCollectionView.tsx'), /<RangeGrid sets=\{sets\}/)
  // both pages read the Made-To-Order collection's own rows
  for (const p of ['src/app/black-friday/page.tsx', 'src/app/christmas/page.tsx']) assert.match(read(p), /getMadeToOrderMembers\(\)/)
  // a clear fallback instead of an empty grid
  assert.match(src, /Open Made-To-Order Sofas/)
  // claims: the £50 is a voucher on today's price, never a comparison
  assert.match(src, /not a comparison with any earlier price/)
  assert.doesNotMatch(src.replace(/\/\/.*$/gm, ''), /was £|save £50|SAVE|% off|has not been announced/i)
})

test('the tree is real artwork, on phones too, and the hat sits on the wordmark', () => {
  const svg = read('public/season/tree.svg')
  assert.match(svg, /prefers-reduced-motion:reduce/)
  assert.ok(svg.length < 260000)
  const tree = read('src/components/Season/ChristmasTree.tsx')
  assert.match(tree, /min-\[360px\]:block sm:hidden/)
  assert.match(tree, /alt=""/); assert.match(tree, /aria-hidden="true"/); assert.match(tree, /fetchPriority="low"/)
  const hero = read('src/components/Home/Hero.tsx')
  assert.match(hero, /variant="phone"/); assert.match(hero, /variant="stage"/)
  assert.ok(hero.indexOf('variant="stage"') < hero.indexOf('<Parallax speed={0.1}'))
  for (const s of ['Sink into something beautiful.', 'Shop all sofas', 'Shop by collection']) assert.ok(hero.includes(s))
  const hat = read('src/components/Season/LogoHat.tsx')
  assert.match(hat, /aria-hidden="true"/); assert.match(hat, /pointer-events-none absolute/); assert.match(hat, /=== 'off'\) return null/)
  assert.match(read('src/components/Layout/Header.tsx'), /<span className="relative inline-block">U<LogoHat \/><\/span>K Sofa/)
})

test('snow: half strength behind copy, quiet on the homepage', () => {
  const css = read('src/app/globals.css')
  assert.match(css, /rgb\(0 0 0 \/ 0\.2\) 0%, rgb\(0 0 0 \/ 0\.2\) 50%/)
  assert.match(css, /\.season-snow--quiet \{ opacity: 0\.25; \}/)
  assert.match(css, /\.season-snow--home \{ opacity: 0\.28; \}/)
  assert.match(css, /\.season-snow--home \.snow-near \{ display: none !important; \}/)
  assert.match(read('src/components/Season/HomeSnow.tsx'), /useSeasonPhase\(\) === 'off' \? null/)
})

test('the price migration touches only active Made-To-Order products, once, and never a was-price', () => {
  const sql = read('supabase/migrations/20261115200000_made_to_order_50_offer.sql')
  assert.match(sql, /mc\.slug = 'made-to-order-sofas'/)
  assert.match(sql, /where p\.is_active/)
  assert.match(sql, /and p\.base_price = a\.old_base_price/)
  assert.doesNotMatch(sql, /set\s+was_price/i)
  assert.match(sql, /'MADE_TO_ORDER'/)
  assert.match(sql, /least\(line_total, v_mto_amount\)/)
})

test('admin: semantic status tokens and the indigo sidebar', () => {
  const tokens = read('src/styles/tokens.css')
  for (const t of ['--color-pine-700: #24584B', '--color-ocean-700: #326A8E', '--color-mulberry-700: #84485A', '--color-frost-50: #E8F1F4', '--color-indigo-900']) assert.ok(tokens.includes(t), t)
  assert.match(read('src/components/Admin/AdminSidebarClient.tsx'), /bg-indigo-900/)
  assert.match(read('src/app/admin/layout.tsx'), /mx-auto max-w-7xl/)
})
