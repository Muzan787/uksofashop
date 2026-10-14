// src/app/actions/image-upload.ts
'use server'

import { requireAdmin } from '@/utils/auth'
import { cloudinaryCredentials, cloudinarySignature } from '@/utils/cloudinarySignature'

/**
 * Signed upload parameters for one product or category photo.
 *
 * These photos used to be posted from the browser with the `products` upload
 * preset and nothing else. That preset is unsigned, and its name and the cloud
 * name are both in the page source - so anyone could upload anything to the
 * account through it, the same hole upload.ts closed for review photos. Now
 * the admin's browser asks for a signature first, which only an admin can get,
 * and posts the file straight to Cloudinary with it; the file itself never
 * passes through this server.
 *
 * The preset still rides along, signed, so whatever it does today (its folder,
 * its naming) carries on unchanged. Once this is live the preset can be
 * switched to Signed in Cloudinary and the unsigned door closes.
 *
 * No public_id is sent: Cloudinary names the file, so an upload can never
 * overwrite an existing photo. An iPhone's HEIC photo is converted to JPEG as
 * it is stored, so every browser can show it.
 */
export async function signImageUpload(
  options: { heic?: boolean } = {},
): Promise<{ url: string; fields: Record<string, string> } | { error: string }> {
  await requireAdmin()

  const credentials = cloudinaryCredentials()
  if (!credentials) {
    return { error: 'Photo upload is not set up: CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are missing.' }
  }
  const { cloudName, apiKey, apiSecret } = credentials

  const params: Record<string, string> = {
    timestamp: String(Math.floor(Date.now() / 1000)),
  }
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRODUCT_UPLOAD_PRESET
  if (preset) params.upload_preset = preset
  if (options.heic === true) params.format = 'jpg'

  return {
    url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    fields: { ...params, api_key: apiKey, signature: cloudinarySignature(params, apiSecret) },
  }
}
