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
import { WHATSAPP_PATH } from './lib/icons.ts'
import { writeEmberLut } from './ember-lut.ts'
import { OUT_DIR, SOCIAL_DIR, openPage, wrapDocument } from './lib/page.ts'
import { fetchProduct, formatPrice, type Product } from './lib/products.ts'
import { renderTemplate, richText } from './lib/template.ts'
import { PROMISES } from '../../src/constants/promises.ts'
import { PHONE_DISPLAY } from '../../src/constants/contact.ts'
import { SITE_URL } from '../../src/constants/site.ts'

const run = promisify(execFile)
const CANVAS = { width: 1080, height: 1920 }

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
