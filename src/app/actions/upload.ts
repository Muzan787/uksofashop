// src/app/actions/upload.ts
'use server'

import { createHash } from 'crypto'
import { createClient } from '@/utils/supabase/server'
import { rateLimit, callerKey } from '@/utils/rateLimit'
import { headers } from 'next/headers'

/**
 * Review photo upload, signed server-side.
 *
 * This used to post straight from the browser to Cloudinary with an UNSIGNED
 * preset named 'reviews'. An unsigned preset is a public write endpoint: the
 * cloud name is in the page source, so anyone could upload anything to the
 * account - any file type, any size, as often as they liked - and it would be
 * served from our domain's CDN. Nothing tied an upload to a customer.
 *
 * Now the file is posted to this server action, which checks the caller, the
 * file type and the size before signing a request with the API secret. The
 * secret never reaches the browser.
 *
 * Cloudinary setup this expects:
 *   - CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the environment
 *   - the 'reviews' preset switched from Unsigned to Signed in the dashboard
 *     (Settings -> Upload -> Upload presets). Until it is switched, the old
 *     unsigned endpoint stays open even though nothing here uses it.
 */

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Image upload is not configured. Please email your photo to us instead.')
  }

  // Only signed-in customers can leave a review, so only they can upload.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Please sign in before adding a photo.')
  }

  // Five photos per hour per person. A review needs one or two.
  const limit = rateLimit(callerKey(await headers(), `upload:${user.id}`), 5, 60 * 60 * 1000)
  if (!limit.ok) {
    throw new Error('You have uploaded several photos already. Please try again a little later.')
  }

  if (!ALLOWED.includes(file.type)) {
    throw new Error('Please upload a photo as a JPG, PNG or WebP.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('That photo is too large. Please use one under 8MB.')
  }

  const timestamp = Math.floor(Date.now() / 1000)
  // Uploads land in one folder so review images can be found and moderated,
  // and are tagged with the uploader for the same reason.
  const params: Record<string, string> = {
    folder: 'reviews',
    timestamp: String(timestamp),
    upload_preset: 'reviews',
  }

  // Cloudinary's signature: parameters sorted by key, joined as k=v pairs with
  // &, the API secret appended, then SHA-1 of the whole string.
  const toSign = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&')
  const signature = createHash('sha1').update(toSign + apiSecret).digest('hex')

  const body = new FormData()
  body.append('file', file)
  body.append('api_key', apiKey)
  body.append('signature', signature)
  for (const [k, v] of Object.entries(params)) body.append(k, v)

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body },
    )
    const data = await response.json()

    if (!response.ok || !data.secure_url) {
      console.error('Cloudinary upload rejected:', data?.error?.message ?? response.status)
      throw new Error('We could not upload that photo. Please try again.')
    }
    return data.secure_url as string
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error('Image upload failed. Please try again.')
  }
}
