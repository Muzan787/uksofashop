// scripts/social/render.ts
//
// The Instagram renderer. One HTML template per post format, styled by the
// real src/styles/tokens.css, screenshotted headlessly at 1080x1440 (3:4, the
// shape Instagram's grid shows since 2025).
//
//   npm run social -- --product verona-high-back-3and2-seater
//   npm run social -- --product verona-high-back-3and2-seater --format spec
//   npm run social -- --format quote --quote "Built to be *sat on*." --attribution "Our workshop"
//   npm run social -- --product lily-high-back-u-shape --format carousel-cover --headline "Five ways to|fill a corner" --count 6
//   npm run social -- --product roma-recliner-corner --format split --before Grey --after Teal
//   npm run social -- --product hannah-electric-corner --format panorama      # the pinned row, three tiles
//   npm run social -- --set scripts/social/sets/launch-grid.json             # a whole grid at once
//   npm run social -- --list
//
// Everything about a product (its photograph, price, specifications, family)
// is read from Supabase, so the only required input is a slug. Every piece of
// copy has a default drawn from the product and can be overridden. Run with
// --help for the full option list.
//
// Why a renderer and not Canva: brand fidelity is guaranteed, not remembered.
// The templates import the same tokens the storefront does, so when a token
// changes on the site, every post made after that follows.

import { parseArgs } from 'node:util'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { launchBrowser } from './lib/browser.ts'
import { cloudinaryFill } from './lib/cloudinary.ts'
import { OUT_DIR, SOCIAL_DIR, openPage, wrapDocument, type Canvas } from './lib/page.ts'
import { WHATSAPP_PATH } from './lib/icons.ts'
import { renderTemplate, richText, type TemplateData } from './lib/template.ts'
import {
  fetchProduct,
  formatPrice,
  listProductSlugs,
  resolveImage,
  specRows,
  type Product,
} from './lib/products.ts'
import { PROMISES } from '../../src/constants/promises.ts'
import { PHONE_DISPLAY, SUPPORT_EMAIL } from '../../src/constants/contact.ts'
import { SITE_URL } from '../../src/constants/site.ts'

const FORMATS = ['full-bleed', 'quote', 'spec', 'carousel-cover', 'split', 'panorama'] as const
type Format = (typeof FORMATS)[number]

// Instagram crops every grid thumbnail to 3:4, so 3:4 is the post. A 4:5
// upload shows whole in the feed but loses its top and bottom in the grid,
// which is where a set of posts is designed to be seen together.
const SIZES = {
  portrait: { width: 1080, height: 1440 },
  feed: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
} as const
type SizeName = keyof typeof SIZES

/** The panorama is three portrait tiles rendered as one wide page. */
const PANORAMA_TILES = 3

const HELP = `
Mill & Velvet social renderer

  npm run social -- --product <slug> [--format <format>] [copy options] [--out file.png]
  npm run social -- --set <file.json>
  npm run social -- --list

Formats
  full-bleed       photograph fills the canvas, lockup top-left, headline + price + CTA at the foot (default)
  quote            a quote card, ink ground by default, no photograph — needs --quote
  spec             photograph in a well, then the product's specifications in Geist Mono, price at the foot
  carousel-cover   display headline over a photograph well, with a slide counter and swipe cue
  split            two photographs stacked with an ember rule between — needs --before
  panorama         the pinned row: welcome | photograph | get in touch, as three tiles to post right-to-left

Options
  --product, -p    product slug (required for every format except quote)
  --format, -f     one of the formats above                    default: full-bleed
  --ground         light | ink                                  default: light (quote: ink)
  --size           portrait (3:4) | feed (4:5) | square | story default: portrait, 1080x1440
  --variant        which colour's photograph to use             default: the lead variant
  --image          any image URL instead of the product's       (a generated room scene, say)
  --headline       *word* for an ember accent, | or \\n for a line break
  --eyebrow        the small uppercase line above the headline
  --body           a supporting line
  --caption        the small line at the foot (panorama: the pill on the photograph)
  --cta            the button label                             default: Order on WhatsApp ("" to hide)
  --quote          the quote (quote format)
  --attribution    who said it (quote format)
  --count          slides in a carousel; with --index shows "n / count" on full-bleed and carousel-cover
  --index          this slide's number in the carousel          default: 1
  --before         URL or variant colour for the top pane       (split)
  --after          URL or variant colour for the bottom pane    (split)  default: the lead variant
  --before-label   label on the top pane                        default: the colour, else Before
  --after-label    label on the bottom pane                     default: the colour, else After
  --json           a JSON file holding any of the options above, by their long names
  --set            a JSON array of such objects; renders every one into out/social/<set name>/
  --out            where to write the PNG                       default: out/social/<format>--<slug>.png
  --html           also write the rendered HTML next to the PNG
  --list           print every active product slug and exit
`.trim()

type Options = {
  product?: string
  format: Format
  ground: 'light' | 'ink'
  size: SizeName
  variant?: string
  image?: string
  headline?: string
  eyebrow?: string
  body?: string
  caption?: string
  cta?: string
  quote?: string
  attribution?: string
  count?: string
  index?: string
  before?: string
  after?: string
  beforeLabel?: string
  afterLabel?: string
  out?: string
  html: boolean
}

type Flags = Record<string, string | boolean | undefined>

/** Flags plus the same keys from a JSON object; a flag wins over the file. */
function resolveOptions(flags: Flags, fromJson: Record<string, unknown>): Options {
  const pick = (key: string, jsonKey = key): string | undefined => {
    const flag = flags[key]
    if (typeof flag === 'string') return flag
    const v = fromJson[jsonKey]
    return v === undefined || v === null ? undefined : String(v)
  }

  const format = pick('format') ?? 'full-bleed'
  if (!FORMATS.includes(format as Format)) {
    throw new Error(`Unknown format "${format}". One of: ${FORMATS.join(', ')}.`)
  }
  const ground = pick('ground') ?? (format === 'quote' ? 'ink' : 'light')
  if (ground !== 'light' && ground !== 'ink') {
    throw new Error(`--ground must be light or ink, not "${ground}".`)
  }
  const size = pick('size') ?? 'portrait'
  if (!(size in SIZES)) {
    throw new Error(`--size must be one of ${Object.keys(SIZES).join(', ')}, not "${size}".`)
  }

  return {
    product: pick('product'),
    format: format as Format,
    ground,
    size: size as SizeName,
    variant: pick('variant'),
    image: pick('image'),
    headline: pick('headline'),
    eyebrow: pick('eyebrow'),
    body: pick('body'),
    caption: pick('caption'),
    cta: pick('cta'),
    quote: pick('quote'),
    attribution: pick('attribution'),
    count: pick('count'),
    index: pick('index'),
    before: pick('before'),
    after: pick('after'),
    beforeLabel: pick('before-label', 'beforeLabel'),
    afterLabel: pick('after-label', 'afterLabel'),
    out: pick('out'),
    html: flags.html === true || fromJson.html === true,
  }
}

/* ── Copy sizing ──────────────────────────────────────────────────────────
   Headlines are typed, not designed, so the size steps down with length
   rather than clipping. The steps keep every headline inside the 1080px
   column at the canvas's line-height; the top step is the brand size. */

function plainLength(copy: string): number {
  return copy.replace(/\*/g, '').replace(/\\n|\|/g, ' ').length
}

function stepDown(copy: string, steps: [number, number][], floor: number): number {
  const n = plainLength(copy)
  for (const [max, size] of steps) if (n <= max) return size
  return floor
}

const displaySize = (copy: string) => stepDown(copy, [[18, 120], [30, 104], [48, 88]], 72)
const headlineSize = (copy: string) => stepDown(copy, [[22, 96], [40, 80], [64, 66]], 56)
const quoteSize = (copy: string) => stepDown(copy, [[50, 92], [90, 76], [150, 62], [240, 52]], 44)

/** "|" is the line break that survives a shell; "\n" also works. */
const breaks = (copy: string) => copy.replace(/\s*\|\s*/g, '\n')

/* ── Per-format data ─────────────────────────────────────────────────────── */

// The default copy splits a product's name across the two lines rather than
// repeating it: the headline is the family ("Verona Sofa") and the eyebrow is
// what distinguishes this one within it ("High Back · 3+2 Seater"). The full
// title is what the catalogue calls it and reads as a listing, not a post.
function defaultHeadline(product: Product): string {
  return product.variant_groups?.name ?? product.title
}

function defaultEyebrow(product: Product): string {
  const parts = [product.subgroup_label, product.size_label].filter(Boolean)
  return parts.length ? parts.join(' · ') : product.title
}

function siteHost(): string {
  return new URL(SITE_URL).host.replace(/^www\./, '')
}

/** "2 / 5" when the post is one slide of a carousel. */
function slideCounter(opts: Options, defaultIndex?: number): string | undefined {
  if (!opts.count) return undefined
  const index = opts.index ?? (defaultIndex !== undefined ? String(defaultIndex) : undefined)
  return index ? `${index} / ${opts.count}` : undefined
}

async function buildData(
  opts: Options,
  product: Product | null,
  canvas: Canvas,
  lockup: string,
): Promise<TemplateData> {
  const need = (): Product => {
    if (!product) throw new Error(`--product is required for the ${opts.format} format.`)
    return product
  }
  const inner = canvas.width - 144 // the canvas less --pad on each side

  switch (opts.format) {
    case 'full-bleed': {
      const p = need()
      const { url } = resolveImage(p, opts.image ?? opts.variant)
      const headline = breaks(opts.headline ?? defaultHeadline(p))
      return {
        lockup,
        image: cloudinaryFill(url, canvas.width, canvas.height),
        eyebrow: opts.eyebrow ?? defaultEyebrow(p),
        headline: richText(headline),
        headlineSize: headlineSize(headline),
        body: richText(opts.body),
        price: formatPrice(p),
        cta: opts.cta ?? 'Order on WhatsApp',
        counter: slideCounter(opts),
      }
    }

    case 'quote': {
      if (!opts.quote) throw new Error('--quote is required for the quote format.')
      const quote = breaks(opts.quote)
      return {
        lockup,
        groundClass: `ground-${opts.ground}`,
        quote: richText(quote),
        quoteSize: quoteSize(quote),
        attribution: opts.attribution,
        body: richText(opts.body),
        caption: opts.caption ?? siteHost(),
      }
    }

    case 'spec': {
      const p = need()
      const { url } = resolveImage(p, opts.image ?? opts.variant)
      const rows = specRows(p)
      const priceLabel = p.custom_made ? 'Made to order' : 'Price'
      return {
        lockup,
        groundClass: `ground-${opts.ground}`,
        image: cloudinaryFill(url, inner, Math.round(canvas.height * 0.33)),
        eyebrow: opts.eyebrow ?? defaultEyebrow(p),
        headline: richText(breaks(opts.headline ?? defaultHeadline(p))),
        specs: rows,
        priceLabel,
        price: formatPrice(p),
        caption: opts.caption ?? PROMISES.delivery.short,
      }
    }

    case 'carousel-cover': {
      const p = need()
      const { url } = resolveImage(p, opts.image ?? opts.variant)
      const headline = breaks(opts.headline ?? defaultHeadline(p))
      return {
        lockup,
        groundClass: `ground-${opts.ground}`,
        image: cloudinaryFill(url, inner, Math.round(canvas.height * 0.41)),
        eyebrow: opts.eyebrow ?? defaultEyebrow(p),
        headline: richText(headline),
        headlineSize: displaySize(headline),
        counter: slideCounter(opts, 1),
        body: richText(opts.body),
        swipe: 'Swipe',
      }
    }

    case 'split': {
      const p = need()
      if (!opts.before) throw new Error('--before is required for the split format: a URL or a variant colour.')
      const before = resolveImage(p, opts.before)
      const after = resolveImage(p, opts.after ?? opts.image ?? opts.variant)
      const paneHeight = Math.floor((canvas.height - 200 - 8) / 2)
      return {
        lockup,
        before: cloudinaryFill(before.url, canvas.width, paneHeight),
        after: cloudinaryFill(after.url, canvas.width, paneHeight),
        beforeLabel: opts.beforeLabel ?? before.label ?? 'Before',
        afterLabel: opts.afterLabel ?? (opts.after ? after.label : undefined) ?? 'After',
        headline: richText(opts.headline ? breaks(opts.headline) : undefined),
      }
    }

    case 'panorama': {
      const p = need()
      const { url } = resolveImage(p, opts.image ?? opts.variant)
      const tile = { width: canvas.width / PANORAMA_TILES, height: canvas.height }
      const promises = [PROMISES.delivery.short, PROMISES.payment.short, PROMISES.guarantee.short, PROMISES.returns.short]
      return {
        lockup,
        eyebrow: opts.eyebrow ?? 'Sofas made to order',
        headline: richText(breaks(opts.headline ?? 'Welcome to|UK Sofa Shop')),
        body: richText(
          opts.body ??
            'Choose the shape, the fabric and the colour. We make it, deliver it free across mainland UK, and you pay when it arrives.',
        ),
        cta: opts.cta ?? 'Message us on WhatsApp',
        image: cloudinaryFill(url, tile.width, tile.height),
        caption: opts.caption ?? `${defaultHeadline(p)} · ${formatPrice(p)}`,
        contactEyebrow: 'Get in touch',
        contactHeadline: richText('Talk to a *person*.'),
        whatsappPath: WHATSAPP_PATH,
        phone: PHONE_DISPLAY,
        site: siteHost(),
        email: SUPPORT_EMAIL,
        promises: promises.map(label => ({ label })),
      }
    }
  }
}

/* ── Document assembly ───────────────────────────────────────────────────── */

async function buildDocument(format: Format, data: TemplateData, canvas: Canvas): Promise<string> {
  const template = await readFile(path.join(SOCIAL_DIR, 'templates', `${format}.html`), 'utf8')
  return wrapDocument(format, renderTemplate(template, data), canvas)
}

/**
 * Capture the page. A panorama is one page cut into tiles, numbered in the
 * order they should be posted: Instagram fills the grid newest-first from
 * the top-left, so the right-hand tile goes up first.
 */
async function screenshot(html: string, canvas: Canvas, out: string, tiles: number): Promise<string[]> {
  const browser = await launchBrowser()
  try {
    const page = await openPage(browser, html, canvas)
    if (tiles === 1) {
      await page.screenshot({ path: out, type: 'png', fullPage: false })
      return [out]
    }
    const width = canvas.width / tiles
    const names = ['left', 'middle', 'right']
    const written: string[] = []
    for (let i = 0; i < tiles; i++) {
      const postOrder = tiles - i
      const file = out.replace(/\.png$/i, '') + `--post-${postOrder}-${names[i] ?? i + 1}.png`
      await page.screenshot({
        path: file,
        type: 'png',
        clip: { x: i * width, y: 0, width, height: canvas.height },
      })
      written.push(file)
    }
    return written
  } finally {
    await browser.close()
  }
}

/* ── One post ────────────────────────────────────────────────────────────── */

async function renderOne(opts: Options, defaultOut?: string): Promise<string[]> {
  const tiles = opts.format === 'panorama' ? PANORAMA_TILES : 1
  const base = SIZES[opts.size]
  const canvas = { width: base.width * tiles, height: base.height }

  const product = opts.product ? await fetchProduct(opts.product) : null
  const lockup = await readFile(path.join(SOCIAL_DIR, 'partials', 'lockup.html'), 'utf8')

  const data = await buildData(opts, product, canvas, lockup)
  const html = await buildDocument(opts.format, data, canvas)

  const out = path.resolve(
    opts.out ?? defaultOut ?? path.join(OUT_DIR, `${opts.format}--${product?.slug ?? 'brand'}.png`),
  )
  await mkdir(path.dirname(out), { recursive: true })

  if (opts.html) await writeFile(out.replace(/\.png$/i, '') + '.html', html, 'utf8')
  return screenshot(html, canvas, out, tiles)
}

/* ── Main ────────────────────────────────────────────────────────────────── */

async function main() {
  const { values } = parseArgs({
    options: {
      product: { type: 'string', short: 'p' },
      format: { type: 'string', short: 'f' },
      ground: { type: 'string' },
      size: { type: 'string' },
      variant: { type: 'string' },
      image: { type: 'string' },
      headline: { type: 'string' },
      eyebrow: { type: 'string' },
      body: { type: 'string' },
      caption: { type: 'string' },
      cta: { type: 'string' },
      quote: { type: 'string' },
      attribution: { type: 'string' },
      count: { type: 'string' },
      index: { type: 'string' },
      before: { type: 'string' },
      after: { type: 'string' },
      'before-label': { type: 'string' },
      'after-label': { type: 'string' },
      json: { type: 'string' },
      set: { type: 'string' },
      out: { type: 'string' },
      html: { type: 'boolean', default: false },
      list: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
  })

  if (values.help) {
    console.log(HELP)
    return
  }
  if (values.list) {
    for (const { slug, title } of await listProductSlugs()) console.log(`${slug.padEnd(48)} ${title}`)
    return
  }

  // A set is a JSON array of posts. Each renders into a folder named after
  // the file, numbered in the order they appear — which is the order to post
  // them in: bottom-right of the grid first, top-left last.
  if (values.set) {
    const setPath = path.resolve(values.set)
    const posts = JSON.parse(await readFile(setPath, 'utf8')) as Record<string, unknown>[]
    if (!Array.isArray(posts)) throw new Error('--set must be a JSON array of post objects.')
    const setDir = path.join(OUT_DIR, path.basename(setPath, '.json'))
    let n = 0
    for (const post of posts) {
      const opts = resolveOptions({ html: values.html }, post)
      n += 1
      const name = `${String(n).padStart(2, '0')}-${opts.format}--${opts.product ?? 'brand'}.png`
      for (const file of await renderOne(opts, path.join(setDir, name))) {
        console.log(path.relative(process.cwd(), file))
      }
    }
    return
  }

  const fromJson: Record<string, unknown> = values.json
    ? JSON.parse(await readFile(path.resolve(values.json), 'utf8'))
    : {}
  const opts = resolveOptions(values as Flags, fromJson)
  for (const file of await renderOne(opts)) console.log(path.relative(process.cwd(), file))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
