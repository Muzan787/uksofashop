const { chromium } = require('playwright-core');

const base = process.env.QA_URL || 'http://127.0.0.1:3000';
const productPath = '/shop/corner-sofa/verona-high-back-4-seater-corner-1c2';

function cookieMap(cookies) {
  return Object.fromEntries(cookies.map(c => [c.name, c.value]));
}

async function fresh(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.route(/googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com\/tr/, r => r.fulfill({ status: 204, body: '' }));
  return { context, page };
}

async function acceptAll(page) {
  const button = page.getByRole('button', { name: 'Accept all' });
  if (await button.count()) {
    await button.first().click();
    await page.waitForTimeout(250);
  }
}

async function operationalIds(context) {
  const c = cookieMap(await context.cookies());
  for (const name of ['uksofashop_vid', 'uksofashop_sid', 'uksofashop_aid']) {
    if (!c[name]) throw new Error(`missing operational cookie ${name}`);
  }
  return c;
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox'],
  });

  try {
    // A. Direct/organic browser gets operational IDs without marketing touch data.
    {
      const { context, page } = await fresh(browser);
      await page.goto(base + productPath, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(500);
      const c = await operationalIds(context);
      if (c.uksofashop_lt) throw new Error('direct visitor unexpectedly has consent-gated last-touch before consent');
      await context.close();
    }

    // B. Google-tagged visitor: after consent, the URL gclid/UTMs are retained in last-touch.
    {
      const { context, page } = await fresh(browser);
      await page.goto(base + productPath + '?gclid=QA-GCLID&utm_source=google&utm_medium=cpc&utm_campaign=v21qa', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await acceptAll(page);
      await page.waitForTimeout(400);
      const c = await operationalIds(context);
      if (!c.uksofashop_lt) throw new Error('Google-tagged visitor missing last-touch after consent');
      const lt = JSON.parse(c.uksofashop_lt);
      if (lt.gclid !== 'QA-GCLID' || lt.source !== 'google' || lt.medium !== 'cpc' || lt.campaign !== 'v21qa') {
        throw new Error(`Google last-touch mismatch: ${JSON.stringify(lt)}`);
      }
      await context.close();
    }

    // C. Meta-tagged visitor: fbclid is retained only as the real URL identifier supplied.
    {
      const { context, page } = await fresh(browser);
      await page.goto(base + productPath + '?fbclid=QA-FBCLID&utm_source=facebook&utm_medium=paid_social&utm_campaign=v21qa', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await acceptAll(page);
      await page.waitForTimeout(400);
      const c = await operationalIds(context);
      const lt = JSON.parse(c.uksofashop_lt || '{}');
      if (lt.fbclid !== 'QA-FBCLID' || lt.source !== 'facebook' || lt.medium !== 'paid_social') {
        throw new Error(`Meta last-touch mismatch: ${JSON.stringify(lt)}`);
      }
      await context.close();
    }

    // D. Product WhatsApp click: acquisition reference is persisted before navigation.
    {
      const { context, page } = await fresh(browser);
      await page.goto(base + productPath, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(600);
      await page.evaluate(() => {
        document.addEventListener('click', e => {
          const a = e.target instanceof Element ? e.target.closest('a[href^="https://wa.me/"]') : null;
          if (a) e.preventDefault();
        }, true);
      });
      const wa = page.locator('a[href^="https://wa.me/"]').first();
      if (!(await wa.count())) throw new Error('product page has no WhatsApp acquisition link');
      await wa.click({ timeout: 5000 });
      await page.waitForTimeout(250);
      const c = await operationalIds(context);
      const ref = c.uksofashop_wa;
      if (!/^UKSS-WA-\d{6}-[A-Z0-9]{6}$/.test(ref || '')) throw new Error(`bad persisted WhatsApp reference: ${ref}`);
      const href = await wa.getAttribute('href');
      if (!href || !href.includes(encodeURIComponent(ref)) && !decodeURIComponent(href).includes(ref)) {
        throw new Error(`WhatsApp href does not carry persisted reference ${ref}`);
      }
      await context.close();
    }

    // E. Direct website checkout remains reachable and does not invent campaign attribution.
    {
      const { context, page } = await fresh(browser);
      const r = await page.goto(base + '/checkout', { waitUntil: 'domcontentloaded', timeout: 45000 });
      if (!r || !r.ok()) throw new Error(`/checkout HTTP ${r && r.status()}`);
      const c = await operationalIds(context);
      if (c.uksofashop_lt) throw new Error('direct checkout invented marketing last-touch');
      await context.close();
    }

    console.log('Tracking V2.1 browser smoke PASS');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
