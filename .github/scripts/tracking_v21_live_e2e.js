const { chromium } = require('playwright-core');

const BASE = 'https://www.uksofashop.co.uk';
// Stocked/non-made-to-order QA product so the real Add to cart control commits
// immediately without opening the fabric picker. The explicit variant makes the
// WhatsApp matcher test exact rather than product-only.
const PRODUCT = '/shop/recliner/roma-recliner-manual-armchair';
const VARIANT = '562327ad-ee1e-4683-8f39-28f1289f8696';
const RUN = `v21-${Date.now()}`;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function cookiesByName(context) {
  const rows = await context.cookies(BASE);
  return Object.fromEntries(rows.map(c => [c.name, c.value]));
}

async function waitForCookie(context, name, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const map = await cookiesByName(context);
    if (map[name]) return map[name];
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error(`Timed out waiting for cookie ${name}`);
}

async function dismissConsent(page, accept) {
  const yes = page.getByRole('button', { name: /Accept all/i });
  const no = page.getByRole('button', { name: /Essential only/i });
  const button = accept ? yes : no;
  await button.waitFor({ state: 'visible', timeout: 10000 });
  await button.click();
  await page.waitForTimeout(250);
}

async function prepareContext(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('https://wa.me/**', route => route.abort());
  const page = await context.newPage();
  return { context, page };
}

async function goProduct(browser, suffix = '', accept = false) {
  const { context, page } = await prepareContext(browser);
  const query = `?variant=${encodeURIComponent(VARIANT)}${suffix ? `&${suffix.replace(/^\?/, '')}` : ''}`;
  await page.goto(`${BASE}${PRODUCT}${query}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissConsent(page, accept);
  const vid = await waitForCookie(context, 'uksofashop_vid');
  const sid = await waitForCookie(context, 'uksofashop_sid');
  const aid = await waitForCookie(context, 'uksofashop_aid');
  return { context, page, vid, sid, aid };
}

async function addProduct(page) {
  const button = page.getByRole('button', { name: /Add to cart/i }).first();
  await button.waitFor({ state: 'visible', timeout: 15000 });
  await button.click();
  // Durable state, not the two-second animated label. The exact variant must be
  // present in the persisted cart before navigation to checkout.
  await page.waitForFunction((variantId) => {
    try {
      const cart = JSON.parse(localStorage.getItem('uksofashop_cart') || '[]');
      return Array.isArray(cart) && cart.some(item => item?.variant_id === variantId && Number(item?.quantity) > 0);
    } catch { return false; }
  }, VARIANT, { timeout: 10000 });
}

async function completeCheckout(context, page, label) {
  await addProduct(page);
  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const continueBtn = page.getByRole('button', { name: /Continue to delivery/i });
  await continueBtn.waitFor({ state: 'visible', timeout: 15000 });
  await continueBtn.click();

  await page.locator('input[name="customerName"]').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('input[name="customerName"]').fill(`TRACKING V2.1 QA ${label}`);
  await page.locator('input[name="customerEmail"]').fill(`tracking-v21-${RUN}-${label.toLowerCase()}@example.invalid`);
  await page.locator('input[name="customerPhone"]').fill('07123456789');
  await page.locator('form input[type="text"]:not([name])').fill('BB1 1AA');
  await page.locator('textarea[name="shippingAddress"]').fill(`TRACKING V2.1 QA ${label}, Blackburn`);
  await page.locator('textarea[name="specialInstructions"]').fill(`TRACKING_V21_QA_${RUN}_${label}`);

  const before = await cookiesByName(context);
  await page.getByRole('button', { name: /^Place Order$/i }).click();
  await page.locator('[data-existing-order-context]').waitFor({ state: 'visible', timeout: 30000 });
  const body = await page.locator('body').innerText();
  const match = body.match(/#([0-9A-F]{8})\b/);
  assert(match, `${label}: no short order reference on success page`);
  const after = await cookiesByName(context);

  return {
    label,
    shortRef: match[1],
    email: `tracking-v21-${RUN}-${label.toLowerCase()}@example.invalid`,
    operational: { vid: before.uksofashop_vid, sid: before.uksofashop_sid, aid: before.uksofashop_aid },
    lastTouch: before.uksofashop_lt ? JSON.parse(decodeURIComponent(before.uksofashop_lt)) : null,
    whatsappBefore: before.uksofashop_wa || null,
    whatsappAfter: after.uksofashop_wa || null,
  };
}

async function clickAcquisitionWhatsApp(context, page) {
  const fab = page.getByLabel('Chat with us on WhatsApp');
  await fab.waitFor({ state: 'visible', timeout: 10000 });
  const responsePromise = page.waitForResponse(
    r => r.url().includes('/api/attribution/whatsapp-click') && r.request().method() === 'POST',
    { timeout: 15000 },
  );
  await fab.click({ noWaitAfter: true });
  const response = await responsePromise;
  assert(response.ok(), `WhatsApp beacon returned ${response.status()}`);
  const ref = await waitForCookie(context, 'uksofashop_wa');
  assert(/^UKSS-WA-\d{6}-[A-Z0-9]{6}$/.test(ref), `invalid persisted WhatsApp ref ${ref}`);
  return ref;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const result = { run: RUN, product: PRODUCT, variant: VARIANT, direct: null, google: null, meta: null, whatsapp: null, crossBrowser: null, support: null };
  try {
    // A. Direct/organic, essential-only consent: operational attribution only.
    {
      const s = await goProduct(browser, '', false);
      result.direct = await completeCheckout(s.context, s.page, 'DIRECT');
      assert(result.direct.operational.vid && result.direct.operational.sid && result.direct.operational.aid, 'DIRECT missing operational ids');
      assert(result.direct.lastTouch === null, 'DIRECT unexpectedly has marketing last-touch');
      await s.context.close();
    }

    // B. Google tagged + granted consent. IDs are deliberately impossible QA values.
    {
      const gclid = `QA-V21-GCLID-${RUN}`;
      const qs = `gclid=${encodeURIComponent(gclid)}&utm_source=google&utm_medium=cpc&utm_campaign=tracking_v21_final_${RUN}`;
      const s = await goProduct(browser, qs, true);
      await waitForCookie(s.context, 'uksofashop_lt');
      result.google = await completeCheckout(s.context, s.page, 'GOOGLE');
      assert(result.google.lastTouch?.gclid === gclid, 'GOOGLE gclid not retained before checkout');
      assert(result.google.lastTouch?.source === 'google', 'GOOGLE source mismatch');
      assert(result.google.lastTouch?.medium === 'cpc', 'GOOGLE medium mismatch');
      assert(result.google.lastTouch?.campaign === `tracking_v21_final_${RUN}`, 'GOOGLE campaign mismatch');
      await s.context.close();
    }

    // C. Meta tagged + granted consent. ID is deliberately an impossible QA value.
    {
      const fbclid = `QA-V21-FBCLID-${RUN}`;
      const qs = `fbclid=${encodeURIComponent(fbclid)}&utm_source=facebook&utm_medium=paid_social&utm_campaign=tracking_v21_final_${RUN}`;
      const s = await goProduct(browser, qs, true);
      await waitForCookie(s.context, 'uksofashop_lt');
      result.meta = await completeCheckout(s.context, s.page, 'META');
      assert(result.meta.lastTouch?.fbclid === fbclid, 'META fbclid not retained before checkout');
      assert(result.meta.lastTouch?.source === 'facebook', 'META source mismatch');
      assert(result.meta.lastTouch?.medium === 'paid_social', 'META medium mismatch');
      assert(result.meta.lastTouch?.campaign === `tracking_v21_final_${RUN}`, 'META campaign mismatch');
      await s.context.close();
    }

    // D. Product WhatsApp -> same-browser exact-variant checkout.
    {
      const s = await goProduct(browser, '', true);
      const ref = await clickAcquisitionWhatsApp(s.context, s.page);
      result.whatsapp = await completeCheckout(s.context, s.page, 'WHATSAPP');
      result.whatsapp.reference = ref;
      assert(result.whatsapp.whatsappBefore === ref, 'WHATSAPP ref missing at checkout');
      assert(result.whatsapp.whatsappAfter === null, 'WHATSAPP acquisition ref was not retired after linked order');
      await s.context.close();
    }

    // E. Different visitor with stolen/copied valid reference must not link.
    {
      const source = await goProduct(browser, '', true);
      const ref = await clickAcquisitionWhatsApp(source.context, source.page);
      const sourceVisitor = source.vid;
      await source.context.close();

      const target = await goProduct(browser, '', true);
      assert(target.vid !== sourceVisitor, 'CROSS browser unexpectedly reused visitor id');
      await target.context.addCookies([{ name: 'uksofashop_wa', value: ref, url: BASE, sameSite: 'Lax', secure: true }]);
      result.crossBrowser = await completeCheckout(target.context, target.page, 'CROSS');
      result.crossBrowser.reference = ref;
      result.crossBrowser.sourceVisitor = sourceVisitor;
      result.crossBrowser.targetVisitor = target.vid;
      assert(result.crossBrowser.whatsappBefore === ref, 'CROSS test ref not present at checkout');
      assert(result.crossBrowser.whatsappAfter === null, 'CROSS mismatched ref was not retired');
      await target.context.close();
    }

    // F. Support context must not persist an acquisition reference or beacon.
    {
      const { context, page } = await prepareContext(browser);
      await page.goto(`${BASE}/track-order`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await dismissConsent(page, true);
      await waitForCookie(context, 'uksofashop_vid');
      let acquisitionBeacon = false;
      page.on('request', req => { if (req.url().includes('/api/attribution/whatsapp-click')) acquisitionBeacon = true; });
      await page.getByLabel('Chat with us on WhatsApp').click({ noWaitAfter: true });
      await page.waitForTimeout(500);
      const c = await cookiesByName(context);
      result.support = { whatsappCookie: c.uksofashop_wa || null, acquisitionBeacon };
      assert(!result.support.whatsappCookie, 'SUPPORT persisted acquisition WhatsApp cookie');
      assert(!result.support.acquisitionBeacon, 'SUPPORT emitted acquisition WhatsApp beacon');
      await context.close();
    }

    console.log('TRACKING_V21_LIVE_E2E=' + JSON.stringify(result));
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});
