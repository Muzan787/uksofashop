// The receipt, as the printed copy and the email both read it (src/utils/
// orderReceipt.ts): every extra on it, the amount paid once delivered, the
// guarantee's first and last day, and the email that carries them. Loads the
// real modules with a stand-in mail transport.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

function load(file, mocks, globals) {
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
  vm.runInNewContext(js, { module, exports: module.exports, require: req, process: { env: globals.env }, console: { error() {}, warn() {}, log() {} }, URL, URLSearchParams, Buffer, Date, Intl, ...globals })
  return module.exports
}

const { buildReceipt, rowAmountText, rowLabelText } = load('src/utils/orderReceipt.ts', {}, { env: {} })

function mailer() {
  const sent = []
  const email = load('src/utils/email.ts', {
    nodemailer: { default: { createTransport: () => ({ sendMail: async m => { sent.push(m); return { messageId: 'fixture' } } }) } },
    '@/utils/supabase/admin': { createAdminClient: () => ({ from: () => ({ insert: async () => ({ error: null }) }) }) },
  }, { env: { SMTP_PASSWORD: 'fixture', NEXT_PUBLIC_SITE_URL: 'https://www.uksofashop.co.uk' } })
  return { email, sent }
}

// Arrays built inside the vm context have another realm's prototype; compare by value.
const plain = v => JSON.parse(JSON.stringify(v))

const ORDER = {
  id: '0b5c3a1e-1111-4111-8111-111111111111',
  created_at: '2026-11-03T10:00:00Z',
  status: 'confirmed',
  delivered_at: null,
  customer_name: 'Ann <b>Smith</b>',
  customer_email: 'ann@example.test',
  customer_phone: '07700 900123',
  shipping_address: '1 High Street, Leeds, LS1 1AA',
  items_subtotal: 1300,
  discount_amount: 100,
  promotion_code: 'SOFAEXTRA',
  fee_distance: 0,
  fee_upstairs: 40,
  fee_assembly: 60,
  fee_sofa_removal: 30,
  sofa_removal_seats: 3,
  delivery_floor: 2,
  delivery_has_lift: false,
  wants_assembly: true,
  wants_sofa_removal: true,
  delivery_total: 130,
  total_amount: 1330,
  order_items: [
    {
      quantity: 1,
      price_at_time_of_purchase: 1300,
      fabric_code: 'CH02',
      fabric_name: 'Mink',
      fabric_collection: 'Chenille',
      customisation: { seats: '3 seater', back: 'Scatter back', feet: { code: 'F1', name: 'Block', finish: 'Oak' } },
      product_variants: { color: 'Grey', sku: 'VER-GR', products: { title: 'Verona' } },
    },
  ],
}

test('every extra the order carries is a row, and the rows add up to the total', () => {
  const r = buildReceipt(ORDER)
  assert.deepEqual(plain(r.rows.map(x => rowLabelText(x))), [
    'Offer · SOFAEXTRA', 'Delivery (ground floor)', 'Upstairs delivery (floor 2)', 'Assembly', 'Old sofa removal (3 seats)',
  ])
  assert.equal(rowAmountText(r.rows[0]), '−£100.00')
  assert.equal(rowAmountText(r.rows[1]), 'FREE')
  const sum = r.itemsSubtotal + r.rows.reduce((s, x) => s + (x.kind === 'discount' ? -x.amount : x.amount), 0)
  assert.equal(Math.round(sum * 100), Math.round(r.total * 100))
  // What was chosen on the line travels with it.
  assert.ok(r.lines[0].details.some(d => d.label === 'Seats' && d.value === '3 seater'))
  assert.ok(r.lines[0].details.some(d => d.label === 'Feet'))
  assert.deepEqual(plain(r.lines[0].summary), ['Fabric: Chenille Mink (CH02)', 'SKU VER-GR'])
})

test('an agreed WhatsApp delivery is a row, and an unexplained difference is shown rather than hidden', () => {
  const r = buildReceipt({
    ...ORDER, discount_amount: 0, fee_upstairs: 0, fee_assembly: 0, fee_sofa_removal: 0,
    wants_assembly: false, wants_sofa_removal: false, delivery_total: 80, total_amount: 1400,
  })
  assert.deepEqual(plain(r.rows.map(x => [rowLabelText(x), x.amount])), [['Delivery (as agreed)', 80], ['Adjustment', 20]])
})

test('before delivery it says what is due; delivered, it says the amount paid and the guarantee dates', () => {
  const open = buildReceipt(ORDER)
  assert.equal(open.payment.kind, 'due')
  assert.equal(open.payment.heading, 'Total due on delivery')
  assert.equal(open.guarantee.from, null)
  assert.match(open.guarantee.text, /starts on the day it is delivered/)

  const done = buildReceipt({ ...ORDER, status: 'delivered', delivered_at: '2026-11-12T14:30:00Z' })
  assert.equal(done.payment.kind, 'paid')
  assert.equal(done.payment.heading, 'Amount paid')
  assert.equal(done.payment.amount, 1330)
  assert.match(done.payment.note, /Paid in full on delivery, 12 November 2026/)
  assert.equal(done.guarantee.from, '12 November 2026')
  assert.equal(done.guarantee.to, '11 November 2027')
})

test('the guarantee dates follow UK time, not UTC', () => {
  // 23:30 UTC on 30 June is 00:30 on 1 July in London.
  const r = buildReceipt({ ...ORDER, status: 'delivered', delivered_at: '2026-06-30T23:30:00Z' })
  assert.equal(r.guarantee.from, '1 July 2026')
  assert.equal(r.guarantee.to, '30 June 2027')
})

test('a cancelled order owes and has paid nothing', () => {
  const r = buildReceipt({ ...ORDER, status: 'cancelled' })
  assert.equal(r.payment.kind, 'cancelled')
  assert.equal(r.payment.amount, null)
})

test('the receipt email carries the thank-you, every line, the amount paid and the guarantee dates, escaped', async () => {
  const { email, sent } = mailer()
  const receipt = buildReceipt({ ...ORDER, status: 'delivered', delivered_at: '2026-11-12T14:30:00Z' })
  await email.sendOrderReceipt('ann@example.test', receipt, { orderId: ORDER.id })
  assert.equal(sent.length, 1)
  const m = sent[0]
  assert.equal(m.to, 'ann@example.test')
  assert.match(m.subject, /Your receipt from UK Sofa Shop \(#0B5C3A1E\)/)
  const html = String(m.html)
  assert.match(html, /Thanks for ordering from us, Ann!/)
  assert.match(html, /valid from 12 November 2026 to 11 November 2027/)
  assert.match(html, /Amount paid: £1330\.00/)
  for (const needle of ['Verona', 'Chenille Mink (CH02)', 'Seats', 'Upstairs delivery (floor 2)', 'Assembly', 'Old sofa removal (3 seats)', 'Offer · SOFAEXTRA', '−£100.00']) {
    assert.ok(html.includes(needle), `email is missing ${needle}`)
  }
  // The customer's name is HTML-escaped, not interpreted.
  assert.doesNotMatch(html, /<b>Smith<\/b>/)
  // The plain-text part is generated from it.
  assert.match(String(m.text), /Amount paid: £1330\.00/)
})

test('before delivery the email says what is due and does not claim it is paid', async () => {
  const { email, sent } = mailer()
  await email.sendOrderReceipt('ann@example.test', buildReceipt(ORDER))
  const html = String(sent[0].html)
  assert.match(html, /Total due on delivery/)
  assert.match(html, /starts on the day it is delivered/)
  assert.doesNotMatch(html, /Amount paid/)
})
