// scripts/social/ember-lut.ts
//
// A colour-grade that moves the reel's copper onto the brand amber.
//
// The Verona reel's outro is an AI-generated animation whose amber was
// sampled afterwards as #C7713F, and its title cards were set in a copper
// from the same family. Neither can be regenerated with a different hex; what
// can be done is a 3D LUT that carries every copper pixel to ember-500 and
// leaves everything else alone.
//
//   npm run social:lut                # writes out/social/ember.cube
//
// then, on any reel:
//
//   ffmpeg -i reel.mp4 -vf "lut3d=out/social/ember.cube:interp=tetrahedral" -c:a copy out.mp4
//
// Add `:enable='gte(t,13.2)'` to the filter to grade only from a given
// second, which is how the outro is done on its own.
//
// The grade works in HSL. A pixel is moved in proportion to how copper it
// is: full weight for a hue in the 10°–40° band with saturation above 35%,
// fading to nothing outside 0°–50° or below 15% saturation. Wood floors and
// mink fabric sit under 15% saturation and are untouched; the WhatsApp green
// is 100° away and is untouched; ink and calico have no hue to move.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SOURCE = { h: 22, s: 0.55, l: 0.51 } // #C7713F — the outro's copper
const TARGET = { h: 35, s: 0.78, l: 0.47 } // #D4871A — ember-500

const SIZE = 33
const OUT = path.resolve(import.meta.dirname, '../../out/social/ember.cube')

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const hk = (((h % 360) + 360) % 360) / 360
  return [channel(hk + 1 / 3), channel(hk), channel(hk - 1 / 3)]
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** How copper a colour is, 0..1. */
function copperWeight(h: number, s: number): number {
  const hue = h > 180 ? h - 360 : h // so 355° reads as -5°
  const inBand = smoothstep(0, 10, hue) * (1 - smoothstep(40, 50, hue))
  const saturated = smoothstep(0.15, 0.35, s)
  return inBand * saturated
}

export function grade(r: number, g: number, b: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(r, g, b)
  const w = copperWeight(h, s)
  if (w === 0) return [r, g, b]

  const h2 = h + (TARGET.h - SOURCE.h) * w
  const s2 = Math.min(1, s * Math.pow(TARGET.s / SOURCE.s, w))
  const l2 = l * Math.pow(TARGET.l / SOURCE.l, w)
  return hslToRgb(h2, s2, l2)
}

/** Write the grade as a .cube file ffmpeg can read with lut3d. */
export async function writeEmberLut(out: string): Promise<void> {
  const lines = [
    '# Mill & Velvet ember grade: copper (#C7713F) -> ember-500 (#D4871A)',
    `TITLE "ember"`,
    `LUT_3D_SIZE ${SIZE}`,
    'DOMAIN_MIN 0.0 0.0 0.0',
    'DOMAIN_MAX 1.0 1.0 1.0',
  ]
  // .cube order: red varies fastest, then green, then blue.
  for (let bi = 0; bi < SIZE; bi++) {
    for (let gi = 0; gi < SIZE; gi++) {
      for (let ri = 0; ri < SIZE; ri++) {
        const [r, g, b] = grade(ri / (SIZE - 1), gi / (SIZE - 1), bi / (SIZE - 1))
        lines.push(`${r.toFixed(6)} ${g.toFixed(6)} ${b.toFixed(6)}`)
      }
    }
  }
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, lines.join('\n') + '\n', 'utf8')
}

async function main() {
  await writeEmberLut(OUT)

  const hex = (c: [number, number, number]) =>
    '#' + c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
  const check = (name: string, r: number, g: number, b: number) =>
    console.log(`${name.padEnd(28)} ${hex([r / 255, g / 255, b / 255])} -> ${hex(grade(r / 255, g / 255, b / 255))}`)

  console.log(path.relative(process.cwd(), OUT))
  check('outro copper', 0xc7, 0x71, 0x3f)
  check('title copper', 0xb8, 0x58, 0x28)
  check('glow highlight', 0xf0, 0xb0, 0x80)
  check('wood floor (untouched)', 0x98, 0x90, 0x88)
  check('whatsapp green (untouched)', 0x25, 0xd3, 0x66)
}

// Runs as a script when invoked directly; render-outro imports writeEmberLut.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
