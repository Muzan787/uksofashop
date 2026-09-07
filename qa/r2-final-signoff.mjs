import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const BASE = 'https://www.uksofashop.co.uk';
const PROD_SHA = '197d81a5a676e12cdd05e6696e5f3c7954d6332c';
const MALIBU = '/shop/corner-sofa/malibu-high-back-5-seater-corner-2c2';
const MALIBU_VARIANT_A = '9cfdb758-3881-42ed-ab85-1b4a1518908c';
const MALIBU_VARIANT_B = '8818f239-49b4-4bb7-8730-8021cf8f54b6';
const SECOND_CANDIDATES = [
  '/shop/3-2-seater/lily-high-back-3and2-seater',
  '/shop/3-2-seater/verona-high-back-3and2-seater',
  '/shop/corner-sofa/verona-high-back-5-seater-corner-2c2',
  '/shop/electric-sofa/hannah-electric-corner',
  '/shop/recliner/roma-recliner-manual-3-and-2',
  '/shop/fabric-sofa/malibu-high-back-2-seater',
  '/shop/fabric-sofa/malibu-high-back-3-seater',
];
const OUT = path.resolve('qa-artifacts-final');
fs.mkdirSync(OUT, { recursive: true });

const results = {
  productionSha: PROD_SHA,
  startedAt: new Date().toISOString(),
  qaTag: `r2qa-postfix-${Date.now()}`,
  checks: [],
  malibu: {},
  secondProduct: {},
  responsive: [],
  network: { whatsapp: [], meta: [] },
  cookies: {},
  addToCart: {},
  checkout: {},
  phone: {},
  errors: [],
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function check(name, pass, details = {}) {
  const row = { name, pass: Boolean(pass), details };
  results.checks.push(row);
  console.log(`${row.pass ? 'PASS' : 'FAIL'} ${name}`, details);
  return row.pass;
}
function executable() {
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    if (fs.existsSync(p)) return p;
  }
  try { return execSync('which google-chrome || which chromium || which chromium-browser', { encoding: 'utf8' }).trim(); } catch { return null; }
}
function waMessage(href) {
  try { return new URL(href).searchParams.get('text') || ''; } catch { return ''; }
}
function waRef(message) { return message.match(/UKSS-WA-\d{6}-[A-Z0-9]{6}/)?.[0] || null; }
function overlaps(a, b) {
  if (!a || !b) return false;
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}
async function goto(page, url) {
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await sleep(400);
  return resp;
}
async function dismissConsent(page, mode = 'accept') {
  const button = mode === 'accept'
    ? page.getByRole('button', { name: /Accept all/i })
    : page.getByRole('button', { name: /Essential only/i });
  if (await button.count() && await button.isVisible().catch(() => false)) {
    await button.click();
    await sleep(600);
    return true;
  }
  return false;
}
async function productContext(page) {
  const marker = page.locator('[data-whatsapp-product-context]');
  await marker.waitFor({ state: 'attached', timeout: 10000 });
  return marker.evaluate(el => ({
    productId: el.dataset.productId || null,
    variantId: el.dataset.variantId || null,
    productName: el.dataset.productName || null,
  }));
}
async function inspectFab(page) {
  const fab = page.locator('a[aria-label="Chat with us on WhatsApp"]').first();
  const visible = await fab.isVisible().catch(() => false);
  const box = visible ? await fab.boundingBox() : null;
  const data = await fab.evaluate(el => {
    const cs = getComputedStyle(el);
    return {
      text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
      href: el.getAttribute('href') || '',
      position: cs.position,
      bottom: cs.bottom,
      zIndex: cs.zIndex,
      svgCount: el.querySelectorAll('svg').length,
    };
  }).catch(() => ({ text: '', href: '', position: '', bottom: '', zIndex: '', svgCount: 0 }));
  const overflow = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    ok: document.documentElement.scrollWidth <= window.innerWidth + 1,
  }));
  return { visible, box, ...data, overflow, message: waMessage(data.href), reference: waRef(waMessage(data.href)) };
}
async function captureWhatsAppClick(page, { expectBeacon = true } = {}) {
  const fab = page.locator('a[aria-label="Chat with us on WhatsApp"]').first();
  let seen = null;
  const listener = req => {
    if (req.url().includes('/api/attribution/whatsapp-click') && req.method() === 'POST') {
      let payload = null;
      try { payload = req.postDataJSON(); } catch { payload = req.postData(); }
      seen = { url: req.url(), payload };
      results.network.whatsapp.push({ page: page.url(), payload });
    }
  };
  page.on('request', listener);
  await fab.evaluate(el => el.addEventListener('click', e => e.preventDefault(), { capture: true, once: true }));
  await fab.click({ timeout: 10000 });
  await sleep(expectBeacon ? 1100 : 800);
  page.off('request', listener);
  const href = await fab.getAttribute('href');
  const message = waMessage(href || '');
  return { href, message, reference: waRef(message), beacon: seen };
}
async function changeToExactVariant(page, targetVariantId) {
  const group = page.locator('[role="group"][aria-label="Material"]');
  if (!(await group.count())) return { changed: false, reason: 'No Material group' };
  const buttons = group.locator('button');
  const attempts = [];
  for (let i = 0; i < await buttons.count(); i++) {
    const b = buttons.nth(i);
    if (!(await b.isVisible().catch(() => false))) continue;
    const before = await productContext(page);
    const label = (await b.textContent() || '').trim();
    await b.click();
    await sleep(750);
    const after = await productContext(page);
    attempts.push({ label, before: before.variantId, after: after.variantId });
    if (after.variantId === targetVariantId) return { changed: true, context: after, attempts };
  }
  return { changed: false, context: await productContext(page), attempts };
}
async function changeToAnyDifferentVariant(page) {
  const before = await productContext(page);
  const group = page.locator('[role="group"][aria-label="Material"]');
  if (!(await group.count())) return { changed: false, before, reason: 'No Material group' };
  const buttons = group.locator('button');
  for (let i = 0; i < await buttons.count(); i++) {
    const b = buttons.nth(i);
    if (!(await b.isVisible().catch(() => false))) continue;
    await b.click();
    await sleep(750);
    const after = await productContext(page);
    if (after.variantId && after.variantId !== before.variantId) return { changed: true, before, after, label: (await b.textContent() || '').trim() };
  }
  return { changed: false, before, after: await productContext(page) };
}
async function ensureAddedToCart(page) {
  const add = page.getByRole('button', { name: /Add to cart/i }).first();
  if (!(await add.count())) return { success: false, reason: 'No add button' };
  await add.click();
  await sleep(600);

  const fabricDialog = page.getByRole('dialog', { name: /Choose your fabric/i });
  if (await fabricDialog.count() && await fabricDialog.isVisible().catch(() => false)) {
    const swatches = fabricDialog.locator('button[aria-label]');
    if (await swatches.count()) {
      await swatches.first().click();
      await sleep(350);
      const build = page.getByRole('button', { name: /Build mine in this|Keep this fabric/i });
      if (await build.count()) {
        await build.click();
        await sleep(500);
        await add.click();
      }
    }
  }
  await sleep(1200);
  const added = await page.getByText(/Added to cart/i).count();
  return { success: added > 0, addedTextCount: added };
}
async function visibleTel(page) {
  const links = page.locator('a[href^="tel:"]');
  for (let i = 0; i < await links.count(); i++) {
    const a = links.nth(i);
    if (await a.isVisible().catch(() => false)) return a;
  }
  return null;
}
async function responsiveCheck(browser, width, productPath) {
  const context = await browser.newContext({ viewport: { width, height: width >= 1024 ? 900 : 844 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const row = { width };
  try {
    await goto(page, `${BASE}/`);
    const consent = page.getByRole('dialog', { name: /Cookies on this site/i });
    const fabBefore = await inspectFab(page);
    let consentResult = { visible: false };
    if (await consent.count() && await consent.isVisible().catch(() => false)) {
      const cb = await consent.boundingBox();
      const cz = Number(await consent.evaluate(el => getComputedStyle(el).zIndex) || 0);
      consentResult = { visible: true, zIndex: cz, box: cb, overlap: overlaps(cb, fabBefore.box), fabZ: Number(fabBefore.zIndex || 0) };
      check(`Consent outranks FAB at ${width}px`, cz > Number(fabBefore.zIndex || 0), consentResult);
    }
    check(`Homepage FAB immediate/fixed/label at ${width}px`, fabBefore.visible && fabBefore.position === 'fixed' && /WhatsApp/.test(fabBefore.text) && fabBefore.svgCount > 0, fabBefore);
    check(`Homepage no horizontal overflow at ${width}px`, fabBefore.overflow.ok, fabBefore.overflow);
    await dismissConsent(page, 'essential');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await sleep(400);
    const fabBottom = await inspectFab(page);
    check(`Homepage FAB persists to bottom at ${width}px`, fabBottom.visible, { box: fabBottom.box });

    await goto(page, `${BASE}${productPath}`);
    await dismissConsent(page, 'essential');
    const top = await inspectFab(page);
    check(`Product FAB immediate at ${width}px`, top.visible && top.position === 'fixed', top);
    check(`Product no horizontal overflow at ${width}px`, top.overflow.ok, top.overflow);

    if (width < 1024) {
      const add = page.getByRole('button', { name: /Add to cart/i }).first();
      if (await add.count()) {
        await add.scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy(0, 700));
        await sleep(900);
      }
      const bars = page.locator('[data-bottom-bar]');
      let stickyBox = null;
      for (let i = 0; i < await bars.count(); i++) {
        const b = bars.nth(i);
        if (await b.isVisible().catch(() => false) && !(await b.getAttribute('inert'))) { stickyBox = await b.boundingBox(); break; }
      }
      const fabSticky = await inspectFab(page);
      check(`Product sticky bar clears WhatsApp at ${width}px`, !!stickyBox && fabSticky.visible && !overlaps(stickyBox, fabSticky.box), { stickyBox, fabBox: fabSticky.box });
      const nav = page.locator('.z-bottom-nav').first();
      if (await nav.count() && await nav.isVisible().catch(() => false)) {
        const navBox = await nav.boundingBox();
        check(`Mobile nav clears WhatsApp at ${width}px`, !overlaps(navBox, fabSticky.box), { navBox, fabBox: fabSticky.box });
      }
    }

    await page.screenshot({ path: path.join(OUT, `homepage-${width}.png`), fullPage: true });
    await goto(page, `${BASE}${productPath}`); await dismissConsent(page, 'essential');
    await page.screenshot({ path: path.join(OUT, `malibu-${width}.png`), fullPage: true });
    row.consent = consentResult;
    row.homeTop = fabBefore;
    row.homeBottom = fabBottom;
    row.productTop = top;
  } finally {
    await context.close();
  }
  results.responsive.push(row);
}

async function main() {
  const exe = executable();
  if (!exe) throw new Error('No Chrome/Chromium found');
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    page.on('request', req => {
      if (req.url().includes('/api/meta/event') && req.method() === 'POST') {
        let payload = null;
        try { payload = req.postDataJSON(); } catch { payload = req.postData(); }
        results.network.meta.push({ page: page.url(), payload });
      }
    });

    const landing = `${BASE}/?utm_source=r2qa&utm_medium=automation&utm_campaign=tracking_v2_postfix&gclid=${results.qaTag}`;
    await goto(page, landing);
    await dismissConsent(page, 'accept');
    results.cookies.afterAcceptAll = (await context.cookies()).map(c => c.name);

    // Generic repeated-click regression: same context reuses the same prepared ref and only one beacon.
    const generic1 = await captureWhatsAppClick(page);
    const before = results.network.whatsapp.length;
    const generic2 = await captureWhatsAppClick(page, { expectBeacon: false });
    check('Generic repeated click reuses prepared reference', !!generic1.reference && generic2.reference === generic1.reference, { first: generic1.reference, second: generic2.reference });
    check('Generic repeated click does not duplicate beacon', results.network.whatsapp.length === before, { beaconCount: results.network.whatsapp.length });

    // Exact Malibu reproduction.
    await goto(page, `${BASE}${MALIBU}`);
    const a = await productContext(page);
    check('Malibu loads exact Variant A', a.variantId === MALIBU_VARIANT_A, a);
    const clickA = await captureWhatsAppClick(page);
    const payloadA = clickA.beacon?.payload || {};
    check('Malibu Variant A message/reference/payload',
      !!clickA.reference && /Malibu/.test(clickA.message) && payloadA.variantId === MALIBU_VARIANT_A && payloadA.productId === a.productId && payloadA.productName === a.productName,
      { context: a, click: clickA });

    const changed = await changeToExactVariant(page, MALIBU_VARIANT_B);
    check('Malibu selector reaches exact Variant B', changed.changed && changed.context?.variantId === MALIBU_VARIANT_B, changed);
    await sleep(700);
    const clickB = await captureWhatsAppClick(page);
    const payloadB = clickB.beacon?.payload || {};
    check('Malibu Variant B gets fresh reference', !!clickB.reference && clickB.reference !== clickA.reference, { refA: clickA.reference, refB: clickB.reference });
    check('Malibu Variant B beacon contains only current variant context',
      payloadB.variantId === MALIBU_VARIANT_B && payloadB.variantId !== MALIBU_VARIANT_A && payloadB.productId === a.productId && payloadB.productName === a.productName && payloadB.reference === clickB.reference,
      { payloadB, expectedVariant: MALIBU_VARIANT_B });
    check('Malibu post-switch WhatsApp text retains actual product name', !!a.productName && clickB.message.includes(a.productName), { message: clickB.message, productName: a.productName });
    results.malibu = { variantA: a, refA: clickA.reference, payloadA, change: changed, refB: clickB.reference, payloadB, messageB: clickB.message };

    // Find and exercise a second real multi-variant product.
    let second = null;
    for (const candidate of SECOND_CANDIDATES) {
      await goto(page, `${BASE}${candidate}`);
      const first = await productContext(page).catch(() => null);
      if (!first) continue;
      const click1 = await captureWhatsAppClick(page);
      const change = await changeToAnyDifferentVariant(page);
      if (!change.changed) continue;
      await sleep(700);
      const click2 = await captureWhatsAppClick(page);
      second = { path: candidate, first, click1, change, click2, payload2: click2.beacon?.payload || {} };
      break;
    }
    check('Second multi-variant product found', !!second, second || {});
    if (second) {
      check('Second product variant change mints fresh reference', !!second.click1.reference && !!second.click2.reference && second.click1.reference !== second.click2.reference, second);
      check('Second product second beacon has current variant', second.payload2.variantId === second.change.after.variantId && second.payload2.variantId !== second.change.before.variantId && second.payload2.productName === second.change.after.productName, { payload: second.payload2, change: second.change });
      results.secondProduct = second;
    }

    // Safe add-to-cart + checkout_start path, using the second product if possible.
    if (second) {
      await goto(page, `${BASE}${second.path}`);
      const add = await ensureAddedToCart(page);
      results.addToCart = add;
      check('Safe add-to-cart completes', add.success, add);
      if (add.success) {
        await goto(page, `${BASE}/checkout`);
        await sleep(1600);
        const bars = page.locator('[data-bottom-bar]');
        let checkoutBar = null;
        for (let i = 0; i < await bars.count(); i++) {
          const b = bars.nth(i);
          if (await b.isVisible().catch(() => false) && !(await b.getAttribute('inert'))) { checkoutBar = await b.boundingBox(); break; }
        }
        const fab = await inspectFab(page);
        results.checkout = { checkoutBar, fab };
        check('Checkout/cart sticky control clears WhatsApp', !checkoutBar || (fab.visible && !overlaps(checkoutBar, fab.box)), results.checkout);
        await page.screenshot({ path: path.join(OUT, 'checkout-390.png'), fullPage: false });
      }
    }

    // Safe call-click check: prevent tel navigation, keep event path intact.
    await goto(page, `${BASE}/contact`);
    const tel = await visibleTel(page);
    if (tel) {
      await tel.evaluate(el => el.addEventListener('click', e => e.preventDefault(), { capture: true, once: true }));
      await tel.click();
      await sleep(1200);
      results.phone = { clicked: true, href: await tel.getAttribute('href') };
      check('Visible phone CTA exercised safely', true, results.phone);
    } else {
      check('Visible phone CTA exercised safely', false, { reason: 'No visible tel link' });
    }

    // Existing-order support path must not mint acquisition reference/beacon.
    await goto(page, `${BASE}/track-order`);
    const support = await captureWhatsAppClick(page, { expectBeacon: false });
    check('Track-order support remains reference-free and beacon-free', !support.reference && !support.beacon && /existing order|account/i.test(support.message), support);

    results.primaryCookies = await context.cookies();
    await context.close();

    for (const width of [320, 390, 430, 1440]) await responsiveCheck(browser, width, MALIBU);
  } finally {
    await browser.close();
  }

  results.finishedAt = new Date().toISOString();
  results.summary = {
    pass: results.checks.filter(c => c.pass).length,
    fail: results.checks.filter(c => !c.pass).length,
    total: results.checks.length,
  };
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.summary));
  if (results.summary.fail) process.exitCode = 2;
}

main().catch(err => {
  results.errors.push({ fatal: String(err?.stack || err) });
  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.error(err);
  process.exitCode = 1;
});
