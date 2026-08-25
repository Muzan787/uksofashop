// src/utils/socialImage.ts
//
// Product photos are stored at whatever size they were uploaded at, in
// whatever aspect ratio the photographer framed. Handing one of those straight
// to Open Graph gives a scraper a multi-megabyte file it may refuse to fetch,
// in a shape it will crop unpredictably.
//
// Every product image is a Cloudinary /upload/ URL, so the correctly sized
// card can be requested from Cloudinary rather than generated and stored.

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

/**
 * A 1200x630 social card derived from a product photo.
 *
 * - c_fill with g_auto crops to the card shape while keeping the subject,
 *   rather than centre-cropping the sofa out of frame.
 * - f_jpg rather than f_auto: content negotiation is right for browsers, but
 *   a scraper that advertises no Accept header can end up with AVIF, and not
 *   every social preview renderer decodes it.
 * - q_auto:good keeps these well inside the few-hundred-KB range that
 *   Facebook and WhatsApp are willing to fetch.
 *
 * Returns undefined for anything that is not a Cloudinary upload URL, so the
 * caller falls back to the site-wide card instead of emitting a broken link.
 */
export function socialImageUrl(src: string | null | undefined): string | undefined {
  if (!src || !src.includes('/upload/')) return undefined

  const transform = `c_fill,g_auto,w_${OG_WIDTH},h_${OG_HEIGHT},f_jpg,q_auto:good`

  // Don't stack a second transform on a URL that already carries one.
  const [prefix, rest] = src.split('/upload/')
  const alreadyTransformed = /^(?!v\d+\/)[a-z]{1,3}_[^/]+\//.test(rest)
  if (alreadyTransformed) return src

  return `${prefix}/upload/${transform}/${rest}`
}

/**
 * A fully described Open Graph image entry. Declaring the dimensions and MIME
 * type lets a scraper lay out the card before it has fetched the file, which
 * is what makes WhatsApp show a large preview rather than a thumbnail.
 */
export function ogImage(url: string, alt: string) {
  return { url, width: OG_WIDTH, height: OG_HEIGHT, alt, type: 'image/jpeg' }
}

/**
 * The lead image for a product, chosen the same way the gallery chooses it:
 * lowest priority value first, skipping variants with no image.
 */
export function leadVariantImage(
  variants: { image_url?: string | null; priority?: number | null }[] | null | undefined,
): string | undefined {
  return [...(variants ?? [])]
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .find(v => v.image_url)?.image_url ?? undefined
}
