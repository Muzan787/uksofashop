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

// ─── Video ───────────────────────────────────────────────────────────────────
//
// A clip uploaded from the admin panel arrives as a Cloudinary VIDEO resource,
// and the same host makes both things the storefront needs from it: a still
// frame to show before anyone presses play, and a phone-sized MP4 to play
// when they do. Both are derived on Cloudinary, not here, so a 60MB clip
// from a phone is never what a visitor downloads.

/** True for a Cloudinary video delivery URL. */
export function isCloudinaryVideo(url: string | null | undefined): boolean {
  return Boolean(url && url.includes('/video/upload/'));
}

/**
 * The clip's first frame, as a JPEG, at a chosen width.
 *
 * Cloudinary returns a frame when a video URL asks for an image extension;
 * `so_0` picks the first one. The result is an ordinary image URL that
 * next/image and the blur placeholder handle exactly like a photograph.
 */
export function videoPoster(url: string, width = 1200): string {
  if (!isCloudinaryVideo(url)) return url;
  return url
    .replace('/video/upload/', `/video/upload/so_0,w_${width},c_limit,q_auto/`)
    .replace(/\.[a-z0-9]+$/i, '.jpg');
}

/**
 * The transformation the player asks for: capped at 1080px on the long edge,
 * quality chosen by Cloudinary, delivered as H.264 MP4 - which every phone
 * plays natively. The admin upload requests this same derivative eagerly, so
 * the first visitor is not the one who waits for it to be encoded.
 */
export const VIDEO_TRANSFORM = 'w_1080,c_limit,q_auto,f_mp4';

/** The clip at a size a phone can stream. */
export function videoSource(url: string): string {
  if (!isCloudinaryVideo(url)) return url;
  return url
    .replace('/video/upload/', `/video/upload/${VIDEO_TRANSFORM}/`)
    .replace(/\.[a-z0-9]+$/i, '.mp4');
}
