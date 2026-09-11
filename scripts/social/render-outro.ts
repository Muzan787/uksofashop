// scripts/social/render-outro.ts
//
// The reel outro, rendered from the same tokens and templates as the posts.
//
//   npm run social:outro -- --product verona-scattered-back-5-seater-corner-2c2
//   npm run social:outro -- --product <slug> --reel "C:\path\to\reel.mp4" --at 13.2083
//
// The outro template is a 1080x1920 page whose animation is scrubbed by
// window.seek(ms). One screenshot per frame goes through ffmpeg into an H.264
// MP4. With --reel and --at, the outro replaces everything in the reel from
// that second onwards and the reel's own audio is kept, so the music runs
// through unchanged.
//
// Why frames and not a screen recording: a recording captures whatever the
// browser managed to paint in real time, which on a busy machine drops
// frames. Scrubbing renders every frame at its exact instant, and the ease
// curves come out as smooth as they are on the site.

import { parseArgs } from 'node:util'
import { execFile } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import ffmpegPath from 'ffmpeg-static'

import { launchBrowser } from './lib/browser.ts'
import { writeEmberLut } from './ember-lut.ts'
import { OUT_DIR, SOCIAL_DIR, openPage, wrapDocument } from './lib/page.ts'
import { fetchProduct, formatPrice, type Product } from './lib/products.ts'
import { renderTemplate, richText } from './lib/template.ts'
import { PROMISES } from '../../src/constants/promises.ts'
import { PHONE_DISPLAY } from '../../src/constants/contact.ts'
import { SITE_URL } from '../../src/constants/site.ts'

const run = promisify(execFile)
const CANVAS = { width: 1080, height: 1920 }

// The WhatsApp glyph, as drawn by src/components/Layout/WhatsAppFab.tsx.
const WHATSAPP_PATH =
  'd="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"'

const HELP = `
Mill & Velvet reel outro

  npm run social:outro -- --product <slug> [copy options] [--reel file.mp4 --at 13.2083] [--out file.mp4]

Options
  --product, -p  product slug; supplies the headline, eyebrow and price
  --headline     default: the family name ("Verona Sofa"); *word* and | work as in posts
  --eyebrow      default: what distinguishes the piece ("Scattered Back · 5 Seater Corner")
  --line         default: "£499 · Made to order"
  --cta          default: Message us on WhatsApp   ("" to hide the button)
  --phone        default: the site's display number ("" to hide)
  --site         default: the site's host ("" to hide)
  --duration     seconds                            default: 8
  --fps          frames per second                  default: 24 (match the reel)
  --reel         a reel to splice the outro onto, keeping its audio
  --at           second at which the outro replaces the reel   (with --reel)
  --grade        also carry the reel's own copper to ember-500 (with --reel; see ember-lut.ts)
  --out          where to write the MP4             default: out/social/outro--<slug>.mp4
                                                    (with --reel: <reel>-mill-and-velvet.mp4)
  --keep-frames  leave the PNG frames in out/social/outro-frames
`.trim()

async function main() {
  const { values } = parseArgs({
    options: {
      product: { type: 'string', short: 'p' },
      headline: { type: 'string' },
      eyebrow: { type: 'string' },
      line: { type: 'string' },
      cta: { type: 'string' },
      phone: { type: 'string' },
      site: { type: 'string' },
      duration: { type: 'string', default: '8' },
      fps: { type: 'string', default: '24' },
      reel: { type: 'string' },
      at: { type: 'string' },
      grade: { type: 'boolean', default: false },
      out: { type: 'string' },
      'keep-frames': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
  })
  if (values.help) {
    console.log(HELP)
    return
  }
  if (!ffmpegPath) throw new Error('ffmpeg-static did not provide a binary for this platform.')
  if (values.reel && values.at === undefined) throw new Error('--reel needs --at <seconds>.')

  const duration = Number(values.duration)
  const fps = Number(values.fps)
  if (!(duration > 0) || !(fps > 0)) throw new Error('--duration and --fps must be positive numbers.')

  const product: Product | null = values.product ? await fetchProduct(values.product) : null
  const family = product ? (product.variant_groups?.name ?? product.title) : 'UK Sofa Shop'
  const detail = product ? [product.subgroup_label, product.size_label].filter(Boolean).join(' · ') : ''
  const line = product
    ? `${formatPrice(product)}${product.custom_made ? ' · Made to order' : ''}`
    : ''

  const promises = [PROMISES.delivery.short, PROMISES.payment.short, PROMISES.guarantee.short]
  const data = {
    lockup: await readFile(path.join(SOCIAL_DIR, 'partials', 'lockup.html'), 'utf8'),
    headline: richText((values.headline ?? family).replace(/\s*\|\s*/g, '\n')),
    eyebrow: values.eyebrow ?? detail,
    line: values.line ?? line,
    cta: values.cta ?? 'Message us on WhatsApp',
    phone: values.phone ?? PHONE_DISPLAY,
    site: values.site ?? new URL(SITE_URL).host.replace(/^www\./, ''),
    whatsappPath: WHATSAPP_PATH,
    promises: promises.map((label, i) => ({ label, delay: 2500 + i * 120 })),
  }

  const template = await readFile(path.join(SOCIAL_DIR, 'templates', 'outro.html'), 'utf8')
  const html = await wrapDocument('outro', renderTemplate(template, data), CANVAS)

  const slug = product?.slug ?? 'brand'
  const framesDir = path.join(OUT_DIR, 'outro-frames')
  await rm(framesDir, { recursive: true, force: true })
  await mkdir(framesDir, { recursive: true })

  // ── Frames ──────────────────────────────────────────────────────────────
  const frames = Math.round(duration * fps)
  const browser = await launchBrowser()
  try {
    const page = await openPage(browser, html, CANVAS)
    for (let i = 0; i < frames; i++) {
      await page.evaluate(ms => (window as unknown as { seek: (ms: number) => void }).seek(ms), (i * 1000) / fps)
      await page.screenshot({
        path: path.join(framesDir, `f_${String(i).padStart(4, '0')}.png`),
        type: 'png',
        fullPage: false,
      })
      if (i % fps === 0) process.stdout.write(`\r${i}/${frames} frames`)
    }
    process.stdout.write(`\r${frames}/${frames} frames\n`)
  } finally {
    await browser.close()
  }

  // ── Encode ──────────────────────────────────────────────────────────────
  const outroOut = values.reel
    ? path.join(OUT_DIR, `outro--${slug}.mp4`)
    : path.resolve(values.out ?? path.join(OUT_DIR, `outro--${slug}.mp4`))
  await run(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-framerate', String(fps),
    '-i', path.join(framesDir, 'f_%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outroOut,
  ])

  // ── Splice ──────────────────────────────────────────────────────────────
  if (values.reel) {
    const reel = path.resolve(values.reel)
    const at = Number(values.at)
    const out = path.resolve(
      values.out ?? reel.replace(/\.[^.]+$/, '') + '-mill-and-velvet.mp4',
    )
    // The reel up to the cut, then the outro; setsar because generated
    // footage often carries an odd sample aspect ratio that concat refuses
    // to mix with 1:1. Audio is the reel's own, cut to the new length.
    //
    // With --grade the reel's title copper is carried to ember-500 on the
    // way through, so the whole reel is on one amber. The LUT is named by a
    // bare filename with ffmpeg run from OUT_DIR: a "C:" inside a filter
    // string is read as an option separator.
    if (values.grade) await writeEmberLut(path.join(OUT_DIR, 'ember.cube'))
    const gradeStep = values.grade ? 'lut3d=file=ember.cube:interp=tetrahedral,' : ''
    await run(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', reel, '-i', outroOut,
      '-filter_complex',
      `[0:v]${gradeStep}trim=end=${at},setpts=PTS-STARTPTS,setsar=1[a];` +
        `[1:v]setpts=PTS-STARTPTS,setsar=1[b];` +
        `[a][b]concat=n=2:v=1:a=0[v]`,
      '-map', '[v]', '-map', '0:a?',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
      '-c:a', 'copy', '-shortest', '-movflags', '+faststart',
      out,
    ], { cwd: OUT_DIR })
    console.log(out)
  } else {
    console.log(path.relative(process.cwd(), outroOut))
  }

  if (!values['keep-frames']) await rm(framesDir, { recursive: true, force: true })
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
