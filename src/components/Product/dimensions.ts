// src/components/Product/dimensions.ts
//
// The dimensions field is free text typed into the admin panel, and it is not
// consistent. Real values in the catalogue today:
//
//   "L:198cm H:97cm D:99cm"
//   "L:115cm H:97cm D:99cm"
//   "190cm x 240cm H:90cm D:95cm"    ← a corner unit: two arms, then H and D
//
// So this reads what is labelled, recognises the bare "A x B" pair a corner
// sofa is written with, and hands back whatever it found. Nothing is inferred:
// a measurement that is not in the string does not appear on the diagram.

export interface ParsedDimensions {
  /** Centimetres. Absent where the record does not say. */
  width?: number;
  depth?: number;
  height?: number;
  seatHeight?: number;
  /** The shorter arm of an L-shape, where the record gives two lengths. */
  secondSide?: number;
  /** Always kept, so nothing the maker wrote is lost on screen. */
  raw: string;
}

/** A number immediately before an optional "cm". */
const NUM = String.raw`(\d{1,3}(?:\.\d+)?)\s*(?:cm)?`;

function find(text: string, keys: string[]): number | undefined {
  for (const key of keys) {
    const m = text.match(new RegExp(`${key}\\s*[:=]?\\s*${NUM}`, 'i'));
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return undefined;
}

export function parseDimensions(raw: string): ParsedDimensions {
  const text = (raw ?? '').trim();
  if (!text) return { raw: '' };

  // Seat height first: "SH" and "seat height" both contain an H that the
  // height pattern below would otherwise claim.
  const seatHeight = find(text, ['seat\\s*height', '\\bSH\\b', '\\bseat\\b']);
  const withoutSeat = text.replace(/(seat\s*height|\bSH\b|\bseat\b)\s*[:=]?\s*\d{1,3}(\.\d+)?\s*(cm)?/gi, ' ');

  let width = find(withoutSeat, ['width', '\\bW\\b', 'length', '\\bL\\b']);
  const depth = find(withoutSeat, ['depth', '\\bD\\b']);
  const height = find(withoutSeat, ['height', '\\bH\\b']);

  // "190cm x 240cm" — an L-shaped unit written as its two arms, unlabelled.
  let secondSide: number | undefined;
  const pair = withoutSeat.match(new RegExp(`(?<![A-Z:])${NUM}\\s*[x×]\\s*${NUM}`, 'i'));
  if (pair) {
    const a = Number(pair[1]);
    const b = Number(pair[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      width ??= Math.max(a, b);
      secondSide = Math.min(a, b);
    }
  }

  return { width, depth, height, seatHeight, secondSide, raw: text };
}

/** True when there is enough to draw something rather than nothing. */
export function isDrawable(d: ParsedDimensions): boolean {
  return Boolean(d.width || d.depth || d.height);
}
