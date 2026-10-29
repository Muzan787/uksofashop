// Beds and mattresses (2026-10-30): the add-on pricing, the catalogue the
// migration inserts, and that a sofa basket costs exactly what it did.
//
// Replays the checkout migrations as production has them into PGlite, prices
// a set of sofa baskets, applies 20261030120000_beds_and_mattresses.sql, and
// prices them again; then orders beds with extras and checks what
// place_order charges, refuses and writes onto the order line.
//
//   node --test scripts/beds.test.cjs
const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const { PGlite } = require('@electric-sql/pglite')

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')

const P_SOFA = 'aaaaaaaa-0000-4000-8000-000000000001'
const V_SOFA = 'bbbbbbbb-0000-4000-8000-000000000001'
const P_TIERED = 'aaaaaaaa-0000-4000-8000-000000000002'
const V_TIERED = 'bbbbbbbb-0000-4000-8000-000000000002'
const VISITOR = '11111111-1111-4111-8111-111111111111'

const BEFORE = [
  '20261010190333_offer_fixed_48_hour_window.sql',
  '20261011212054_offer_for_every_visitor.sql',
  '20261012122909_delivery_distance_fees.sql',
  '20261012125526_place_order_distance_fee.sql',
  '20261015130831_shop_settings.sql',
  '20261015135237_tracking_admin.sql',
  '20261017184918_far_delivery_window.sql',
  '20261017190729_place_order_delivery_days.sql',
  '20261023200444_offer_floor_exclusions_removal_band.sql',
]
const BEDS = '20261030120000_beds_and_mattresses.sql'

// update_order_details as production had it on 2026-10-30, cut down to the
// line the migration patches - enough to prove the patch finds it.
const UPDATE_ORDER_DETAILS_STUB = `
create or replace function private.update_order_details(p_order_id uuid, p_customer_name text, p_customer_email text,
  p_customer_phone text, p_shipping_address text, p_special_instructions text, p_preferred_delivery_date date,
  p_delivery_total numeric, p_items jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public' as $f$
declare v_has_mto boolean;
begin
  select coalesce(bool_or(oi.fabric_id is not null or oi.customisation is not null), false)
  into v_has_mto from public.order_items oi where oi.order_id = p_order_id;
  return jsonb_build_object('has_mto', v_has_mto);
end;
$f$;`

async function shopDb() {
  const pg = new PGlite()
  await pg.exec(`create role anon; create role authenticated; create role service_role;
    create schema private; create schema vault; create schema orderflow; create schema auth; create schema cron;
    create function cron.schedule(text, text, text) returns bigint language sql as 'select 1::bigint';
    create function auth.uid() returns uuid language sql as 'select null::uuid';
    create function private.is_admin() returns boolean language sql as 'select false';
    create function private.require_admin() returns void language plpgsql as $$ begin raise exception 'NOT_AUTHORISED'; end $$;
    create table vault.secrets (name text);
    create table categories (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
      parent_id uuid, sort int not null default 99, is_active boolean not null default true, image_url text, intro text,
      search_words text, created_at timestamptz default now());
    create table products (id uuid primary key default gen_random_uuid(), title text, slug text unique, base_price numeric,
      was_price numeric, description text, specifications jsonb, gallery_images text[], origin text default 'unspecified',
      custom_made boolean default false, is_active boolean default true, is_featured boolean default false, category_id uuid,
      created_at timestamptz default now());
    create table product_categories (product_id uuid, category_id uuid, primary key (product_id, category_id));
    create table product_variants (id uuid primary key default gen_random_uuid(), product_id uuid, sku text unique, color text,
      color_hex text, material text, price_adjustment numeric, image_url text, priority int, is_active boolean default true);
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
    create table order_items (id uuid primary key default gen_random_uuid(), order_id uuid, variant_id uuid, quantity int,
      price_at_time_of_purchase numeric, fabric_id uuid, fabric_code text, fabric_name text, fabric_collection text, customisation jsonb);
    insert into products (id, title, slug, base_price, custom_made) values
      ('${P_SOFA}', 'Verona 3 Seater', 'verona-3', 649, true), ('${P_TIERED}', 'Nova Electric', 'nova', 1299, false);
    insert into product_variants (id, product_id, sku, price_adjustment) values
      ('${V_SOFA}', '${P_SOFA}', 'VER-3', 50), ('${V_TIERED}', '${P_TIERED}', 'NOV-1', 0);
    insert into offer_product_tiers values ('${P_TIERED}', 'ELECTRIC');`)
  for (const m of BEFORE) await pg.exec(read(`supabase/migrations/${m}`))
  await pg.exec(UPDATE_ORDER_DETAILS_STUB)
  return pg
}

const beds = async pg => { await pg.exec(read(`supabase/migrations/${BEDS}`)) }

/** What place_order would charge, read from its own refusal. */
async function quote(pg, items, { address = '5 Road, Blackburn, BB2 1AA', token = null, assembly = false } = {}) {
  try {
    await pg.query(
      `select place_order('Test', 't@example.com', '07700900000', $1, '', $2::jsonb, -1, 0, false, $3, false, null, $4)`,
      [address, JSON.stringify(items), assembly, token])
  } catch (err) {
    const m = /give ([\d.]+)/.exec(err.message)
    if (m) return Number(m[1])
    return `refused: ${err.message.split(':')[0]}`
  }
  throw new Error('place_order accepted a total of -1')
}

const order = async (pg, items, expected) => (await pg.query(
  `select place_order('Test', 't@example.com', '07700900000', '5 Road, Blackburn, BB2 1AA', '', $1::jsonb, $2) r`,
  [JSON.stringify(items), expected])).rows[0].r

const variant = async (pg, sku) => (await pg.query('select id from product_variants where sku = $1', [sku])).rows[0].id
const addon = async (pg, slug) => (await pg.query('select id from addons where slug = $1', [slug])).rows[0].id

test('a sofa basket costs exactly what it did before beds', async () => {
  const pg = await shopDb()
  const token = (await pg.query(`select issue_paid_offer_entitlement($1, 'meta_ads', null) r`, [VISITOR])).rows[0].r
  const baskets = [
    [[{ variant_id: V_SOFA, quantity: 1 }], {}],
    [[{ variant_id: V_SOFA, quantity: 2 }, { variant_id: V_TIERED, quantity: 1 }], { token }],
    [[{ variant_id: V_TIERED, quantity: 1 }], { address: '1 Fore Street, Penzance, TR18 4AA', assembly: true, token }],
    [[{ variant_id: V_SOFA, quantity: 1, customisation: { seats: '3 Seater' } }], {}],
  ]
  const before = []
  for (const [items, opts] of baskets) before.push(await quote(pg, items, opts))
  await beds(pg)
  for (const [i, [items, opts]] of baskets.entries()) assert.equal(await quote(pg, items, opts), before[i], `basket ${i}`)
  // And with an empty add-on list, which is what the new checkout sends.
  assert.equal(await quote(pg, [{ variant_id: V_SOFA, quantity: 1, addon_ids: [] }]), before[0])
})

test('the six beds are in at the price sheet plus £100, hidden', async () => {
  const pg = await shopDb(); await beds(pg)
  const { rows } = await pg.query(`
    select p.slug, p.is_active, p.product_type, p.custom_made, count(v.*) n,
           jsonb_object_agg(v.options->>'size' || '-' || (v.options->>'build'), p.base_price + v.price_adjustment) prices
    from products p join product_variants v on v.product_id = p.id
    where p.product_type = 'bed' group by p.id order by p.slug`)
  assert.deepEqual(rows.map(r => r.slug), ['arizona-bed', 'cube-bed', 'florida-bed', 'hilton-bed', 'panel-bed', 'sleigh-bed'])
  for (const r of rows) {
    assert.equal(Number(r.n), 10, r.slug)
    assert.equal(r.is_active, false, r.slug)
    assert.equal(r.custom_made, true, r.slug)
  }
  const price = (slug, key) => Number(rows.find(r => r.slug === slug).prices[key])
  // Florida / Cube / Panel: frame 150 170 170 180 240, set 180 210 210 230 310, each + 100.
  for (const slug of ['florida-bed', 'cube-bed', 'panel-bed']) {
    assert.deepEqual(['3ft', '4ft', '4ft6', '5ft', '6ft'].map(s => price(slug, `${s}-frame`)), [250, 270, 270, 280, 340])
    assert.deepEqual(['3ft', '4ft', '4ft6', '5ft', '6ft'].map(s => price(slug, `${s}-set`)), [280, 310, 310, 330, 410])
  }
  assert.deepEqual(['3ft', '4ft', '4ft6', '5ft', '6ft'].map(s => price('hilton-bed', `${s}-frame`)), [260, 280, 280, 290, 350])
  assert.deepEqual(['3ft', '4ft', '4ft6', '5ft', '6ft'].map(s => price('hilton-bed', `${s}-set`)), [290, 320, 320, 340, 420])
  for (const slug of ['sleigh-bed', 'arizona-bed']) {
    assert.deepEqual(['3ft', '4ft', '4ft6', '5ft', '6ft'].map(s => price(slug, `${s}-frame`)), [270, 310, 310, 330, 360])
    assert.deepEqual(['3ft', '4ft', '4ft6', '5ft', '6ft'].map(s => price(slug, `${s}-set`)), [310, 350, 350, 380, 430])
  }
  const cats = (await pg.query(`select slug, department, is_active from categories order by sort`)).rows
  assert.deepEqual(cats, [{ slug: 'beds', department: 'beds', is_active: false }, { slug: 'mattresses', department: 'beds', is_active: false }])
})

test('the eight mattresses are in at the list plus £30', async () => {
  const pg = await shopDb(); await beds(pg)
  const { rows } = await pg.query(`
    select p.slug, array_agg(p.base_price + v.price_adjustment order by v.priority) prices,
           bool_and(v.image_url like 'https://res.cloudinary.com/%.png') pictured
    from products p join product_variants v on v.product_id = p.id
    where p.product_type = 'mattress' group by p.id`)
  const bySlug = Object.fromEntries(rows.map(r => [r.slug, r.prices.map(Number)]))
  assert.deepEqual(bySlug, {
    'eco-spring-mattress': [99, 109, 109, 129, 159],
    'memory-foam-mattress': [109, 119, 119, 139, 169],
    'orthopaedic-firm-mattress': [109, 119, 119, 139, 169],
    '1000-pocket-mattress': [130, 145, 145, 165, 195],
    '2000-pocket-mattress': [140, 155, 155, 175, 205],
    'pillow-top-pocket-mattress': [169, 190, 190, 230, 290],
    'emperor-3000-pocket-mattress': [170, 190, 190, 210, 240],
    'royal-5000-pocket-mattress': [190, 210, 210, 230, 290],
  })
  assert.ok(rows.every(r => r.pictured))
})

test('a bed set with an upgrade and extras is priced and snapshotted by the database', async () => {
  const pg = await shopDb(); await beds(pg)
  await pg.exec(`update products set is_active = true where product_type in ('bed', 'mattress')`)
  const set = await variant(pg, 'FLA-46-S')
  const ids = [await addon(pg, 'pocket-2000'), await addon(pg, 'gas-lift'), await addon(pg, 'solid-base')]
  // Double set 310 + 2000 pocket 40 + gas lift 110 + solid base 35.
  assert.equal(await quote(pg, [{ variant_id: set, quantity: 1, addon_ids: ids }]), 495)
  // Assembly is still the one delivery extra on top.
  assert.equal(await quote(pg, [{ variant_id: set, quantity: 2, addon_ids: ids }], { assembly: true }), 1010)

  await order(pg, [{ variant_id: set, quantity: 1, addon_ids: ids, customisation: { seats: 'ignored' } }], 495)
  const line = (await pg.query('select price_at_time_of_purchase p, customisation c from order_items')).rows[0]
  assert.equal(Number(line.p), 495)
  assert.equal(line.c.kind, 'options')
  assert.equal(line.c.product_type, 'bed')
  assert.deepEqual(line.c.options, { size: '4ft6', build: 'set' })
  assert.deepEqual(line.c.addons.map(a => [a.group, a.name, Number(a.price)]), [
    ['Mattress upgrade', '2000 pocket sprung', 40],
    ['Extras', 'Gas lift storage', 110],
    ['Extras', 'Solid base', 35],
  ])
  const o = (await pg.query('select has_made_to_order, items_subtotal from orders')).rows[0]
  assert.equal(o.has_made_to_order, true)
  assert.equal(Number(o.items_subtotal), 495)
})

test('a mattress on its own carries its size, and no extras', async () => {
  const pg = await shopDb(); await beds(pg)
  await pg.exec(`update products set is_active = true where product_type in ('bed', 'mattress')`)
  const royal = await variant(pg, 'MP5-6')
  await order(pg, [{ variant_id: royal, quantity: 1 }], 290)
  const line = (await pg.query('select customisation c from order_items')).rows[0]
  assert.deepEqual(line.c, { kind: 'options', product_type: 'mattress', options: { size: '6ft' }, addons: [] })
  assert.equal((await pg.query('select has_made_to_order from orders')).rows[0].has_made_to_order, false)
})

test('add-ons the line cannot have are refused', async () => {
  const pg = await shopDb(); await beds(pg)
  await pg.exec(`update products set is_active = true where product_type in ('bed', 'mattress')`)
  const frame = await variant(pg, 'HIL-5-F')
  const set = await variant(pg, 'HIL-5-S')
  const mattress = await variant(pg, 'MP1-3')
  const upgrade = await addon(pg, 'memory-foam')
  const royal = await addon(pg, 'royal-5000')
  const drawers = await addon(pg, 'drawers')
  const refused = 'refused: UNAVAILABLE_ADDON'
  // The upgrade is offered on a set only.
  assert.equal(await quote(pg, [{ variant_id: frame, quantity: 1, addon_ids: [upgrade] }]), refused)
  assert.equal(await quote(pg, [{ variant_id: set, quantity: 1, addon_ids: [upgrade] }]), 340 + 20)
  // Extras are offered on both.
  assert.equal(await quote(pg, [{ variant_id: frame, quantity: 1, addon_ids: [drawers] }]), 290 + 20)
  // Two mattresses in a pick-one group.
  assert.equal(await quote(pg, [{ variant_id: set, quantity: 1, addon_ids: [upgrade, royal] }]), refused)
  // A product that does not offer the group.
  assert.equal(await quote(pg, [{ variant_id: mattress, quantity: 1, addon_ids: [drawers] }]), refused)
  // A sofa.
  assert.equal(await quote(pg, [{ variant_id: V_SOFA, quantity: 1, addon_ids: [drawers] }]), refused)
  // Not an id, an unknown id, not a list.
  assert.equal(await quote(pg, [{ variant_id: frame, quantity: 1, addon_ids: ['drawers'] }]), refused)
  assert.equal(await quote(pg, [{ variant_id: frame, quantity: 1, addon_ids: ['00000000-0000-4000-8000-000000000000'] }]), refused)
  assert.equal(await quote(pg, [{ variant_id: frame, quantity: 1, addon_ids: drawers }]), refused)
  // Switched off in the admin.
  await pg.query(`update addons set is_active = false where slug = 'drawers'`)
  assert.equal(await quote(pg, [{ variant_id: frame, quantity: 1, addon_ids: [drawers] }]), refused)
  // The same id twice is one add-on, not two.
  await pg.query(`update addons set is_active = true where slug = 'drawers'`)
  assert.equal(await quote(pg, [{ variant_id: frame, quantity: 1, addon_ids: [drawers, drawers] }]), 290 + 20)
})

test('update_order_details stops counting an options snapshot as made to order', async () => {
  const pg = await shopDb(); await beds(pg)
  const def = (await pg.query(`select pg_get_functiondef('private.update_order_details(uuid, text, text, text, text, text, date, numeric, jsonb)'::regprocedure) d`)).rows[0].d
  assert.match(def, /customisation->>'kind', ''\) <> 'options'/)
  // Running the migration twice is harmless.
  await beds(pg)
  assert.equal(Number((await pg.query(`select count(*) n from products where product_type = 'bed'`)).rows[0].n), 6)
})
