// src/constants/homePicks.ts
//
// The homepage's main product rail, in the owner's order (Run 8, 15 Nov 2026):
// Michigan first, then UK-made, made-to-order designs. page.tsx reads these
// slugs live (current price, image and canonical link); any pick that is
// missing or inactive is skipped and the slot is filled from the old
// featured-then-dearest order, so the rail never shows a gap or a dead link.
export const HOME_PICKS = [
  'michigan-electric-recliner-3and2-seater',
  'verona-scattered-back-family-set',
  'bishop-u-shaped-scattered-back-sofa',
  'sims-high-back-u-shape',
  'lily-high-back-5-seater-corner-2c2',
  'ashton-high-back-3and2-seater',
] as const

/** Picks first, in order, then fallbacks not already shown, up to `limit`. */
export function orderHomePicks<T extends { slug: string }>(picks: T[], fallback: T[], limit = 6): T[] {
  const bySlug = new Map(picks.map(p => [p.slug, p]))
  const out: T[] = []
  for (const slug of HOME_PICKS) {
    const p = bySlug.get(slug)
    if (p) out.push(p)
  }
  for (const p of fallback) {
    if (out.length >= limit) break
    if (!out.some(o => o.slug === p.slug)) out.push(p)
  }
  return out.slice(0, limit)
}
