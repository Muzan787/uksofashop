import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE = 'https://www.uksofashop.co.uk';
const PROD_SHA = '04e4154a537fb4c5c5a5058f86cd83b4077b4752';
const MALIBU = '/shop/corner-sofa/malibu-high-back-5-seater-corner-2c2';
const ROMA = '/shop/recliner/roma-recliner-manual-3-and-2';
const MALIBU_A = '9cfdb758-3881-42ed-ab85-1b4a1518908c';
const MALIBU_B = '8818f239-49b4-4bb7-8730-8021cf8f54b6';
const OUT = path.resolve('qa-artifacts-pass');
fs.mkdirSync(OUT, { recursive: true });

const result = {
  productionSha: PROD_SHA,
  qaTag: `r2qa-final-${Date.now()}`,
  startedAt: new Date().toISOString(),
  checks: [],
  refs: {},
  contexts: {},
  whatsappPayloads: [],
  metaPayloads: [],
  responsive: [],
  errors: [],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
function check(name, pass, details = {}) {
  const row = { name, pass: Boolean(pass), details };
  result.checks.push(row);
  console.log(`${row.pass ? 'PASS' : 'FAIL'} ${name}`, details);
  return row.pass;
}
function overlap(a, b) {
  if (!a || !b) return false;
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}
function msg(href) { try { return new URL(href).searchParams.get('text') || ''; } catch { return ''; } }
function refOf(message) { return message.match(/UKSS-WA-\d{6}-[A-Z0-9]{6}/)?.[0] || null; }
async function nav(page, url) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await sleep(450);
  return response;
}
async function consent(page, choice = 'accept') {
  const button = page.getByRole('button', { name: choice === 'accept' ? /Accept all/i : /Essential only/i });
  if (await button.count() && await button.isVisible().catch(() => false)) {
    await button.click();
    await sleep(550);
  }
}
async function context(page) {
  const marker = page.locator('[data-whatsapp-product-context]');
  await marker.waitFor({ state: 'attached', timeout: 10000 });
  return marker.evaluate(el => ({ productId: el.dataset.productId || null, variantId: el.dataset.variantId || null, productName: el.dataset.productName || null }));
}
async function fab(page) {
  const el = page.locator('a[aria-label="Chat with us on WhatsApp"]').first();
  const visible = await el.isVisible().catch(() => false);
  const box = visible ? await el.boundingBox() : null;
  const data = await el.evaluate(node => {
    const s = getComputedStyle(node);
    return { href: node.getAttribute('href') || '', text: (node.textContent || '').replace(/\s+/g, ' ').trim(), position: s.position, bottom: s.bottom, zIndex: s.zIndex, svg: node.querySelectorAll('svg').length };
  });
  const overflow = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, ok: document.documentElement.scrollWidth <= window.innerWidth + 1 }));
  return { visible, box, ...data, message: msg(data.href), reference: refOf(msg(data.href)), overflow };
}
async function waClick(page) {
  const el = page.locator('a[aria-label="Chat with us on WhatsApp"]').first();
  let captured = null;
  const listener = req => {
    if (req.url().includes('/api/attribution/whatsapp-click') && req.method() === 'POST') {
      let payload = null; try { payload = req.postDataJSON(); } catch { payload = req.postData(); }
      captured = payload;
      result.whatsappPayloads.push(payload);
    }
  };
  page.on('request', listener);
  await el.evaluate(node => node.addEventListener('click', e => e.preventDefault(), { capture: true, once: true }));
  await el.click({ timeout: 10000 });
  await sleep(1000);
  page.off('request', listener);
  const href = await el.getAttribute('href');
  const message = msg(href || '');
  return { href, message, reference: refOf(message), payload: captured };
}
async function switchVariant(page, exact = null) {
  const before = await context(page);
  const group = page.locator('[role="group"][aria-label="Material"]');
  if (!(await group.count())) return { changed: false, before, reason: 'no material group' };
  const buttons = group.locator('button');
  const attempts = [];
  for (let i = 0; i < await buttons.count(); i++) {
    const b = buttons.nth(i);
    if (!(await b.isVisible().catch(() => false))) continue;
    const label = (await b.textContent() || '').trim();
    await b.click(); await sleep(700);
    const after = await context(page);
    attempts.push({ label, variantId: after.variantId });
    if (after.variantId !== before.variantId && (!exact || after.variantId === exact)) return { changed: true, before, after, attempts };
  }
  return { changed: false, before, after: await context(page), attempts };
}
async function addRoma(page) {
  await nav(page, `${BASE}${ROMA}`);
  const add = page.getByRole('button', { name: /Add to cart/i }).first();
  if (!(await add.count())) return false;
  await add.click(); await sleep(1200);
  return (await page.getByText(/Added to cart/i).count()) > 0;
}
async function activeBar(page) {
  const bars = page.locator('[data-bottom-bar]');
  for (let i = 0; i < await bars.count(); i++) {
    const b = bars.nth(i);
    if (await b.isVisible().catch(() => false) && !(await b.getAttribute('inert'))) return { box: await b.boundingBox(), height: await b.evaluate(el => el.getBoundingClientRect().height) };
  }
  return null;
}
async function phoneClick(page) {
  const links = page.locator('a[href^="tel:"]');
  let chosen = null;
  for (let i = 0; i < await links.count(); i++) {
    const a = links.nth(i);
    const usable = await a.evaluate(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).catch(() => false);
    if (usable) { chosen = a; break; }
  }
  if (!chosen) return false;
  await chosen.evaluate(el => {
    el.addEventListener('click', e => e.preventDefault(), { capture: true, once: true });
    el.click();
  });
  await sleep(1200);
  return true;
}
async function responsive(browser, width) {
  const c = await browser.newContext({ viewport: { width, height: width >= 1024 ? 900 : 844 }, ignoreHTTPSErrors: true });
  const p = await c.newPage();
  const row = { width };
  try {
    await nav(p, `${BASE}/`);
    const before = await fab(p);
    const consentDialog = p.getByRole('dialog', { name: /Cookies on this site/i });
    if (await consentDialog.count() && await consentDialog.isVisible().catch(() => false)) {
      const cb = await consentDialog.boundingBox();
      const cz = Number(await consentDialog.evaluate(el => getComputedStyle(el).zIndex) || 0);
      check(`Consent outranks FAB ${width}px`, cz > Number(before.zIndex || 0), { consentZ: cz, fabZ: before.zIndex, overlap: overlap(cb, before.box) });
    }
    check(`Homepage immediate fixed labelled FAB ${width}px`, before.visible && before.position === 'fixed' && /WhatsApp/i.test(before.text) && before.svg > 0, before);
    check(`Homepage no overflow ${width}px`, before.overflow.ok, before.overflow);
    await consent(p, 'essential');
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await sleep(400);
    const bottom = await fab(p);
    check(`Homepage FAB persists at bottom ${width}px`, bottom.visible, { box: bottom.box });

    await nav(p, `${BASE}${MALIBU}`); await consent(p, 'essential');
    const productTop = await fab(p);
    check(`Product immediate fixed FAB ${width}px`, productTop.visible && productTop.position === 'fixed', productTop);
    check(`Product no overflow ${width}px`, productTop.overflow.ok, productTop.overflow);

    if (width < 1024) {
      const add = p.getByRole('button', { name: /Add to cart/i }).first();
      if (await add.count()) { await add.scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, 700)); await sleep(1000); }
      const bar = await activeBar(p);
      const f = await fab(p);
      check(`Product sticky bar clears FAB ${width}px`, !!bar && f.visible && !overlap(bar.box, f.box), { bar, fab: f.box });
      const mobileNav = p.locator('.z-bottom-nav').first();
      if (await mobileNav.count() && await mobileNav.isVisible().catch(() => false)) {
        const nb = await mobileNav.boundingBox();
        check(`Mobile bottom nav clears FAB ${width}px`, !overlap(nb, f.box), { nav: nb, fab: f.box });
      }
      await p.screenshot({ path: path.join(OUT, `product-sticky-${width}.png`), fullPage: false });
    }

    await p.screenshot({ path: path.join(OUT, `homepage-${width}.png`), fullPage: true });
    await nav(p, `${BASE}${MALIBU}`); await consent(p, 'essential');
    await p.screenshot({ path: path.join(OUT, `malibu-${width}.png`), fullPage: true });
    row.home = before; row.product = productTop;
  } finally { await c.close(); }
  result.responsive.push(row);
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
    const p = await c.newPage();
    p.on('request', req => {
      if (req.url().includes('/api/meta/event') && req.method() === 'POST') {
        let payload = null; try { payload = req.postDataJSON(); } catch { payload = req.postData(); }
        result.metaPayloads.push(payload);
      }
    });

    await nav(p, `${BASE}/?utm_source=r2qa&utm_medium=automation&utm_campaign=tracking_v2_final&gclid=${result.qaTag}`);
    await consent(p, 'accept');

    const g1 = await waClick(p);
    const countAfterOne = result.whatsappPayloads.length;
    const g2 = await waClick(p);
    check('Generic same-context repeated click reuses ref', g1.reference && g2.reference === g1.reference, { ref1: g1.reference, ref2: g2.reference });
    check('Generic repeated click emits one enquiry beacon', result.whatsappPayloads.length === countAfterOne, { count: result.whatsappPayloads.length });

    await nav(p, `${BASE}${MALIBU}`);
    const ma = await context(p);
    check('Malibu starts on exact Variant A', ma.variantId === MALIBU_A, ma);
    const wa = await waClick(p);
    check('Malibu A beacon current', wa.reference && wa.payload?.variantId === MALIBU_A && wa.payload?.productName === ma.productName, wa);
    const changedM = await switchVariant(p, MALIBU_B);
    check('Malibu changes to exact Variant B', changedM.changed && changedM.after?.variantId === MALIBU_B, changedM);
    const wb = await waClick(p);
    check('Malibu B gets fresh ref', wb.reference && wb.reference !== wa.reference, { refA: wa.reference, refB: wb.reference });
    check('Malibu B beacon has no stale A', wb.payload?.variantId === MALIBU_B && wb.payload?.variantId !== MALIBU_A && wb.payload?.productName === ma.productName && wb.payload?.reference === wb.reference, wb);
    check('Malibu B message retains product name', wb.message.includes(ma.productName || ''), { message: wb.message });
    result.refs.malibu = { refA: wa.reference, refB: wb.reference };
    result.contexts.malibu = { a: ma, b: changedM.after };

    await nav(p, `${BASE}${ROMA}`);
    const ra = await context(p);
    const rwa = await waClick(p);
    const changedR = await switchVariant(p);
    check('Roma second multi-variant switch succeeds', changedR.changed, changedR);
    const rwb = await waClick(p);
    check('Roma fresh ref after variant switch', rwb.reference && rwb.reference !== rwa.reference, { refA: rwa.reference, refB: rwb.reference });
    check('Roma second beacon current', rwb.payload?.variantId === changedR.after?.variantId && rwb.payload?.variantId !== ra.variantId && rwb.payload?.productName === changedR.after?.productName, rwb);
    result.refs.roma = { refA: rwa.reference, refB: rwb.reference };
    result.contexts.roma = { a: ra, b: changedR.after };

    const added = await addRoma(p);
    check('Safe add_to_cart exercised', added, { added });
    const metaBeforeCheckout = result.metaPayloads.length;
    await nav(p, `${BASE}/checkout`); await sleep(1500);
    const checkoutBar = await activeBar(p);
    const checkoutFab = await fab(p);
    check('Checkout sticky bar clears FAB', !!checkoutBar && checkoutFab.visible && !overlap(checkoutBar.box, checkoutFab.box), { bar: checkoutBar, fab: checkoutFab });
    check('Checkout start request emitted', result.metaPayloads.slice(metaBeforeCheckout).some(x => x?.ledgerAction === 'checkout_start'), { newMeta: result.metaPayloads.slice(metaBeforeCheckout) });
    await p.screenshot({ path: path.join(OUT, 'checkout-390.png'), fullPage: false });

    const metaBeforePhone = result.metaPayloads.length;
    await nav(p, `${BASE}/contact`); await phoneClick(p);
    check('Call click request emitted', result.metaPayloads.slice(metaBeforePhone).some(x => x?.ledgerAction === 'call_click'), { newMeta: result.metaPayloads.slice(metaBeforePhone) });

    await nav(p, `${BASE}/track-order`);
    const support = await waClick(p);
    check('Track-order support has no acquisition ref/beacon', !support.reference && !support.payload && /existing order|account/i.test(support.message), support);
    await c.close();

    for (const width of [320, 390, 430, 1440]) await responsive(browser, width);
  } finally { await browser.close(); }

  result.finishedAt = new Date().toISOString();
  result.summary = { pass: result.checks.filter(x => x.pass).length, fail: result.checks.filter(x => !x.pass).length, total: result.checks.length };
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result.summary));
  if (result.summary.fail) process.exitCode = 2;
}

main().catch(err => {
  result.errors.push({ fatal: String(err?.stack || err) });
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(result, null, 2));
  console.error(err);
  process.exitCode = 1;
});
