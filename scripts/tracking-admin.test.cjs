// Tracking in the admin (admin upgrade Phase 11, N1-N8 and O1-O5).
//
//   * Live sends exactly what it sent before; Test goes to Meta's Test events
//     (its own event id) and Google's validator; Dry run sends nothing; every
//     built event is logged with personal details hashed in the log only;
//   * a staff device and a test-link visit never count, in the browser and on
//     every route that records or forwards tracking; the ad tags load only on
//     Live;
//   * Hold and Don't send take an order out of the queue; a Purchase sent for
//     an order cancelled later is listed; Meta's reply reads as a sentence;
//   * the database: the mode is admin-only and one of three, holds go with
//     their order;
//   * the Ad links rules: the URL parameters read as Meta, profile links don't,
//     the test link carries its marker through offer-entry, and the feed's
//     "left out" agrees with the feed itself.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { createHash } = require('node:crypto')
const { PGlite } = require('@electric-sql/pglite')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
const plain = value => JSON.parse(JSON.stringify(value))
const sha = v => createHash('sha256').update(String(v)).digest('hex')

/** Loads a TypeScript module; '@/...' and './...' imports load the real file unless mocked. */
function load(file, mocks = {}, globals = {}) {
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  const req = spec => {
    if (spec in mocks) return mocks[spec]
    const base = spec.startsWith('@/') ? path.join('src', spec.slice(2)) : spec.startsWith('.') ? path.join(path.dirname(file), spec) : null
    if (base) {
      for (const c of [`${base}.ts`, `${base}.tsx`]) if (fs.existsSync(path.join(root, c))) return load(c, mocks, globals)
      throw new Error(`cannot load ${spec}`)
    }
    return require(spec)
  }
  vm.runInNewContext(js, {
    module, exports: module.exports, require: req, process: { env: globals.env ?? {} },
    console: { error() {}, warn() {} }, URL, URLSearchParams, Buffer, Date, Number, JSON, ...globals,
  })
  return module.exports
}

// ── The browser ─────────────────────────────────────────────────────────────

function browser({ host = 'www.uksofashop.co.uk', search = '', cookies = {}, mode = null } = {}) {
  const jar = new Map(Object.entries(cookies))
  const document = {
    get cookie() { return [...jar].map(([k, v]) => `${k}=${v}`).join('; ') },
    set cookie(v) { const [k, val] = v.split(';')[0].split('='); jar.set(k.trim(), val) },
    querySelector: sel => (mode && sel.includes('ukss-tracking-mode') ? { getAttribute: () => mode } : null),
  }
  const window = { location: { hostname: host, search, protocol: 'https:' } }
  return { env: load('src/utils/trackingEnv.ts', {}, { window, document }), jar }
}

test('the live site counts a customer, and loads the ad tags only on Live', () => {
  assert.equal(browser().env.isBrowserTrackingEnabled(), true)
  assert.equal(browser().env.isAdTrackingEnabled(), true)
  assert.equal(browser({ mode: 'live' }).env.isAdTrackingEnabled(), true)
  for (const mode of ['test', 'dry_run']) {
    const { env } = browser({ mode })
    assert.equal(env.isAdTrackingEnabled(), false, `${mode}: no tags`)
    assert.equal(env.isBrowserTrackingEnabled(), true, `${mode}: the shop's own records carry on`)
  }
  assert.equal(browser({ host: 'localhost' }).env.isBrowserTrackingEnabled(), false)
})

test('a staff device and a test-link visit never count', () => {
  for (const cookies of [{ ukss_staff: '1' }, { ukss_test_visit: '1' }]) {
    const { env } = browser({ cookies })
    assert.equal(env.isBrowserTrackingEnabled(), false)
    assert.equal(env.isAdTrackingEnabled(), false)
  }
  const landing = browser({ search: '?utm_campaign=offer-test&ukss_test=1' })
  assert.equal(landing.env.isBrowserTrackingEnabled(), false, 'the landing page itself')
  landing.env.markTestVisit()
  assert.equal(landing.jar.get('ukss_test_visit'), '1', 'and the rest of the visit')
  const ordinary = browser({ search: '?utm_source=fb' })
  ordinary.env.markTestVisit()
  assert.equal(ordinary.jar.has('ukss_test_visit'), false)

  const env = browser().env
  assert.equal(env.exclusionReason(n => ({ ukss_staff: '1', ukss_test_visit: '1' })[n]), 'staff_device')
  assert.equal(env.exclusionReason(n => ({ ukss_test_visit: '1' })[n]), 'test_link')
  assert.equal(env.exclusionReason(() => undefined), null)
})

test('every route that records or forwards tracking checks for a staff device or test visit', () => {
  for (const route of ['attribution/action', 'attribution/arrival', 'attribution/whatsapp-click', 'checkout/telemetry',
                       'google/consent', 'journey', 'meta/event', 'offer/qualified-event']) {
    assert.match(read(`src/app/api/${route}/route.ts`), /if \(await isExcludedRequest\(\)\) return/, route)
  }
  // An order placed on one is marked as a test.
  assert.match(read('src/app/actions/checkout.ts'), /exclusionReason\(name => jar\.get\(name\)\?\.value\)[\s\S]{0,200}is_test: true/)
  // The test link's marker survives the offer-entry redirect.
  assert.match(read('src/app/offer-entry/[token]/route.ts'), /TEST_LINK_PARAM,\r?\n\]\)/)
})

test('the ad tags and their events follow the mode; the shop\'s own records follow only the exclusions', () => {
  const tracking = read('src/utils/tracking.ts')
  assert.match(tracking, /function fbq[\s\S]{0,700}if \(!isAdTrackingEnabled\(\)\) return/)
  assert.match(tracking, /function ga\([\s\S]{0,900}if \(!isAdTrackingEnabled\(\)\) return/)
  assert.match(tracking, /function ledger[\s\S]{0,300}if \(!isBrowserTrackingEnabled\(\)\) return/)
  assert.match(tracking, /function mirror[\s\S]{0,500}if \(!isBrowserTrackingEnabled\(\)\) return/)
  assert.match(read('src/components/UI/TrackingScripts.tsx'), /\(\) => isAdTrackingEnabled\(\)/)
  assert.match(read('src/components/Checkout/AdsPurchaseConversion.tsx'), /if \(!isAdTrackingEnabled\(\)\) return/)
  assert.match(read('src/app/layout.tsx'), /<meta name=\{TRACKING_MODE_META\} content=\{shopSettings\.trackingMode\} \/>/)
})

// ── The server: Meta and GA4 by mode, and the log ──────────────────────────

const ENV = { META_PIXEL_ID: 'fixture_dataset', META_CAPI_ACCESS_TOKEN: 'fixture_secret' }
const EVENT = {
  eventName: 'Purchase', eventId: 'evt-1', eventTime: 1790824320, orderId: 'AB12CD34',
  user: { email: 'a@example.test', phone: '07123456789', clientIp: '192.0.2.7', userAgent: 'Fixture UA', fbp: 'fb.1.1.1', fbc: 'fb.1.1.abc' },
  contents: [{ id: 'v1', quantity: 1, item_price: 799 }], value: 799, currency: 'GBP',
}

function capi(mode, env = ENV, reply = { ok: true, status: 200, json: async () => ({ events_received: 1 }) }) {
  const sent = []
  const logged = []
  const trackingLog = load('src/utils/trackingLog.ts', {
    'server-only': {},
    '@/utils/supabase/admin': { createAdminClient: () => ({ from: () => ({ insert: async row => { logged.push(row); return { error: null } } }) }) },
  })
  const m = load('src/utils/metaCapi.ts', {
    'server-only': {},
    '@/utils/phone': { normaliseUkMobile: p => (p.startsWith('07') ? '44' + p.slice(1) : p) },
    '@/utils/trackingEnv': { isServerTrackingEnabled: () => true },
    '@/utils/trackingMode': { getTrackingMode: async () => mode },
    '@/utils/trackingLog': trackingLog,
  }, { env, fetch: async (url, opt) => { sent.push({ url, body: JSON.parse(opt.body) }); return reply } })
  return { m, sent, logged }
}

test('Live sends exactly what it always did, and logs it with the raw identifiers hashed', async () => {
  const { m, sent, logged } = capi('live')
  const r = await m.sendCapiEvent(EVENT)
  assert.deepEqual(plain(r), { outcome: 'accepted', http_status: 200, events_received: 1 })
  assert.equal(sent.length, 1)
  const body = sent[0].body
  assert.equal(body.data[0].event_id, 'evt-1')
  assert.equal('test_event_code' in body, false)
  assert.equal(body.data[0].user_data.client_ip_address, '192.0.2.7', 'Meta gets the IP raw, as it asks')
  assert.equal(body.data[0].user_data.em, sha('a@example.test'))
  assert.equal(body.data[0].custom_data.order_id, 'AB12CD34')

  assert.equal(logged.length, 1)
  const row = logged[0]
  assert.deepEqual({ ...row, payload: undefined }, { platform: 'meta', event_name: 'Purchase', event_id: 'evt-1', mode: 'live', outcome: 'accepted', order_ref: 'AB12CD34', payload: undefined })
  const loggedUser = row.payload.data[0].user_data
  for (const [key, raw] of [['client_ip_address', '192.0.2.7'], ['client_user_agent', 'Fixture UA'], ['fbp', 'fb.1.1.1'], ['fbc', 'fb.1.1.abc']]) {
    assert.equal(loggedUser[key], `sha256:${sha(raw)}`, `${key} hashed in the log`)
  }
  assert.equal(JSON.stringify(row.payload).includes('192.0.2.7'), false)
  assert.equal(JSON.stringify(row.payload).includes('fixture_secret'), false)
})

test('Dry run builds and logs the event and sends nothing', async () => {
  const { m, sent, logged } = capi('dry_run')
  const r = await m.sendCapiEvent(EVENT)
  assert.deepEqual(plain(r), { outcome: 'skipped', reason: 'dry_run', mode: 'dry_run' })
  assert.equal(sent.length, 0)
  assert.equal(logged[0].outcome, 'dry_run')
  assert.equal(logged[0].payload.data[0].event_id, 'evt-1')
})

test('Test goes to Meta\'s Test events under its own id, and never without the test code', async () => {
  const none = capi('test')
  assert.deepEqual(plain(await none.m.sendCapiEvent(EVENT)), { outcome: 'skipped', reason: 'no_test_code', mode: 'test' })
  assert.equal(none.sent.length, 0)

  const t = capi('test', { ...ENV, META_CAPI_TEST_EVENT_CODE: 'TEST123' })
  const r = await t.m.sendCapiEvent(EVENT)
  assert.equal(r.mode, 'test')
  assert.equal(t.sent[0].body.data[0].event_id, 'evt-1-test')
  assert.equal(t.sent[0].body.test_event_code, 'TEST123')
  assert.equal(t.logged[0].payload.test_event_code, '(set)', 'the code is never logged')
})

test('GA4: Live to the collector, Test to the validator, Dry run nowhere; the client id is hashed in the log', async () => {
  for (const [mode, expectUrl, expectResult] of [['live', '/mp/collect?', 'transport_accepted'], ['test', '/debug/mp/collect?', 'validated'], ['dry_run', null, 'dry_run']]) {
    const sent = []
    const logged = []
    const m = load('src/utils/ga4Server.ts', {
      'server-only': {},
      '@/utils/trackingEnv': { isServerTrackingEnabled: () => true },
      '@/utils/trackingMode': { getTrackingMode: async () => mode },
      '@/utils/trackingLog': { logTrackingEvent: async row => { logged.push(row) }, ga4PayloadForLog: b => ({ ...b, client_id: `sha256:${sha(b.client_id)}` }) },
    }, { env: { GA4_MEASUREMENT_ID: 'G-X', GA4_API_SECRET: 's' }, fetch: async url => { sent.push(url); return { ok: true, status: 204 } } })
    const r = await m.sendGa4Event({ clientId: '123.456', name: 'purchase', params: { value: 1 } })
    assert.equal(r, expectResult, mode)
    if (expectUrl) assert.ok(sent[0].includes(expectUrl), mode)
    else assert.equal(sent.length, 0)
    assert.equal(logged[0].payload.client_id, `sha256:${sha('123.456')}`)
  }
})

test('Test and Dry run never claim the order, stage Google or write the send ledger', () => {
  const src = read('src/utils/orderConversions.ts')
  assert.match(src, /if \(live\) \{\s+const \{ data: staged/, 'Google staging is Live only')
  assert.match(src, /if \(live\) \{\s+const \{ data: claimed \}/, 'the claim is Live only')
  assert.match(src, /if \(live\) await admin\.from\('conversion_events'\)\.insert\(\[/, 'the ledger is Live only')
  assert.match(src, /from\('meta_signal_holds'\)[\s\S]{0,120}if \(hold\) return/, 'a held order sends nothing')
  assert.match(read('src/utils/googleServer.ts'), /if \(\(await getTrackingMode\(\)\) !== 'live'\) return/)
  const action = read('src/app/actions/orders.ts')
  assert.match(action, /from\('meta_signal_holds'\)[\s\S]{0,200}if \(hold\) \{/, 'the button refuses a held order')
})

// ── The queue ───────────────────────────────────────────────────────────────

test('a held order isn\'t waiting; a Purchase sent before a cancellation is listed', () => {
  const s = load('src/utils/metaSignals.ts')
  const ready = { status: 'confirmed', confirmed_at: '2026-10-15T10:00:00Z', delivered_at: null, purchase_event_sent_at: null, delivered_event_sent_at: null, utm_campaign: null, cancellation_reason: null, is_test: false }
  assert.equal(s.purchasePending(ready), true)
  assert.equal(s.purchasePending({ ...ready, meta_signal_holds: { state: 'hold' } }), false)
  assert.equal(s.purchasePending({ ...ready, meta_signal_holds: [{ state: 'dont_send' }] }), false)
  assert.equal(s.holdState({ ...ready, meta_signal_holds: [] }), null)
  assert.equal(s.holdState({ ...ready, meta_signal_holds: { state: 'hold' } }), 'hold')
  const delivered = { ...ready, status: 'delivered', delivered_at: '2026-10-16T10:00:00Z', purchase_event_sent_at: '2026-10-15T11:00:00Z' }
  assert.equal(s.deliveredPending(delivered), true)
  assert.equal(s.deliveredPending({ ...delivered, meta_signal_holds: { state: 'hold' } }), false)
  assert.equal(s.cancelledAfterSending({ ...ready, status: 'cancelled', purchase_event_sent_at: '2026-10-15T11:00:00Z' }), true)
  assert.equal(s.cancelledAfterSending({ ...ready, status: 'cancelled' }), false)
  assert.match(s.META_SIGNAL_COLUMNS, /meta_signal_holds\(state\)/)
})

test('Meta\'s reply reads as one sentence, with the attempts', () => {
  const { metaReply } = load('src/utils/metaReply.ts')
  const at = (minutes, response_metadata, status = 'sent') => ({ order_id: 'o', event_name: 'Purchase', status, created_at: `2026-10-15T10:${String(minutes).padStart(2, '0')}:00Z`, response_metadata })
  assert.equal(metaReply([]), null)
  assert.deepEqual(plain(metaReply([at(1, { outcome: 'rejected', http_status: 400, error_code: 100 }), at(5, { outcome: 'accepted' })])), { attempts: 2, text: 'Meta accepted it.', tone: 'ok' })
  assert.equal(metaReply([at(1, { outcome: 'rejected', http_status: 400, error_code: 100 })]).text, 'Meta refused it (HTTP 400, code 100).')
  assert.equal(metaReply([at(1, { outcome: 'ambiguous' })]).tone, 'unclear')
  assert.equal(metaReply([at(1, { outcome: 'skipped', reason: 'denied_or_withdrawn' }, 'skipped')]).text, 'Not sent: the customer declined ad cookies.')
  assert.equal(metaReply([at(1, null)]).text, 'Sent before Meta’s replies were recorded.')
})

test('What\'s set up shows ticks, never a value', () => {
  const env = { META_PIXEL_ID: 'dataset-123456', META_CAPI_ACCESS_TOKEN: 'EAAsecret', META_CAPI_TEST_EVENT_CODE: 'TEST999', GA4_MEASUREMENT_ID: 'G-ABCDEF', GA4_API_SECRET: 'apisecret', NEXT_PUBLIC_ADS_ORDER_PLACED_SEND_TO: 'AW-1/label', TRACKING_ENV: 'production' }
  const { trackingSetup } = load('src/utils/trackingSetup.ts', {
    'server-only': {},
    '@/utils/trackingEnv': { isServerTrackingEnabled: () => true },
    '@/utils/consentMode': { GA_ID: 'G-GTBKG6RSNF', META_PIXEL_ID: '1613016580155004' },
    '@/utils/googleMeasurement': { GOOGLE_GTM_ENABLED: false },
  }, { env })
  const items = trackingSetup()
  const text = JSON.stringify(items)
  for (const value of [...Object.values(env), 'G-GTBKG6RSNF', '1613016580155004']) {
    if (value !== 'production') assert.equal(text.includes(value), false, `${value} never shown`)
  }
  assert.equal(items.find(i => i.key === 'capi').state, true)
  assert.equal(items.find(i => i.key === 'test-code').state, 'warn')
})

// ── The database ────────────────────────────────────────────────────────────

test('the mode is admin-only and one of three; a hold goes with its order', async () => {
  const pg = new PGlite()
  await pg.exec(`create role anon; create role authenticated; create role service_role;
    create schema private; create schema auth; create schema cron;
    create function auth.uid() returns uuid language sql as 'select null::uuid';
    create function cron.schedule(text, text, text) returns bigint language sql as 'select 1::bigint';
    create function private.is_admin() returns boolean language sql as 'select false';
    create function private.require_admin() returns void language plpgsql as $$ begin raise exception 'NOT_AUTHORISED'; end $$;
    create table public.shop_settings (id boolean primary key default true, updated_at timestamptz, updated_by uuid);
    insert into public.shop_settings default values;
    create table public.orders (id uuid primary key default gen_random_uuid());`)
  await pg.exec(read('supabase/migrations/20261015135237_tracking_admin.sql'))
  assert.equal((await pg.query('select tracking_mode from shop_settings')).rows[0].tracking_mode, 'live')
  await assert.rejects(() => pg.query(`select set_tracking_mode('test')`), /NOT_AUTHORISED/)
  await pg.exec(`create or replace function private.require_admin() returns void language plpgsql as $$ begin end $$`)
  assert.equal((await pg.query(`select set_tracking_mode('dry_run') m`)).rows[0].m, 'dry_run')
  await assert.rejects(() => pg.query(`select set_tracking_mode('loud')`), /MODE_INVALID/)
  await assert.rejects(() => pg.exec(`update shop_settings set tracking_mode = 'off'`), /check/)

  const { rows: [order] } = await pg.query('insert into orders default values returning id')
  await pg.query(`insert into meta_signal_holds (order_id, state) values ($1, 'hold')`, [order.id])
  await assert.rejects(() => pg.query(`insert into meta_signal_holds (order_id, state) values ($1, 'later')`, [order.id]), /check|duplicate/)
  await pg.query('delete from orders where id = $1', [order.id])
  assert.equal((await pg.query('select count(*)::int n from meta_signal_holds')).rows[0].n, 0)
  await assert.rejects(() => pg.exec(`insert into tracking_event_log (platform, event_name, mode, outcome, payload) values ('tiktok', 'x', 'live', 'x', '{}')`), /check/)
})

// ── Ad links ────────────────────────────────────────────────────────────────

test('the URL parameters read as a Meta ad visit; profile links don\'t; the test link is marked', () => {
  const links = load('src/utils/adLinks.ts')
  const { classifyPaidLanding } = load('src/utils/offers/paidTraffic.ts')
  for (const source of ['fb', 'ig', 'msg', 'an']) {
    const filled = links.AD_URL_PARAMETERS.replace('{{site_source_name}}', source).replace(/\{\{[a-z.]+\}\}/g, 'Name')
    assert.equal(classifyPaidLanding(`/?${filled}`), 'meta_ads', source)
  }
  for (const p of links.PROFILE_LINKS) {
    assert.equal(classifyPaidLanding(p.url.replace(links.SITE, '')), null, p.key)
    assert.equal(p.url.includes('offer-entry'), false)
  }
  assert.match(links.TEST_LINK_QUERY, /(^|&)ukss_test=1(&|$)/)
  assert.match(links.TEST_LINK_QUERY, /utm_campaign=offer-test/)
})

test('"left out" agrees with the feed Meta reads', async () => {
  const products = [
    { id: 'p1', title: 'Roma', slug: 'roma', is_active: true, gallery_images: ['https://res.cloudinary.com/x/roma.jpg'], description: null, base_price: 649, was_price: null, size_label: null,
      categories: { slug: 'recliner', name: 'Recliners' }, product_categories: [],
      product_variants: [{ id: 'v1', sku: 'A', color: 'Grey', material: null, price_adjustment: 0, image_url: null, is_active: true },
                         { id: 'v2', sku: 'B', color: 'Beige', material: null, price_adjustment: 0, image_url: 'https://res.cloudinary.com/x/b.jpg', is_active: true },
                         { id: 'v3', sku: 'C', color: 'Red', material: null, price_adjustment: 0, image_url: null, is_active: false }] },
    { id: 'p2', title: 'Nova', slug: 'nova', is_active: true, gallery_images: [], description: null, base_price: 999, was_price: null, size_label: null,
      categories: { slug: 'electric-sofa', name: 'Electric' }, product_categories: [],
      product_variants: [{ id: 'v4', sku: 'D', color: 'Black', material: null, price_adjustment: 0, image_url: null, is_active: true }] },
    { id: 'p3', title: 'Old', slug: 'old', is_active: false, gallery_images: ['https://res.cloudinary.com/x/o.jpg'], description: null, base_price: 1, was_price: null, size_label: null,
      categories: null, product_categories: [], product_variants: [] },
    { id: 'p4', title: 'Bare', slug: 'bare', is_active: true, gallery_images: ['https://res.cloudinary.com/x/bare.jpg'], description: null, base_price: 1, was_price: null, size_label: null,
      categories: null, product_categories: [], product_variants: [{ id: 'v5', sku: 'E', color: 'Tan', material: null, price_adjustment: 0, image_url: null, is_active: false }] },
  ]
  // What the feed's query returns: shown products, with their shown colourways.
  const asQueried = products.filter(p => p.is_active).map(p => ({ ...p, product_variants: p.product_variants.filter(v => v.is_active) }))
  const query = { select() { return this }, eq() { return this }, then(resolve) { resolve({ data: asQueried, error: null }) } }
  const feed = load('src/utils/catalog/productFeed.ts', {
    '@supabase/supabase-js': { createClient: () => ({ from: () => query }) },
    '@/utils/offers/entryToken': { signOfferEntry: () => 'token' },
  }, { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://x', SUPABASE_SERVICE_ROLE_KEY: 'k' }, Response: class { constructor(body) { this.body = body; this.ok = true } async text() { return this.body } } })
  const xml = await (await feed.buildProductFeed('meta')).text()
  const fed = (xml.match(/<item>/g) ?? []).length

  const { feedLeftOut } = load('src/utils/adLinks.ts')
  const { items, leftOut } = feedLeftOut(products)
  assert.equal(items, fed)
  assert.equal(items, 2)
  assert.deepEqual(plain(leftOut).map(l => `${l.title}: ${l.reason}`).sort(), [
    'Bare: Every colourway is hidden', 'Nova - Black: No photo', 'Old: Hidden in the shop', 'Roma: 1 colourway hidden',
  ])
})

test('Settings and Ad links are reachable from More, and the tracking actions check for an admin', () => {
  const nav = load('src/utils/adminNav.ts')
  assert.ok(nav.ADMIN_SECTIONS.some(s => s.key === 'adlinks' && s.href === '/admin/ad-links'))
  assert.ok(nav.MORE_SECTION_KEYS.includes('adlinks'))
  assert.equal(nav.activePhoneTab('/admin/ad-links'), 'more')
  const actions = read('src/app/actions/tracking.ts')
  const exported = [...actions.matchAll(/export async function (\w+)\(/g)].map(m => m[1])
  assert.deepEqual(exported.sort(), ['setMetaHold', 'setStaffDevice', 'setTrackingMode'])
  for (const name of exported) {
    const body = actions.slice(actions.indexOf(`export async function ${name}(`)).split(/\nexport async function /)[0]
    assert.match(body, /adminGuard\(\)/, `${name} checks for an admin`)
  }
})
