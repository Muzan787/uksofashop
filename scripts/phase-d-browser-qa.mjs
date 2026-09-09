import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const BASE = process.env.PHASE_D_PREVIEW_URL || 'https://uksofashop-git-feature-offer-phase-d-5778df-muzan787s-projects.vercel.app'
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

function log(message) { console.log(`[phase-d-browser] ${message}`) }

async function waitVisible(locator, label) {
  await locator.waitFor({ state: 'visible', timeout: 15000 })
  assert.equal(await locator.isVisible(), true, `${label} should be visible`)
}

async function setupPage(browser, width, { acquisition = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width <= 430 ? 844 : 900 } })
  if (acquisition) {
    await context.addCookies([{
      name: 'uksofashop_wa', value: ACQ_COOKIE, url: BASE,
      path: '/', sameSite: 'Lax', secure: true,
    }])
  }
  const page = await context.newPage()
  await page.addInitScript(cart => {
    localStorage.setItem('uksofashop_cart', JSON.stringify(cart))
  }, qaCart)
  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  const essential = page.getByRole('button', { name: 'Essential only' })
  if (await essential.isVisible().catch(() => false)) await essential.click()
  await waitVisible(page.getByRole('button', { name: /Continue to delivery/i }), 'cart continue button')
  return { context, page }
}

async function enterDetails(page) {
  await page.getByRole('button', { name: /Continue to delivery/i }).click()
  await waitVisible(page.locator('[name="customerName"]'), 'customer name')
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
  const input = page.getByLabel('Offer code')
  await input.fill('SOFAEXTRA')
  await page.getByRole('button', { name: /^Apply$/ }).click()
  await page.waitForFunction(() => document.body.innerText.includes('£50') || document.body.innerText.includes('50.00'), null, { timeout: 15000 })
  const text = await page.locator('body').innerText()
  assert.match(text, /£50|50\.00/, 'Electric basket should retain £50 offer context')
}

async function setAssembly(page) {
  const label = page.locator('label').filter({ hasText: 'Assembly' }).first()
  const checkbox = label.locator('input[type="checkbox"]')
  if (await checkbox.count()) await checkbox.check()
}

async function setPostcode(page, postcode) {
  const input = page.locator('input[name="postcode"]')
  await input.fill(postcode)
  return input
}

async function waitMainland(page, postcode) {
  await page.getByText(new RegExp(`FREE UK Mainland delivery to ${postcode.replace(' ', '\\s*')}`, 'i')).waitFor({ state: 'visible', timeout: 15000 })
  const place = page.getByRole('button', { name: /Place Order/i })
  await waitVisible(place, 'Place Order')
  assert.equal(await place.isEnabled(), true, `${postcode} should enable public online checkout`)
}

async function waitQuote(page, postcode) {
  await page.getByText(new RegExp(`Custom delivery quote needed for ${postcode.replace(' ', '\\s*')}`, 'i')).waitFor({ state: 'visible', timeout: 15000 })
  await waitVisible(page.getByRole('link', { name: /Get a Delivery Quote on WhatsApp/i }), 'delivery quote WhatsApp CTA')
  assert.equal(await page.getByRole('button', { name: /Place Order/i }).count(), 0, 'custom quote state must remove ordinary Place Order action')
  const body = await page.locator('body').innerText()
  assert.match(body, /Delivery · Custom quote/i)
  assert.match(body, /TO CONFIRM/i)
  assert.match(body, /Current online subtotal/i)
}

async function assertFieldsPreserved(page) {
  assert.equal(await page.locator('[name="customerName"]').inputValue(), 'Phase D QA')
  assert.equal(await page.locator('[name="customerEmail"]').inputValue(), 'phase-d-qa@example.com')
  assert.equal(await page.locator('[name="customerPhone"]').inputValue(), '07123456789')
  assert.equal(await page.locator('[name="shippingAddress"]').inputValue(), '1 Controlled QA Street, Blackburn')
  assert.equal(await page.locator('[name="specialInstructions"]').inputValue(), 'Keep this instruction through postcode switching')
  const body = await page.locator('body').innerText()
  assert.match(body, /Premium Beige/)
  assert.match(body, /QA-01/)
  assert.match(body, /£50|50\.00/)
}

async function assertNoHorizontalOverflow(page, width) {
  const metrics = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  assert.ok(metrics.sw <= metrics.cw + 1, `${width}px has horizontal overflow: ${metrics.sw} > ${metrics.cw}`)
}

async function assertFabClearsBar(page, width) {
  if (width >= 1024) return
  const boxes = await page.evaluate(() => {
    const bar = document.querySelector('[data-bottom-bar]')?.getBoundingClientRect()
    const fab = document.querySelector('a[aria-label="Chat with us on WhatsApp"]')?.getBoundingClientRect()
    return bar && fab ? { barTop: bar.top, fabBottom: fab.bottom, fabTop: fab.top } : null
  })
  assert.ok(boxes, `${width}px should render mobile total bar and WhatsApp FAB`)
  assert.ok(boxes.fabBottom <= boxes.barTop + 1, `${width}px WhatsApp FAB overlaps MobileTotalBar`)
}

async function fullSwitchMatrix(browser, width) {
  log(`full switching matrix ${width}px`)
  const { context, page } = await setupPage(browser, width, { acquisition: true })
  const acquisitionRequests = []
  page.on('request', req => { if (req.url().includes('/api/attribution/whatsapp-click')) acquisitionRequests.push(req.url()) })
  await enterDetails(page)
  await fillDetails(page)
  await applyOffer(page)
  await setAssembly(page)

  await setPostcode(page, 'BB6 7LS')
  await waitMainland(page, 'BB6 7LS')

  const postcodeInput = page.locator('input[name="postcode"]')
  await postcodeInput.fill('BT1 5GS')
  // The old mainland decision must disappear synchronously on mutation, before
  // the new async server classification has a chance to finish.
  assert.equal(await page.getByRole('button', { name: /Place Order/i }).isEnabled().catch(() => false), false, `${width}px stale mainland permission survived postcode mutation`)
  await waitQuote(page, 'BT1 5GS')
  await assertFieldsPreserved(page)

  const cta = page.getByRole('link', { name: /Get a Delivery Quote on WhatsApp/i })
  const href = await cta.getAttribute('href')
  assert.ok(href?.startsWith('https://wa.me/'), 'quote CTA should use wa.me')
  const decoded = decodeURIComponent(new URL(href).searchParams.get('text') || '')
  assert.match(decoded, /Postcode:\s*BT1 5GS/i)
  assert.match(decoded, new RegExp(LONG_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(decoded, /Premium Beige/i)
  assert.match(decoded, /QA-01/i)
  assert.match(decoded, /x 1/i)
  assert.match(decoded, /£50.*offer/i)
  assert.match(decoded, /Assembly/i)
  assert.match(decoded, /delivery charge/i)
  assert.match(decoded, /whether delivery is available/i)
  assert.doesNotMatch(decoded, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
  assert.doesNotMatch(decoded, /UKSS-WA-/i)
  assert.doesNotMatch(decoded, /gclid|fbclid|visitor[_ -]?id|session[_ -]?id|arrival[_ -]?id|entitlement/i)

  await page.evaluate(() => document.addEventListener('click', event => {
    const a = event.target instanceof Element ? event.target.closest('a[href^="https://wa.me/"]') : null
    if (a) event.preventDefault()
  }, true))
  await cta.click()
  await page.waitForTimeout(300)
  const acqAfter = (await context.cookies()).find(c => c.name === 'uksofashop_wa')?.value
  assert.equal(acqAfter, ACQ_COOKIE, 'delivery quote must not replace existing acquisition reference')
  assert.equal(acquisitionRequests.length, 0, 'delivery quote must not fire acquisition whatsapp-click beacon')

  await setPostcode(page, 'BB6 7LS')
  await waitMainland(page, 'BB6 7LS')
  await assertFieldsPreserved(page)
  await assertNoHorizontalOverflow(page, width)
  await assertFabClearsBar(page, width)
  await context.close()
}

async function freshNoAcquisition(browser) {
  log('fresh-browser non-acquisition quote CTA')
  const { context, page } = await setupPage(browser, 390)
  const requests = []
  page.on('request', req => { if (req.url().includes('/api/attribution/whatsapp-click')) requests.push(req.url()) })
  await enterDetails(page)
  await fillDetails(page)
  await setPostcode(page, 'BT1 5GS')
  await waitQuote(page, 'BT1 5GS')
  const cta = page.getByRole('link', { name: /Get a Delivery Quote on WhatsApp/i })
  await page.evaluate(() => document.addEventListener('click', event => {
    const a = event.target instanceof Element ? event.target.closest('a[href^="https://wa.me/"]') : null
    if (a) event.preventDefault()
  }, true))
  await cta.click()
  await page.waitForTimeout(300)
  assert.equal((await context.cookies()).some(c => c.name === 'uksofashop_wa'), false, 'fresh quote CTA must not mint acquisition reference')
  assert.equal(requests.length, 0, 'fresh quote CTA must not emit acquisition whatsapp-click')
  await context.close()
}

async function simpleWidth(browser, width) {
  log(`responsive custom-quote ${width}px`)
  const { context, page } = await setupPage(browser, width)
  await enterDetails(page)
  await fillDetails(page)
  await setPostcode(page, 'BT1 5GS')
  await waitQuote(page, 'BT1 5GS')
  await assertNoHorizontalOverflow(page, width)
  await assertFabClearsBar(page, width)
  if (width < 1024) {
    const bar = page.getByText(/Current online subtotal · delivery quote needed/i)
    await waitVisible(bar, 'MobileTotalBar quote wording')
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(100)
  const atBottom = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8)
  assert.equal(atBottom, true, `${width}px should be able to scroll to page bottom`)
  await context.close()
}

async function estimatorMatrix(browser) {
  log('PDP delivery estimator matrix')
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(`${BASE}/shop/electric-sofa/hannah-electric-corner`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  const essential = page.getByRole('button', { name: 'Essential only' })
  if (await essential.isVisible().catch(() => false)) await essential.click()
  const input = page.locator('#estimator-postcode')
  await input.scrollIntoViewIfNeeded()

  async function check(postcode, expected) {
    await input.fill(postcode)
    await page.getByRole('button', { name: /^Check$/ }).click()
    await page.getByText(expected).waitFor({ state: 'visible', timeout: 15000 })
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
  for (const width of [390, 430, 1440]) await fullSwitchMatrix(browser, width)
  await freshNoAcquisition(browser)
  for (const width of [320, 768]) await simpleWidth(browser, width)
  await estimatorMatrix(browser)
  log('PASS: browser matrix, offer/form/cart persistence, quote CTA and attribution semantics')
} finally {
  await browser.close()
}
