import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const BASE = process.env.PHASE_D_LOCAL_URL || 'http://127.0.0.1:3100'
const ACQ_COOKIE = 'UKSS-WA-260909-A1B2C3'
const LONG_TITLE = 'Hannah Electric Corner — controlled Phase D QA long title for cart readability'

const qaCart = [{
  variant_id: '1ba97d1f-f890-48f8-8ab9-57cbb147f388',
  quantity: 1,
  price: 999,
  title: LONG_TITLE,
  color: 'Beige',
  image_url: '',
  fabric_id: null,
  fabric_label: 'Premium Beige',
  fabric_code: 'QA-01',
  fabric_swatch: null,
}]

function log(message) { console.log(`[phase-d-local-browser] ${message}`) }

async function setupPage(browser, width, { acquisition = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width <= 430 ? 844 : 900 } })
  if (acquisition) {
    await context.addCookies([{
      name: 'uksofashop_wa',
      value: ACQ_COOKIE,
      url: BASE,
      sameSite: 'Lax',
      secure: BASE.startsWith('https://'),
    }])
  }
  const page = await context.newPage()
  await page.addInitScript(cart => localStorage.setItem('uksofashop_cart', JSON.stringify(cart)), qaCart)
  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  const essential = page.getByRole('button', { name: 'Essential only' })
  if (await essential.isVisible().catch(() => false)) await essential.click()
  await page.getByRole('button', { name: /Continue to delivery/i }).waitFor({ state: 'visible', timeout: 15000 })
  return { context, page }
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

async function assertCartReadabilityAndUndo(page) {
  const body = await page.locator('body').innerText()
  assert.match(body, /Hannah Electric Corner/)
  assert.match(body, /Premium Beige/)
  assert.match(body, /QA-01/)
  assert.match(body, /£999/)
  const more = page.getByRole('button', { name: new RegExp(`One more ${LONG_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })
  await more.click()
  await page.getByText('2 in your cart').waitFor({ state: 'attached', timeout: 3000 }).catch(() => {})
  const afterQty = await page.locator('body').innerText()
  assert.match(afterQty, /£1998/)
  const remove = page.getByRole('button', { name: new RegExp(`Remove ${LONG_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} from your cart`) })
  await remove.click()
  await page.getByRole('button', { name: 'Undo' }).waitFor({ state: 'visible', timeout: 3000 })
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByRole('button', { name: /Continue to delivery/i }).waitFor({ state: 'visible', timeout: 3000 })
  const restored = await page.locator('body').innerText()
  assert.match(restored, /Hannah Electric Corner/)
  assert.match(restored, /Premium Beige/)
  assert.match(restored, /QA-01/)
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

async function applyOffer(page) {
  const reveal = page.getByRole('button', { name: /Have an offer code/i })
  if (await reveal.isVisible().catch(() => false)) await reveal.click()
  await page.getByLabel('Offer code').fill('SOFAEXTRA')
  await page.getByRole('button', { name: /^Apply$/ }).click()
  await page.waitForFunction(() => /£50|50\.00/.test(document.body.innerText), null, { timeout: 15000 })
}

async function setAssembly(page) {
  const label = page.locator('label').filter({ hasText: 'Assembly' }).first()
  const checkbox = label.locator('input[type="checkbox"]')
  if (await checkbox.count()) await checkbox.check()
}

async function setPostcode(page, postcode) {
  await page.locator('input[name="postcode"]').fill(postcode)
}

async function waitMainland(page, postcode) {
  await page.getByText(new RegExp(`FREE UK Mainland delivery to ${postcode.replace(' ', '\\s*')}`, 'i')).waitFor({ state: 'visible', timeout: 15000 })
  const button = page.getByRole('button', { name: /Place Order/i })
  await button.waitFor({ state: 'visible', timeout: 5000 })
  assert.equal(await button.isEnabled(), true, `${postcode} should enable Place Order`)
}

async function waitQuote(page, postcode) {
  await page.getByText(new RegExp(`Custom delivery quote needed for ${postcode.replace(' ', '\\s*')}`, 'i')).waitFor({ state: 'visible', timeout: 15000 })
  const cta = page.getByRole('link', { name: /Get a Delivery Quote on WhatsApp/i })
  await cta.waitFor({ state: 'visible', timeout: 5000 })
  assert.equal(await page.getByRole('button', { name: /Place Order/i }).count(), 0, `${postcode}: ordinary order action must be absent`)
  const body = await page.locator('body').innerText()
  assert.match(body, /Delivery · Custom quote/i)
  assert.match(body, /TO CONFIRM/i)
  assert.match(body, /Current online subtotal/i)
}

async function assertStatePreserved(page) {
  assert.equal(await page.locator('[name="customerName"]').inputValue(), 'Phase D QA')
  assert.equal(await page.locator('[name="customerEmail"]').inputValue(), 'phase-d-qa@example.com')
  assert.equal(await page.locator('[name="customerPhone"]').inputValue(), '07123456789')
  assert.equal(await page.locator('[name="shippingAddress"]').inputValue(), '1 Controlled QA Street, Blackburn')
  assert.equal(await page.locator('[name="specialInstructions"]').inputValue(), 'Keep this instruction through postcode switching')
  const body = await page.locator('body').innerText()
  assert.match(body, /Premium Beige/)
  assert.match(body, /QA-01/)
  assert.match(body, /£50|50\.00/)
  assert.match(body, /Assembly/)
}

async function forgedFlagsStayBlocked(page) {
  await page.evaluate(() => {
    const form = document.querySelector('form')
    if (!form) throw new Error('checkout form missing')
    for (const [name, value] of [['mainland','true'],['delivery_zone','MAINLAND_STANDARD'],['delivery_price','0']]) {
      const input = document.createElement('input')
      input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input)
    }
    form.requestSubmit()
  })
  await page.waitForTimeout(500)
  assert.equal(await page.getByRole('button', { name: /Place Order/i }).count(), 0)
  assert.equal(await page.getByRole('link', { name: /Get a Delivery Quote on WhatsApp/i }).isVisible(), true)
}

async function assertQuoteMessageAndAcquisition(context, page, expectExistingReference) {
  const requests = []
  page.on('request', req => { if (req.url().includes('/api/attribution/whatsapp-click')) requests.push(req.url()) })
  const cta = page.getByRole('link', { name: /Get a Delivery Quote on WhatsApp/i })
  const href = await cta.getAttribute('href')
  assert.ok(href?.startsWith('https://wa.me/'))
  const message = decodeURIComponent(new URL(href).searchParams.get('text') || '')
  assert.match(message, /Postcode:\s*BT1 5GS/i)
  assert.ok(message.includes(LONG_TITLE))
  assert.match(message, /Premium Beige/i)
  assert.match(message, /QA-01/i)
  assert.match(message, /x 2/i)
  assert.match(message, /£50.*offer/i)
  assert.match(message, /Assembly/i)
  assert.match(message, /delivery charge/i)
  assert.match(message, /whether delivery is available/i)
  assert.doesNotMatch(message, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
  assert.doesNotMatch(message, /UKSS-WA-/i)
  assert.doesNotMatch(message, /gclid|fbclid|visitor[_ -]?id|session[_ -]?id|arrival[_ -]?id|entitlement/i)

  await page.evaluate(() => document.addEventListener('click', event => {
    const a = event.target instanceof Element ? event.target.closest('a[href^="https://wa.me/"]') : null
    if (a) event.preventDefault()
  }, true))
  await cta.click()
  await page.waitForTimeout(250)
  const cookie = (await context.cookies()).find(c => c.name === 'uksofashop_wa')?.value
  if (expectExistingReference) assert.equal(cookie, ACQ_COOKIE)
  else assert.equal(cookie, undefined)
  assert.equal(requests.length, 0, 'support/fulfilment CTA must not emit acquisition WhatsApp event')
}

async function fullSwitch(browser, width) {
  log(`full 2D-A/custom quote/offer matrix ${width}px`)
  const { context, page } = await setupPage(browser, width, { acquisition: true })
  if (width === 390 || width === 1440) await assertCartReadabilityAndUndo(page)
  await enterDetails(page)
  await fillDetails(page)
  await applyOffer(page)
  await setAssembly(page)
  await setPostcode(page, 'BB6 7LS')
  await waitMainland(page, 'BB6 7LS')

  const postcode = page.locator('input[name="postcode"]')
  await postcode.fill('BT1 5GS')
  assert.equal(await page.getByRole('button', { name: /Place Order/i }).isEnabled().catch(() => false), false, 'stale mainland permission survived postcode edit')
  await waitQuote(page, 'BT1 5GS')
  await assertStatePreserved(page)
  await forgedFlagsStayBlocked(page)
  await assertQuoteMessageAndAcquisition(context, page, true)

  await setPostcode(page, 'BB6 7LS')
  await waitMainland(page, 'BB6 7LS')
  await assertStatePreserved(page)
  await assertNoHorizontalOverflow(page, width)
  await assertFabClearsBar(page, width)
  await context.close()
}

async function freshQuote(browser) {
  log('fresh organic quote CTA has no acquisition side effects')
  const { context, page } = await setupPage(browser, 390)
  await enterDetails(page); await fillDetails(page); await applyOffer(page); await setPostcode(page, 'BT1 5GS'); await waitQuote(page, 'BT1 5GS')
  await assertQuoteMessageAndAcquisition(context, page, false)
  await context.close()
}

async function responsiveQuote(browser, width) {
  log(`responsive custom quote ${width}px`)
  const { context, page } = await setupPage(browser, width)
  await enterDetails(page); await fillDetails(page); await setPostcode(page, 'BT1 5GS'); await waitQuote(page, 'BT1 5GS')
  await assertNoHorizontalOverflow(page, width)
  await assertFabClearsBar(page, width)
  if (width < 1024) await page.getByText(/Current online subtotal · delivery quote needed/i).waitFor({ state: 'visible', timeout: 5000 })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(100)
  assert.equal(await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8), true, `${width}px scroll trap`)
  await context.close()
}

async function checkoutGeography(browser) {
  log('checkout Server Action postcode classification matrix')
  const { context, page } = await setupPage(browser, 768)
  await enterDetails(page); await fillDetails(page)
  for (const postcode of ['BB6 7LS','CF10 1EP','EH1 1YZ','IV52 8TN','IV53 8AA','IV54 8YX','PA35 1HN','PA80 5UZ']) {
    await setPostcode(page, postcode); await waitMainland(page, postcode)
  }
  for (const postcode of ['BT1 5GS','IM1 1AA','JE2 3QA','GY1 1AA','HS1 2AA','ZE1 0AA','KA27 8AA','KW16 3AA','PH42 4RL','PO30 1AA','TR21 0AA']) {
    await setPostcode(page, postcode); await waitQuote(page, postcode)
  }
  await setPostcode(page, 'D02 X285')
  assert.equal(await page.getByRole('button', { name: /Place Order/i }).isEnabled().catch(() => false), false)
  await context.close()
}

async function estimator(browser) {
  log('PDP delivery estimator')
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(`${BASE}/shop/electric-sofa/hannah-electric-corner`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  const essential = page.getByRole('button', { name: 'Essential only' })
  if (await essential.isVisible().catch(() => false)) await essential.click()
  const input = page.locator('#estimator-postcode'); await input.scrollIntoViewIfNeeded()
  async function check(postcode, expected) {
    await input.fill(postcode); await page.getByRole('button', { name: /^Check$/ }).click(); await page.getByText(expected).waitFor({ state: 'visible', timeout: 15000 })
  }
  await check('BB6 7LS', /Free UK Mainland delivery to BB6 7LS/i)
  await check('BT1 5GS', /BT1 5GS needs a custom delivery quote/i)
  await check('ABC 123', /does not look like a UK postcode/i)
  await check('IV40 8PB', /IV40 8PB needs a custom delivery quote/i)
  await check('PA34 4UB', /PA34 4UB needs a custom delivery quote/i)
  await assertNoHorizontalOverflow(page, 1440)
  await context.close()
}

const browser = await chromium.launch({ headless: true })
try {
  for (const width of [390, 430, 1440]) await fullSwitch(browser, width)
  await freshQuote(browser)
  for (const width of [320, 768]) await responsiveQuote(browser, width)
  await checkoutGeography(browser)
  await estimator(browser)
  log('PASS')
} finally {
  await browser.close()
}
