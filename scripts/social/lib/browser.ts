// scripts/social/lib/browser.ts
//
// Playwright, with a fallback chain. The bundled Chromium is preferred because
// it renders the same on every machine, but it is a 150MB download from a CDN
// that is not always reachable, so an installed Chrome or Edge is used when
// it is missing. All three are Chromium; the only thing that could differ
// between them is font hinting, and the fonts are loaded from Google Fonts
// rather than the OS so even that is fixed.

import { chromium, type Browser } from 'playwright'

const INSTALL_HINT =
  'No Chromium found. Either run `npx playwright install chromium` or install Google Chrome or Microsoft Edge.'

export async function launchBrowser(): Promise<Browser> {
  const attempts: Array<Parameters<typeof chromium.launch>[0]> = [
    {},
    { channel: 'chrome' },
    { channel: 'msedge' },
  ]

  let lastError: unknown
  for (const options of attempts) {
    try {
      return await chromium.launch(options)
    } catch (error) {
      lastError = error
    }
  }

  const detail = lastError instanceof Error ? lastError.message.split('\n')[0] : String(lastError)
  throw new Error(`${INSTALL_HINT}\n(${detail})`)
}
