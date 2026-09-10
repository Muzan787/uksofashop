import { chromium } from 'playwright'

const BASE = process.env.PHASE_D_PREVIEW_URL
if (!BASE) throw new Error('PHASE_D_PREVIEW_URL is required')
const cart = [{ variant_id:'1ba97d1f-f890-48f8-8ab9-57cbb147f388', quantity:1, price:999, title:'Phase D diagnostic cart', color:'Beige', image_url:'', fabric_id:null, fabric_label:'Beige', fabric_code:'QA-DIAG', fabric_swatch:null }]
const browser = await chromium.launch({ headless:true })
try {
  const context = await browser.newContext({ viewport:{ width:390, height:844 } })
  const page = await context.newPage()
  await page.addInitScript(initialCart => localStorage.setItem('uksofashop_cart', JSON.stringify(initialCart)), cart)
  const response = await page.goto(`${BASE}/checkout`, { waitUntil:'domcontentloaded', timeout:30000 })
  await page.waitForTimeout(2000)
  const diagnostic = await page.evaluate(() => ({
    href: location.href,
    title: document.title,
    body: document.body?.innerText?.slice(0, 2500) || '',
    cart: localStorage.getItem('uksofashop_cart'),
    htmlLang: document.documentElement.lang,
  })).catch(err => ({ href: page.url(), evaluateError:String(err) }))
  console.log('[phase-d-preview-diag]', JSON.stringify({
    status: response?.status() ?? null,
    responseUrl: response?.url() ?? null,
    ...diagnostic,
  }, null, 2))
  await context.close()
} finally {
  await browser.close()
}
