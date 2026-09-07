const { chromium } = require('playwright-core');

const base = process.env.QA_URL || 'http://127.0.0.1:3000';
const productPath = '/shop/corner-sofa/verona-high-back-4-seater-corner-1c2';
const googleQuery = '?gclid=QA-GCLID&utm_source=google&utm_medium=cpc&utm_campaign=v21qa';
const metaQuery = '?fbclid=QA-FBCLID&utm_source=facebook&utm_medium=paid_social&utm_campaign=v21qa';

function cookieMap(cookies) {
  return Object.fromEntries(cookies.map(c => [c.name, c.value]));
}

function parseJsonCookie(raw) {
  return JSON.parse(decodeURIComponent(raw));
}

async function fresh(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  await context.addInitScript(() => {
    const started = Date.now();
    const push = (type, data = {}) => {
      window.__trackingV21QaTimeline = window.__trackingV21QaTimeline || [];
      window.__trackingV21QaTimeline.push({ t: Date.now() - started, type, ...data });
    };
    window.__trackingV21QaTimeline = [];
    window.__trackingV21QaPush = push;

    const originalAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type === 'cookies_accepted' || type === 'cookie_consent_changed') {
        push('listener_attached', { event: type, target: this === window ? 'window' : this?.constructor?.name || 'unknown' });
      }
      return originalAdd.call(this, type, listener, options);
    };

    const originalDispatch = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function(event) {
      if (event?.type === 'cookies_accepted' || event?.type === 'cookie_consent_changed') {
        let consent = null;
        try { consent = localStorage.getItem('cookie_consent'); } catch {}
        push('event_dispatched', { event: event.type, consent, search: location.search });
      }
      return originalDispatch.call(this, event);
    };

    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'cookie_consent') push('consent_storage_write', { value });
      return originalSetItem.call(this, key, value);
    };

    try {
      const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
      if (descriptor?.get && descriptor?.set) {
        Object.defineProperty(document, 'cookie', {
          configurable: true,
          get() { return descriptor.get.call(document); },
          set(value) {
            if (String(value).includes('uksofashop_ft') || String(value).includes('uksofashop_lt')) {
              let consent = null;
              try { consent = localStorage.getItem('cookie_consent'); } catch {}
              push('touch_cookie_write_attempt', {
                value: String(value),
                consent,
                search: location.search,
                hostname: location.hostname,
              });
            }
            return descriptor.set.call(document, value);
          },
        });
      }
    } catch (error) {
      push('cookie_instrumentation_error', { message: String(error) });
    }
  });

  const page = await context.newPage();
  await page.route(/googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com\/tr/, r => r.fulfill({ status: 204, body: '' }));
  return { context, page };
}

async function waitForCookie(context, name, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const c = cookieMap(await context.cookies());
    if (c[name]) return c[name];
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
}

async function waitForNoCookie(context, name, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const c = cookieMap(await context.cookies());
    if (!c[name]) return true;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

async function operationalIds(context) {
  const c = cookieMap(await context.cookies());
  for (const name of ['uksofashop_vid', 'uksofashop_sid', 'uksofashop_aid']) {
    if (!c[name]) throw new Error(`missing operational cookie ${name}`);
  }
  return c;
}

async function state(page, context) {
  const browserState = await page.evaluate(() => ({
    href: location.href,
    hostname: location.hostname,
    search: location.search,
    consent: localStorage.getItem('cookie_consent'),
    documentCookie: document.cookie,
    timeline: window.__trackingV21QaTimeline || [],
  }));
  return { ...browserState, cookieStore: cookieMap(await context.cookies()) };
}

async function acceptAll(page) {
  const button = page.getByRole('button', { name: 'Accept all' }).first();
  await button.waitFor({ state: 'visible', timeout: 10000 });
  await page.evaluate(() => window.__trackingV21QaPush?.('qa_click_accept', { search: location.search }));
  await button.click();
  await page.waitForFunction(() => localStorage.getItem('cookie_consent') === 'granted', null, { timeout: 10000 });
}

async function essentialOnly(page) {
  const button = page.getByRole('button', { name: 'Essential only' }).first();
  await button.waitFor({ state: 'visible', timeout: 10000 });
  await page.evaluate(() => window.__trackingV21QaPush?.('qa_click_reject', { search: location.search }));
  await button.click();
  await page.waitForFunction(() => localStorage.getItem('cookie_consent') === 'denied', null, { timeout: 10000 });
}

function assertGoogleTouch(raw) {
  const lt = parseJsonCookie(raw);
  if (lt.gclid !== 'QA-GCLID' || lt.source !== 'google' || lt.medium !== 'cpc' || lt.campaign !== 'v21qa') {
    throw new Error(`Google last-touch mismatch: ${JSON.stringify(lt)}`);
  }
  return lt;
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox'],
  });

  try {
    const result = { host: new URL(base).hostname, consentMatrix: {}, google: null, meta: null, whatsapp: null };

    // CASE A — tagged + no consent.
    {
      const { context, page } = await fresh(browser);
      await page.goto(base + productPath + googleQuery, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.getByRole('button', { name: 'Accept all' }).first().waitFor({ state: 'visible', timeout: 10000 });
      const before = await state(page, context);
      await operationalIds(context);
      if (!before.search.includes('gclid=QA-GCLID')) throw new Error('Case A query parameters did not survive initial landing');
      if (before.cookieStore.uksofashop_lt || before.cookieStore.uksofashop_ft) throw new Error('Case A persisted marketing touch before consent');
      result.consentMatrix.A = { consent: before.consent, search: before.search, lt: false, ft: false };
      await context.close();
    }

    // CASE B — tagged + accept.
    {
      const { context, page } = await fresh(browser);
      await page.goto(base + productPath + googleQuery, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.getByRole('button', { name: 'Accept all' }).first().waitFor({ state: 'visible', timeout: 10000 });
      const before = await state(page, context);
      await acceptAll(page);
      const rawLt = await waitForCookie(context, 'uksofashop_lt', 10000);
      const rawFt = await waitForCookie(context, 'uksofashop_ft', 10000);
      const after = await state(page, context);
      if (!rawLt || !rawFt) throw new Error(`Case B missing touch cookie after consent: ${JSON.stringify(after)}`);
      if (before.search !== after.search || !after.search.includes('gclid=QA-GCLID')) throw new Error(`Case B query changed across consent: ${before.search} -> ${after.search}`);
      const lt = assertGoogleTouch(rawLt);
      result.consentMatrix.B = { consent: after.consent, searchBefore: before.search, searchAfter: after.search, lt: true, ft: true };
      result.google = { touch: lt, timeline: after.timeline };
      await context.close();
    }

    // CASE C — tagged + reject.
    {
      const { context, page } = await fresh(browser);
      await page.goto(base + productPath + googleQuery, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await essentialOnly(page);
      const after = await state(page, context);
      if (after.cookieStore.uksofashop_lt || after.cookieStore.uksofashop_ft) throw new Error(`Case C retained marketing touch after reject: ${JSON.stringify(after)}`);
      result.consentMatrix.C = { consent: after.consent, search: after.search, lt: false, ft: false };
      await context.close();
    }

    // CASE D — accept, then withdraw via the real /cookies preference control.
    {
      const { context, page } = await fresh(browser);
      await page.goto(base + productPath + googleQuery, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await acceptAll(page);
      if (!await waitForCookie(context, 'uksofashop_lt', 10000)) throw new Error('Case D setup did not create last-touch');
      await page.goto(base + '/cookies', { waitUntil: 'domcontentloaded', timeout: 45000 });
      const withdraw = page.getByRole('button', { name: 'Essential only' }).first();
      await withdraw.waitFor({ state: 'visible', timeout: 10000 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null),
        withdraw.click(),
      ]);
      await page.waitForFunction(() => localStorage.getItem('cookie_consent') === 'denied', null, { timeout: 10000 });
      if (!await waitForNoCookie(context, 'uksofashop_lt', 10000) || !await waitForNoCookie(context, 'uksofashop_ft', 10000)) {
        throw new Error(`Case D failed to clear touch cookies: ${JSON.stringify(await state(page, context))}`);
      }
      const c = await operationalIds(context);
      result.consentMatrix.D = { consent: 'denied', lt: false, ft: false, operationalIdsRemain: Boolean(c.uksofashop_vid && c.uksofashop_sid && c.uksofashop_aid) };
      await context.close();
    }

    // Meta-tagged acceptance.
    {
      const { context, page } = await fresh(browser);
      await page.goto(base + productPath + metaQuery, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await acceptAll(page);
      const rawLt = await waitForCookie(context, 'uksofashop_lt', 10000);
      if (!rawLt) throw new Error(`Meta-tagged visitor missing last-touch: ${JSON.stringify(await state(page, context))}`);
      const lt = parseJsonCookie(rawLt);
      if (lt.fbclid !== 'QA-FBCLID' || lt.source !== 'facebook' || lt.medium !== 'paid_social' || lt.campaign !== 'v21qa') {
        throw new Error(`Meta last-touch mismatch: ${JSON.stringify(lt)}`);
      }
      result.meta = { touch: lt };
      await context.close();
    }

    // Persist the consent evidence before unrelated UI smoke runs.
    console.log('TRACKING_V21_CONSENT_DIAGNOSTIC=' + JSON.stringify({
      host: result.host,
      consentMatrix: result.consentMatrix,
      google: result.google,
      meta: result.meta,
    }));

    // Product acquisition WhatsApp persists reference before navigation.
    {
      const { context, page } = await fresh(browser);
      await page.goto(base + productPath, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await essentialOnly(page);
      await page.waitForTimeout(450);
      await page.evaluate(() => {
        document.addEventListener('click', e => {
          const a = e.target instanceof Element ? e.target.closest('a[href^="https://wa.me/"]') : null;
          if (a) e.preventDefault();
        }, true);
      });
      const wa = page.locator('a[href^="https://wa.me/"]:visible').first();
      await wa.waitFor({ state: 'visible', timeout: 10000 });
      await wa.click();
      const ref = await waitForCookie(context, 'uksofashop_wa', 5000);
      if (!/^UKSS-WA-\d{6}-[A-Z0-9]{6}$/.test(ref || '')) throw new Error(`bad persisted WhatsApp reference: ${ref}`);
      const href = await wa.getAttribute('href');
      if (!href || (!href.includes(encodeURIComponent(ref)) && !decodeURIComponent(href).includes(ref))) throw new Error(`WhatsApp href missing ref ${ref}`);
      result.whatsapp = { persisted: true, reference: ref };
      await context.close();
    }

    // Support-only WhatsApp must not mint acquisition cookie.
    {
      const { context, page } = await fresh(browser);
      await page.goto(base + '/track-order', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await essentialOnly(page);
      await page.waitForTimeout(450);
      await page.evaluate(() => {
        document.addEventListener('click', e => {
          const a = e.target instanceof Element ? e.target.closest('a[href^="https://wa.me/"]') : null;
          if (a) e.preventDefault();
        }, true);
      });
      const wa = page.locator('a[href^="https://wa.me/"]:visible').first();
      if (await wa.count()) await wa.click();
      if ((await cookieMap(await context.cookies())).uksofashop_wa) throw new Error('support-only WhatsApp minted acquisition cookie');
      await context.close();
    }

    // Direct checkout remains reachable and invents no marketing attribution.
    {
      const { context, page } = await fresh(browser);
      const response = await page.goto(base + '/checkout', { waitUntil: 'domcontentloaded', timeout: 45000 });
      if (!response || !response.ok()) throw new Error(`/checkout HTTP ${response && response.status()}`);
      const c = await operationalIds(context);
      if (c.uksofashop_lt || c.uksofashop_ft) throw new Error('direct checkout invented marketing attribution');
      await context.close();
    }

    console.log('TRACKING_V21_BROWSER_RESULT=' + JSON.stringify(result));
    console.log('Tracking V2.1 browser smoke PASS');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
