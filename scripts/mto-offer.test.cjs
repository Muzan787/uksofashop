// The owner-approved Made-To-Order £50 promotion (Run 7, 15 Nov 2026).
// Replays the real migration (20261115200000) into PGlite over the tables it
// touches and prices baskets through the real calculate_order_offer.
const { test, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { PGlite } = require('@electric-sql/pglite')

const MIGRATION = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261115200000_made_to_order_50_offer.sql'), 'utf8')
const MTO = '00000000-0000-4000-8000-0000000000aa'
const IMP = '00000000-0000-4000-8000-0000000000bb'
const P = n => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`
const V = n => `bbbbbbbb-0000-4000-8000-${String(n).padStart(12, '0')}`
// id, slug, base, was, active, collection, tier
const PRODUCTS = [
  [1, 'bishop-u-shaped', 649, null, true, MTO, 'STANDARD'],
  [2, 'verona-family-set', 799, 899, true, MTO, 'EXCLUDED'],
  [3, 'malibu-2-seater', 399, null, true, MTO, 'STANDARD'],
  [4, 'sims-footstool', 149, null, true, MTO, 'EXCLUDED'],
  [5, 'roma-imported', 649, 699, true, IMP, 'ROMA'],
  [6, 'nova-electric-imported', 1299, null, true, IMP, 'ELECTRIC'],
  [7, 'imported-standard', 549, null, true, IMP, 'STANDARD'],
  [8, 'old-mto-inactive', 500, null, false, MTO, 'STANDARD'],
]
let db
let token
before(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema private;
    create function private.line_addons(uuid, jsonb) returns jsonb language sql as $$ select '{"total":0}'::jsonb $$;
    create table shop_settings (offer_min_price numeric, tier_standard numeric, tier_roma numeric, tier_electric numeric, tier_excluded numeric, offer_window_hours int, offer_enabled boolean);
    insert into shop_settings values (400, 20, 30, 50, 0, 96, true);
    create table main_collections (id uuid primary key, slug text);
    insert into main_collections values ('${MTO}', 'made-to-order-sofas'), ('${IMP}', 'imported-sofas');
    create table products (id uuid primary key, slug text, base_price numeric, was_price numeric, is_active boolean, main_collection_id uuid,
      constraint products_was_price_above_base check (was_price is null or was_price > base_price));
    create table product_variants (id uuid primary key, product_id uuid, price_adjustment numeric);
    create table offer_product_tiers (product_id uuid, tier text);
    create table offer_excluded_products (product_id uuid);
    create table offer_entitlements (token uuid, visitor_id uuid, started_at timestamptz, expires_at timestamptz, revoked_at timestamptz);
    create table offer_codes (code text primary key, is_active boolean);
    insert into offer_codes values ('SOFAEXTRA', true), ('BLACKFRIDAY', true), ('CHRISTMAS', true);
    create function private.offer_code_active(p_code text) returns boolean language sql stable as
      $$ select exists (select 1 from public.offer_codes where code = upper(btrim(coalesce(p_code, ''))) and is_active) $$;
    create table orders (id serial primary key, discount_tier text,
      constraint orders_discount_tier_check check (discount_tier is null or discount_tier = any (array['ELECTRIC','ROMA','STANDARD','EXCLUDED'])));
  `)
  for (const [n, slug, base, was, active, coll, tier] of PRODUCTS) {
    await db.query(`insert into products values ($1,$2,$3,$4,$5,$6)`, [P(n), slug, base, was, active, coll])
    await db.query(`insert into product_variants values ($1,$2,0)`, [V(n), P(n)])
    await db.query(`insert into offer_product_tiers values ($1,$2)`, [P(n), tier])
  }
  // A second colourway of Bishop at +£40.
  await db.query(`insert into product_variants values ($1,$2,40)`, [V(11), P(1)])
  token = '11111111-1111-4111-8111-111111111111'
  await db.query(`insert into offer_entitlements values ($1, gen_random_uuid(), now(), now() + interval '96 hours', null)`, [token])
  await db.exec(MIGRATION)
})

const quote = async (lines, code = 'BLACKFRIDAY', tok = token) => {
  const items = JSON.stringify(lines.map(([v, q = 1]) => ({ variant_id: V(v), quantity: q })))
  return (await db.query(`select calculate_order_offer($1::jsonb, $2, $3) r`, [items, code, tok])).rows[0].r
}
const price = async n => Number((await db.query(`select base_price from products where id = $1`, [P(n)])).rows[0].base_price)

test('only active Made-To-Order products go up £50; was-prices and other products do not move', async () => {
  assert.equal(await price(1), 699)
  assert.equal(await price(2), 849)
  assert.equal(await price(3), 449)
  assert.equal(await price(4), 199)
  assert.equal(await price(5), 649, 'imported Roma unchanged')
  assert.equal(await price(6), 1299)
  assert.equal(await price(7), 549)
  assert.equal(await price(8), 500, 'inactive made-to-order product unchanged')
  const was = (await db.query(`select was_price from products where id = $1`, [P(2)])).rows[0].was_price
  assert.equal(Number(was), 899, 'was-price not raised')
  const audit = (await db.query(`select count(*)::int n from private.mto_price_change_20261115`)).rows[0].n
  assert.equal(audit, 4)
})

test('running the migration again never adds a second £50', async () => {
  await db.exec(MIGRATION)
  assert.equal(await price(1), 699)
  assert.equal(await price(4), 199)
})

test('£50 off every Made-To-Order product, whatever its old tier, exclusion or the £400 floor', async () => {
  for (const [v, list] of [[1, 699], [2, 849], [3, 449], [4, 199]]) {
    const q = await quote([[v]])
    assert.equal(Number(q.items_subtotal), list)
    assert.equal(Number(q.discount_amount), 50, `variant ${v}`)
    assert.equal(q.discount_tier, 'MADE_TO_ORDER')
  }
  // a +£40 colourway: £50 off its own price
  const c = await quote([[11]])
  assert.equal(Number(c.items_subtotal), 739); assert.equal(Number(c.discount_amount), 50)
})

test('other collections keep exactly the old rules', async () => {
  assert.equal(Number((await quote([[5]])).discount_amount), 30)
  assert.equal((await quote([[5]])).discount_tier, 'ROMA')
  assert.equal(Number((await quote([[6]])).discount_amount), 50)
  assert.equal(Number((await quote([[7]])).discount_amount), 20)
})

test('baskets: £50 per Made-To-Order line, once per line; the rest by the old rule; never stacked', async () => {
  assert.equal(Number((await quote([[1], [3]])).discount_amount), 100, 'two sofas, two lines')
  assert.equal(Number((await quote([[1, 2]])).discount_amount), 50, 'one line of two is still one £50')
  const mixed = await quote([[1], [7]])
  assert.equal(Number(mixed.discount_amount), 70, '£50 sofa + £20 on the imported sofa')
  assert.equal(Number(mixed.made_to_order_discount), 50)
  assert.equal(Number(mixed.other_discount), 20)
  const mixed2 = await quote([[1], [5], [7]])
  assert.equal(Number(mixed2.other_discount), 30, 'the rest still gets ONE tier amount, the best')
  assert.equal(Number(mixed2.discount_amount), 80)
})

test('the three codes are one offer; no window means no money', async () => {
  for (const code of ['SOFAEXTRA', 'BLACKFRIDAY', 'christmas', null, 'NOPE']) {
    assert.equal(Number((await quote([[1]], code)).discount_amount), 50, String(code))
  }
  for (const code of ['SOFAEXTRA', 'BLACKFRIDAY', 'CHRISTMAS']) {
    const q = await quote([[1]], code, null)
    assert.equal(Number(q.discount_amount), 0); assert.equal(q.code_valid, false)
  }
  // an ended window
  const ended = '22222222-2222-4222-8222-222222222222'
  await db.query(`insert into offer_entitlements values ($1, gen_random_uuid(), now() - interval '97 hours', now() - interval '1 hour', null)`, [ended])
  assert.equal(Number((await quote([[1]], 'BLACKFRIDAY', ended)).discount_amount), 0)
  // a revoked one
  const revoked = '33333333-3333-4333-8333-333333333333'
  await db.query(`insert into offer_entitlements values ($1, gen_random_uuid(), now(), now() + interval '90 hours', now())`, [revoked])
  assert.equal(Number((await quote([[1]], 'CHRISTMAS', revoked)).discount_amount), 0)
})

test('orders may be labelled MADE_TO_ORDER', async () => {
  await db.query(`insert into orders (discount_tier) values ('MADE_TO_ORDER')`)
  await assert.rejects(() => db.query(`insert into orders (discount_tier) values ('FIFTY')`))
})
