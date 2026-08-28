// src/utils/cloudinary.ts
//
// Transform helpers for the image host. cloudinaryLoader.js injects its own
// `f_auto,c_limit,w_,q_` segment immediately after /upload/, so anything added
// here becomes a SECOND segment and the two chain — Cloudinary applies them
// left to right and returns one file.

/** True for URLs the loader can actually transform. */
function transformable(url: string): boolean {
  return url.includes('/upload/');
}

/**
 * A ~200-byte blurred thumbnail, for `placeholder="blur"`.
 *
 * Every image on this site currently pops out of a flat grey box. Next needs a
 * `blurDataURL` to do better, and there is no build step here that could inline
 * a base64 one for 60-odd remote product photos — so this asks Cloudinary for a
 * 16px version instead. It is a real request, but a tiny one, and it arrives
 * long before the full image.
 */
export function blurDataURL(url: string | null | undefined): string | undefined {
  if (!url || !transformable(url)) return undefined;
  return url.replace('/upload/', '/upload/w_16,q_20,e_blur:600,f_auto/');
}

/**
 * The same photograph at a chosen width.
 *
 * For the places that need a URL rather than an `<Image>` — a CSS background,
 * an `<img>` in an email — where next/image's loader never runs and the raw
 * Cloudinary URL would otherwise serve the full-size original. The product
 * page's 2× magnifier is the current caller: without this it would fetch a
 * multi-megabyte master the moment a pointer crossed the stage.
 */
export function sized(url: string | null | undefined, width: number): string | undefined {
  if (!url) return undefined;
  if (!transformable(url)) return url;
  return url.replace('/upload/', `/upload/w_${Math.round(width)},c_limit,q_auto,f_auto/`);
}

/**
 * Darkens an image at the source rather than in the browser.
 *
 * The alternative — shipping the full-size file and rendering it at reduced
 * opacity — downloads every byte and then throws a third of them away at the
 * compositor, and the result reads as washed grey rather than a lit photograph
 * on a dark ground.
 */
export function darkened(url: string, brightness = -34, contrast = 12): string {
  if (!transformable(url)) return url;
  return url.replace('/upload/', `/upload/e_brightness:${brightness},e_contrast:${contrast}/`);
}
