// src/constants/videos.ts
//
// Shared by the admin uploader (a client component) and the videos Server
// Actions, which cannot export anything but async functions themselves.

export const VIDEO_KINDS = ['studio', 'customer', 'warehouse'] as const
export type VideoKind = (typeof VIDEO_KINDS)[number]

/** What each kind is and where it goes, in the admin's words. */
export const VIDEO_KIND_LABELS: Record<VideoKind, { label: string; where: string }> = {
  studio:    { label: 'Studio',    where: 'In the product’s gallery, after the photos' },
  customer:  { label: 'Customer',  where: 'On the product page and the Reviews page' },
  warehouse: { label: 'Warehouse', where: 'On the About and Showroom pages' },
}

/** Cloudinary's free plan will not take a single file over this. */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024
