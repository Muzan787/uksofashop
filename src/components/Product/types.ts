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
