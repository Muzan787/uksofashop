// src/types/build.ts
//
// What a customer decided on /build, in the shape it travels in.
//
// The same object goes into the basket line (CartContext), across the wire
// to placeOrder (actions/checkout.ts) and into order_items.customisation as
// a jsonb snapshot - so the admin panel, the copy-to-WhatsApp button and the
// delivery note can all read one thing rather than three near-copies of it.
//
// Every value here is a LABEL, frozen at the moment of the order. Feet and
// piping are described by name and code rather than by a reference into a
// live table, for the same reason order_items keeps fabric_name beside
// fabric_id: the sofa was ordered with what the customer saw, and what the
// customer saw must survive the catalogue changing under it.

export type BuildBack = 'High Back' | 'Scattered Back'

export interface BuildFeet {
  /** The supplier's code - SF015G. What goes on the purchase order. */
  code: string
  /** Ours - "Fluted shell". */
  name: string
  /** "Rose gold". Null where the style comes in one finish only. */
  finish: string | null
  image: string | null
}

export interface BuildPiping {
  fabric_id: string
  code: string
  name: string
  collection: string
  image: string | null
}

export interface BuildNotes {
  dimensions: string | null
  design: string | null
  other: string | null
}

export interface BuildSpec {
  /**
   * Stable for the life of one build and nothing else. Two builds of the same
   * frame in the same fabric are two sofas, and the basket keys on this so it
   * never merges them into one line of quantity two.
   */
  key: string
  /** "3 Seater", "5 Seater Corner", or "Custom". */
  seats: string
  /** What they typed, when seats is "Custom". */
  custom_seats: string | null
  back: BuildBack | null
  /** "Verona". The frame's family, for the summary and the chat. */
  design: string
  /** Null means "as pictured on the design". */
  feet: BuildFeet | null
  /** Null means plain seams. */
  piping: BuildPiping | null
  notes: BuildNotes
}

/** The value stored on the order: everything but the basket key. */
export type BuildSnapshot = Omit<BuildSpec, 'key'>

export function buildSnapshot(spec: BuildSpec): BuildSnapshot {
  const { key, ...rest } = spec
  void key
  return rest
}

/**
 * The build as a list of "Label: value" lines.
 *
 * One formatter, used by the basket, the checkout summary, the WhatsApp
 * message, the admin panel and the printed delivery note - so the words a
 * customer read on the summary screen are the words the workshop reads.
 * Anything left at its default is left out rather than printed as "none".
 */
export function describeBuild(build: Partial<BuildSnapshot> | null | undefined): { label: string; value: string }[] {
  if (!build) return []
  const lines: { label: string; value: string }[] = []

  if (build.seats) {
    lines.push({
      label: 'Seats',
      value: build.seats === 'Custom' && build.custom_seats
        ? `Custom — ${build.custom_seats}`
        : build.seats,
    })
  }
  if (build.back) lines.push({ label: 'Back', value: build.back })
  if (build.feet) {
    lines.push({
      label: 'Feet',
      value: `${build.feet.name}${build.feet.finish ? ` — ${build.feet.finish}` : ''} (${build.feet.code})`,
    })
  }
  if (build.piping) {
    lines.push({
      label: 'Piping',
      value: `${build.piping.collection} ${build.piping.name} (${build.piping.code})`,
    })
  }
  const notes = build.notes
  if (notes?.dimensions) lines.push({ label: 'Custom dimensions', value: notes.dimensions })
  if (notes?.design) lines.push({ label: 'Design changes', value: notes.design })
  if (notes?.other) lines.push({ label: 'Other', value: notes.other })

  return lines
}

/**
 * A jsonb value read back from order_items.customisation, narrowed. Anything
 * that is not an object - and a column of that type can hold a string - is
 * treated as no build rather than as a crash in the admin panel.
 */
export function asBuildSnapshot(value: unknown): Partial<BuildSnapshot> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Partial<BuildSnapshot>
}

/** True when the customer asked for anything beyond the frame and the fabric. */
export function buildHasExtras(build: Partial<BuildSnapshot> | null | undefined): boolean {
  if (!build) return false
  return Boolean(
    build.seats === 'Custom' ||
    build.feet ||
    build.piping ||
    build.notes?.dimensions ||
    build.notes?.design ||
    build.notes?.other,
  )
}
