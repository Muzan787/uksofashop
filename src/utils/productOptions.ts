// src/utils/productOptions.ts
//
// What a variant IS when it is not a colourway, and what a basket line chose
// on top of it - in words.
//
// A sofa's variants are colourways and every size is its own product. A bed is
// one product whose ten variants are five sizes, each as the frame alone or
// as a set with a mattress, and a mattress is one product in five sizes. The
// database holds those as codes on product_variants.options -
// {"size":"4ft6","build":"set"} - and this file is the only place they are
// turned into words, so the product page, the basket, the admin panel, the
// delivery note and the WhatsApp copy can never call one bed two things.
//
// Add-ons ("Gas lift storage", "2000 pocket sprung") are priced choices on top
// of a variant. Their names and prices live in the addons table; place_order
// snapshots them onto the order line next to the variant's options:
//
//   order_items.customisation = {
//     kind: 'options', product_type: 'bed',
//     options: { size: '4ft6', build: 'set' },
//     addons: [{ id, group: 'Extras', name: 'Gas lift storage', price: 110 }],
//   }
//
// A /build sofa's customisation has no `kind` at all, which is how
// describeCustomisation tells the two apart.
//
// Dining and the rest will add axes here (top, chairs, finish) rather than a
// formatter of their own.

import { describeBuild, asBuildSnapshot } from '@/types/build'

/** The product types the storefront knows how to draw. Anything else is a sofa. */
export type ProductType = 'sofa' | 'bed' | 'mattress'

export function asProductType(value: unknown): ProductType {
  return value === 'bed' || value === 'mattress' ? value : 'sofa'
}

/** What every product but a sofa is called in a sentence: "this bed". */
export const PRODUCT_NOUN: Record<ProductType, string> = {
  sofa: 'sofa',
  bed: 'bed',
  mattress: 'mattress',
}

// ─── The axes ────────────────────────────────────────────────────────────────

export interface AxisValue {
  code: string
  /** On the tile: "Double". */
  label: string
  /** Under it: "4ft 6in". */
  detail?: string
  /** One line of what it is, where the tile has room. */
  blurb?: string
  /** In a sentence and on the order: "Double (4ft 6in)". */
  long: string
}

export interface Axis {
  key: string
  /** The heading over the tiles: "Size". */
  label: string
  /** On a basket or order line, where it differs: "Bed" rather than "Frame or set". */
  lineLabel?: string
  values: AxisValue[]
}

/**
 * UK bed and mattress sizes. The centimetres are the standard UK mattress
 * sizes, which is what a customer measures a room against.
 */
export const SIZE_AXIS: Axis = {
  key: 'size',
  label: 'Size',
  values: [
    { code: '3ft',  label: 'Single',       detail: "3ft · 90 × 190cm",     long: "Single (3ft)" },
    { code: '4ft',  label: 'Small Double', detail: "4ft · 120 × 190cm",    long: "Small Double (4ft)" },
    { code: '4ft6', label: 'Double',       detail: "4ft 6in · 135 × 190cm", long: "Double (4ft 6in)" },
    { code: '5ft',  label: 'King',         detail: "5ft · 150 × 200cm",    long: "King (5ft)" },
    { code: '6ft',  label: 'Super King',   detail: "6ft · 180 × 200cm",    long: "Super King (6ft)" },
  ],
}

/** The words for the Standard mattress a bed set comes with - Muaz's own. */
export const STANDARD_MATTRESS =
  'Our Standard mattress: an 8-9 inch hybrid spring mattress with a layer of foam.'

export const BUILD_AXIS: Axis = {
  key: 'build',
  label: 'Frame or set',
  lineLabel: 'Bed',
  values: [
    {
      code: 'frame',
      label: 'Frame only',
      blurb: 'The bed frame, headboard and footboard. Bring your own mattress.',
      long: 'Frame only',
    },
    {
      code: 'set',
      label: 'Bed set',
      blurb: 'The frame with our Standard mattress, which you can upgrade below.',
      long: 'Bed set (frame + mattress)',
    },
  ],
}

/** In the order they are shown and described. */
export const AXES: Axis[] = [SIZE_AXIS, BUILD_AXIS]

export function axisFor(key: string): Axis | undefined {
  return AXES.find(a => a.key === key)
}

export function axisValue(key: string, code: string | undefined | null): AxisValue | undefined {
  if (!code) return undefined
  return axisFor(key)?.values.find(v => v.code === code)
}

/** A variant's options, narrowed from jsonb. Anything that is not text is dropped. */
export function asOptions(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string' && v) out[k] = v
  }
  return out
}

/**
 * "Double (4ft 6in) · Bed set (frame + mattress)" - the variant in one line,
 * for a basket row, a select in the admin panel or a feed title.
 */
export function optionsLabel(options: Record<string, string>, separator = ' · '): string {
  return AXES
    .filter(a => options[a.key])
    .map(a => axisValue(a.key, options[a.key])?.long ?? options[a.key])
    .join(separator)
}

// ─── What a line chose ───────────────────────────────────────────────────────

export interface AddonSnapshot {
  id: string
  /** The group's name - "Extras", "Mattress upgrade". */
  group: string
  name: string
  price: number
}

/** What place_order writes onto order_items.customisation for these lines. */
export interface OptionsSnapshot {
  kind: 'options'
  product_type: ProductType | string
  options: Record<string, string>
  addons: AddonSnapshot[]
}

export function isOptionsSnapshot(value: unknown): value is OptionsSnapshot {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) &&
    (value as { kind?: unknown }).kind === 'options'
}

function money(n: number): string {
  return Number.isInteger(n) ? `£${n}` : `£${n.toFixed(2)}`
}

/**
 * The line as "Label: value" rows - "Size: Double (4ft 6in)", "Extras: Gas
 * lift storage (+£110), Solid base (+£35)". Add-ons carry their price so the
 * workshop and the customer can both see what the line total is made of.
 */
export function describeOptions(snapshot: Partial<OptionsSnapshot> | null | undefined): { label: string; value: string }[] {
  if (!snapshot) return []
  const lines: { label: string; value: string }[] = []
  const options = asOptions(snapshot.options)

  for (const axis of AXES) {
    const code = options[axis.key]
    if (!code) continue
    lines.push({ label: axis.lineLabel ?? axis.label, value: axisValue(axis.key, code)?.long ?? code })
  }

  const groups = new Map<string, string[]>()
  for (const a of Array.isArray(snapshot.addons) ? snapshot.addons : []) {
    if (!a || typeof a.name !== 'string') continue
    const group = typeof a.group === 'string' && a.group ? a.group : 'Extras'
    const price = Number(a.price)
    groups.set(group, [...(groups.get(group) ?? []), price > 0 ? `${a.name} (+${money(price)})` : a.name])
  }
  for (const [group, names] of groups) lines.push({ label: group, value: names.join(', ') })

  // A set with no upgrade comes with the Standard mattress; say so, because
  // "Bed set" alone does not tell the warehouse which mattress to load.
  if (options.build === 'set' && !groups.has('Mattress upgrade')) {
    lines.push({ label: 'Mattress', value: 'Standard hybrid spring (included)' })
  }

  return lines
}

/**
 * Whatever is on an order line's customisation, as rows. A /build sofa and a
 * bed's options are told apart by `kind`; anything else is nothing rather
 * than a crash in the admin panel.
 */
export function describeCustomisation(value: unknown): { label: string; value: string }[] {
  if (isOptionsSnapshot(value)) return describeOptions(value)
  return describeBuild(asBuildSnapshot(value))
}
