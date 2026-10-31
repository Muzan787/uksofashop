// Order rules in the database (admin upgrade Phase 5, F9).
//
// Replays supabase/migrations/20261014215150_order_rules.sql into PGlite on a
// stand-in schema (the columns the rules touch, the tables that point at an
// order, and OrderFlow's real payload function) and checks:
//
//   * every allowed status move works and every refused one is refused, for
//     staff and for everyone else - and the admin's own list of moves
//     (src/utils/orderMoves.ts) matches the database on every pair;
//   * stage times are stamped once and never move;
//   * the history records each change and who made it;
//   * a non-admin is refused by every staff function, and signed-out callers
//     cannot reach them at all;
//   * deleting an order clears every linked row, in one go;
//   * orderflow.order_payload() returns exactly what it did before.
//
// And, from 20261014230352_order_page.sql (Phase 6), the orders list's search
// - a phone typed without spaces still finds "07700 900123" - and the
// WhatsApp-or-phone channel; plus the order page's WhatsApp messages and the
// search box's own cleaning (src/utils/orderWhatsApp.ts, orderSearch.ts).
//
// Each test runs inside BEGIN ... ROLLBACK, so they don't see each other.
const { test, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

function load(file) {
  const module = { exports: {} }
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(js, { module, exports: module.exports })
  return module.exports
}
const moves = load('src/utils/orderMoves.ts')

const ADMIN = '11111111-1111-4111-8111-111111111111'
const STATUSES = ['pending_cod', 'confirmed', 'on_hold', 'delivered', 'cancelled']

let db
let payloadBefore

// OrderFlow's payload function exactly as it is in production (orderflow_push).
const ORDERFLOW = `
create schema orderflow;
create or replace function orderflow.uk_postcode(p_address text) returns text language sql immutable set search_path to '' as $f$
  with found as (
    select m[1] as pc, ord
      from regexp_matches(upper(regexp_replace(coalesce(p_address, ''), '\\s+', ' ', 'g')),
             '([A-Z]{1,2}[0-9][A-Z0-9]?\\s?[0-9][A-Z]{2})', 'g') with ordinality as t(m, ord)
  ),
  last_one as (select replace(pc, ' ', '') as flat from found order by ord desc limit 1)
  select left(flat, length(flat) - 3) || ' ' || right(flat, 3) from last_one;
$f$;
create or replace function orderflow.order_payload(p_order_id uuid) returns jsonb language sql stable security definer set search_path to '' as $f$
  select jsonb_strip_nulls(jsonb_build_object(
    'external_id', o.id::text,
    'status', o.status,
    'placed_at', to_jsonb(o.created_at),
    'postcode', orderflow.uk_postcode(o.shipping_address),
    'delivery_date', to_char(o.preferred_delivery_date, 'YYYY-MM-DD'),
    'total', round(o.total_amount, 2),
    'items', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'product_name', coalesce(nullif(btrim(oi.custom_title), ''), btrim(p.title)),
               'sku', pv.sku,
               'variant', coalesce(nullif(btrim(oi.fabric_name), ''), nullif(btrim(pv.material), '')),
               'quantity', oi.quantity,
               'unit_price', round(oi.price_at_time_of_purchase, 2))) order by p.title)
        from public.order_items oi
        join public.product_variants pv on pv.id = oi.variant_id
        join public.products p on p.id = pv.product_id
       where oi.order_id = o.id
    ), '[]'::jsonb)))
  from public.orders o where o.id = p_order_id;
$f$;`

before(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    insert into auth.users values ('${ADMIN}');
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    -- Stand-in for the real is_admin(): admin when the test says so.
    create function public.is_admin() returns boolean language sql stable
      as $$ select coalesce(current_setting('test.admin', true), '') = 'yes' $$;
    grant execute on function public.is_admin() to anon, authenticated;

    create table public.orders (
      id uuid primary key default gen_random_uuid(),
      status text not null default 'pending_cod',
      source text, customer_name text, customer_email text, customer_phone text, shipping_address text,
      special_instructions text, preferred_delivery_date date,
      items_subtotal numeric, delivery_total numeric, total_amount numeric,
      created_at timestamptz not null default now(),
      confirmed_at timestamptz, processing_at timestamptz, shipped_at timestamptz,
      delivered_at timestamptz, cancelled_at timestamptz, cancellation_reason text,
      utm_campaign text,
      manual_acquisition_source text, manual_acquisition_note text, manual_acquisition_at timestamptz
    );
    create table public.products (id uuid primary key default gen_random_uuid(), title text);
    create table public.product_variants (id uuid primary key default gen_random_uuid(), product_id uuid references public.products(id), sku text, material text);
    create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id) on delete cascade,
      variant_id uuid references public.product_variants(id), quantity int, price_at_time_of_purchase numeric, fabric_name text, custom_title text);
    create table public.attribution_actions (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id));
    create table public.conversion_events (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id));
    create table public.google_offline_conversions (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id));
    create table public.google_conversion_outbox (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id));
    create table public.google_order_consent (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id));
    create table public.google_ga4_delivery (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id));
    create table public.whatsapp_enquiries (id uuid primary key default gen_random_uuid(), converted_order_id uuid references public.orders(id));
    ${ORDERFLOW}

    -- A sample order with lines, and the test order decision 6 names.
    insert into public.products (id, title) values ('aaaaaaaa-0000-4000-8000-000000000001', 'Hannah Electric 3+2 Seater');
    insert into public.product_variants (id, product_id, sku, material) values ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'HAN-32-GRY', 'Plush velvet');
    insert into public.orders (id, status, source, customer_name, shipping_address, total_amount, confirmed_at, preferred_delivery_date)
      values ('cccccccc-0000-4000-8000-000000000001', 'confirmed', 'whatsapp', 'Sample', '1 High St, Blackburn, BB1 1AA', 1299.5, now(), '2026-10-20');
    insert into public.order_items (order_id, variant_id, quantity, price_at_time_of_purchase, fabric_name)
      values ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 1, 1299.5, 'Chenille Mink');
    insert into public.orders (id, status, customer_name, total_amount, utm_campaign, cancelled_at)
      values ('cccccccc-0000-4000-8000-000000000002', 'cancelled', 'Saad', 10, 'offer-test', now());
  `)
  payloadBefore = (await db.query(`select orderflow.order_payload('cccccccc-0000-4000-8000-000000000001') p`)).rows[0].p
  await db.exec(read('supabase/migrations/20261014215150_order_rules.sql'))
  await db.exec(read('supabase/migrations/20261014230352_order_page.sql'))
  await db.exec(read('supabase/migrations/20261031131331_order_on_hold.sql'))
})

/** Runs `fn` in a transaction that is always rolled back. */
async function isolated(fn) {
  await db.exec('begin')
  try {
    return await fn()
  } finally {
    await db.exec('rollback')
  }
}

async function as(who) {
  await db.query(`select set_config('test.admin', $1, true), set_config('test.uid', $2, true)`,
    [who === 'admin' ? 'yes' : '', who === 'admin' ? ADMIN : ''])
}

async function newOrder(status) {
  const stamps = {
    confirmed: 'confirmed_at', on_hold: 'confirmed_at', delivered: 'delivered_at', cancelled: 'cancelled_at',
  }
  const col = stamps[status]
  const sql = col
    ? `insert into public.orders (status, customer_name, total_amount, ${col}) values ($1, 'Test', 100, now() - interval '1 day') returning id`
    : `insert into public.orders (status, customer_name, total_amount) values ($1, 'Test', 100) returning id`
  return (await db.query(sql, [status])).rows[0].id
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

test('every allowed move works, every other is refused - and the admin screens agree', async () => {
  for (const staff of [true, false]) {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        await isolated(async () => {
          await as(staff ? 'admin' : 'customer')
          const id = await newOrder(from)
          const err = await refusal(`update public.orders set status = $1 where id = $2`, [to, id])
          const allowed = err === null
          const label = `${staff ? 'staff' : 'other'} ${from} -> ${to}`
          assert.equal(allowed, moves.orderMoveAllowed(from, to, staff), `${label}: database said ${err ?? 'yes'}`)
          if (!allowed) assert.match(err, /BAD_STATUS_CHANGE/, label)
        })
      }
    }
  }
  assert.deepEqual(JSON.parse(JSON.stringify(moves.movesFrom('cancelled'))), ['confirmed'])
  assert.deepEqual(JSON.parse(JSON.stringify(moves.movesFrom('pending_cod'))), ['confirmed', 'cancelled'])
})

test('reopening a cancelled order needs a reason, and staff', async () => {
  await isolated(async () => {
    await as('admin')
    const id = await newOrder('cancelled')
    assert.match(await refusal(`select public.change_order_status($1, 'confirmed')`, [id]), /REASON_REQUIRED/)
    const res = (await db.query(`select public.change_order_status($1, 'confirmed', 'Came back on WhatsApp') r`, [id])).rows[0].r
    assert.equal(res.to, 'confirmed')
    const ev = (await db.query(`select note, staff_id from public.order_events where order_id = $1 and kind = 'status_changed'`, [id])).rows[0]
    assert.deepEqual(ev, { note: 'Came back on WhatsApp', staff_id: ADMIN })
  })
})

test('stage times are stamped once and never move', async () => {
  await isolated(async () => {
    await as('admin')
    const id = await newOrder('pending_cod')
    const r1 = (await db.query(`select public.change_order_status($1, 'confirmed') r`, [id])).rows[0].r
    assert.equal(r1.confirmed_now, true)
    const first = (await db.query(`select confirmed_at, confirmed_by from public.orders where id = $1`, [id])).rows[0]
    assert.ok(first.confirmed_at)
    assert.equal(first.confirmed_by, 'staff')

    await db.query(`select public.change_order_status($1, 'delivered')`, [id])
    await db.query(`select public.change_order_status($1, 'on_hold')`, [id]) // a correction backwards
    await db.query(`select public.change_order_status($1, 'confirmed')`, [id])
    const after = (await db.query(`select confirmed_at, delivered_at, status from public.orders where id = $1`, [id])).rows[0]
    assert.equal(after.confirmed_at.getTime(), first.confirmed_at.getTime(), 'confirmed_at kept')
    assert.ok(after.delivered_at, 'delivered_at kept after moving back')
    assert.equal(after.status, 'confirmed')

    for (const col of ['confirmed_at', 'delivered_at']) {
      assert.match(await refusal(`update public.orders set ${col} = now() + interval '1 hour' where id = $1`, [id]), /STAGE_TIME_LOCKED/, col)
      assert.match(await refusal(`update public.orders set ${col} = null where id = $1`, [id]), /STAGE_TIME_LOCKED/, `${col} cleared`)
    }
    assert.match(await refusal(`update public.orders set confirmed_by = 'customer' where id = $1`, [id]), /STAGE_TIME_LOCKED/)
  })
})

test('the customer confirming is recorded as the customer, with no staff account', async () => {
  await isolated(async () => {
    await as('customer')
    const id = await newOrder('pending_cod')
    await db.query(`select private.apply_status_change($1, 'confirmed', 'customer', null)`, [id])
    const row = (await db.query(`select confirmed_by, confirmed_at from public.orders where id = $1`, [id])).rows[0]
    assert.equal(row.confirmed_by, 'customer')
    const events = (await db.query(`select kind, from_status, to_status, staff_id from public.order_events where order_id = $1 order by id`, [id])).rows
    assert.deepEqual(events, [
      { kind: 'placed', from_status: null, to_status: 'pending_cod', staff_id: null },
      { kind: 'status_changed', from_status: 'pending_cod', to_status: 'confirmed', staff_id: null },
    ])
  })
})

test('the history records each change and who made it', async () => {
  await isolated(async () => {
    await as('admin')
    const id = await newOrder('confirmed')
    await db.query(`select public.change_order_status($1, 'cancelled', 'Changed their mind')`, [id])
    await db.query(`select public.add_order_note($1, 'Rang on Tuesday')`, [id])
    await db.query(`select public.set_order_test_flag($1, true, 'Staff test')`, [id])
    await db.query(`select public.set_order_source($1, 'meta', 'From the reel')`, [id])
    await db.query(`update public.orders set customer_phone = '07700900999' where id = $1`, [id])
    const events = (await db.query(`select kind, note, staff_id = $2 as by_admin from public.order_events where order_id = $1 order by id`, [id, ADMIN])).rows
    assert.deepEqual(events.map(e => e.kind), ['placed', 'status_changed', 'note', 'test_flag_changed', 'source_changed', 'details_changed'])
    assert.ok(events.every(e => e.by_admin), 'every line carries the admin')
    assert.equal(events[1].note, 'Changed their mind')
    const order = (await db.query(`select cancellation_reason, is_test, test_reason, manual_acquisition_source from public.orders where id = $1`, [id])).rows[0]
    assert.deepEqual(order, { cancellation_reason: 'Changed their mind', is_test: true, test_reason: 'Staff test', manual_acquisition_source: 'meta' })
  })
})

test('a non-admin is refused by every staff function, and signed-out callers cannot reach them', async () => {
  await isolated(async () => {
    const id = await newOrder('confirmed')
    await as('customer')
    for (const sql of [
      `select public.change_order_status($1, 'on_hold')`,
      `select public.set_order_test_flag($1, true)`,
      `select public.add_order_note($1, 'x')`,
      `select public.set_order_source($1, 'google')`,
      `select public.delete_order($1)`,
    ]) {
      assert.match(await refusal(sql, [id]) ?? 'ALLOWED', /NOT_AUTHORISED/, sql)
    }
    await db.exec('set local role anon')
    assert.match(await refusal(`select public.change_order_status($1, 'on_hold')`, [id]) ?? 'ALLOWED', /permission denied/)
    assert.match(await refusal(`select private.apply_status_change($1, 'cancelled', 'customer', null)`, [id]) ?? 'ALLOWED', /permission denied/)
    assert.match(await refusal(`select * from public.order_events`) ?? 'ALLOWED', /permission denied/)
    await db.exec('reset role')
  })
})

test('deleting an order clears every linked row in one go', async () => {
  await isolated(async () => {
    await as('admin')
    const id = await newOrder('confirmed')
    for (const t of ['attribution_actions', 'conversion_events', 'google_offline_conversions', 'google_conversion_outbox', 'google_order_consent', 'google_ga4_delivery']) {
      await db.query(`insert into public.${t} (order_id) values ($1)`, [id])
    }
    await db.query(`insert into public.whatsapp_enquiries (converted_order_id) values ($1)`, [id])
    await db.query(`select public.add_order_note($1, 'goes with it')`, [id])
    const ok = (await db.query(`select public.delete_order($1) d`, [id])).rows[0].d
    assert.equal(ok, true)
    assert.equal((await db.query(`select count(*)::int n from public.orders where id = $1`, [id])).rows[0].n, 0)
    assert.equal((await db.query(`select count(*)::int n from public.order_events where order_id = $1`, [id])).rows[0].n, 0)
    assert.equal((await db.query(`select count(*)::int n from public.whatsapp_enquiries where converted_order_id is null`)).rows[0].n, 1)
    assert.match(await refusal(`select public.delete_order($1)`, [id]), /NOT_FOUND/)
  })
})

test('the test order from the offer-test link is flagged, and nothing else', async () => {
  const rows = (await db.query(`select customer_name, is_test, test_reason from public.orders order by customer_name`)).rows
  assert.deepEqual(rows, [
    { customer_name: 'Saad', is_test: true, test_reason: 'Placed from the offer-test link' },
    { customer_name: 'Sample', is_test: false, test_reason: null },
  ])
})

test('OrderFlow receives exactly what it did before', async () => {
  const after = (await db.query(`select orderflow.order_payload('cccccccc-0000-4000-8000-000000000001') p`)).rows[0].p
  assert.deepEqual(after, payloadBefore)
  assert.deepEqual(Object.keys(after).sort(), ['delivery_date', 'external_id', 'items', 'placed_at', 'postcode', 'status', 'total'])
  assert.equal(after.postcode, 'BB1 1AA')
})

test('an order on hold goes to OrderFlow without its delivery day, and gets it back when rebooked', async () => {
  await isolated(async () => {
    await as('admin')
    const id = 'cccccccc-0000-4000-8000-000000000001'
    await db.query(`select public.change_order_status($1, 'on_hold', 'Moving house, will ring')`, [id])
    const held = (await db.query(`select orderflow.order_payload($1) p`, [id])).rows[0].p
    assert.equal(held.status, 'on_hold')
    assert.equal('delivery_date' in held, false)
    assert.equal((await db.query(`select preferred_delivery_date::text d from public.orders where id = $1`, [id])).rows[0].d, '2026-10-20', 'kept on the order')
    const ev = (await db.query(`select note from public.order_events where order_id = $1 and to_status = 'on_hold'`, [id])).rows[0]
    assert.equal(ev.note, 'Moving house, will ring')
    await db.query(`select public.change_order_status($1, 'confirmed')`, [id])
    assert.equal((await db.query(`select orderflow.order_payload($1) p`, [id])).rows[0].p.delivery_date, '2026-10-20')
    assert.match(await refusal(`select public.change_order_status($1, 'processing')`, [id]), /BAD_STATUS/)
  })
})

// ── Phase 6: the order page and the list ──────────────────────────────────

test('search finds an order by code, name, email, postcode and phone, however it is typed', async () => {
  await isolated(async () => {
    const id = (await db.query(
      `insert into public.orders (status, customer_name, customer_email, customer_phone, shipping_address, total_amount)
       values ('pending_cod', 'Aisha Khan', 'aisha.k@example.com', '07700 900123', '12 Mill Lane, Blackburn, BB2 4QR', 899) returning id`,
    )).rows[0].id
    await as('admin')
    const finds = async q => (await db.query(`select * from public.search_orders($1) as id`, [q])).rows.map(r => r.id).includes(id)
    for (const q of ['07700900123', '07700 900123', '+44 7700 900123', '447700900123', '900123', 'BB2 4QR', 'bb24qr', 'Khan', 'aisha.k@', id.slice(0, 8), id.slice(0, 8).toUpperCase(), id]) {
      assert.equal(await finds(q), true, q)
    }
    for (const q of ['07700 900124', 'Smith', 'a', '', "'; drop table public.orders; --", '%', '_']) {
      assert.equal(await finds(q), false, q)
    }
    assert.ok((await db.query(`select count(*)::int n from public.orders`)).rows[0].n > 0)
    await as('customer')
    assert.match(await refusal(`select * from public.search_orders('Khan')`) ?? 'ALLOWED', /NOT_AUTHORISED/)
    await db.exec('set local role anon')
    assert.match(await refusal(`select * from public.search_orders('Khan')`) ?? 'ALLOWED', /permission denied/)
    await db.exec('reset role')
  })
})

test('orders taken on WhatsApp are marked so, and staff can say it was the phone', async () => {
  await isolated(async () => {
    const rows = (await db.query(`select customer_name, channel from public.orders order by customer_name`)).rows
    assert.deepEqual(rows, [{ customer_name: 'Saad', channel: null }, { customer_name: 'Sample', channel: 'whatsapp' }])
    await as('admin')
    const id = await newOrder('pending_cod')
    await db.query(`select public.set_order_channel($1, 'phone')`, [id])
    assert.equal((await db.query(`select channel from public.orders where id = $1`, [id])).rows[0].channel, 'phone')
    assert.match(await refusal(`select public.set_order_channel($1, 'fax')`, [id]), /BAD_CHANNEL/)
    await as('customer')
    assert.match(await refusal(`select public.set_order_channel($1, 'whatsapp')`, [id]) ?? 'ALLOWED', /NOT_AUTHORISED/)
    assert.match(await refusal(`select public.send_order_to_orderflow($1)`, [id]) ?? 'ALLOWED', /NOT_AUTHORISED/)
    assert.match(await refusal(`select public.order_orderflow_sends($1)`, [id]) ?? 'ALLOWED', /NOT_AUTHORISED/)
  })
})

/** Values made inside the vm sandbox, brought into this realm for deepEqual. */
const plain = value => JSON.parse(JSON.stringify(value))

test('the order page has a WhatsApp message for every status, in the shop voice', () => {
  const { orderWhatsAppMessage, postcodeOf, firstName } = load('src/utils/orderWhatsApp.ts')
  const site = 'https://www.uksofashop.co.uk'
  const order = {
    id: 'abcdef12-0000-4000-8000-000000000001', status: 'pending_cod', customer_name: '  Aisha Khan',
    total_amount: 1299.5, shipping_address: '12 Mill Lane, Blackburn, bb2 4qr', cancellation_reason: 'Out of stock. ',
  }
  assert.equal(postcodeOf(order.shipping_address), 'BB2 4QR')
  assert.equal(postcodeOf('12 Mill Lane, Blackburn'), '')
  assert.equal(firstName(order.customer_name), 'Aisha')
  assert.equal(firstName(''), 'there')

  const waiting = orderWhatsAppMessage(order, site)
  assert.match(waiting, /^Hi Aisha, /)
  assert.ok(waiting.includes(`${site}/confirm-order/${order.id}`), 'waiting carries the /confirm-order link')
  assert.match(waiting, /#ABCDEF12/)
  assert.match(orderWhatsAppMessage(order, site, { status: 'confirmed' }), /When is a good time to ring you about a delivery day\?/)
  const onHold = orderWhatsAppMessage(order, site, { status: 'on_hold' })
  assert.match(onHold, /on hold for now\. Nothing is cancelled\./)
  assert.ok(onHold.includes(`${site}/track-order?ref=ABCDEF12&postcode=BB2%204QR`))
  assert.ok(orderWhatsAppMessage(order, site, { status: 'delivered', reviewLink: 'https://example.com/r' }).includes('https://example.com/r'))
  assert.doesNotMatch(orderWhatsAppMessage(order, site, { status: 'delivered' }), /review/)
  assert.match(orderWhatsAppMessage(order, site, { status: 'cancelled' }), /cancelled: Out of stock\.\n/)
  for (const status of ['pending_cod', 'confirmed', 'on_hold', 'delivered', 'cancelled']) {
    assert.doesNotMatch(orderWhatsAppMessage(order, site, { status }), /undefined|null|NaN/, status)
  }
  assert.deepEqual(plain([postcodeOf(null), firstName(null)]), ['', 'there'])
})

test('the search box sends only plain characters, and knows an order code', () => {
  const { cleanSearch, isOrderCode } = load('src/utils/orderSearch.ts')
  assert.equal(cleanSearch('  07700   900123 '), '07700 900123')
  assert.equal(cleanSearch("x'; drop table orders; --"), 'x drop table orders --')
  assert.equal(cleanSearch('100%_(a)*'), '100_a')
  assert.equal(cleanSearch('aisha.k+1@example.com'), 'aisha.k+1@example.com')
  assert.equal(cleanSearch(undefined), '')
  assert.equal(cleanSearch('x'.repeat(200)).length, 80)
  assert.equal(isOrderCode('ABCDEF12'), true)
  assert.equal(isOrderCode('abcdef12-0000-4000-8000-000000000001'), true)
  assert.equal(isOrderCode('Khan'), false)
})
