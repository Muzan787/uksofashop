// Matching a hand-taken order to the website visit that produced it.
//
// Replays supabase/migrations/20261101210000_match_order_to_visit.sql into
// PGlite on a stand-in schema (the columns the functions read) and checks:
//
//   * only visits whose cookie choice allows advertising are listed; the rest
//     are counted, never shown, and a later withdrawal hides a visit too;
//   * each visit lists its pages in order, with product names, repeats folded;
//   * the product filter, the phone mark and the "how they got in touch"
//     ordering;
//   * matching copies the visit's identity and click ids onto the order, so
//     the same consent rule Meta's Purchase uses (metaOrderConsent.ts) passes
//     for the order afterwards, and records who did it;
//   * a WhatsApp tap in the visit wins and is marked used; a reminder lead is
//     closed; taking the match off gives both back;
//   * the refusals: no consent, visit already on another order, an order that
//     came with its own reference, a Purchase already sent, a non-admin.
//
// Each test runs inside BEGIN ... ROLLBACK, so they don't see each other.
const { test, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { PGlite } = require('@electric-sql/pglite')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

const ADMIN = '11111111-1111-4111-8111-111111111111'
const PRODUCT = 'aaaaaaaa-0000-4000-8000-000000000001'
const OTHER_PRODUCT = 'aaaaaaaa-0000-4000-8000-000000000002'
// Three visits around 14:00 UTC on 1 Nov: A from a Meta ad and consented,
// B consented but organic, C declined cookies.
const A = { visitor: 'a0000000-0000-4000-8000-00000000000a', session: 'a1000000-0000-4000-8000-00000000000a', arrival: 'a2000000-0000-4000-8000-00000000000a' }
const B = { visitor: 'b0000000-0000-4000-8000-00000000000b', session: 'b1000000-0000-4000-8000-00000000000b', arrival: 'b2000000-0000-4000-8000-00000000000b' }
const C = { visitor: 'c0000000-0000-4000-8000-00000000000c', session: 'c1000000-0000-4000-8000-00000000000c', arrival: 'c2000000-0000-4000-8000-00000000000c' }
const AT = '2026-11-01T14:00:00Z'
const FROM = '2026-11-01T13:00:00Z'
const TO = '2026-11-01T15:00:00Z'

let db

before(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    insert into auth.users values ('${ADMIN}');
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create schema private;
    grant usage on schema private to authenticated;
    create function public.is_admin() returns boolean language sql stable
      as $$ select coalesce(current_setting('test.admin', true), '') = 'yes' $$;
    create function private.require_admin() returns void language plpgsql
      as $$ begin if not public.is_admin() then raise exception 'NOT_AUTHORISED'; end if; end $$;
    grant execute on function public.is_admin() to authenticated;
    grant execute on function private.require_admin() to authenticated;

    create table public.products (id uuid primary key, title text);
    insert into public.products values ('${PRODUCT}', 'Hannah Electric Corner'), ('${OTHER_PRODUCT}', 'Verona 3+2');

    create table public.orders (
      id uuid primary key default gen_random_uuid(), source text, status text default 'pending_cod',
      created_at timestamptz not null default now(), purchase_event_sent_at timestamptz,
      customer_phone text,
      visitor_id uuid, session_id uuid, arrival_id uuid,
      gclid text, gbraid text, wbraid text, fbclid text,
      utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
      ga_client_id text, meta_fbp text, meta_fbc text, landing_page text, referrer text,
      whatsapp_reference text
    );
    create table public.order_events (
      id bigserial primary key, order_id uuid references public.orders(id) on delete cascade,
      created_at timestamptz not null default now(), kind text not null, staff_id uuid, note text,
      constraint order_events_kind_check check (kind = any (array['placed', 'status_changed', 'details_changed', 'test_flag_changed', 'source_changed', 'note']))
    );
    create table public.attribution_sessions (
      id uuid primary key default gen_random_uuid(), visitor_id uuid, session_id uuid, arrival_id uuid unique,
      created_at timestamptz default now(),
      first_touch_source text, first_touch_medium text, first_touch_campaign text, first_touch_content text, first_touch_term text,
      last_touch_source text, last_touch_medium text, last_touch_campaign text, last_touch_content text, last_touch_term text,
      gclid text, gbraid text, wbraid text, fbclid text, ga_client_id text, meta_fbp text, meta_fbc text,
      landing_page text, referrer text
    );
    create table public.attribution_actions (
      id uuid primary key default gen_random_uuid(), created_at timestamptz not null, visitor_id uuid, session_id uuid, arrival_id uuid,
      action_type text, page_url text, product_id uuid, metadata jsonb default '{}'
    );
    create table public.google_consent_receipts (
      id uuid primary key default gen_random_uuid(), visitor_id uuid, session_id uuid, arrival_id uuid,
      ad_storage text, analytics_storage text, ad_user_data text, ad_personalization text,
      captured_at timestamptz, policy_version text, surface text
    );
    create table public.whatsapp_enquiries (
      id uuid primary key default gen_random_uuid(), reference text unique, created_at timestamptz, visitor_id uuid, session_id uuid, arrival_id uuid,
      product_id uuid, product_name text, gclid text, gbraid text, wbraid text, fbclid text,
      utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
      ga_client_id text, meta_fbp text, meta_fbc text, converted_order_id uuid references public.orders(id), converted_at timestamptz
    );
    create table public.checkout_recovery_leads (
      id uuid primary key default gen_random_uuid(), session_id uuid unique, phone text, reference text,
      status text, converted_order_id uuid references public.orders(id), created_at timestamptz default now(), updated_at timestamptz
    );
    create table public.swatch_requests (id uuid primary key default gen_random_uuid(), customer_name text, customer_phone text, postcode text, created_at timestamptz);
    create table public.google_order_consent (order_id uuid primary key, receipt_id uuid);
    create table public.google_conversion_outbox (id uuid primary key default gen_random_uuid(), order_id uuid);
  `)
  await db.exec(read('supabase/migrations/20261101210000_match_order_to_visit.sql'))
})

async function isolated(fn) {
  await db.exec('begin')
  try { return await fn() } finally { await db.exec('rollback') }
}

async function as(who) {
  await db.query(`select set_config('test.admin', $1, true), set_config('test.uid', $2, true)`,
    [who === 'admin' ? 'yes' : '', who === 'admin' ? ADMIN : ''])
}

async function refusal(sql, params = []) {
  await db.exec('savepoint s')
  try {
    await db.query(sql, params)
    await db.exec('release savepoint s')
    return null
  } catch (err) {
    await db.exec('rollback to savepoint s')
    return err.message
  }
}

async function receipt(v, at, granted = true) {
  const g = granted ? 'granted' : 'denied'
  await db.query(`insert into public.google_consent_receipts (visitor_id, session_id, arrival_id, ad_storage, analytics_storage, ad_user_data, ad_personalization, captured_at, policy_version, surface)
    values ($1, $2, $3, $4, $4, $4, $4, $5, 'ukss-google-2026-09-27-v1', 'cookie_banner')`, [v.visitor, v.session, v.arrival, g, at])
}

async function page(v, at, url, productId = null, kind = 'page_enter') {
  await db.query(`insert into public.attribution_actions (created_at, visitor_id, session_id, arrival_id, action_type, page_url, product_id, metadata)
    values ($1, $2, $3, $4, 'journey_event', $5, $6, jsonb_build_object('kind', $7::text, 'data_class', 'consented_journey', 'device', 'mobile', 'page_type', 'product'))`,
  [at, v.visitor, v.session, v.arrival, url, productId, kind])
}

async function world() {
  await db.query(`insert into public.attribution_sessions (visitor_id, session_id, arrival_id, last_touch_source, last_touch_campaign, fbclid, meta_fbp, meta_fbc, landing_page, created_at)
    values ($1, $2, $3, 'facebook', 'Nov corner sofas', 'fbclid-A', 'fb.1.111', 'fb.1.111.fbclid-A', '/shop/fabric-sofa/hannah?fbclid=x', '2026-11-01T13:20:00Z')`, [A.visitor, A.session, A.arrival])
  await db.query(`insert into public.attribution_sessions (visitor_id, session_id, arrival_id, created_at) values ($1, $2, $3, '2026-11-01T13:50:00Z')`, [B.visitor, B.session, B.arrival])
  await db.query(`insert into public.attribution_sessions (visitor_id, session_id, arrival_id, last_touch_source, fbclid, created_at) values ($1, $2, $3, 'facebook', 'fbclid-C', '2026-11-01T13:55:00Z')`, [C.visitor, C.session, C.arrival])
  await receipt(A, '2026-11-01T13:20:01Z')
  await receipt(B, '2026-11-01T13:50:01Z')
  await receipt(C, '2026-11-01T13:55:01Z', false)
  await page(A, '2026-11-01T13:20:05Z', '/shop/fabric-sofa/hannah-electric-corner?fbclid=x', PRODUCT)
  await page(A, '2026-11-01T13:20:06Z', '/shop/fabric-sofa/hannah-electric-corner', PRODUCT) // fired twice: folded
  await page(A, '2026-11-01T13:24:00Z', '/swatches')
  await page(A, '2026-11-01T13:30:00Z', '/shop/fabric-sofa/hannah-electric-corner', PRODUCT)
  await page(B, '2026-11-01T13:58:00Z', '/shop/recliner/verona', OTHER_PRODUCT)
  await page(C, '2026-11-01T13:59:00Z', '/shop/fabric-sofa/hannah-electric-corner', PRODUCT)
}

const find = async (args = {}) => (await db.query(
  `select public.find_order_visits($1, $2, $3, $4, $5, $6) r`,
  [args.from ?? FROM, args.to ?? TO, args.at ?? AT, args.product ?? null, args.phone ?? null, args.channel ?? null],
)).rows[0].r

async function manualOrder(extra = {}) {
  const values = { source: 'whatsapp', created_at: '2026-11-01T16:00:00Z', ...extra }
  const cols = Object.keys(values)
  const { rows } = await db.query(
    `insert into public.orders (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
    Object.values(values),
  )
  return rows[0].id
}

test('lists only consented visits, with their pages in order and product names', async () => {
  await isolated(async () => {
    await world()
    await as('admin')
    const r = await find()
    assert.deepEqual(r.visits.map(v => v.session_id).sort(), [A.session, B.session].sort())
    assert.equal(r.hidden_no_consent, 1, 'the declined visit is counted, not shown')
    const a = r.visits.find(v => v.session_id === A.session)
    assert.deepEqual(a.pages.map(p => [p.path, p.product]), [
      ['/shop/fabric-sofa/hannah-electric-corner', 'Hannah Electric Corner'],
      ['/swatches', null],
      ['/shop/fabric-sofa/hannah-electric-corner', 'Hannah Electric Corner'],
    ])
    assert.equal(a.device, 'mobile')
    assert.equal(a.arrival.source, 'facebook')
    assert.equal(a.arrival.campaign, 'Nov corner sofas')
    assert.equal(a.arrival.meta_click, true)
    assert.equal(a.arrival.landing_page, '/shop/fabric-sofa/hannah')
    assert.equal(a.saw_swatches, true)
    // B was last seen nearer 14:00, so it comes first with no other evidence.
    assert.equal(r.visits[0].session_id, B.session)
  })
})

test('the product filter, the phone mark and the channel ordering', async () => {
  await isolated(async () => {
    await world()
    await as('admin')
    assert.deepEqual((await find({ product: PRODUCT })).visits.map(v => v.session_id), [A.session])
    assert.equal((await find({ channel: 'swatches' })).visits[0].session_id, A.session)

    await db.query(`insert into public.checkout_recovery_leads (session_id, phone, reference, status) values ($1, '07700 900123', 'UKSS-LD-261101-AAAAAA', 'active')`, [A.session])
    await db.query(`insert into public.swatch_requests (customer_name, customer_phone, postcode, created_at) values ('Jane', '+447700900123', 'BB1 1AA', '2026-10-30T10:00:00Z')`)
    const r = await find({ phone: '07700900123' })
    assert.equal(r.visits[0].session_id, A.session)
    assert.equal(r.visits[0].phone_match, true)
    assert.equal(r.visits[0].lead.reference, 'UKSS-LD-261101-AAAAAA')
    assert.deepEqual(r.phone_hits.map(h => h.kind).sort(), ['lead', 'swatches'])
    assert.equal(r.phone_hits.find(h => h.kind === 'swatches').label, 'Jane, BB1 1AA')
  })
})

test('a later withdrawal hides the visit; the window is capped at two days', async () => {
  await isolated(async () => {
    await world()
    await receipt({ ...A, session: 'a1000000-0000-4000-8000-0000000000ff', arrival: 'a2000000-0000-4000-8000-0000000000ff' }, '2026-11-01T18:00:00Z', false)
    await as('admin')
    assert.deepEqual((await find()).visits.map(v => v.session_id), [B.session])
    assert.match(await refusal(`select public.find_order_visits(now() - interval '3 days', now(), now())`), /BAD_WINDOW/)
  })
})

test('matching copies the visit onto the order and records who did it', async () => {
  await isolated(async () => {
    await world()
    await as('admin')
    const id = await manualOrder()
    const result = (await db.query(`select public.match_order_visit($1, $2, 'rang at 2pm') r`, [id, A.session])).rows[0].r
    assert.equal(result.matched, true)
    const o = (await db.query(`select * from public.orders where id = $1`, [id])).rows[0]
    assert.equal(o.visitor_id, A.visitor)
    assert.equal(o.session_id, A.session)
    assert.equal(o.arrival_id, A.arrival)
    assert.equal(o.fbclid, 'fbclid-A')
    assert.equal(o.meta_fbc, 'fb.1.111.fbclid-A')
    assert.equal(o.meta_fbp, 'fb.1.111')
    assert.equal(o.utm_source, 'facebook')
    assert.equal(o.utm_campaign, 'Nov corner sofas')
    assert.equal(o.visit_matched_by, ADMIN)
    assert.ok(o.visit_matched_at)
    assert.equal(o.visit_match_note, 'rang at 2pm')
    // The same rule the Purchase is gated on now passes for this order.
    const gate = (await db.query(`select private.visit_ad_receipt($1, $2, $3, $4) r`, [o.visitor_id, o.session_id, o.arrival_id, o.created_at])).rows[0].r
    assert.ok(gate)
    const ev = (await db.query(`select kind, staff_id, note from public.order_events where order_id = $1`, [id])).rows
    assert.equal(ev.length, 1)
    assert.equal(ev[0].kind, 'visit_matched')
    assert.equal(ev[0].staff_id, ADMIN)
    assert.match(ev[0].note, /Facebook or Instagram ad.*rang at 2pm/)
    // Shown as taken in the list now.
    assert.equal((await find()).visits.find(v => v.session_id === A.session).linked_order_id, id)
  })
})

test('a WhatsApp tap in the visit wins, a lead is closed, and taking the match off gives both back', async () => {
  await isolated(async () => {
    await world()
    await db.query(`insert into public.whatsapp_enquiries (reference, created_at, visitor_id, session_id, arrival_id, product_id, fbclid, utm_source, meta_fbc)
      values ('UKSS-WA-261101-ABCDEF', '2026-11-01T13:31:00Z', $1, $2, $3, $4, 'fbclid-wa', 'facebook', 'fb.1.222.fbclid-wa')`, [A.visitor, A.session, A.arrival, PRODUCT])
    await db.query(`insert into public.checkout_recovery_leads (session_id, phone, reference, status) values ($1, '07700900123', 'UKSS-LD-261101-AAAAAA', 'active')`, [A.session])
    await as('admin')
    const id = await manualOrder()
    await db.query(`select public.match_order_visit($1, $2)`, [id, A.session])
    let o = (await db.query(`select * from public.orders where id = $1`, [id])).rows[0]
    assert.equal(o.whatsapp_reference, 'UKSS-WA-261101-ABCDEF')
    assert.equal(o.fbclid, 'fbclid-wa')
    assert.equal((await db.query(`select converted_order_id from public.whatsapp_enquiries`)).rows[0].converted_order_id, id)
    assert.deepEqual((await db.query(`select status, converted_order_id from public.checkout_recovery_leads`)).rows[0], { status: 'converted', converted_order_id: id })

    await db.query(`select public.match_order_visit($1, null)`, [id])
    o = (await db.query(`select * from public.orders where id = $1`, [id])).rows[0]
    assert.equal(o.visitor_id, null)
    assert.equal(o.fbclid, null)
    assert.equal(o.whatsapp_reference, null)
    assert.equal(o.visit_matched_at, null)
    assert.equal((await db.query(`select converted_order_id from public.whatsapp_enquiries`)).rows[0].converted_order_id, null)
    assert.deepEqual((await db.query(`select status, converted_order_id from public.checkout_recovery_leads`)).rows[0], { status: 'done', converted_order_id: null })
    assert.deepEqual((await db.query(`select kind from public.order_events where order_id = $1 order by id`, [id])).rows.map(r => r.kind), ['visit_matched', 'visit_matched'])
  })
})

test('a match can be changed to another visit', async () => {
  await isolated(async () => {
    await world()
    await as('admin')
    const id = await manualOrder()
    await db.query(`select public.match_order_visit($1, $2)`, [id, A.session])
    await db.query(`select public.match_order_visit($1, $2)`, [id, B.session])
    const o = (await db.query(`select session_id, fbclid, utm_source from public.orders where id = $1`, [id])).rows[0]
    assert.deepEqual(o, { session_id: B.session, fbclid: null, utm_source: null })
  })
})

test('the refusals', async () => {
  await isolated(async () => {
    await world()
    await as('admin')
    const id = await manualOrder()
    assert.match(await refusal(`select public.match_order_visit($1, $2)`, [id, C.session]), /NO_CONSENT/)

    // A visit that only began after the order was taken cannot be its source.
    const early = await manualOrder({ created_at: '2026-11-01T13:00:00Z' })
    assert.match(await refusal(`select public.match_order_visit($1, $2)`, [early, B.session]), /NO_CONSENT/)

    const other = await manualOrder()
    await db.query(`select public.match_order_visit($1, $2)`, [other, A.session])
    assert.match(await refusal(`select public.match_order_visit($1, $2)`, [id, A.session]), /VISIT_TAKEN/)

    const referenced = await manualOrder({ visitor_id: B.visitor, session_id: B.session, arrival_id: B.arrival })
    assert.match(await refusal(`select public.match_order_visit($1, $2)`, [referenced, A.session]), /ALREADY_LINKED/)

    const sent = await manualOrder({ purchase_event_sent_at: '2026-11-01T17:00:00Z' })
    assert.match(await refusal(`select public.match_order_visit($1, $2)`, [sent, B.session]), /ALREADY_SENT/)

    const website = (await db.query(`insert into public.orders (source) values ('website') returning id`)).rows[0].id
    assert.match(await refusal(`select public.match_order_visit($1, $2)`, [website, B.session]), /NOT_MANUAL/)

    await as('customer')
    assert.match(await refusal(`select public.find_order_visits($1, $2, $3)`, [FROM, TO, AT]), /NOT_AUTHORISED/)
    assert.match(await refusal(`select public.match_order_visit($1, $2)`, [id, B.session]), /NOT_AUTHORISED/)
  })
})

test('the history accepts its new kind and keeps the old ones', async () => {
  const { rows } = await db.query(`select pg_get_constraintdef(oid) d from pg_constraint where conname = 'order_events_kind_check'`)
  assert.match(rows[0].d, /visit_matched/)
  assert.match(rows[0].d, /source_changed/)
  // Replaying the migration is harmless.
  await db.exec(read('supabase/migrations/20261101210000_match_order_to_visit.sql'))
})
