// src/components/Product/types.ts
//
// The shapes the product page and its six sections share. They lived inside
// ProductPageClient when that file was the whole page; they are here now so a
// section can be read, or changed, without opening the orchestrator.

export interface Variant {
  id: string
  color: string | null
  color_hex: string | null
  material: string | null
  image_url: string | null
  price_adjustment: number
}

export interface Review {
  id: string
  customer_name: string
  /** Set where the review is attached to a real order. Drives "Verified buyer". */
  order_id?: string | null
  image_url: string | null
  rating: number
  comment: string
  created_at: string
  status: string
}

export interface Product {
  id: string
  title: string
  slug: string
  description: string | null
  base_price: number
  specifications: Record<string, string> | string | null
  gallery_images?: string[] | null
  product_variants?: Variant[]
  reviews?: Review[]
  /** Drives the "Made in the UK" badge. Only 'uk' shows anything. */
  origin?: string | null
  /** Drives the made-to-order panel and its Consumer Contracts notice. */
  custom_made?: boolean | null
}

export interface SimilarProduct {
  id: string
  title: string
  slug: string
  base_price: number
  image_url: string
}

export interface SizeVariant {
  id: string
  slug: string
  size_label: string
  subgroup_label?: string | null
}

/** One image in the main slider. */
export interface GalleryImage {
  src: string
}

/** One colour choice under the gallery. */
export interface Swatch {
  id: string
  color: string
  hex: string | null
  image: string | null
}

// ─── The made-to-order fabric library ─────────────────────────────────────────
//
// Deliberately not the same shape as Variant. A variant is a photographed,
// priced SKU of one product; a fabric is a choice offered across every
// made-to-order frame. The swatch row on the product page shows the variants
// (picking one changes the photograph); the dialog behind it shows the whole
// library (picking one sets what gets built, and the gallery honestly goes on
// showing the fabric it was actually shot in).

export interface Fabric {
  id: string
  /** The supplier's code — CH01, PL08. What goes on the purchase order. */
  code: string
  /** Ours, not theirs. "Turquoise", not "PL08 Plush Soft Velvet Torqouise". */
  name: string
  /** Approximate. A placeholder tile while the photograph loads, never a claim. */
  hex: string | null
  image: string | null
  /** False where we cannot post a sample of it. */
  swatchable: boolean
  /** Denormalised for the chosen-fabric line, which has no collection to hand. */
  collectionName: string
}

export interface FabricCollection {
  id: string
  slug: string
  name: string
  fabrics: Fabric[]
}
