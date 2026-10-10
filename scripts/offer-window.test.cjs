// The paid offer's 48-hour window: fixed from the first click, never slid,
// never reissued once ended, and SOFAEXTRA valid only inside it. Replays the
// migration into PGlite over the minimum tables it touches.
const { test, before } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const { PGlite } = require('@electric-sql/pglite')
let db
const V = '11111111-1111-4111-8111-111111111111'
before(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table products (id uuid primary key, base_price numeric, is_active boolean);
    create table product_variants (id uuid primary key, product_id uuid, price_adjustment numeric);
    create table offer_product_tiers (product_id uuid, tier text);
    create table offer_entitlements (id uuid default gen_random_uuid() primary key, token uuid not null, visitor_id uuid unique, source text,
      qualifying_arrival_id uuid, started_at timestamptz, expires_at timestamptz, revoked_at timestamptz, created_at timestamptz default now(), updated_at timestamptz);
    insert into products values ('aaaaaaaa-0000-4000-8000-000000000001', 649, true);
    insert into product_variants values ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 0);
    insert into offer_product_tiers values ('aaaaaaaa-0000-4000-8000-000000000001', 'ROMA');
  `)
  await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261010190333_offer_fixed_48_hour_window.sql'), 'utf8'))
})
const issue = async (v = V, s = 'meta_ads') => (await db.query(`select issue_paid_offer_entitlement($1,$2,null) r`, [v, s])).rows[0].r
const items = JSON.stringify([{ variant_id: 'bbbbbbbb-0000-4000-8000-000000000001', quantity: 1 }])
const quote = async (code, token) => (await db.query(`select calculate_order_offer($1::jsonb,$2,$3) r`, [items, code, token])).rows[0].r

test('new window is 48 hours, a later click changes nothing', async () => {
  const a = await issue()
  const hours = (Date.parse(a.expires_at) - Date.parse(a.started_at)) / 36e5
  assert.equal(hours, 48)
  assert.equal(a.revoked, false)
  const b = await issue(V, 'google_ads')
  assert.equal(b.token, a.token)
  assert.equal(b.expires_at, a.expires_at)
  assert.equal(b.started_at, a.started_at)
  assert.equal(b.source, 'meta_ads')
})
test('code works only inside the window; entitlement alone works', async () => {
  const a = await issue()
  assert.equal((await quote('SOFAEXTRA', null)).code_valid, false)
  assert.equal(Number((await quote('SOFAEXTRA', null)).discount_amount), 0)
  const q = await quote('sofaextra ', a.token)
  assert.equal(q.code_valid, true); assert.equal(Number(q.discount_amount), 30); assert.equal(q.offer_source, 'paid_entitlement')
  const auto = await quote(null, a.token)
  assert.equal(Number(auto.discount_amount), 30); assert.equal(auto.code_valid, false)
})
test('an ended window is never reissued or extended', async () => {
  const a = await issue()
  await db.query(`update offer_entitlements set expires_at = now() - interval '1 minute' where visitor_id = $1`, [V])
  const b = await issue(V, 'meta_ads')
  assert.equal(b.token, a.token)
  assert.ok(Date.parse(b.expires_at) < Date.now())
  const q = await quote('SOFAEXTRA', a.token)
  assert.equal(q.code_valid, false); assert.equal(Number(q.discount_amount), 0); assert.equal(q.entitlement_valid, false)
})
test('a revoked window stays revoked', async () => {
  const v2 = '22222222-2222-4222-8222-222222222222'
  await issue(v2)
  await db.query(`update offer_entitlements set revoked_at = now() where visitor_id = $1`, [v2])
  const b = await issue(v2)
  assert.equal(b.revoked, true)
})
test('an old seven-day row keeps its expiry and is not slid', async () => {
  const v3 = '33333333-3333-4333-8333-333333333333'
  await db.query(`insert into offer_entitlements (token, visitor_id, source, started_at, expires_at, updated_at) values (gen_random_uuid(), $1, 'meta_ads', now() - interval '1 day', now() + interval '6 days', now() - interval '1 day')`, [v3])
  const before = (await db.query(`select expires_at from offer_entitlements where visitor_id=$1`, [v3])).rows[0].expires_at
  const b = await issue(v3)
  assert.equal(Date.parse(b.expires_at), new Date(before).getTime())
})
