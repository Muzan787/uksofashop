// src/components/Product/accent.ts
//
// The product page takes one colour from the database — the selected variant's
// swatch hex — and has to place it on the page without breaking the palette.
//
// What changed here, and why:
//
// The page used to tint its ENTIRE background from the variant. Browsing four
// fabrics repainted the whole page four times, and because the tint was derived
// from an arbitrary hex the contrast of every piece of body copy on the page
// became a function of which sofa colour was selected. That is a colour system
// with no floor. `getPageTint` is gone; the ground is Calico, always.
//
// The accent now reaches exactly three things — swatches, focus and selection
// rings, and the trust row — and it reaches them as CSS custom properties on a
// single wrapper, so components address it as `bg-[var(--pdp-accent)]` rather
// than carrying inline style objects around.

import type { CSSProperties } from 'react'

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '')
  if (clean.length !== 3 && clean.length !== 6) return null
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/** Relative luminance of the two system text colours, precomputed. */
const L_INK_900 = 0.0106    // #191C1B
const L_CALICO_50 = 0.9662  // #FBFAF7

export function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Picks whichever system text colour is actually more legible on a swatch.
 *
 * This used to compare luminance against a flat 0.4 threshold, which chose
 * white for Ember 500 — 2.9:1, and the reason every amber button on the site
 * was illegible. Comparing the two contrast ratios directly gives Ink 900 on
 * ember (6.6:1) and still gives Calico 50 on genuinely dark fabrics.
 */
export function getTextColor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return 'var(--color-ink-900)'
  const l = getLuminance(rgb.r, rgb.g, rgb.b)
  return contrastRatio(l, L_INK_900) >= contrastRatio(l, L_CALICO_50)
    ? 'var(--color-ink-900)'
    : 'var(--color-calico-50)'
}

/**
 * Ember 700 is the fallback rather than Ember 500 because these variables are
 * used for letterforms as well as fills, and Ember 500 as text on Calico is
 * 2.9:1. A variant with no hex therefore reads as the brand, legibly.
 */
const FALLBACK = {
  accent: 'var(--color-ember-500)',
  text: 'var(--color-ember-700)',
  on: 'var(--color-ink-900)',
  tint: 'var(--color-ember-50)',
  mid: 'rgba(212,135,26,0.20)',
  line: 'rgba(212,135,26,0.30)',
}

export interface AccentVars extends CSSProperties {
  '--pdp-accent'?: string
  '--pdp-accent-text'?: string
  '--pdp-accent-on'?: string
  '--pdp-accent-tint'?: string
  '--pdp-accent-mid'?: string
  '--pdp-accent-line'?: string
}

/**
 * The six values every accented surface on the page draws from.
 *
 *   --pdp-accent       the fill: swatch rings, the bar over the hero image
 *   --pdp-accent-text  letterforms — see the note on FALLBACK above
 *   --pdp-accent-on    what sits ON an accent fill
 *   --pdp-accent-tint  a wash for panels: the trust row, the swatch well
 *   --pdp-accent-mid   a stronger wash, for a chip that must read as selected
 *   --pdp-accent-line  hairlines and dividers
 *
 * Text is the one that needs care: a pale fabric hex is a perfectly good fill
 * and an illegible letter. Where the raw hex would fail on Calico the text
 * variable falls back to Ember 700 rather than printing 2:1 copy.
 */
export function accentVars(hex: string | null | undefined): AccentVars {
  const rgb = hex ? hexToRgb(hex) : null
  if (!rgb) {
    return {
      '--pdp-accent': FALLBACK.accent,
      '--pdp-accent-text': FALLBACK.text,
      '--pdp-accent-on': FALLBACK.on,
      '--pdp-accent-tint': FALLBACK.tint,
      '--pdp-accent-mid': FALLBACK.mid,
      '--pdp-accent-line': FALLBACK.line,
    }
  }

  const { r, g, b } = rgb
  const legibleOnCalico = contrastRatio(getLuminance(r, g, b), L_CALICO_50) >= 4.5

  return {
    '--pdp-accent': `rgb(${r} ${g} ${b})`,
    '--pdp-accent-text': legibleOnCalico ? `rgb(${r} ${g} ${b})` : FALLBACK.text,
    '--pdp-accent-on': getTextColor(`#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`),
    '--pdp-accent-tint': `rgb(${r} ${g} ${b} / 0.10)`,
    '--pdp-accent-mid': `rgb(${r} ${g} ${b} / 0.20)`,
    '--pdp-accent-line': `rgb(${r} ${g} ${b} / 0.30)`,
  }
}
