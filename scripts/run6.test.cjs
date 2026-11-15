// Run 6 (15 Nov 2026): the 96-hour window, the seasonal code spellings, the
// snow, the Christmas tree and band, the seasonal pages' product selection and
// the footer links. The database side (extension of open windows, aliases) is
// in shop-settings.test.cjs, which replays the real migrations.
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
  const req = id => {
    if (id in stubs) return stubs[id]
    throw new Error(`unstubbed import ${id} in ${file}`)
  }
  vm.runInNewContext(js, { module: m, exports: m.exports, require: req, Date, Math, Number, Object, Array, String, Boolean, Map, Set, Intl, URLSearchParams }, { filename: file })
  return m.exports
}

const deadline = load('src/utils/offers/deadline.ts', { './constants': load('src/utils/offers/constants.ts') })
const constants = load('src/utils/offers/constants.ts')
const seasonal = load('src/utils/seasonal.ts')
const season = load('src/utils/seasonProducts.ts', {
  'next/cache': { unstable_cache: fn => fn },
  '@/utils/supabase/public': { createPublicClient: () => ({}) },
  '@/utils/productUrl': { canonicalProductPath: p => `/shop/all/${p.slug}` },
  '@/utils/seasonal': seasonal,
})

// ── 96 hours ────────────────────────────────────────────────────────────────

test('the countdown reads in days, then hours on the last day (Run 9, 7-day window)', () => {
  const H = 3600000
  assert.equal(deadline.formatCountdown(168 * H - 1000), '6d 23:59:59')
  assert.equal(deadline.formatCountdown(72 * H + 5000), '3d 00:00:05')
  assert.equal(deadline.formatCountdown(23 * H + 12 * 60000 + 5000), '23:12:05')
  assert.equal(deadline.formatCountdown(0), '00:00:00')
  assert.equal(deadline.windowLabel(168), '7-day')
  assert.equal(deadline.windowLabel(36), '36-hour')
})

test('the window is 96 hours in the constant, the default and the migration', () => {
  assert.equal(constants.OFFER_WINDOW_HOURS, 336)
  assert.match(read('src/utils/shopSettings.ts'), /offerWindowHours:\s*336/)
  assert.match(read('supabase/migrations/20261115220000_offer_window_168_hours.sql'), /coalesce\(v_s\.offer_window_hours, 168\)/)
  const sql = read('supabase/migrations/20261115100000_offer_window_96_hours.sql')
  assert.match(sql, /set default 96/)
  assert.match(sql, /coalesce\(v_s\.offer_window_hours, 96\)/)
  assert.doesNotMatch(sql, /coalesce\(v_s\.offer_window_hours, (48|72)\)/)
})

test('the one-off extension touches only open, unrevoked 72-hour windows', () => {
  const sql = read('supabase/migrations/20261115100000_offer_window_96_hours.sql')
  const update = sql.slice(sql.indexOf('update public.offer_entitlements'), sql.indexOf('-- Seasonal spellings'))
  assert.match(update, /revoked_at is null/)
  assert.match(update, /expires_at > now\(\)/)
  assert.match(update, /expires_at = started_at \+ interval '72 hours'/)
  assert.match(update, /set expires_at = started_at \+ interval '96 hours'/)
  assert.doesNotMatch(update, /started_at\s*=/)
})

test('the displayed code stays SOFAEXTRA and the seasonal spellings are recognised, whatever the case', () => {
  assert.equal(constants.OFFER_PUBLIC_CODE, 'SOFAEXTRA')
  assert.equal(JSON.stringify(constants.OFFER_ALIAS_CODES), JSON.stringify(['BLACKFRIDAY', 'CHRISTMAS']))
  for (const c of ['sofaextra', ' BlackFriday ', 'CHRISTMAS']) assert.equal(constants.isOfferCode(c), true, c)
  for (const c of ['', null, undefined, 'SOFAEXTRA2', 'WINTER20']) assert.equal(constants.isOfferCode(c), false, String(c))
})

// ── Snow ────────────────────────────────────────────────────────────────────

test('the snow is three layers of real flake artwork, not gradient dots', () => {
  const css = read('src/app/globals.css')
  const block = css.slice(css.indexOf('/* ─── Seasonal snow'), css.indexOf('/* ─── Christmas tree lights'))
  assert.doesNotMatch(block, /radial-gradient/)
  for (const f of ['snow-far.svg', 'snow-mid.svg', 'snow-near.svg']) {
    assert.match(block, new RegExp(f.replace('.', '\\.')))
    const svg = read(`public/season/${f}`)
    assert.match(svg, /^<svg /)
    assert.ok(svg.length < 20000, `${f} is ${svg.length} bytes`)
    assert.ok((svg.match(/<path /g) || []).length >= 4, `${f} draws several flakes`)
  }
  // Depth: bigger flakes fall faster (shorter loop).
  const dur = n => Number(new RegExp(`snow-fall-${n} (\\d+)s`).exec(block)[1])
  assert.ok(dur('near') < dur('mid') && dur('mid') < dur('far'))
})

test('the snow honours reduced motion and gives phones one layer', () => {
  const css = read('src/app/globals.css')
  const block = css.slice(css.indexOf('/* ─── Seasonal snow'), css.indexOf('/* ─── Christmas tree lights'))
  assert.match(block, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(block, /@media \(width >= 40rem\) and \(prefers-reduced-motion: no-preference\)/)
  // far and near are only switched on in the wide, motion-allowed block
  const wide = block.slice(block.indexOf('@media (width >= 40rem)'), block.indexOf('@media (prefers-reduced-motion: reduce)'))
  assert.match(wide, /snow-far/); assert.match(wide, /snow-near/)
  const phone = block.slice(block.indexOf('@media (prefers-reduced-motion: no-preference)'), block.indexOf('@media (width >= 40rem)'))
  assert.match(phone, /snow-mid/); assert.doesNotMatch(phone, /snow-far|snow-near/)
})

test('the snow component is decoration: aria-hidden, no pointer events, behind content', () => {
  const src = read('src/components/Season/SeasonalSnow.tsx')
  assert.match(src, /aria-hidden="true"/)
  assert.match(src, /pointer-events-none/)
  const hero = read('src/components/Collection/CollectionHero.tsx')
  assert.ok(hero.indexOf('{decoration}') < hero.indexOf('relative mx-auto max-w-shell'), 'snow comes before (under) the content')
})

// ── Tree and band ───────────────────────────────────────────────────────────

test('the tree is decorative, hidden on phones, drawn in season only, and sits behind the sofa', () => {
  const tree = read('src/components/Season/ChristmasTree.tsx')
  assert.match(tree, /aria-hidden="true"/)
  assert.match(tree, /pointer-events-none/)
  assert.match(tree, /hidden sm:block/)
  assert.match(tree, /phase === 'off'\) return null/)
  const hero = read('src/components/Home/Hero.tsx')
  assert.ok(hero.indexOf('<ChristmasTree') < hero.indexOf('<Parallax speed={0.1}'), 'tree comes first, so the sofa paints over it')
  // the hero's own words and actions are untouched
  for (const s of ['Sink into something beautiful.', 'Shop all sofas', 'Shop by collection']) assert.ok(hero.includes(s), s)
  const css = read('src/app/globals.css')
  assert.match(css, /\.tree-light \{ opacity: 0\.95; \}/)
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.tree-light \{ animation/)
})

test('the homepage band is in season only and the footer links appear in season only', () => {
  assert.match(read('src/components/Season/ChristmasShowcase.tsx'), /phase === 'off' \|\| items\.length === 0\) return null/)
  const footer = read('src/components/Layout/Footer.tsx')
  assert.match(footer, /season !== 'off' &&/)
  assert.match(footer, /\/black-friday/); assert.match(footer, /\/christmas/)
  assert.match(read('src/app/sitemap.ts'), /'\/black-friday'/)
  assert.match(read('src/app/sitemap.ts'), /'\/christmas'/)
})

// ── Which sofas the seasonal pages show ─────────────────────────────────────

const row = (slug, price, extra = {}) => ({
  id: slug, title: slug, slug, base_price: price, review_count: 0, is_active: true,
  product_variants: [{ image_url: `https://img/${slug}.jpg`, price_adjustment: 0 }], ...extra,
})

test('seasonal sofas: shapes are read from the slug', () => {
  assert.equal(season.seasonShape('bishop-u-shaped-scattered-back-sofa'), 'u_shape')
  assert.equal(season.seasonShape('salone-5-seater-corner-2c2'), 'corner')
  assert.equal(season.seasonShape('ashton-high-back-3and2-seater'), 'three_two')
  assert.equal(season.seasonShape('verona-scattered-back-family-set'), 'family')
  assert.equal(season.seasonShape('sims-footstool'), 'other')
})

test('seasonal sofas: no reference price, no missing photo, no footstool, spread across shapes, stable order', () => {
  const rows = [
    row('verona-scattered-back-family-set', 799, { was_price: 899 }),
    row('a-u-shape', 649), row('b-u-shape', 749, { review_count: 5 }),
    row('c-5-seater-corner-2c2', 699), row('d-5-seater-corner-2c2', 599),
    row('e-3and2-seater', 749), row('f-3and2-seater', 699),
    row('sims-footstool', 149),
    row('g-u-shape', 999, { product_variants: [{ image_url: null }] }),
    row('h-u-shape', 0),
    row('i-u-shape', 899, { is_active: false }),
  ]
  const out = season.pickSeasonProducts(rows, 8)
  const slugs = out.map(p => p.slug)
  assert.ok(!slugs.includes('verona-scattered-back-family-set'), 'a sofa with a was price is not featured')
  assert.ok(!slugs.includes('sims-footstool'))
  for (const bad of ['g-u-shape', 'h-u-shape', 'i-u-shape']) assert.ok(!slugs.includes(bad), bad)
  // the first cards already span shapes (u-shape, corner, 3+2) rather than three u-shapes in a row
  assert.equal(new Set(out.slice(0, 3).map(p => p.shape)).size, 3)
  assert.equal(slugs[0], 'b-u-shape', 'best-reviewed first inside a shape')
  assert.equal(JSON.stringify(season.pickSeasonProducts(rows, 8).map(p => p.slug)), JSON.stringify(slugs))
  assert.ok(out.length <= 8)
})

// ── The page keeps its honesty rules ────────────────────────────────────────

test('the seasonal landing makes no sale, saving or reference-price claim', () => {
  const src = read('src/components/Season/SeasonalLanding.tsx')
  // strip comments, then look at what a customer can read
  const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  assert.doesNotMatch(code, /£50 off|SAVE £|was £|% off|Black Friday sale is on|only \d+ left/i)
  assert.doesNotMatch(code, /guarantee[sd]? (delivery|arrival)|before Christmas guaranteed/i)
  // the Christmas copy still refuses to promise a date
  assert.match(code, /We will not tell you a sofa will arrive before Christmas until we have checked it/)
  // the shop CTA goes to the made-to-order collection
  assert.match(code, /MADE_TO_ORDER_HREF/)
})

test('the offer chip shows the real deadline from the persisted window and no money figure', () => {
  const src = read('src/components/Season/YourOfferChip.tsx')
  assert.match(src, /useOfferCountdown/)
  assert.match(src, /if \(!active \|\| !deadline\) return null/)
  const code = src.replace(/\/\/.*$/gm, '')
  assert.doesNotMatch(code, /£\d/)
})
