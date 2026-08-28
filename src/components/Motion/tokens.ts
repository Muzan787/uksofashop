// src/components/Motion/tokens.ts
//
// The motion tokens, expressed as numbers because Framer needs seconds and a
// bezier array rather than a CSS custom property.
//
// src/styles/tokens.css remains the source of truth. These values MUST match
// --dur-* and --ease-* there. Same arrangement as src/constants/palette.ts:
// one authority per domain, cross-referenced.

/** Seconds, because that is what Framer takes. */
export const DUR = {
  press: 0.12,
  swift: 0.22,
  base: 0.38,
  settle: 0.64,
  cinematic: 1.0,
} as const

/** Cubic bezier control points. */
export const EASE = {
  /** Anything entering. */
  out: [0.16, 1, 0.3, 1] as const,
  /** Anything that leaves and comes back. */
  inOut: [0.76, 0, 0.24, 1] as const,
}

/** 70ms per child, and the delay stops growing after the sixth. */
export const STAGGER_STEP = 0.07
export const STAGGER_CAP = 6

/** The delay a child at `index` should wait, in seconds. */
export function staggerDelay(index: number, step = STAGGER_STEP): number {
  return Math.min(index, STAGGER_CAP - 1) * step
}
