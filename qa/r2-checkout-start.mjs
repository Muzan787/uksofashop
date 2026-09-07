import fs from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = 'https://www.uksofashop.co.uk';
const ROMA = '/shop/recliner/roma-recliner-manual-3-and-2';
const tag = `r2qa-checkout-${Date.now()}`;
const out = { tag, productionSha: '04e4154a537fb4c5c5a5058f86cd83b4077b4752', passed: false, meta: [], error: null };

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function nav(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await sleep(400);
}
async function accept(page) {
  const b = page.getByRole('button', { name: /Accept all/i });
  if (await b.count() && await b.isVisible().catch(() => false)) { await b.click(); await sleep(550); }
}

const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on('request', req => {
    if (req.url().includes('/api/meta/event') && req.method() === 'POST') {
      let payload = null; try { payload = req.postDataJSON(); } catch { payload = req.postData(); }
      out.meta.push(payload);
    }
  });

  await nav(page, `${BASE}/?utm_source=r2qa&utm_medium=automation&utm_campaign=tracking_v2_checkout&gclid=${tag}`);
  await accept(page);
  await nav(page, `${BASE}${ROMA}`);
  const add = page.getByRole('button', { name: /Add to cart/i }).first();
  await add.click();
  await sleep(1000);
  if (!(await page.getByText(/Added to cart/i).count())) throw new Error('Roma was not added to cart');

  await nav(page, `${BASE}/checkout`);
  const before = out.meta.length;
  const next = page.getByRole('button', { name: /Continue to delivery/i });
  if (!(await next.count())) throw new Error('Continue to delivery button not found');
  await next.click();
  await sleep(1400);
  const fresh = out.meta.slice(before);
  const hit = fresh.find(x => x?.ledgerAction === 'checkout_start');
  if (!hit) throw new Error(`checkout_start request not observed; new meta payloads=${JSON.stringify(fresh)}`);
  out.passed = true;
  out.checkoutPayload = hit;
  out.currentUrl = page.url();
  await page.screenshot({ path: 'qa-checkout-start.png', fullPage: false });
  await context.close();
} catch (error) {
  out.error = String(error?.stack || error);
} finally {
  await browser.close();
}

fs.writeFileSync('qa-checkout-start.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
if (!out.passed) process.exit(2);
