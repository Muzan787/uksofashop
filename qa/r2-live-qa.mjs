import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const BASE = 'https://www.uksofashop.co.uk';
const PROD_SHA = 'd787931d9f9e8556f026d11dd9758fbb3ac95e04';
const OUT = path.resolve('qa-artifacts');
fs.mkdirSync(OUT, { recursive: true });

const results = {
  productionSha: PROD_SHA,
  baseUrl: BASE,
  startedAt: new Date().toISOString(),
  browserExecutable: null,
  discovery: {},
  checks: [],
  pageMatrix: [],
  productTests: [],
  contextualMessages: [],
  network: { whatsappPayloads: [], metaPayloads: [] },
  cookies: {},
  errors: [],
};

function check(name, pass, details = {}) {
  results.checks.push({ name, pass: Boolean(pass), details });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`, details);
  return Boolean(pass);
}

function safeName(s) { return s.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase(); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function overlaps(a, b) {
  if (!a || !b) return false;
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}
function whatsappMessage(href) {
  try { return new URL(href).searchParams.get('text') || ''; } catch { return ''; }
}
function whatsappRef(message) {
  return message.match(/UKSS-WA-\d{6}-[A-Z0-9]{6}/)?.[0] || null;
}
function executable() {
  for (const candidate of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    if (fs.existsSync(candidate)) return candidate;
  }
  try { return execSync('which google-chrome || which chromium || which chromium-browser', { encoding: 'utf8' }).trim(); } catch { return null; }
}

async function inspectFab(page, label) {
  const fab = page.locator('a[aria-label="Chat with us on WhatsApp"]');
  const count = await fab.count();
  if (!count) return { present: false, visible: false, label };
  const visible = await fab.isVisible().catch(() => false);
  const box = visible ? await fab.boundingBox() : null;
  const info = await fab.evaluate(el => {
    const cs = getComputedStyle(el);
    return {
      text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
      position: cs.position,
      bottom: cs.bottom,
      zIndex: cs.zIndex,
      href: el.getAttribute('href') || '',
      svgCount: el.querySelectorAll('svg').length,
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
      centerTopElement: (() => {
        const r = el.getBoundingClientRect();
        const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return e ? `${e.tagName}.${e.className || ''}` : null;
      })(),
    };
  });
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    ok: document.documentElement.scrollWidth <= window.innerWidth + 1,
  }));
  return { present: true, visible, box, ...info, overflow, message: whatsappMessage(info.href), reference: whatsappRef(whatsappMessage(info.href)), label };
}

async function cookieDialogInfo(page) {
  const dialog = page.getByRole('dialog', { name: /Cookies on this site/i });
  if (!(await dialog.count())) return { visible: false };
  const visible = await dialog.isVisible().catch(() => false);
  if (!visible) return { visible: false };
  const box = await dialog.boundingBox();
  const z = await dialog.evaluate(el => getComputedStyle(el).zIndex);
  return { visible, box, zIndex: z };
}

async function dismissConsent(page, choice = 'essential') {
  const button = choice === 'accept'
    ? page.getByRole('button', { name: /Accept all/i })
    : page.getByRole('button', { name: /Essential only/i });
  if (await button.count() && await button.isVisible().catch(() => false)) {
    await button.click();
    await sleep(550);
    return true;
  }
  return false;
}

async function goto(page, url) {
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await sleep(350);
  return resp;
}

async function pageChecks(page, name, url, width, { screenshot = false, consentChoice = 'essential' } = {}) {
  const started = Date.now();
  const resp = await goto(page, url);
  const top = await inspectFab(page, `${name}:top`);
  const topElapsedMs = Date.now() - started;
  const consent = await cookieDialogInfo(page);
  if (consent.visible && top.box) {
    const fabZ = Number(top.zIndex || 0);
    const consentZ = Number(consent.zIndex || 0);
    check(`${name} ${width}px consent UI outranks FAB`, consentZ > fabZ, { consentZ, fabZ, overlap: overlaps(consent.box, top.box) });
  }
  await dismissConsent(page, consentChoice);

  check(`${name} ${width}px HTTP success`, !!resp && resp.status() < 400, { status: resp?.status() });
  check(`${name} ${width}px WhatsApp visible immediately`, top.visible, { topElapsedMs, box: top.box });
  check(`${name} ${width}px WhatsApp label visible`, top.visible && /WhatsApp/i.test(top.text) && top.svgCount > 0, { text: top.text, svgCount: top.svgCount });
  check(`${name} ${width}px WhatsApp fixed`, top.position === 'fixed', { position: top.position });
  check(`${name} ${width}px no horizontal overflow at top`, top.overflow?.ok, top.overflow);

  await page.evaluate(() => window.scrollTo(0, Math.max(0, document.documentElement.scrollHeight * 0.5)));
  await sleep(350);
  const mid = await inspectFab(page, `${name}:mid`);
  check(`${name} ${width}px WhatsApp visible while scrolling`, mid.visible, { box: mid.box });
  check(`${name} ${width}px no horizontal overflow mid-page`, mid.overflow?.ok, mid.overflow);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(350);
  const bottom = await inspectFab(page, `${name}:bottom`);
  check(`${name} ${width}px WhatsApp visible near page bottom`, bottom.visible, { box: bottom.box });
  check(`${name} ${width}px no horizontal overflow at bottom`, bottom.overflow?.ok, bottom.overflow);

  let mobileNav = null;
  if (width < 1024) {
    const nav = page.locator('.z-bottom-nav').first();
    if (await nav.count() && await nav.isVisible().catch(() => false)) {
      const navBox = await nav.boundingBox();
      mobileNav = { box: navBox, overlap: overlaps(bottom.box, navBox) };
      check(`${name} ${width}px FAB clears mobile bottom navigation`, !mobileNav.overlap, mobileNav);
    }
  }

  if (screenshot) {
    await page.screenshot({ path: path.join(OUT, `${safeName(name)}-${width}.png`), fullPage: true });
  }

  const record = { name, url, width, topElapsedMs, top, mid, bottom, consent, mobileNav };
  results.pageMatrix.push(record);
  return record;
}

async function preventNextNavigation(page, selector) {
  await page.locator(selector).evaluate(el => el.addEventListener('click', e => e.preventDefault(), { capture: true, once: true }));
}

async function clickWhatsAppAndCapture(page, selector = 'a[aria-label="Chat with us on WhatsApp"]') {
  const locator = page.locator(selector).first();
  const href = await locator.getAttribute('href');
  const beforeCount = results.network.whatsappPayloads.length;
  const reqPromise = page.waitForRequest(r => r.url().includes('/api/attribution/whatsapp-click') && r.method() === 'POST', { timeout: 8000 }).catch(() => null);
  await preventNextNavigation(page, selector);
  await locator.click({ timeout: 10000 });
  const req = await reqPromise;
  if (req) {
    let payload = null;
    try { payload = req.postDataJSON(); } catch { payload = req.postData(); }
    results.network.whatsappPayloads.push({ url: page.url(), payload });
  }
  await sleep(700);
  return { href, message: whatsappMessage(href || ''), reference: whatsappRef(whatsappMessage(href || '')), requestCaptured: results.network.whatsappPayloads.length > beforeCount, request: req ? results.network.whatsappPayloads.at(-1) : null };
}

async function clickNoBeaconExpected(page, selector = 'a[aria-label="Chat with us on WhatsApp"]') {
  const locator = page.locator(selector).first();
  const href = await locator.getAttribute('href');
  let seen = false;
  const onReq = r => { if (r.url().includes('/api/attribution/whatsapp-click')) seen = true; };
  page.on('request', onReq);
  await preventNextNavigation(page, selector);
  await locator.click();
  await sleep(900);
  page.off('request', onReq);
  return { href, message: whatsappMessage(href || ''), reference: whatsappRef(whatsappMessage(href || '')), beaconSeen: seen };
}

async function findContextualWhatsApp(page, regex) {
  const anchors = page.locator('a[href*="wa.me"]');
  const count = await anchors.count();
  for (let i = 0; i < count; i++) {
    const a = anchors.nth(i);
    const href = await a.getAttribute('href');
    const message = whatsappMessage(href || '');
    if (regex.test(message)) return { index: i, href, message, reference: whatsappRef(message) };
  }
  return null;
}

async function main() {
  const exe = executable();
  results.browserExecutable = exe;
  if (!exe) throw new Error('No Chrome/Chromium executable on GitHub runner');
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    page.on('console', msg => { if (msg.type() === 'error') results.errors.push({ page: page.url(), console: msg.text() }); });
    page.on('request', req => {
      if (req.url().includes('/api/meta/event') && req.method() === 'POST') {
        let payload = null; try { payload = req.postDataJSON(); } catch { payload = req.postData(); }
        results.network.metaPayloads.push({ url: page.url(), payload });
      }
    });

    const qaTag = `r2qa-${Date.now()}`;
    const landing = `${BASE}/?utm_source=r2qa&utm_medium=automation&utm_campaign=tracking_v2_live&gclid=${qaTag}`;
    await goto(page, landing);
    const consentBefore = await cookieDialogInfo(page);
    const topBeforeConsent = await inspectFab(page, 'homepage-before-consent');
    check('Homepage FAB visible before consent choice', topBeforeConsent.visible, { consentVisible: consentBefore.visible });
    if (consentBefore.visible && topBeforeConsent.box) {
      check('Cookie consent z-index outranks FAB', Number(consentBefore.zIndex) > Number(topBeforeConsent.zIndex), { consentZ: consentBefore.zIndex, fabZ: topBeforeConsent.zIndex, overlap: overlaps(consentBefore.box, topBeforeConsent.box) });
    }
    await dismissConsent(page, 'essential');
    results.cookies.afterEssentialOnly = await context.cookies();
    check('Essential-only consent leaves _fbp/_fbc absent', !results.cookies.afterEssentialOnly.some(c => c.name === '_fbp' || c.name === '_fbc'), { cookieNames: results.cookies.afterEssentialOnly.map(c => c.name) });

    await goto(page, `${BASE}/shop/all`);
    await dismissConsent(page, 'essential');
    const hrefs = await page.locator('a[href^="/shop/"]').evaluateAll(as => [...new Set(as.map(a => a.getAttribute('href')).filter(Boolean))]);
    const productPaths = hrefs.filter(h => /^\/shop\/[^/]+\/[^/]+\/?$/.test(h));
    if (productPaths.length < 2) throw new Error(`Could not discover two product links; found ${productPaths.length}`);
    const product1Path = productPaths[0];
    const product2Path = productPaths.find(p => p !== product1Path) || productPaths[1];
    const categoryPath = '/' + product1Path.split('/').filter(Boolean).slice(0, 2).join('/');
    results.discovery = { qaTag, product1Path, product2Path, categoryPath, productPaths: productPaths.slice(0, 10) };

    const pageSet = [
      ['homepage', `${BASE}/`], ['shop-all', `${BASE}/shop/all`], ['category', `${BASE}${categoryPath}`],
      ['product-1', `${BASE}${product1Path}`], ['product-2', `${BASE}${product2Path}`], ['showroom', `${BASE}/showroom`],
      ['swatches', `${BASE}/swatches`], ['contact', `${BASE}/contact`], ['account', `${BASE}/account`], ['track-order', `${BASE}/track-order`],
    ];
    for (const [name, url] of pageSet) await pageChecks(page, name, url, 390, { screenshot: ['homepage','product-1','contact'].includes(name) });

    for (const width of [320, 430, 1440]) {
      const c = await browser.newContext({ viewport: { width, height: width >= 1024 ? 900 : 844 }, ignoreHTTPSErrors: true });
      const p = await c.newPage();
      await pageChecks(p, 'homepage', `${BASE}/`, width, { screenshot: true });
      await pageChecks(p, 'product-1', `${BASE}${product1Path}`, width, { screenshot: width === 320 || width === 1440 });
      await c.close();
    }

    await goto(page, `${BASE}/`); await dismissConsent(page, 'essential');
    const safeAreaRule = await page.evaluate(() => {
      const found = [];
      for (const sheet of [...document.styleSheets]) {
        try { for (const rule of [...sheet.cssRules]) { const text = rule.cssText || ''; if (text.includes('.fab-offset') || (text.includes('safe-area-inset-bottom') && text.includes('bottom-nav'))) found.push(text); } } catch {}
      }
      return found;
    });
    check('Live CSS includes safe-area-aware FAB offset', safeAreaRule.some(t => t.includes('safe-area-inset-bottom')), { matchingRules: safeAreaRule.slice(0, 5) });

    const genericFab = await inspectFab(page, 'generic-fab');
    check('Generic FAB message is sofa enquiry + UKSS reference', genericFab.message.includes('help with a sofa enquiry') && !!genericFab.reference, { message: genericFab.message });
    const beforeDouble = results.network.whatsappPayloads.length;
    const firstGenericClick = await clickWhatsAppAndCapture(page);
    await preventNextNavigation(page, 'a[aria-label="Chat with us on WhatsApp"]');
    await page.locator('a[aria-label="Chat with us on WhatsApp"]').click(); await sleep(900);
    const doubleDelta = results.network.whatsappPayloads.length - beforeDouble;
    check('Same prepared WhatsApp ref writes exactly one beacon on repeated click', doubleDelta === 1, { doubleDelta, reference: firstGenericClick.reference });

    await goto(page, `${BASE}${product1Path}`); await dismissConsent(page, 'essential');
    const marker1 = page.locator('[data-whatsapp-product-context]'); await marker1.waitFor({ state: 'attached', timeout: 10000 });
    const ctx1 = await marker1.evaluate(el => ({ productId: el.dataset.productId, variantId: el.dataset.variantId, productName: el.dataset.productName }));
    const p1Fab = await inspectFab(page, 'product1-fab');
    check('Product #1 FAB names actual product', !!ctx1.productName && p1Fab.message.includes(`this product: ${ctx1.productName}`) && !!p1Fab.reference, { context: ctx1, message: p1Fab.message });
    const click1 = await clickWhatsAppAndCapture(page); const payload1 = click1.request?.payload || {};
    check('Product #1 WhatsApp beacon carries current product/variant/name', click1.requestCaptured && payload1.productId === ctx1.productId && payload1.variantId === ctx1.variantId && payload1.productName === ctx1.productName && payload1.reference === click1.reference, { payload: payload1, context: ctx1 });

    let variantResult = { attempted: false };
    const materialGroup = page.locator('[role="group"][aria-label="Material"]');
    if (await materialGroup.count()) {
      const candidates = materialGroup.locator('button[aria-pressed="false"]');
      if (await candidates.count()) {
        variantResult.attempted = true; const before = ctx1.variantId; await candidates.first().click();
        await page.waitForFunction(prev => document.querySelector('[data-whatsapp-product-context]')?.getAttribute('data-variant-id') !== prev, before, { timeout: 10000 }).catch(() => {}); await sleep(500);
        const ctx2 = await marker1.evaluate(el => ({ productId: el.dataset.productId, variantId: el.dataset.variantId, productName: el.dataset.productName }));
        const click2 = await clickWhatsAppAndCapture(page); const payload2 = click2.request?.payload || {};
        variantResult = { attempted: true, before, after: ctx2.variantId, oldRef: click1.reference, newRef: click2.reference, payload: payload2 };
        check('Variant change updates marker and mints fresh WhatsApp reference', !!ctx2.variantId && ctx2.variantId !== before && click2.reference !== click1.reference && payload2.variantId === ctx2.variantId, variantResult);
      }
    }
    results.variantTest = variantResult;

    await goto(page, `${BASE}${product2Path}`); await dismissConsent(page, 'essential');
    const marker2 = page.locator('[data-whatsapp-product-context]'); await marker2.waitFor({ state: 'attached', timeout: 10000 });
    const ctxP2 = await marker2.evaluate(el => ({ productId: el.dataset.productId, variantId: el.dataset.variantId, productName: el.dataset.productName }));
    const p2Fab = await inspectFab(page, 'product2-fab');
    check('Product #2 FAB names different actual product', !!ctxP2.productName && ctxP2.productName !== ctx1.productName && p2Fab.message.includes(`this product: ${ctxP2.productName}`) && !!p2Fab.reference, { product1: ctx1.productName, product2: ctxP2.productName, message: p2Fab.message });
    const clickP2 = await clickWhatsAppAndCapture(page); const payloadP2 = clickP2.request?.payload || {};
    check('Product #2 beacon carries its own product context', payloadP2.productId === ctxP2.productId && payloadP2.variantId === ctxP2.variantId && payloadP2.productName === ctxP2.productName, { payload: payloadP2, context: ctxP2 });
    results.productTests.push({ path: product1Path, context: ctx1, click: click1 }, { path: product2Path, context: ctxP2, click: clickP2 });

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.55)); await sleep(800);
    const sticky = page.locator('[data-bottom-bar]').first();
    if (await sticky.count() && await sticky.isVisible().catch(() => false)) {
      const stickyBox = await sticky.boundingBox(); const fabNow = await inspectFab(page, 'product-sticky');
      check('FAB moves above visible sticky product bar', fabNow.visible && !overlaps(fabNow.box, stickyBox) && fabNow.box.y + fabNow.box.height <= stickyBox.y + 1, { fab: fabNow.box, sticky: stickyBox });
      await page.screenshot({ path: path.join(OUT, 'product-sticky-390.png'), fullPage: false });
    } else check('FAB moves above visible sticky product bar', false, { reason: 'Sticky bar did not become visible in test scroll position' });

    await page.evaluate(() => window.scrollTo(0, 0)); await sleep(300);
    const add = page.getByRole('button', { name: /Add to cart/i }).first(); let addResult = { attempted: false };
    if (await add.count()) {
      addResult.attempted = true; const beforeMeta = results.network.metaPayloads.length; await add.click(); await sleep(900);
      const addedText = await page.getByText(/Added to cart/i).count(); addResult = { attempted: true, addedText, metaDelta: results.network.metaPayloads.length - beforeMeta };
      check('Add-to-cart UI action executed safely', addedText > 0 || addResult.metaDelta > 0, addResult);
    }
    results.addToCartTest = addResult;

    await goto(page, `${BASE}/`); await dismissConsent(page, 'essential');
    const cartControl = page.getByText(/^Cart$/).first();
    if (await cartControl.count()) {
      await cartControl.click().catch(() => {}); await sleep(500); const fabCart = await inspectFab(page, 'cart-open'); const dialogs = page.locator('[role="dialog"]'); let visibleDialog = null;
      for (let i = 0; i < await dialogs.count(); i++) if (await dialogs.nth(i).isVisible().catch(() => false)) { visibleDialog = dialogs.nth(i); break; }
      if (visibleDialog) { const dbox = await visibleDialog.boundingBox(); const dz = Number(await visibleDialog.evaluate(el => getComputedStyle(el).zIndex) || 0); check('Active cart/modal UI outranks FAB', dz > Number(fabCart.zIndex || 0), { dialogZ: dz, fabZ: fabCart.zIndex, overlap: overlaps(dbox, fabCart.box) }); }
      results.cartCheck = { fab: fabCart, dialogVisible: !!visibleDialog };
    }

    for (const [name, pathName, regex] of [['showroom','/showroom',/showroom|visiting/i],['swatches','/swatches',/swatch|fabric|colour|sample/i]]) {
      await goto(page, `${BASE}${pathName}`); await dismissConsent(page, 'essential'); const contextual = await findContextualWhatsApp(page, regex); results.contextualMessages.push({ name, ...contextual });
      check(`${name} contextual WhatsApp message + reference`, !!contextual && !!contextual.reference && regex.test(contextual.message), contextual || {});
    }

    for (const supportPath of ['/account', '/track-order']) {
      await goto(page, `${BASE}${supportPath}`); await dismissConsent(page, 'essential'); const supportFab = await inspectFab(page, `support-${supportPath}`); const supportClick = await clickNoBeaconExpected(page);
      check(`${supportPath} support FAB has no acquisition reference`, !supportFab.reference && !supportClick.reference && /existing order|account/i.test(supportFab.message), { message: supportFab.message, beaconSeen: supportClick.beaconSeen });
      check(`${supportPath} support click creates no WhatsApp acquisition beacon`, !supportClick.beaconSeen, supportClick);
    }

    const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true }); const phonePage = await phoneContext.newPage(); const phoneMeta = [];
    phonePage.on('request', req => { if (req.url().includes('/api/meta/event') && req.method() === 'POST') { let payload = null; try { payload = req.postDataJSON(); } catch { payload = req.postData(); } phoneMeta.push(payload); } });
    await goto(phonePage, `${BASE}/contact`); await dismissConsent(phonePage, 'accept'); await sleep(1200); const tel = phonePage.locator('a[href^="tel:"]').first();
    if (await tel.count()) { await tel.evaluate(el => el.addEventListener('click', e => e.preventDefault(), { capture: true, once: true })); await tel.click(); await sleep(1200); check('Phone CTA still works and emits call_click ledger request when consent granted', phoneMeta.some(p => p?.ledgerAction === 'call_click'), { phoneMeta }); }
    else check('Phone CTA still works and emits call_click ledger request when consent granted', false, { reason: 'No tel link found' });
    results.cookies.afterAcceptAll = await phoneContext.cookies(); await phoneContext.close();

    results.checkoutStart = { attempted: false };
    if (addResult.attempted) {
      await goto(page, `${BASE}/checkout`); await dismissConsent(page, 'accept'); const checkoutMetaBefore = results.network.metaPayloads.length; const continueBtn = page.getByRole('button', { name: /checkout|continue|details|delivery/i }).first();
      if (await continueBtn.count()) { results.checkoutStart.attempted = true; await continueBtn.click().catch(() => {}); await sleep(1000); results.checkoutStart.metaDelta = results.network.metaPayloads.length - checkoutMetaBefore; }
    }

    await context.close();
  } finally { await browser.close(); }

  results.finishedAt = new Date().toISOString(); results.summary = { pass: results.checks.filter(c => c.pass).length, fail: results.checks.filter(c => !c.pass).length, total: results.checks.length };
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2)); console.log(JSON.stringify(results.summary)); if (results.summary.fail > 0) process.exitCode = 2;
}

main().catch(err => { results.errors.push({ fatal: String(err?.stack || err) }); results.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2)); console.error(err); process.exitCode = 1; });
