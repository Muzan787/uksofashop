// The distance delivery fee: the table, the lookup, and reading the postcode
// place_order uses from the end of the authoritative address. Replays the
// table migration into PGlite.
const { test, before } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const { PGlite } = require('@electric-sql/pglite')

let db
before(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table orders (id uuid primary key default gen_random_uuid());`)
  await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261012122909_delivery_distance_fees.sql'), 'utf8'))
})

const fee = async pc => Number((await db.query('select delivery_distance_fee($1) f', [pc])).rows[0].f)
// The same expression place_order uses on p_shipping_address.
const fromAddress = async address => (await db.query(
  String.raw`select upper(substring($1::text from '([A-Za-z]{1,2}[0-9][0-9A-Za-z]?\s*[0-9][A-Za-z]{2})\s*$')) pc`, [address])).rows[0].pc

test('free within 250 miles, including London, Kent and Wales', async () => {
  for (const pc of ['BB2 1AA', 'SW4 7AA', 'ME7 1AA', 'CF24 1AA', 'NR2 1AA', 'G1 1AA', 'PH22 1AA', 'PH33 6AA']) {
    assert.equal(await fee(pc), 0, pc)
  }
})
test('Devon and the Aberdeen area are £40', async () => {
  for (const pc of ['EX1 1AA', 'TQ1 1AA', 'PL1 1AA', 'PL16 0AA', 'EX22 6AA', 'AB10 1AA']) assert.equal(await fee(pc), 40, pc)
})
test('Cornwall, the Highlands and North East Scotland are £80', async () => {
  for (const pc of ['IV63 6AA', 'TR18 4AA', 'PL14 3AA', 'PL15 7AA', 'EX23 8AA', 'IV2 3AA', 'IV30 1AA', 'AB43 9AA', 'PH41 4AA']) assert.equal(await fee(pc), 80, pc)
})
test('the far north of Scotland is £100', async () => {
  for (const pc of ['KW14 7AA', 'KW1 4AA', 'IV27 4AA', 'IV26 2AA']) assert.equal(await fee(pc), 100, pc)
})
test('the lookup tolerates spacing and case, and unknowns are free', async () => {
  assert.equal(await fee('tr184aa'), 80)
  assert.equal(await fee(' kw14  7aa '), 100)
  assert.equal(await fee(''), 0)
  assert.equal(await fee(null), 0)
})
test('place_order reads the postcode the server appended', async () => {
  assert.equal(await fromAddress('Flat 2, 10 Fore Street, Bude, EX23 8AA'), 'EX23 8AA')
  assert.equal(await fromAddress('1 Mill Lane, Plymouth, PL1 2AB'), 'PL1 2AB')
  assert.equal(await fee(await fromAddress('3 High St, Thurso, KW14 7AA')), 100)
  assert.equal(await fee(await fromAddress('5 Road, Blackburn, BB2 1AA')), 0)
})
test('every fee is one of the agreed figures', async () => {
  const { rows } = await db.query('select distinct fee from delivery_distance_fees order by fee')
  assert.deepEqual(rows.map(r => Number(r.fee)), [40, 80, 100])
})

// ── place_order, end to end ────────────────────────────────────────────────
// The minimum tables place_order touches, then the offer migration (for
// calculate_order_offer), the fee table and the place_order migration.
const VARIANT = 'bbbbbbbb-0000-4000-8000-000000000001'
async function orderDb() {
  const pg = new PGlite()
  await pg.exec(`create role anon; create role authenticated; create role service_role;
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
      total_amount numeric, has_made_to_order boolean, preferred_delivery_date date);
    create table order_items (order_id uuid, variant_id uuid, quantity int, price_at_time_of_purchase numeric, fabric_id uuid,
      fabric_code text, fabric_name text, fabric_collection text, customisation jsonb);
    insert into products values ('aaaaaaaa-0000-4000-8000-000000000001', 649, true, false);
    insert into product_variants values ('${VARIANT}', 'aaaaaaaa-0000-4000-8000-000000000001', 0);`)
  for (const m of ['20261010190333_offer_fixed_48_hour_window.sql', '20261011212054_offer_for_every_visitor.sql',
                   '20261012122909_delivery_distance_fees.sql', '20261012122910_place_order_distance_fee.sql']) {
    await pg.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/' + m), 'utf8'))
  }
  return pg
}
const place = (pg, address, expected) => pg.query(
  `select place_order('Test', 't@example.com', '07700900000', $1, '', $2::jsonb, $3) r`,
  [address, JSON.stringify([{ variant_id: VARIANT, quantity: 1 }]), expected])

test('place_order charges Cornwall £80 on top, and records it', async () => {
  const pg = await orderDb()
  const r = (await place(pg, '1 Fore Street, Penzance, TR18 4AA', 729)).rows[0].r
  assert.equal(Number(r.fee_distance), 80)
  assert.equal(r.delivery_region, 'Cornwall')
  assert.equal(Number(r.total_amount), 729)
  const o = (await pg.query('select fee_distance, delivery_region, delivery_total from orders')).rows[0]
  assert.equal(Number(o.fee_distance), 80); assert.equal(o.delivery_region, 'Cornwall'); assert.equal(Number(o.delivery_total), 80)
})
test('place_order keeps a free area free', async () => {
  const pg = await orderDb()
  const r = (await place(pg, '5 Road, Blackburn, BB2 1AA', 649)).rows[0].r
  assert.equal(Number(r.fee_distance), 0); assert.equal(r.delivery_region, null); assert.equal(Number(r.total_amount), 649)
})
test('a total quoted without the fee is refused, not undercharged', async () => {
  const pg = await orderDb()
  await assert.rejects(() => place(pg, '3 High St, Thurso, KW14 7AA', 649), /PRICE_MISMATCH/)
  const r = (await place(pg, '3 High St, Thurso, KW14 7AA', 749)).rows[0].r
  assert.equal(Number(r.total_amount), 749)
})
