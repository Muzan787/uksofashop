// src/components/Product/dimensions.ts
//
// The dimensions field is free text typed into the admin panel, and it is not
// consistent. Real values in the catalogue today:
//
//   "L:198cm H:97cm D:99cm"
//   "L:115cm H:97cm D:99cm"
//   "190cm x 240cm H:90cm D:95cm"    ← a corner unit: two arms, then H and D
//   "Length:169 | Width:94 | Height:94"             ← the Nova convention
//   "3 Seater: L:198cm ... | 2 Seater: L:168cm ..." ← one record, two sofas
//
// So this reads what is labelled, recognises the bare "A x B" pair a corner
// sofa is written with, and hands back whatever it found. Nothing is inferred:
// a measurement that is not in the string does not appear on the diagram.
//
// TWO CONVENTIONS FOR THE SAME THREE NUMBERS. Most records write the
// across-the-room measurement as L and the front-to-back one as D. The Nova
// records write them as "Length" and "Width". Read naively, "Width" wins the
// width slot and the Nova 3-seater is published as 94cm wide instead of 198 -
// so where a record gives BOTH a length and a width, length is the width and
// the width value is the depth. That is handled explicitly below rather than
// by key ordering, which is what got it wrong.

export interface ParsedDimensions {
  /** Centimetres. Absent where the record does not say. */
  width?: number;
  depth?: number;
  height?: number;
  seatHeight?: number;
  /** The shorter arm of an L-shape, where the record gives two lengths. */
  secondSide?: number;
  /**
   * True when the record describes more than one piece - a 3+2 set writes both
   * sofas into one field. The numbers parsed out of such a string belong to
   * whichever piece was written first, so they describe a part of the product
   * rather than the product. The diagram can still draw that piece; Product
   * structured data must not publish it as the product's own width, which is
   * what put "198cm wide" on eight two-piece sets.
   */
  multiPiece?: boolean;
  /** Always kept, so nothing the maker wrote is lost on screen. */
  raw: string;
}

/**
 * Two or more pieces written into one dimensions field.
 *
 * Matches the labels actually in the catalogue - "3 Seater:", "3-Seater",
 * "2-seater" - and only counts it as a set when at least two of them appear.
 * A single "3 Seater: L:198cm" record is one sofa and is read normally.
 */
function countsPieces(text: string): number {
  return (text.match(/\d\s*-?\s*seater\b/gi) ?? []).length;
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

  // Resolved separately so a record carrying both labels is read correctly.
  const labelledLength = find(withoutSeat, ['length', '\\bL\\b']);
  const labelledWidth = find(withoutSeat, ['width', '\\bW\\b']);
  const labelledDepth = find(withoutSeat, ['depth', '\\bD\\b']);

  // Length wins the width slot wherever it is given; a width stated beside a
  // length is the front-to-back measurement, so it falls through to depth.
  let width = labelledLength ?? labelledWidth;
  const depth = labelledDepth ?? (labelledLength ? labelledWidth : undefined);
  const height = find(withoutSeat, ['height', '\\bH\\b']);

  // "190cm x 240cm" — an L-shaped unit written as its two arms, unlabelled.
  //
  // The lookbehind used to be a single `(?<![A-Z:])`, which only stopped the
  // match from BEGINNING at the character after a label. On "L:240cm x 240cm"
  // it therefore skipped the "2" and matched "40cm x 240cm", reporting a 40cm
  // second side on every Lily, Sims and Malibu corner unit. Requiring that no
  // digit precede the first number as well pins the match to a whole number,
  // and the label itself is already consumed by `find` above.
  let secondSide: number | undefined;
  const pair = withoutSeat.match(new RegExp(`(?<![A-Z:\\d.])${NUM}\\s*[x×]\\s*${NUM}`, 'i'));
  if (pair) {
    const a = Number(pair[1]);
    const b = Number(pair[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      width ??= Math.max(a, b);
      secondSide = Math.min(a, b);
    }
  }

  // "L:240cm x 240cm" — the same two arms, but with the first one labelled, so
  // the unlabelled pattern above cannot reach it. Tightening that lookbehind
  // stopped it reporting a bogus 40cm side; this is what restores the real one,
  // on the Lily, Malibu and Sims corner and armed-U records.
  if (secondSide === undefined) {
    const labelledPair = withoutSeat.match(
      new RegExp(`(?:length|\\bL\\b)\\s*[:=]?\\s*${NUM}\\s*[x×]\\s*${NUM}`, 'i'),
    );
    if (labelledPair) {
      const a = Number(labelledPair[1]);
      const b = Number(labelledPair[2]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        width ??= Math.max(a, b);
        secondSide = Math.min(a, b);
      }
    }
  }

  return {
    width,
    depth,
    height,
    seatHeight,
    secondSide,
    multiPiece: countsPieces(text) > 1,
    raw: text,
  };
}

/** True when there is enough to draw something rather than nothing. */
export function isDrawable(d: ParsedDimensions): boolean {
  return Boolean(d.width || d.depth || d.height);
}
