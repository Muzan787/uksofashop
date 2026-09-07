const { chromium } = require('playwright-core');

const base = process.env.QA_URL;
const widths = [320, 390, 430, 1440];
const results = [];

async function quiet(page) {
  await page.route('**/api/attribution/**', r => r.fulfill({ status: 204, body: '' }));
  await page.route('**/api/meta/**', r => r.fulfill({ status: 204, body: '' }));
  await page.route(/googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com\/tr/, r => r.fulfill({ status: 204, body: '' }));
}

async function dismiss(page) {
  const b = page.getByRole('button', { name: 'Essential only' });
  if (await b.count()) {
    try {
      await b.first().click({ timeout: 1500 });
      await page.waitForTimeout(450);
    } catch {}
  }
}

async function go(page, path) {
  const r = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (!r || !r.ok()) throw new Error(`${path}: HTTP ${r && r.status()}`);
  await page.waitForTimeout(700);
  await dismiss(page);
}

async function uniqueProductHrefs(page, category) {
  await go(page, `/shop/${category}`);
  return page.locator(`a[href^="/shop/${category}/"]`).evaluateAll(as =>
    [...new Set(as.map(a => a.getAttribute('href')).filter(Boolean))],
  );
}

async function findPdp(page, category, wantCustom) {
  const hrefs = await uniqueProductHrefs(page, category);
  for (const href of hrefs.slice(0, 12)) {
    await go(page, href);
    const custom = (await page.getByText('Made to Order', { exact: true }).count()) > 0;
    if (custom === wantCustom) return href;
  }
  throw new Error(`${category}: could not find wantCustom=${wantCustom}`);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox'],
  });

  try {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 } });
      const page = await context.newPage();
      await quiet(page);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));

      await go(page, '/');
      const home = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      if (!/sofas available/i.test(home)) throw new Error(`${width}: catalogue availability wording missing`);
      if (/\bin stock\b/i.test(home)) throw new Error(`${width}: homepage still says in stock`);
      if (!/Fabric sofas made to your size\. Delivered free\. Pay on arrival\./i.test(home)) throw new Error(`${width}: hero customisation wording missing`);
      if (!/Pay Cash or by Bank Transfer on Delivery/i.test(home)) throw new Error(`${width}: payment announcement missing`);
      if (/Cash on Delivery Available Nationwide/i.test(home)) throw new Error(`${width}: nationwide wording remains`);

      const footer = page.locator('footer');
      await footer.scrollIntoViewIfNeeded();
      const footerText = (await footer.innerText()).replace(/\s+/g, ' ');
      if (!/Custom Options/i.test(footerText) || !/Fabric & size options available/i.test(footerText)) {
        throw new Error(`${width}: safe global custom promise missing`);
      }
      if (await footer.locator('a[href="https://www.tiktok.com"]').count()) throw new Error(`${width}: placeholder TikTok visible`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`${width}: homepage horizontal overflow ${overflow}`);

      await go(page, '/delivery-returns');
      const delivery = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      for (const s of ['2–3 working days', '3–4 working days', '5–7 working days', 'Ask us first']) {
        if (!delivery.includes(s)) throw new Error(`${width}: delivery band missing ${s}`);
      }
      if (/England, Scotland and Wales alike/i.test(delivery)) throw new Error(`${width}: old universal delivery wording remains`);

      for (const cat of ['fabric-sofa', 'leather-sofa', 'electric-sofa']) {
        await go(page, `/shop/${cat}`);
        const txt = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
        if (!/5–7 working days/.test(txt)) throw new Error(`${width}: ${cat} missing slower-band qualification`);
        const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 1) throw new Error(`${width}: ${cat} horizontal overflow ${ov}`);
      }

      if (width === 390) {
        const customHref = await findPdp(page, 'fabric-sofa', true);
        const customText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
        if (!/Made to Order/.test(customText)) throw new Error('custom PDP lost Made to Order');
        if (!/Some Wales and Scotland postcodes take 5–7 working days/.test(customText)) throw new Error('custom PDP missing slower-band qualification');

        const input = page.locator('#estimator-postcode');
        if (await input.count()) {
          await input.fill('BB6 7LS');
          await page.getByRole('button', { name: 'Check', exact: true }).click();
          await page.waitForTimeout(600);
          const txt = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
          if (!/Most UK Mainland orders arrive in 2–4 working days/.test(txt)) {
            throw new Error('postcode estimator still uses false exact timing');
          }
        }

        const fixedHref = await findPdp(page, 'leather-sofa', false);
        if (await page.getByText('Made to Order', { exact: true }).count()) {
          throw new Error(`fixed PDP ${fixedHref} falsely claims Made to Order`);
        }
        results.push({ customHref, fixedHref });
      }

      if (errors.length) throw new Error(`${width}: runtime errors ${JSON.stringify(errors)}`);
      results.push({ width, home: true, delivery: true, categories: true, overflow });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
})().catch(e => {
  console.error(e);
  process.exit(1);
});
