// src/utils/cloudinarySignature.ts
//
// Server only: signs Cloudinary upload parameters with the API secret, so the
// browser can post a file straight to Cloudinary without the upload endpoint
// being open to anyone. Used by the video library and the admin's product and
// category photos.

import 'server-only'
import { createHash } from 'crypto'

/**
 * Cloudinary's signature: parameters sorted by key, joined as k=v with &, the
 * API secret appended, SHA-1 of the whole string.
 */
export function cloudinarySignature(params: Record<string, string>, secret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&')
  return createHash('sha1').update(toSign + secret).digest('hex')
}

/** The account credentials, or null when uploads are not configured. */
export function cloudinaryCredentials(): { cloudName: string; apiKey: string; apiSecret: string } | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret }
}
