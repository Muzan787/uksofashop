// scripts/social/lib/cloudinary.ts
//
// Product photographs live on Cloudinary at whatever size and shape they were
// uploaded, so the post asks Cloudinary for the exact crop it needs rather
// than downloading the original and resizing it here. Same approach as
// src/utils/socialImage.ts, with the size chosen per template rather than
// fixed at Open Graph's 1200x630.

const TRANSFORMED = /^(?!v\d+\/)[a-z]{1,3}_[^/]+\//

/**
 * A photograph cropped to exactly `width` x `height`.
 *
 * - c_fill with g_auto keeps the subject in frame instead of centre-cropping
 *   the sofa out of it.
 * - f_jpg because the source is a photograph and the PNG is made here; asking
 *   for AVIF would only add a decode step.
 * - q_auto:best: this is the one place bytes do not matter. The screenshot is
 *   the deliverable and it is taken once.
 *
 * Anything that is not a Cloudinary upload URL (a --image override pointing
 * at a generated room scene, say) is returned untouched and stretched to fit
 * by the template's object-fit: cover.
 */
export function cloudinaryFill(src: string, width: number, height: number): string {
  if (!src.includes('/upload/')) return src

  const [prefix, rest] = src.split('/upload/')
  if (TRANSFORMED.test(rest)) return src

  const transform = `c_fill,g_auto,w_${width},h_${height},f_jpg,q_auto:best`
  return `${prefix}/upload/${transform}/${rest}`
}
