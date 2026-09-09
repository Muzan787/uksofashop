import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.PHASE_D_LOCAL_URL || 'https://127.0.0.1:3100'
const ACQ_COOKIE = 'UKSS-WA-260909-A1B2C3'
const PAID_COOKIE = '11111111-1111-4111-8111-111111111111'
const LONG_TITLE = 'Hannah Electric Corner — controlled Phase D QA long title for cart readability'
const RESULTS = []
const SCREEN_DIR = '.qa/screenshots'

const CARTS = {
  electric: [{ variant_id: '1ba97d1f-f890-48f8-8ab9-57cbb147f388', quantity: 1, price: 999, title: LONG_TITLE, color: 'Beige', image_url: '', fabric_id: null, fabric_label: 'Premium Beige', fabric_code: 'QA-01', fabric_swatch: null }],
  roma: [{ variant_id: '4b6dc9c2-91ec-432f-9735-abb6899b1a95', quantity: 1, price: 350, title: 'Roma Recliner 2 Seater Manual Sofa', color: 'Grey', image_url: '', fabric_id: null, fabric_label: 'Grey', fabric_code: 'QA-ROMA', fabric_swatch: null }],
  standard: [{ variant_id: 'e3ed0121-2990-4f17-b4f3-103da614f228', quantity: 1, price: 749, title: 'Lily 3+2 Seater High Back', color: 'Cream', image_url: '', fabric_id: null, fabric_label: 'Cream', fabric_code: 'QA-STANDARD', fabric_swatch: null }],
  verona: [{ variant_id: '477b6305-82e2-4ace-8594-dda75cc47244', quantity: 1, price: 369, title: 'Verona 2 Seater High Back', color: 'Natural', image_url: '', fabric_id: null, fabric_label: 'Natural', fabric_code: 'QA-VERONA', fabric_swatch: null }],
  footstool: [{ variant_id: 'f262accc-1287-4375-984e-e677afd5aa01', quantity: 1, price: 149, title: 'Controlled QA Footstool', color: 'Natural', image_url: '', fabric_id: null, fabric_label: 'Natural', fabric_code: 'QA-FOOT', fabric_swatch: null }],
}

function log(message) { console.log(`[phase-d-final] ${message}`) }
function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) }
function classifyError(error) {
  const text = String(error?.stack || error || '')
  if (/strict mode violation|intercepts pointer events|locator\.|waiting for locator|Timeout.*locator/i.test(text)) return 'QA_HARNESS'
  if (/candidate|boot|fixture|server crash/i.test(text)) return 'ENVIRONMENT'
  return 'BEHAVIOR_ASSERTION'
}

await fs.mkdir(SCREEN_DIR, { recursive: true })

async function installBrowserHomedata(context) {
  await context.route('https://api.homedata.co.uk/**', async route => {
    const url = new URL(route.request().url())
    const postcode = (url.searchParams.get('q') || '').trim().toUpperCase()
    const fixture = {
      'IV40 8AE': '1 Main Street, Kyle of Lochalsh, IV40 8AE',
      'IV40 8PB': '1 Inverarish, Isle of Raasay, IV40 8PB',
      'PA34 5AB': '1 George Street, Oban, PA34 5AB',
      'PA34 4UB': '1 Cullipool, Isle of Luing, PA34 4UB',
    }[postcode]
    if (postcode === 'IV40 8ZZ' || postcode === 'PA34 5ZZ') {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'controlled lookup unavailable' }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ suggestions: [{ address: fixture || `1 Controlled QA Address, ${postcode}` }] }) })
  })
}

function attachRuntime(page) {
  const runtime = { pageErrors: [], dangerousConsole: [], failedSameOrigin: [], serverActions: 0, consoleErrors: [] }
  page.on('pageerror', error => runtime.pageErrors.push(String(error)))
  page.on('console', msg => {
    if (msg.type() === 'error') {
      runtime.consoleErrors.push(msg.text())
      if (/hydration|uncaught|maximum update depth|too many re-renders/i.test(msg.text())) runtime.dangerousConsole.push(msg.text())
    }
  })
  page.on('requestfailed', req => {
    if (req.url().startsWith(BASE)) runtime.failedSameOrigin.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText || ''}`)
  })
  page.on('request', req => {
    if (req.method() === 'POST' && req.headers()['next-action']) runtime.serverActions += 1
  })
  return runtime
}

async function setupPage(browser, width, { acquisition = false, paid = false, cart = CARTS.electric, route = '/checkout' } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width <= 430 ? 844 : 900 }, ignoreHTTPSErrors: true })
  await installBrowserHomedata(context)
  const cookies = []
  if (acquisition) cookies.push({ name: 'uksofashop_wa', value: ACQ_COOKIE, url: BASE, sameSite: 'Lax', secure: true })
  if (paid) cookies.push({ name: 'uksofashop_offer', value: PAID_COOKIE, url: BASE, sameSite: 'Lax', secure: true, httpOnly: true })
  if (cookies.length) await context.addCookies(cookies)
  const page = await context.newPage()
  const runtime = attachRuntime(page)
  await page.addInitScript(({ cart }) => {
    localStorage.setItem('cookie_consent', 'denied')
    localStorage.setItem('uksofashop_cart', JSON.stringify(cart))
  }, { cart })
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  assert.equal(await page.getByRole('dialog', { name: /Cookies on this site/i }).count(), 0, 'consent sheet should be suppressed by deterministic QA state')
  return { context, page, runtime }
}

function assertRuntimeClean(runtime, label) {
  assert.deepEqual(runtime.pageErrors, [], `${label}: uncaught page errors: ${runtime.pageErrors.join(' | ')}`)
  assert.deepEqual(runtime.dangerousConsole, [], `${label}: hydration/runtime console errors: ${runtime.dangerousConsole.join(' | ')}`)
  assert.deepEqual(runtime.failedSameOrigin, [], `${label}: same-origin request failures: ${runtime.failedSameOrigin.join(' | ')}`)
  assert.ok(runtime.serverActions < 100, `${label}: suspected Server Action request loop (${runtime.serverActions})`)
}

async function runCase(name, fn) {
  log(name)
  let state = null
  try {
    state = await fn()
    if (state?.runtime) assertRuntimeClean(state.runtime, name)
    RESULTS.push({ case: name, status: 'PASS', classification: '', assertion: '', screenshot: '', applicationDefect: 'NO' })
  } catch (error) {
    let screenshot = ''
    let dom = ''
    const page = state?.page || globalThis.__phaseDActivePage
    if (page && !page.isClosed()) {
      screenshot = path.join(SCREEN_DIR, `${slug(name)}.png`)
      await page.screenshot({ path: screenshot, fullPage: true }).catch(() => { screenshot = '' })
      dom = (await page.locator('body').innerText().catch(() => ''))?.slice(0, 6000) || ''
    }
    const classification = classifyError(error)
    console.error(`\n[phase-d-final][FAIL] ${name}\n${String(error?.stack || error)}\nDOM:\n${dom}\n`)
    RESULTS.push({ case: name, status: 'FAIL', classification, assertion: String(error?.message || error), screenshot, applicationDefect: classification === 'QA_HARNESS' ? 'NO' : 'REVIEW' })
  } finally {
    globalThis.__phaseDActivePage = null
    if (state?.context) await state.context.close().catch(() => {})
  }
}

async function withCheckout(browser, name, width, opts, body) {
  await runCase(name, async () => {
    const state = await setupPage(browser, width, opts)
    globalThis.__phaseDActivePage = state.page
    await state.page.getByRole('button', { name: /Continue to delivery/i }).waitFor({ state: 'visible', timeout: 15000 })
    await body(state)
    return state
  })
}

async function enterDetails(page) {
  await page.getByRole('button', { name: /Continue to delivery/i }).click()
  await page.locator('[name="customerName"]').waitFor({ state: 'visible', timeout: 10000 })
}
async function fillDetails(page) {
  await page.locator('[name="customerName"]').fill('Phase D QA')
  await page.locator('[name="customerEmail"]').fill('phase-d-qa@example.com')
  await page.locator('[name="customerPhone"]').fill('07123456789')
  await page.locator('[name="shippingAddress"]').fill('1 Controlled QA Street, Blackburn')
  await page.locator('[name="specialInstructions"]').fill('Keep this instruction through postcode switching')
}
async function setPostcode(page, postcode) { await page.locator('input[name="postcode"]').fill(postcode) }
async function waitMainland(page, postcode) {
  await page.getByText(new RegExp(`FREE UK Mainland delivery to ${postcode.replace(' ', '\\s*')}`, 'i')).waitFor({ state: 'visible', timeout: 15000 })
  const button = page.getByRole('button', { name: /Place Order/i })
  await button.waitFor({ state: 'visible', timeout: 5000 })
  assert.equal(await button.isEnabled(), true, `${postcode}: Place Order should be enabled`)
}
async function openQuoteSummary(page) {
  const toggle = page.locator('button[aria-controls="mobile-summary"]')
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click()
    const drawer = page.locator('#mobile-summary')
    await drawer.getByText(/Delivery · Custom quote/i).waitFor({ state: 'visible', timeout: 5000 })
    await drawer.getByText(/TO CONFIRM/i).waitFor({ state: 'visible', timeout: 5000 })
    // The fixed summary bar deliberately sits above the backdrop. Close from
    // the bar's own toggle so the harness follows the reachable UI control.
    return async () => { await toggle.click() }
  }
  const body = await page.locator('body').innerText()
  assert.match(body, /Delivery · Custom quote/i)
  assert.match(body, /TO CONFIRM/i)
  return async () => {}
}
async function waitQuote(page, postcode) {
  await page.getByText(new RegExp(`Custom delivery quote needed for ${postcode.replace(' ', '\\s*')}`, 'i')).waitFor({ state: 'visible', timeout: 15000 })
  const cta = page.getByRole('link', { name: /Get a Delivery Quote on WhatsApp/i })
  await cta.waitFor({ state: 'visible', timeout: 5000 })
  assert.equal(await page.getByRole('button', { name: /Place Order/i }).count(), 0, `${postcode}: ordinary order action must be absent`)
  const body = await page.locator('body').innerText()
  assert.match(body, /We may still be able to deliver to you/i)
  assert.match(body, /Current online subtotal/i)
  assert.doesNotMatch(body, new RegExp(`FREE UK Mainland delivery to ${postcode.replace(' ', '\\s*')}`, 'i'))
  const close = await openQuoteSummary(page)
  await close()
}
async function applyOffer(page, amount) {
  const reveal = page.getByRole('button', { name: /Have an offer code/i })
  if (await reveal.isVisible().catch(() => false)) await reveal.click()
  await page.getByLabel('Offer code').fill('SOFAEXTRA')
  await page.getByRole('button', { name: /^Apply$/ }).click()
  const confirmation = amount > 0
    ? new RegExp(`SOFAEXTRA applied · £${amount} off`, 'i')
    : /SOFAEXTRA is recognised\. No extra cash discount applies to this basket\./i
  await page.getByText(confirmation).waitFor({ state: 'visible', timeout: 15000 })
}
async function setAssembly(page) {
  const label = page.locator('label').filter({ hasText: 'Assembly' }).first()
  const checkbox = label.locator('input[type="checkbox"]')
  assert.equal(await checkbox.count(), 1, 'Assembly checkbox missing')
  await checkbox.check()
}
async function assertStatePreserved(page, quantity = 2) {
  assert.equal(await page.locator('[name="customerName"]').inputValue(), 'Phase D QA')
  assert.equal(await page.locator('[name="customerEmail"]').inputValue(), 'phase-d-qa@example.com')
  assert.equal(await page.locator('[name="customerPhone"]').inputValue(), '07123456789')
  assert.equal(await page.locator('[name="shippingAddress"]').inputValue(), '1 Controlled QA Street, Blackburn')
  assert.equal(await page.locator('[name="specialInstructions"]').inputValue(), 'Keep this instruction through postcode switching')
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('uksofashop_cart') || '[]'))
  assert.equal(cart.length, 1, 'cart line count changed while switching delivery state')
  assert.equal(cart[0].title, LONG_TITLE)
  assert.equal(cart[0].fabric_label, 'Premium Beige')
  assert.equal(cart[0].fabric_code, 'QA-01')
  assert.equal(cart[0].quantity, quantity)
  await page.getByText(/SOFAEXTRA applied · £50 off/i).waitFor({ state: 'visible', timeout: 3000 })
  const assembly = page.locator('label').filter({ hasText: 'Assembly' }).first().locator('input[type="checkbox"]')
  assert.equal(await assembly.isChecked(), true, 'Assembly extra was lost while switching delivery state')
}
async function quantityTwo(page) {
  const row = page.locator('article').filter({ hasText: LONG_TITLE }).first()
  await row.getByRole('button', { name: new RegExp(`One more ${LONG_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click()
  await page.waitForFunction(() => (JSON.parse(localStorage.getItem('uksofashop_cart') || '[]')[0]?.quantity) === 2, null, { timeout: 5000 })
}
async function assertCartReadabilityUndo(page) {
  const row = page.locator('article').filter({ hasText: LONG_TITLE }).first()
  await row.waitFor({ state: 'visible', timeout: 5000 })
  assert.match(await row.innerText(), /Premium Beige/)
  assert.match(await row.innerText(), /QA-01/)
  assert.match(await row.innerText(), /£999/)
  await quantityTwo(page)
  assert.match(await row.innerText(), /£1998/)
  await row.getByRole('button', { name: new RegExp(`Remove ${LONG_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} from your cart`) }).click()
  await page.getByRole('button', { name: 'Undo' }).waitFor({ state: 'visible', timeout: 3000 })
  await page.getByRole('button', { name: 'Undo' }).click()
  const restored = page.locator('article').filter({ hasText: LONG_TITLE }).first()
  await restored.waitFor({ state: 'visible', timeout: 3000 })
  assert.match(await restored.innerText(), /Premium Beige/)
  assert.match(await restored.innerText(), /QA-01/)
  assert.match(await restored.innerText(), /£1998/)
}
async function assertNoHorizontalOverflow(page, width) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  assert.ok(sw <= cw + 1, `${width}px horizontal overflow: ${sw} > ${cw}`)
}
async function assertFabClearsBar(page, width) {
  if (width >= 1024) return
  const boxes = await page.evaluate(() => {
    const bar = document.querySelector('[data-bottom-bar]')?.getBoundingClientRect()
    const fab = document.querySelector('a[aria-label="Chat with us on WhatsApp"]')?.getBoundingClientRect()
    return bar && fab ? { barTop: bar.top, fabBottom: fab.bottom } : null
  })
  assert.ok(boxes, `${width}px must render MobileTotalBar and WhatsApp FAB`)
  assert.ok(boxes.fabBottom <= boxes.barTop + 1, `${width}px WhatsApp FAB overlaps MobileTotalBar`)
}

async function geographyCase(browser, postcode, expected) {
  await withCheckout(browser, `geography ${postcode} => ${expected}`, 768, {}, async ({ page }) => {
    await enterDetails(page); await fillDetails(page); await setPostcode(page, postcode)
    if (expected === 'STANDARD') await waitMainland(page, postcode)
    else if (expected === 'QUOTE') await waitQuote(page, postcode)
    else {
      await page.getByRole('button', { name: /Find/i }).first().click()
      await page.getByText(/Please enter a valid UK postcode/i).waitFor({ state: 'visible', timeout: 5000 })
      assert.equal(await page.getByRole('link', { name: /Get a Delivery Quote on WhatsApp/i }).count(), 0)
    }
  })
}

async function switchingCase(browser, width) {
  await withCheckout(browser, `2D-A switching ${width}px`, width, { acquisition: true }, async ({ context, page }) => {
    if (width === 390 || width === 1440) await assertCartReadabilityUndo(page)
    else await quantityTwo(page)
    await enterDetails(page); await fillDetails(page); await applyOffer(page, 50); await setAssembly(page)
    await setPostcode(page, 'BB6 7LS'); await waitMainland(page, 'BB6 7LS')
    await page.locator('input[name="postcode"]').fill('BT1 5GS')
    assert.equal(await page.getByRole('button', { name: /Place Order/i }).isEnabled().catch(() => false), false, 'stale mainland permission survived postcode mutation')
    await waitQuote(page, 'BT1 5GS'); await assertStatePreserved(page, 2)
    await page.evaluate(() => {
      const form = document.querySelector('form'); if (!form) throw new Error('checkout form missing')
      for (const [name, value] of [['mainland','true'],['delivery_zone','MAINLAND_STANDARD'],['delivery_price','0']]) {
        const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input)
      }
      form.requestSubmit()
    })
    await page.waitForTimeout(400)
    assert.equal(await page.getByRole('button', { name: /Place Order/i }).count(), 0, 'forged mainland fields regained order authority')
    const before = (await context.cookies()).find(c => c.name === 'uksofashop_wa')?.value
    assert.equal(before, ACQ_COOKIE)
    const requests = []
    page.on('request', req => { if (req.url().includes('/api/attribution/whatsapp-click')) requests.push(req.url()) })
    const cta = page.getByRole('link', { name: /Get a Delivery Quote on WhatsApp/i })
    const href = await cta.getAttribute('href'); assert.ok(href?.startsWith('https://wa.me/'))
    const message = decodeURIComponent(new URL(href).searchParams.get('text') || '')
    assert.match(message, /Postcode:\s*BT1 5GS/i); assert.ok(message.includes(LONG_TITLE)); assert.match(message, /Premium Beige/i); assert.match(message, /QA-01/i); assert.match(message, /x 2/i); assert.match(message, /£50.*offer/i); assert.match(message, /Assembly/i); assert.match(message, /delivery charge/i); assert.match(message, /whether delivery is available/i)
    assert.doesNotMatch(message, /UKSS-WA-|gclid|fbclid|visitor[_ -]?id|session[_ -]?id|arrival[_ -]?id|entitlement/i)
    assert.doesNotMatch(message, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
    await page.evaluate(() => document.addEventListener('click', e => { const a = e.target instanceof Element ? e.target.closest('a[href^="https://wa.me/"]') : null; if (a) e.preventDefault() }, true))
    await cta.click(); await page.waitForTimeout(200)
    const after = (await context.cookies()).find(c => c.name === 'uksofashop_wa')?.value
    assert.equal(after, ACQ_COOKIE, 'delivery quote CTA overwrote acquisition reference')
    assert.equal(requests.length, 0, 'delivery quote CTA emitted acquisition whatsapp_click')
    await setPostcode(page, 'BB6 7LS'); await waitMainland(page, 'BB6 7LS'); await assertStatePreserved(page, 2)
    await assertNoHorizontalOverflow(page, width); await assertFabClearsBar(page, width)
  })
}

async function freshOrganicQuote(browser) {
  await withCheckout(browser, 'fresh organic quote attribution', 430, {}, async ({ context, page }) => {
    await enterDetails(page); await fillDetails(page); await applyOffer(page, 50); await setAssembly(page); await setPostcode(page, 'BT1 5GS'); await waitQuote(page, 'BT1 5GS')
    const cta = page.getByRole('link', { name: /Get a Delivery Quote on WhatsApp/i })
    const requests = []; page.on('request', req => { if (req.url().includes('/api/attribution/whatsapp-click')) requests.push(req.url()) })
    await page.evaluate(() => document.addEventListener('click', e => { const a = e.target instanceof Element ? e.target.closest('a[href^="https://wa.me/"]') : null; if (a) e.preventDefault() }, true))
    await cta.click(); await page.waitForTimeout(200)
    assert.equal((await context.cookies()).some(c => c.name === 'uksofashop_wa'), false, 'fresh fulfilment quote minted acquisition reference')
    assert.equal(requests.length, 0)
  })
}

async function responsiveCase(browser, width, postcode, expected) {
  await withCheckout(browser, `responsive ${width}px ${expected}`, width, {}, async ({ page }) => {
    await enterDetails(page); await fillDetails(page); await setPostcode(page, postcode)
    if (expected === 'STANDARD') await waitMainland(page, postcode); else await waitQuote(page, postcode)
    if (width < 1024) {
      await page.locator('button[aria-controls="mobile-summary"]').waitFor({ state: 'visible', timeout: 3000 })
      await assertFabClearsBar(page, width)
    }
    await assertNoHorizontalOverflow(page, width)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(100)
    assert.equal(await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8), true, `${width}px scroll trap`)
  })
}

async function manualOfferCase(browser, name, cart, amount) {
  await withCheckout(browser, `Phase B manual ${name} £${amount}`, 768, { cart }, async ({ page }) => {
    await enterDetails(page); await fillDetails(page); await applyOffer(page, amount); await setPostcode(page, 'BB6 7LS'); await waitMainland(page, 'BB6 7LS')
    const toggle = page.locator('button[aria-controls="mobile-summary"]')
    await toggle.click()
    const summary = page.locator('#mobile-summary')
    const label = summary.getByText('Offer · SOFAEXTRA', { exact: true }).first(); await label.waitFor({ state: 'visible', timeout: 5000 })
    const text = await label.locator('..').innerText(); assert.match(text, amount > 0 ? new RegExp(`[−-]£${amount}\\.00`) : /£0\.00/)
  })
}

async function paidOfferCase(browser, name, cart, amount) {
  await withCheckout(browser, `Phase C paid ${name} £${amount}`, 1440, { paid: true, cart }, async ({ page }) => {
    await enterDetails(page); await fillDetails(page)
    const label = page.getByText('Online offer', { exact: true }).first(); await label.waitFor({ state: 'visible', timeout: 15000 })
    const expected = amount > 0 ? new RegExp(`[−-]£${amount}\\.00`) : /£0\.00/
    assert.match(await label.locator('..').innerText(), expected)
    await setPostcode(page, 'BB6 7LS'); await waitMainland(page, 'BB6 7LS'); assert.match(await label.locator('..').innerText(), expected)
    await setPostcode(page, 'BT1 5GS'); await waitQuote(page, 'BT1 5GS'); assert.match(await label.locator('..').innerText(), expected)
    assert.equal(await page.getByRole('button', { name: /Place Order/i }).count(), 0)
  })
}

async function serverProbeCase(browser, postcode, expectedRpc, expectedMessage, forged = true) {
  await withCheckout(browser, `server guard ${postcode}`, 768, {}, async ({ page }) => {
    const result = await page.evaluate(async ({ postcode, forged }) => {
      const res = await fetch('/api/qa/phase-d-server', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postcode, forged }) })
      if (!res.ok) throw new Error(`QA server probe HTTP ${res.status}`)
      return res.json()
    }, { postcode, forged })
    assert.equal(result.rpcDelta, expectedRpc, `${postcode}: unexpected place_order authority delta`)
    assert.match(String(result.result?.error || ''), expectedMessage)
  })
}

async function estimatorCase(browser, postcode, expected) {
  await runCase(`estimator ${postcode}`, async () => {
    const state = await setupPage(browser, 1440, { route: '/qa/phase-d-estimator' })
    globalThis.__phaseDActivePage = state.page
    const input = state.page.locator('#estimator-postcode'); await input.waitFor({ state: 'visible', timeout: 10000 }); await input.fill(postcode)
    await state.page.getByRole('button', { name: /^Check$/ }).click(); await state.page.getByText(expected).waitFor({ state: 'visible', timeout: 15000 })
    return state
  })
}

const browser = await chromium.launch({ headless: true })
try {
  await runCase('boot direct HTTPS exact candidate', async () => {
    const state = await setupPage(browser, 768)
    globalThis.__phaseDActivePage = state.page
    await state.page.getByRole('button', { name: /Continue to delivery/i }).waitFor({ state: 'visible', timeout: 15000 })
    return state
  })

  for (const p of ['BB6 7LS','CF10 1EP','EH1 1YZ','IV52 8TN','IV53 8AA','IV54 8YX','PA35 1HN','PA80 5UZ','IV40 8AE','PA34 5AB']) await geographyCase(browser, p, 'STANDARD')
  for (const p of ['BT1 5GS','IM1 1AA','JE2 3QA','GY1 1AA','HS1 2AA','ZE1 0AA','KA27 8AA','KW16 3AA','PH42 4RL','PO30 1AA','TR21 0AA','IV40 8PB','PA34 4UB','IV40 8ZZ','PA34 5ZZ']) await geographyCase(browser, p, 'QUOTE')
  for (const p of ['D02 X285','ABC 123']) await geographyCase(browser, p, 'INVALID')

  for (const width of [390,430,1440]) await switchingCase(browser, width)
  await freshOrganicQuote(browser)
  for (const width of [320,390,430,768,1440]) {
    await responsiveCase(browser, width, 'BB6 7LS', 'STANDARD')
    await responsiveCase(browser, width, 'BT1 5GS', 'QUOTE')
  }

  for (const [name, cart, amount] of [['Electric',CARTS.electric,50],['Roma',CARTS.roma,30],['Standard',CARTS.standard,20],['Verona',CARTS.verona,0],['Footstool',CARTS.footstool,0]]) await manualOfferCase(browser, name, cart, amount)
  for (const [name, cart, amount] of [['Electric',CARTS.electric,50],['Roma',CARTS.roma,30],['Standard',CARTS.standard,20],['Verona',CARTS.verona,0]]) await paidOfferCase(browser, name, cart, amount)

  await serverProbeCase(browser, 'BB6 7LS', 1, /Prices or your offer have changed/i, false)
  for (const p of ['BT1 5GS','IM1 1AA','JE2 3QA','GY1 1AA','HS1 2AA']) await serverProbeCase(browser, p, 0, /custom delivery quote/i, true)
  await serverProbeCase(browser, 'D02 X285', 0, /valid UK postcode/i, true)

  for (const [p, expected] of [
    ['BB6 7LS', /Free UK Mainland delivery to BB6 7LS/i], ['BT1 5GS', /BT1 5GS needs a custom delivery quote/i], ['ABC 123', /does not look like a UK postcode/i],
    ['IV40 8AE', /Free UK Mainland delivery to IV40 8AE/i], ['IV40 8PB', /IV40 8PB needs a custom delivery quote/i], ['IV40 8ZZ', /IV40 8ZZ needs a custom delivery quote/i],
    ['PA34 5AB', /Free UK Mainland delivery to PA34 5AB/i], ['PA34 4UB', /PA34 4UB needs a custom delivery quote/i], ['PA34 5ZZ', /PA34 5ZZ needs a custom delivery quote/i],
  ]) await estimatorCase(browser, p, expected)
} finally {
  await browser.close()
}

console.log('\nPHASE D CONSOLIDATED BROWSER MATRIX')
console.table(RESULTS)
await fs.writeFile('.qa/phase-d-results.json', JSON.stringify(RESULTS, null, 2))
const failed = RESULTS.filter(r => r.status === 'FAIL')
console.log(`PHASE_D_CASES=${RESULTS.length} PASS=${RESULTS.length - failed.length} FAIL=${failed.length}`)
if (failed.length) process.exitCode = 1
