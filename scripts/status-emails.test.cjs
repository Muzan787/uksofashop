// The customer status emails, as Muaz agreed them on 16 Oct 2026 (admin
// upgrade E14): a proper confirmed email, the reason in the cancelled one, the
// amount to pay in the on-its-way one, and nothing at all when the status
// pressed is the one the order already has. Loads src/utils/email.ts with a
// stand-in mail transport and reads what would have been sent.
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

function mailer() {
  const sent = []
  const email = load('src/utils/email.ts', {
    nodemailer: { default: { createTransport: () => ({ sendMail: async m => { sent.push(m); return { messageId: 'fixture' } } }) } },
    '@/utils/supabase/admin': { createAdminClient: () => ({ from: () => ({ insert: async () => ({ error: null }) }) }) },
  }, { env: { SMTP_PASSWORD: 'fixture', NEXT_PUBLIC_SITE_URL: 'https://www.uksofashop.co.uk' } })
  return { email, sent }
}

const ORDER = '0b5c3a1e-1111-4111-8111-111111111111'
const text = m => String(m.html)

test('staff confirming an order sends "Order confirmed: we\'ll ring you to agree a delivery day"', async () => {
  const { email, sent } = mailer()
  await email.sendOrderStatusUpdate('ann@example.test', 'Ann', ORDER, 'confirmed', 'BB2 1AA')
  assert.equal(sent.length, 1)
  assert.match(sent[0].subject, /Order Confirmed \(#0B5C3A1E\)/)
  assert.match(text(sent[0]), /your order is confirmed\. We'll ring you to agree a delivery day\./)
  assert.doesNotMatch(text(sent[0]), /There has been an update to your order/)
})

test('the cancelled email gives the reason, escaped; without one it reads as before', async () => {
  const { email, sent } = mailer()
  await email.sendOrderStatusUpdate('ann@example.test', 'Ann', ORDER, 'cancelled', '', { cancellationReason: 'Out of stock <b>until</b> March. ' })
  assert.match(text(sent[0]), /Your order has been cancelled: Out of stock &lt;b&gt;until&lt;\/b&gt; March\. If this isn't what you expected/)
  await email.sendOrderStatusUpdate('ann@example.test', 'Ann', ORDER, 'cancelled', '', {})
  assert.match(text(sent[1]), /Your order has been cancelled\. If you have any questions, please contact our support team\./)
})

test('the on-hold email says nothing is cancelled and how to rebook', async () => {
  const { email, sent } = mailer()
  await email.sendOrderStatusUpdate('ann@example.test', 'Ann', ORDER, 'on_hold', 'BB2 1AA', {})
  assert.match(text(sent[0]), /Order On Hold/)
  assert.match(text(sent[0]), /Nothing is cancelled - when you're ready, just message us on WhatsApp or give us a ring and we'll book a new delivery day\./)
})

test('pressing the status an order already has sends nothing', () => {
  const action = read('src/app/actions/orders.ts')
  assert.match(action, /if \(change\.changed\) after\(async \(\) => \{/)
  // Both sends live inside that one guarded block: the customer's email and the shop's WhatsApp prompt.
  const block = action.slice(action.indexOf('if (change.changed) after(async () => {'))
  const end = block.indexOf('\n  })\n') >= 0 ? block.indexOf('\n  })\n') : block.indexOf('\r\n  })\r\n')
  const guarded = block.slice(0, end)
  assert.ok(guarded.includes('sendOrderStatusUpdate('))
  assert.ok(guarded.includes('sendAdminOrderStatusNotification('))
  assert.match(guarded, /select\('cancellation_reason, total_amount'\)/)
})
