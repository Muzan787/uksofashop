// scripts/social/render.ts
//
// The Instagram renderer. One HTML template per post format, styled by the
// real src/styles/tokens.css, screenshotted headlessly at 1080x1350.
//
//   npm run social -- --product verona-high-back-3and2-seater
//   npm run social -- --product verona-high-back-3and2-seater --format spec
//   npm run social -- --format quote --quote "Built to be *sat on*." --attribution "Our workshop"
//   npm run social -- --product lily-high-back-u-shape --format carousel-cover --headline "Five ways to|fill a corner" --count 6
//   npm run social -- --product roma-recliner-corner --format split --before Grey --after Teal
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
import { SITE_URL } from '../../src/constants/site.ts'

const FORMATS = ['full-bleed', 'quote', 'spec', 'carousel-cover', 'split'] as const
type Format = (typeof FORMATS)[number]

const SIZES = {
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
} as const
type SizeName = keyof typeof SIZES

const HELP = `
Mill & Velvet social renderer

  npm run social -- --product <slug> [--format <format>] [copy options] [--out file.png]
  npm run social -- --list

Formats
  full-bleed       photograph fills the canvas, lockup top-left, headline + price + CTA at the foot (default)
  quote            a quote card, ink ground by default, no photograph — needs --quote
  spec             photograph in a well, then the product's specifications in Geist Mono, price at the foot
  carousel-cover   display headline over a photograph well, with a slide counter and swipe cue
  split            two photographs stacked with an ember rule between — needs --before

Options
  --product, -p    product slug (required for every format except quote)
  --format, -f     one of the formats above                    default: full-bleed
  --ground         light | ink                                  default: light (quote: ink)
  --size           portrait | square | story                    default: portrait (1080x1350)
  --variant        which colour's photograph to use             default: the lead variant
  --image          any image URL instead of the product's       (a generated room scene, say)
  --headline       *word* for an ember accent, | or \\n for a line break
  --eyebrow        the small uppercase line above the headline
  --body           a supporting line
  --caption        the small line at the foot
  --cta            the button label on full-bleed              default: Order on WhatsApp ("" to hide)
  --quote          the quote (quote format)
  --attribution    who said it (quote format)
  --count          slides in the carousel, shown as "1 / N"    (carousel-cover)
  --before         URL or variant colour for the top pane       (split)
  --after          URL or variant colour for the bottom pane    (split)  default: the lead variant
  --before-label   label on the top pane                        default: the colour, else Before
  --after-label    label on the bottom pane                     default: the colour, else After
  --json           a JSON file holding any of the options above, by their long names
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
  before?: string
  after?: string
  beforeLabel?: string
  afterLabel?: string
  out?: string
  html: boolean
}

async function readOptions(): Promise<Options | 'list' | 'help'> {
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
      before: { type: 'string' },
      after: { type: 'string' },
      'before-label': { type: 'string' },
      'after-label': { type: 'string' },
      json: { type: 'string' },
      out: { type: 'string' },
      html: { type: 'boolean', default: false },
      list: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
  })

  if (values.help) return 'help'
  if (values.list) return 'list'

  // A JSON file is the same options by their long names; flags win over it.
  const fromJson: Record<string, unknown> = values.json
    ? JSON.parse(await readFile(path.resolve(values.json), 'utf8'))
    : {}
  const pick = (flag: string | undefined, key: string): string | undefined => {
    if (flag !== undefined) return flag
    const v = fromJson[key]
    return v === undefined || v === null ? undefined : String(v)
  }

  const format = pick(values.format, 'format') ?? 'full-bleed'
  if (!FORMATS.includes(format as Format)) {
    throw new Error(`Unknown format "${format}". One of: ${FORMATS.join(', ')}.`)
  }
  const ground = pick(values.ground, 'ground') ?? (format === 'quote' ? 'ink' : 'light')
  if (ground !== 'light' && ground !== 'ink') {
    throw new Error(`--ground must be light or ink, not "${ground}".`)
  }
  const size = pick(values.size, 'size') ?? 'portrait'
  if (!(size in SIZES)) {
    throw new Error(`--size must be one of ${Object.keys(SIZES).join(', ')}, not "${size}".`)
  }

  return {
    product: pick(values.product, 'product'),
    format: format as Format,
    ground,
    size: size as SizeName,
    variant: pick(values.variant, 'variant'),
    image: pick(values.image, 'image'),
    headline: pick(values.headline, 'headline'),
    eyebrow: pick(values.eyebrow, 'eyebrow'),
    body: pick(values.body, 'body'),
    caption: pick(values.caption, 'caption'),
    cta: pick(values.cta, 'cta'),
    quote: pick(values.quote, 'quote'),
    attribution: pick(values.attribution, 'attribution'),
    count: pick(values.count, 'count'),
    before: pick(values.before, 'before'),
    after: pick(values.after, 'after'),
    beforeLabel: pick(values['before-label'], 'beforeLabel'),
    afterLabel: pick(values['after-label'], 'afterLabel'),
    out: pick(values.out, 'out'),
    html: values.html || fromJson.html === true,
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
        image: cloudinaryFill(url, inner, 440),
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
        image: cloudinaryFill(url, inner, 560),
        eyebrow: opts.eyebrow ?? defaultEyebrow(p),
        headline: richText(headline),
        headlineSize: displaySize(headline),
        counter: opts.count ? `1 / ${opts.count}` : undefined,
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
  }
}

/* ── Document assembly ───────────────────────────────────────────────────── */

async function buildDocument(format: Format, data: TemplateData, canvas: Canvas): Promise<string> {
  const template = await readFile(path.join(SOCIAL_DIR, 'templates', `${format}.html`), 'utf8')
  return wrapDocument(format, renderTemplate(template, data), canvas)
}

async function screenshot(html: string, canvas: Canvas, out: string) {
  const browser = await launchBrowser()
  try {
    const page = await openPage(browser, html, canvas)
    await page.screenshot({ path: out, type: 'png', fullPage: false })
  } finally {
    await browser.close()
  }
}

/* ── Main ────────────────────────────────────────────────────────────────── */

async function main() {
  const opts = await readOptions()

  if (opts === 'help') {
    console.log(HELP)
    return
  }
  if (opts === 'list') {
    for (const { slug, title } of await listProductSlugs()) console.log(`${slug.padEnd(48)} ${title}`)
    return
  }

  const canvas = SIZES[opts.size]
  const product = opts.product ? await fetchProduct(opts.product) : null
  const lockup = await readFile(path.join(SOCIAL_DIR, 'partials', 'lockup.html'), 'utf8')

  const data = await buildData(opts, product, canvas, lockup)
  const html = await buildDocument(opts.format, data, canvas)

  const out = path.resolve(opts.out ?? path.join(OUT_DIR, `${opts.format}--${product?.slug ?? 'brand'}.png`))
  await mkdir(path.dirname(out), { recursive: true })

  if (opts.html) await writeFile(out.replace(/\.png$/i, '') + '.html', html, 'utf8')
  await screenshot(html, canvas, out)

  console.log(path.relative(process.cwd(), out))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
