// scripts/social/lib/page.ts
//
// What a post and the outro have in common: the document that wraps a
// template in the site's tokens and the Instagram stylesheet, and the page
// that refuses to be captured until its fonts and images have arrived.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Browser, Page } from 'playwright'

import { escapeHtml } from './template.ts'

export const SOCIAL_DIR = path.resolve(import.meta.dirname, '..')
export const ROOT = path.resolve(SOCIAL_DIR, '../..')
export const OUT_DIR = path.join(ROOT, 'out/social')

const TOKENS_PATH = path.join(ROOT, 'src/styles/tokens.css')

export type Canvas = { width: number; height: number }

// Fraunces with its optical-size axis and Geist, from the same foundry files
// next/font/google downloads for the site. display=block: the screenshot must
// never be taken with a fallback face on screen.
export const FONTS_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700' +
  '&family=Geist:wght@400..600' +
  '&family=Geist+Mono:wght@400..500' +
  '&display=block'

export async function loadTokens(): Promise<string> {
  // tokens.css is written for Tailwind, whose @theme block both generates
  // utilities and emits every variable to :root. Chromium alone would ignore
  // an @theme block, so it becomes :root here; the @utility blocks at the
  // foot are unknown at-rules to a browser and are skipped harmlessly.
  const css = await readFile(TOKENS_PATH, 'utf8')
  return css.replace(/@theme\s+static\s*\{/, ':root {')
}

/** A full document: tokens, then social.css, then the rendered body. */
export async function wrapDocument(title: string, body: string, canvas: Canvas): Promise<string> {
  const [tokens, social] = await Promise.all([
    loadTokens(),
    readFile(path.join(SOCIAL_DIR, 'social.css'), 'utf8'),
  ])

  return `<!doctype html>
<html lang="en-GB" style="--canvas-w: ${canvas.width}px; --canvas-h: ${canvas.height}px">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_HREF}">
<style>
${tokens}
</style>
<style>
${social}
</style>
</head>
<body>
${body}
</body>
</html>`
}

/**
 * A page holding the document, ready to capture. The fonts arrive from
 * Google; nothing is captured until the browser says every declared face has
 * loaded, and the run stops rather than ship a post set in Georgia. Likewise
 * every image must have decoded.
 */
export async function openPage(browser: Browser, html: string, canvas: Canvas): Promise<Page> {
  const page = await browser.newPage({
    viewport: canvas,
    deviceScaleFactor: 1,
    colorScheme: 'light',
  })
  await page.setContent(html, { waitUntil: 'networkidle' })

  const fontsReady = await page.evaluate(async () => {
    // A face the page has not used yet is still "unloaded", so each is
    // asked for explicitly before it is checked.
    const faces = {
      fraunces: '500 96px Fraunces',
      geist: '400 40px Geist',
      mono: '400 36px "Geist Mono"',
    }
    await Promise.all(Object.values(faces).map(face => document.fonts.load(face)))
    await document.fonts.ready
    return Object.fromEntries(
      Object.entries(faces).map(([name, face]) => [name, document.fonts.check(face)]),
    )
  })
  const missing = Object.entries(fontsReady).filter(([, ok]) => !ok).map(([name]) => name)
  if (missing.length) {
    throw new Error(`Fonts did not load (${missing.join(', ')}). Is fonts.googleapis.com reachable?`)
  }

  const broken = await page.evaluate(() =>
    Array.from(document.images)
      .filter(img => !img.complete || img.naturalWidth === 0)
      .map(img => img.src),
  )
  if (broken.length) {
    throw new Error(`Image did not load:\n  ${broken.join('\n  ')}`)
  }

  return page
}
