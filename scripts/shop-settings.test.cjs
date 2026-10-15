// The shop settings (admin upgrade Phase 10, M1-M3).
//
// Replays the checkout's migrations into PGlite on a stand-in schema, prices
// a matrix of baskets with place_order, applies
// supabase/migrations/20261015130831_shop_settings.sql and prices them again:
//   * the same basket gives the same total before and after;
//   * a changed figure changes the next quote, and the shop's own sum
//     (deliveryBreakdown) agrees with what place_order charges;
//   * the offer switch stops new windows only - a window already given keeps
//     its token, its deadline and its discount;
//   * a code is accepted only while it is on, and only inside a window;
//   * the sample limit and the delivery dates follow the row;
// plus the pure rules in src/utils/shopSettings.ts and shopSettingsForm.ts.
const { test, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
const plain = value => JSON.parse(JSON.stringify(value))

/** Loads a TypeScript module, resolving '@/...' and './...' imports to other loaded modules. */
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const module = { exports: {} }
  cache.set(file, module.exports)
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const req = spec => {
    const base = spec.startsWith('@/') ? path.join('src', spec.slice(2)) : path.join(path.dirname(file), spec)
    for (const candidate of [`${base}.ts`, `${base}.tsx`]) if (fs.existsSync(path.join(root, candidate))) return load(candidate)
    throw new Error(`cannot load ${spec} from ${file}`)
  }
  vm.runInNewContext(js, { module, exports: module.exports, require: req })
  cache.set(file, module.exports)
  return module.exports
}

const settings = load('src/utils/shopSettings.ts')
const form = load('src/utils/shopSettingsForm.ts')
const delivery = load('src/constants/delivery.ts')

// ── The checkout, before and after ──────────────────────────────────────────

const P_ELECTRIC = 'aaaaaaaa-0000-4000-8000-000000000001'
const P_STANDARD = 'aaaaaaaa-0000-4000-8000-000000000002'
const P_NONE = 'aaaaaaaa-0000-4000-8000-000000000003'
const V_ELECTRIC = 'bbbbbbbb-0000-4000-8000-000000000001'
const V_STANDARD = 'bbbbbbbb-0000-4000-8000-000000000002'
const V_NONE = 'bbbbbbbb-0000-4000-8000-000000000003'
const VISITOR = '11111111-1111-4111-8111-111111111111'

const BEFORE = [
  '20261010190333_offer_fixed_48_hour_window.sql',
  '20261011212054_offer_for_every_visitor.sql',
  '20261012122909_delivery_distance_fees.sql',
  '20261012125526_place_order_distance_fee.sql',
]
const SETTINGS_MIGRATION = '20261015130831_shop_settings.sql'

async function checkoutDb() {
  const pg = new PGlite()
  await pg.exec(`create role anon; create role authenticated; create role service_role;
    create schema private; create schema vault; create schema orderflow; create schema auth;
    create function auth.uid() returns uuid language sql as 'select null::uuid';
    create function private.is_admin() returns boolean language sql as 'select false';
    create function private.require_admin() returns void language plpgsql as $$ begin raise exception 'NOT_AUTHORISED'; end $$;
    create table vault.secrets (name text);
    create table products (id uuid primary key, base_price numeric, is_active boolean, custom_made boolean);
    create table product_variants (id uuid primary key, product_id uuid, price_adjustment numeric);
    create table offer_product_tiers (product_id uuid, tier text);
    create table offer_entitlements (id uuid default gen_random_uuid() primary key, token uuid not null, visitor_id uuid unique, source text,
      qualifying_arrival_id uuid, started_at timestamptz, expires_at timestamptz, revoked_at timestamptz, created_at timestamptz default now(), updated_at timestamptz);
    create table fabric_collections (id uuid primary key, name text);
    create table fabrics (id uuid primary key, code text, name text, collection_id uuid, is_active boolean);
    create table orders (id uuid primary key default gen_random_uuid(), customer_name text, customer_email text, customer_phone text,
      shipping_address text, special_instructions text, status text, items_subtotal numeric, discount_amount numeric, discount_tier text,
      promotion_code text, offer_source text, delivery_floor int, delivery_has_lift boolean, fee_upstairs numeric, wants_assembly boolean,
      fee_assembly numeric, wants_sofa_removal boolean, sofa_removal_seats int, fee_sofa_removal numeric, delivery_total numeric,
      total_amount numeric, has_made_to_order boolean, preferred_delivery_date date, is_test boolean default false, created_at timestamptz default now());
    create table order_items (order_id uuid, variant_id uuid, quantity int, price_at_time_of_purchase numeric, fabric_id uuid,
      fabric_code text, fabric_name text, fabric_collection text, customisation jsonb);
    insert into products values ('${P_ELECTRIC}', 1299, true, false), ('${P_STANDARD}', 649, true, false), ('${P_NONE}', 15, true, false);
    insert into product_variants values ('${V_ELECTRIC}', '${P_ELECTRIC}', 0), ('${V_STANDARD}', '${P_STANDARD}', 50), ('${V_NONE}', '${P_NONE}', 0);
    insert into offer_product_tiers values ('${P_ELECTRIC}', 'ELECTRIC'), ('${P_STANDARD}', 'STANDARD');`)
  for (const m of BEFORE) await pg.exec(read(`supabase/migrations/${m}`))
  return pg
}

const applySettings = pg => pg.exec(read(`supabase/migrations/${SETTINGS_MIGRATION}`))

/** A window for the test visitor; its token. */
const issue = async (pg, visitor = VISITOR) => (await pg.query(`select issue_paid_offer_entitlement($1, 'meta_ads', null) r`, [visitor])).rows[0].r

const ADDRESSES = ['5 Road, Blackburn, BB2 1AA', '1 Fore Street, Penzance, TR18 4AA', '3 High St, Thurso, KW14 7AA']

/**
 * What place_order would charge, read from its own refusal: quoting -1 makes
 * it say "PRICE_MISMATCH: quoted -1 but current prices/offer give <total>".
 */
async function quote(pg, b) {
  try {
    await pg.query(
      `select place_order('Test', 't@example.com', '07700900000', $1, '', $2::jsonb, -1, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [b.address, JSON.stringify(b.items), b.floor, b.lift, b.assembly, b.removal, b.code, b.token, b.seats, b.date ?? null])
  } catch (err) {
    const m = /give ([\d.]+)/.exec(err.message)
    if (m) return Number(m[1])
    return `refused: ${err.message.split(':')[0]}`
  }
  throw new Error('place_order accepted a total of -1')
}

function baskets(token) {
  const out = []
  const itemSets = [
    [{ variant_id: V_ELECTRIC, quantity: 1 }],
    [{ variant_id: V_STANDARD, quantity: 2 }],
    [{ variant_id: V_NONE, quantity: 1 }],
    [{ variant_id: V_STANDARD, quantity: 1 }, { variant_id: V_NONE, quantity: 3 }],
  ]
  for (const items of itemSets)
    for (const address of ADDRESSES)
      for (const [floor, lift] of [[0, false], [1, false], [3, false], [3, true], [25, false], [-2, false]])
        for (const assembly of [false, true])
          for (const [removal, seats] of [[false, null], [true, null], [true, 1], [true, 4], [true, 12], [true, 0]])
            for (const [code, tok] of [[null, null], [null, token], ['sofaextra', token], ['SOFAEXTRA', null]])
              out.push({ items, address, floor, lift, assembly, removal, seats, code, token: tok })
  return out
}

let parity
before(async () => {
  const pg = await checkoutDb()
  const token = (await issue(pg)).token
  const all = baskets(token)
  const before = []
  for (const b of all) before.push(await quote(pg, b))
  await applySettings(pg)
  const after = []
  for (const b of all) after.push(await quote(pg, b))
  parity = { pg, token, all, before, after }
})

test('the same basket gives the same total before and after the settings table', () => {
  const { all, before, after } = parity
  assert.ok(all.length > 2000, `priced ${all.length} baskets`)
  const differ = all.map((b, i) => ({ b, was: before[i], now: after[i] })).filter(x => x.was !== x.now)
  assert.deepEqual(differ, [])
  assert.ok(before.every(t => typeof t === 'number'), 'every basket was priced')
})

test('the settings row holds exactly today\'s figures', async () => {
  const row = (await parity.pg.query(`select ${settings.SHOP_SETTINGS_COLUMNS} from shop_settings`)).rows[0]
  assert.deepEqual(plain(settings.settingsFromRow(row)), plain(settings.DEFAULT_SHOP_SETTINGS))
})

test('the shop\'s sum of the extras is what place_order charges', async () => {
  const { pg } = parity
  const shop = settings.DEFAULT_SHOP_SETTINGS
  for (const [floor, lift] of [[0, false], [1, false], [2, false], [4, true], [30, false]])
    for (const assembly of [false, true])
      for (const [removal, seats] of [[false, 3], [true, 1], [true, 3], [true, 10]]) {
        const total = await quote(pg, { items: [{ variant_id: V_NONE, quantity: 1 }], address: ADDRESSES[0], floor, lift, assembly, removal, seats, code: null, token: null })
        const extras = delivery.deliveryTotal({ floor, hasLift: lift, assembly, sofaRemoval: removal, sofaRemovalSeats: seats }, shop)
        assert.equal(total, 15 + extras, `floor ${floor} lift ${lift} assembly ${assembly} removal ${removal}x${seats}`)
      }
})

test('a changed figure changes the next quote, and the shop says the same', async () => {
  const pg = await checkoutDb()
  await applySettings(pg)
  const basket = { items: [{ variant_id: V_STANDARD, quantity: 1 }], address: ADDRESSES[0], floor: 2, lift: false, assembly: true, removal: true, seats: 3, code: null, token: null }
  assert.equal(await quote(pg, basket), 699 + 30 + 20 + 30)

  await pg.exec(`update shop_settings set assembly_fee = 25, upstairs_first_floor = 15, upstairs_per_extra_floor = 12.5, removal_per_seat = 9`)
  assert.equal(await quote(pg, basket), 699 + 27.5 + 25 + 27)
  const row = (await pg.query(`select ${settings.SHOP_SETTINGS_COLUMNS} from shop_settings`)).rows[0]
  const shop = settings.settingsFromRow(row)
  assert.equal(delivery.deliveryTotal({ floor: 2, hasLift: false, assembly: true, sofaRemoval: true, sofaRemovalSeats: 3 }, shop), 27.5 + 25 + 27)

  // The tier amounts.
  const token = (await issue(pg)).token
  const withOffer = { ...basket, assembly: false, removal: false, floor: 0, token }
  assert.equal(await quote(pg, withOffer), 699 - 20)
  await pg.exec(`update shop_settings set tier_standard = 35, tier_roma = 35`)
  assert.equal(await quote(pg, withOffer), 699 - 35)

  // The highest floor and the seat limits hold the same way the shop holds them.
  await pg.exec(`update shop_settings set max_floor = 3, removal_max_seats = 5`)
  const high = { ...basket, assembly: false, removal: true, seats: 9, floor: 9 }
  const s2 = settings.settingsFromRow((await pg.query(`select ${settings.SHOP_SETTINGS_COLUMNS} from shop_settings`)).rows[0])
  assert.equal(await quote(pg, high), 699 + delivery.deliveryTotal({ floor: 9, hasLift: false, assembly: false, sofaRemoval: true, sofaRemovalSeats: 9 }, s2))
  assert.equal(await quote(pg, high), 699 + (15 + 2 * 12.5) + 5 * 9)
})

test('the offer switch stops new windows only', async () => {
  const pg = await checkoutDb()
  await applySettings(pg)
  const given = await issue(pg)
  assert.equal(given.revoked, false)
  await pg.exec(`update shop_settings set offer_enabled = false`)

  // Someone new gets an answer that has already ended; nothing is stored for them.
  const newcomer = '22222222-2222-4222-8222-222222222222'
  const refused = await issue(pg, newcomer)
  assert.equal(refused.revoked, true)
  assert.equal((await pg.query(`select count(*)::int n from offer_entitlements where visitor_id = $1`, [newcomer])).rows[0].n, 0)

  // The window already given comes back untouched and still takes money off.
  const again = await issue(pg)
  assert.equal(again.token, given.token)
  assert.equal(again.expires_at, given.expires_at)
  assert.equal(again.revoked, false)
  const basket = { items: [{ variant_id: V_ELECTRIC, quantity: 1 }], address: ADDRESSES[0], floor: 0, lift: false, assembly: false, removal: false, seats: null, code: 'SOFAEXTRA', token: given.token }
  assert.equal(await quote(pg, basket), 1299 - 50)

  // Back on: a new visitor gets a window again, of the length in the row.
  await pg.exec(`update shop_settings set offer_enabled = true, offer_window_hours = 24`)
  const fresh = await issue(pg, newcomer)
  assert.equal(fresh.revoked, false)
  const hours = (new Date(fresh.expires_at) - new Date(fresh.started_at)) / 3600000
  assert.equal(hours, 24)
  // And the first visitor's deadline still hasn't moved.
  assert.equal((await issue(pg)).expires_at, given.expires_at)
})

test('a code labels an order only while it is on, and only inside a window', async () => {
  const pg = await checkoutDb()
  await applySettings(pg)
  const token = (await issue(pg)).token
  const items = JSON.stringify([{ variant_id: V_STANDARD, quantity: 1 }])
  const offer = async (code, tok) => (await pg.query(`select calculate_order_offer($1::jsonb, $2, $3) r`, [items, code, tok])).rows[0].r

  assert.equal((await offer('SOFAEXTRA', token)).promotion_code, 'SOFAEXTRA')
  assert.equal((await offer(' sofaextra ', token)).promotion_code, 'SOFAEXTRA')
  assert.equal((await offer('SOFAEXTRA', null)).promotion_code, null)
  assert.equal(Number((await offer('SOFAEXTRA', null)).discount_amount), 0)

  await pg.exec(`insert into offer_codes (code) values ('WINTER20')`)
  assert.equal((await offer('winter20', token)).promotion_code, 'WINTER20')
  await pg.exec(`update offer_codes set is_active = false where code = 'WINTER20'`)
  const off = await offer('WINTER20', token)
  assert.equal(off.promotion_code, null)
  // The money off comes from the window, not the code.
  assert.equal(Number(off.discount_amount), 20)

  await assert.rejects(() => pg.exec(`insert into offer_codes (code) values ('no')`), /check/)
  await assert.rejects(() => pg.exec(`insert into offer_codes (code) values ('WITH-DASH')`), /check/)
})

test('the delivery dates follow the row', async () => {
  const pg = await checkoutDb()
  await applySettings(pg)
  const day = n => (new Date(Date.now() + n * 86400000)).toISOString().slice(0, 10)
  const basket = d => ({ items: [{ variant_id: V_NONE, quantity: 1 }], address: ADDRESSES[0], floor: 0, lift: false, assembly: false, removal: false, seats: null, code: null, token: null, date: d })
  // London's today can differ from UTC's around midnight, so keep a day clear of each edge.
  assert.equal(await quote(pg, basket(day(5))), 15)
  assert.match(String(await quote(pg, basket(day(1)))), /DELIVERY_DATE_TOO_SOON/)
  assert.match(String(await quote(pg, basket(day(200)))), /DELIVERY_DATE_TOO_FAR/)
  await pg.exec(`update shop_settings set preferred_earliest_days = 10, preferred_latest_days = 250`)
  assert.match(String(await quote(pg, basket(day(5)))), /DELIVERY_DATE_TOO_SOON/)
  assert.equal(await quote(pg, basket(day(200))), 15)
})

test('the table refuses figures out of order or out of range', async () => {
  const pg = await checkoutDb()
  await applySettings(pg)
  for (const bad of [
    'delivery_window_from_days = 5, delivery_window_to_days = 3',
    'preferred_earliest_days = 10, preferred_latest_days = 10',
    'tier_roma = 60',
    'removal_default_seats = 12',
    'max_floor = 0',
    'sample_limit = 0',
    'offer_window_hours = 0',
    'assembly_fee = -1',
  ]) await assert.rejects(() => pg.exec(`update shop_settings set ${bad}`), /check/, bad)
  await assert.rejects(() => pg.exec(`insert into shop_settings (id) values (false)`), /check|duplicate/)
})

test('saving the settings is for admins only', async () => {
  const pg = await checkoutDb()
  await applySettings(pg)
  await assert.rejects(() => pg.query(`select save_shop_settings('{"assembly_fee": 30}'::jsonb)`), /NOT_AUTHORISED/)
  await pg.exec(`create or replace function private.require_admin() returns void language plpgsql as $$ begin end $$`)
  await pg.query(`select save_shop_settings('{"assembly_fee": 30}'::jsonb)`)
  assert.equal(Number((await pg.query(`select assembly_fee from shop_settings`)).rows[0].assembly_fee), 30)
  for (const [p, code] of [
    ['{"delivery_window_from_days": 9}', 'WINDOW_ORDER'],
    ['{"preferred_latest_days": 2}', 'DATES_ORDER'],
    ['{"tier_standard": 45}', 'TIERS_ORDER'],
    ['{"removal_min_seats": 4}', 'SEATS_ORDER'],
    ['{"assembly_fee": "thirty"}', 'BAD_NUMBER'],
    ['{"sample_limit": 2.5}', 'BAD_WHOLE_NUMBER'],
    ['{"sample_limit": 50}', 'OUT_OF_RANGE'],
    ['{"orderflow_enabled": false}', null],
    ['{"orderflow_enabled": true}', 'ORDERFLOW_NOT_CONNECTED'],
  ]) {
    if (code === null) { await pg.query(`select save_shop_settings($1::jsonb)`, [p]); continue }
    await assert.rejects(() => pg.query(`select save_shop_settings($1::jsonb)`, [p]), new RegExp(code), p)
  }
  // A refused save changes nothing.
  assert.equal(Number((await pg.query(`select assembly_fee from shop_settings`)).rows[0].assembly_fee), 30)
})

// ── The pure rules ──────────────────────────────────────────────────────────

test('settingsFromRow falls back to today\'s figures, field by field', () => {
  assert.deepEqual(plain(settings.settingsFromRow(null)), plain(settings.DEFAULT_SHOP_SETTINGS))
  const s = settings.settingsFromRow({ assembly_fee: '25.50', tier_roma: null, offer_enabled: false, sample_limit: 'x' })
  assert.equal(s.assemblyFee, 25.5)
  assert.equal(s.tierAmounts.ROMA, 30)
  assert.equal(s.offerEnabled, false)
  assert.equal(s.sampleLimit, 5)
})

test('figures are written as the shop writes them', () => {
  assert.equal(settings.gbpFigure(20), '£20')
  assert.equal(settings.gbpFigure(12.5), '£12.50')
  assert.equal(settings.countWord(5), 'Five')
  assert.equal(settings.countWord(12), '12')
})

test('the form covers every figure in the row, once', () => {
  const columns = settings.SHOP_SETTINGS_COLUMNS.split(', ').filter(c => !['offer_enabled', 'orderflow_enabled'].includes(c))
  assert.deepEqual(plain(form.FIGURE_FIELDS.map(f => f.key)).sort(), columns.sort())
  // And the database checks the same keys.
  const sql = read(`supabase/migrations/${SETTINGS_MIGRATION}`)
  for (const key of columns) assert.ok(sql.includes(`'${key}'`), `save_shop_settings checks ${key}`)
})

test('today\'s figures pass the form as they are', () => {
  const res = form.checkFigures(form.figuresFromSettings(settings.DEFAULT_SHOP_SETTINGS))
  assert.equal(res.ok, true)
  assert.equal(res.figures.assembly_fee, 20)
  assert.equal(res.figures.preferred_latest_days, 180)
})

test('the form refuses a window that ends before it starts, and tiers out of order', () => {
  const today = form.figuresFromSettings(settings.DEFAULT_SHOP_SETTINGS)
  const check = changes => form.checkFigures({ ...today, ...changes })
  assert.deepEqual(plain(check({ delivery_window_from_days: '5', delivery_window_to_days: '3' })), { ok: false, field: 'delivery_window_to_days', text: form.SETTINGS_REFUSALS.WINDOW_ORDER })
  assert.deepEqual(plain(check({ preferred_latest_days: '4' })), { ok: false, field: 'preferred_latest_days', text: form.SETTINGS_REFUSALS.DATES_ORDER })
  assert.deepEqual(plain(check({ tier_roma: '60' })), { ok: false, field: 'tier_roma', text: form.SETTINGS_REFUSALS.TIERS_ORDER })
  assert.deepEqual(plain(check({ tier_excluded: '25' })), { ok: false, field: 'tier_roma', text: form.SETTINGS_REFUSALS.TIERS_ORDER })
  assert.deepEqual(plain(check({ removal_default_seats: '11' })), { ok: false, field: 'removal_default_seats', text: form.SETTINGS_REFUSALS.SEATS_ORDER })
  assert.equal(check({ tier_roma: '50' }).ok, true, 'equal tiers are in order')
  assert.equal(check({ delivery_window_from_days: '4' }).ok, true, 'a one-day window is fine')
})

test('the form wants pounds where it says pounds, and whole numbers elsewhere', () => {
  const today = form.figuresFromSettings(settings.DEFAULT_SHOP_SETTINGS)
  const check = changes => form.checkFigures({ ...today, ...changes })
  assert.equal(check({ assembly_fee: '£22.50' }).figures.assembly_fee, 22.5)
  assert.equal(check({ assembly_fee: '22.505' }).field, 'assembly_fee')
  assert.equal(check({ assembly_fee: '' }).field, 'assembly_fee')
  assert.equal(check({ assembly_fee: '1001' }).field, 'assembly_fee')
  assert.equal(check({ sample_limit: '2.5' }).field, 'sample_limit')
  assert.equal(check({ sample_limit: '21' }).field, 'sample_limit')
  assert.equal(check({ max_floor: '0' }).field, 'max_floor')
  assert.equal(check({ offer_window_hours: '-1' }).field, 'offer_window_hours')
})

test('every database code has a sentence', () => {
  const sql = read(`supabase/migrations/${SETTINGS_MIGRATION}`)
  const raised = new Set([...sql.matchAll(/raise exception '([A-Z_]+)'/g)].map(m => m[1]))
  for (const code of ['BAD_NUMBER', 'BAD_WHOLE_NUMBER', 'WINDOW_ORDER', 'DATES_ORDER', 'TIERS_ORDER', 'SEATS_ORDER', 'OUT_OF_RANGE', 'ORDERFLOW_NOT_CONNECTED', 'ORDERFLOW_SWITCHED_OFF', 'NO_TEST_ORDER']) {
    assert.ok(raised.has(code), `${code} is raised`)
    assert.equal(form.settingsRefusal(`ERROR: ${code}`), form.SETTINGS_REFUSALS[code])
  }
  assert.equal(form.settingsRefusal('NOT_AUTHORISED'), form.SETTINGS_REFUSALS.NOT_AUTHORISED)
  assert.match(form.settingsRefusal('something else'), /didn’t save/)
})

test('offer codes are capitals, letters and numbers, 4 to 24 long', () => {
  assert.equal(form.normaliseOfferCode(' sofa extra '), 'SOFAEXTRA')
  assert.equal(form.offerCodeProblem('SOFAEXTRA'), null)
  assert.match(form.offerCodeProblem('ABC'), /4 to 24/)
  assert.match(form.offerCodeProblem('A'.repeat(25)), /4 to 24/)
  assert.match(form.offerCodeProblem('WITH-DASH'), /Letters and numbers/)
})

// ── The shop reads the row ──────────────────────────────────────────────────

test('nothing customer-facing quotes the old fixed figures any more', () => {
  const offenders = []
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dir, e.name)] : [])
  for (const file of walk('src')) {
    const src = read(file)
    const norm = file.replace(/\\/g, '/')
    if (norm.endsWith('constants/swatches.ts') || norm.endsWith('constants/delivery.ts') || norm.endsWith('utils/offers/constants.ts') || norm.endsWith('utils/delivery.ts')) continue
    for (const name of ['MAX_SAMPLES', 'OFFER_TIER_AMOUNTS[', 'UPSTAIRS_FIRST_FLOOR', 'UPSTAIRS_PER_EXTRA_FLOOR', 'ASSEMBLY_FEE', 'SOFA_REMOVAL_PER_SEAT']) {
      if (src.includes(name)) offenders.push(`${norm}: ${name}`)
    }
  }
  assert.deepEqual(offenders, [])
})

test('Settings is reachable from More, and its actions check for an admin', () => {
  const nav = load('src/utils/adminNav.ts')
  assert.ok(nav.ADMIN_SECTIONS.some(s => s.key === 'settings' && s.href === '/admin/settings'))
  assert.ok(nav.MORE_SECTION_KEYS.includes('settings'))
  assert.equal(nav.activePhoneTab('/admin/settings'), 'more')
  const actions = read('src/app/actions/settings.ts')
  const exported = [...actions.matchAll(/export async function (\w+)\(/g)].map(m => m[1])
  assert.ok(exported.length >= 7)
  for (const name of exported) {
    const body = actions.slice(actions.indexOf(`export async function ${name}(`)).split(/\nexport async function /)[0]
    assert.match(body, /adminGuard\(\)/, `${name} checks for an admin`)
  }
})
