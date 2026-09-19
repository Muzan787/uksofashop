// src/app/actions/videos.ts
'use server'

import { createHash } from 'crypto'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/utils/auth'
import { VIDEO_TRANSFORM } from '@/utils/cloudinary'
import { VIDEO_KINDS, type VideoKind } from '@/constants/videos'

/**
 * The video library's server side.
 *
 * The clip itself never passes through here. A Vercel function accepts a few
 * megabytes of request body and a phone clip is tens of them, so the browser
 * posts the file straight to Cloudinary - but with a signature this file
 * produced, which is what stops the upload endpoint being a public one. The
 * review-photo uploader in upload.ts explains why an unsigned preset is a
 * problem; this is the same answer applied to video.
 *
 * Flow: signVideoUpload -> (browser uploads to Cloudinary) -> saveVideo.
 */

/** Every page a clip can appear on, so a change shows straight away. */
function revalidateStorefront() {
  revalidateTag('videos', 'max')
  revalidatePath('/admin/videos')
  revalidatePath('/reviews')
  revalidatePath('/about')
  revalidatePath('/showroom')
  revalidatePath('/shop/[category]/[slug]', 'page')
}

/**
 * Cloudinary's signature: parameters sorted by key, joined as k=v with &, the
 * API secret appended, SHA-1 of the whole string.
 */
function sign(params: Record<string, string>, secret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&')
  return createHash('sha1').update(toSign + secret).digest('hex')
}

function credentials() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Video upload is not configured: CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are missing.')
  }
  return { cloudName, apiKey, apiSecret }
}

export interface SignedUpload {
  url: string
  fields: Record<string, string>
}

/**
 * A signed, single-use set of upload parameters for one clip.
 *
 * The eager transformation asks Cloudinary to encode the phone-sized MP4 the
 * player will request as soon as the upload lands, in the background, so the
 * first visitor to press play is not the one who waits for it.
 */
export async function signVideoUpload(kind: VideoKind): Promise<SignedUpload> {
  await requireAdmin()
  if (!VIDEO_KINDS.includes(kind)) throw new Error('Unknown video kind')

  const { cloudName, apiKey, apiSecret } = credentials()
  const params: Record<string, string> = {
    folder: `videos/${kind}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
    eager: VIDEO_TRANSFORM,
    eager_async: 'true',
  }

  return {
    url: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    fields: { ...params, api_key: apiKey, signature: sign(params, apiSecret) },
  }
}

export interface NewVideo {
  kind: VideoKind
  productId: string | null
  caption: string
  url: string
  publicId: string
  width: number | null
  height: number | null
  duration: number | null
}

/** Records a clip Cloudinary has accepted. */
export async function saveVideo(video: NewVideo): Promise<{ error?: string }> {
  await requireAdmin()

  if (!VIDEO_KINDS.includes(video.kind)) return { error: 'Unknown video kind' }
  if (!video.url.includes('/video/upload/') || !video.publicId) {
    return { error: 'That does not look like an uploaded video.' }
  }
  // A warehouse clip belongs to the business, not to a sofa.
  const productId = video.kind === 'warehouse' ? null : video.productId || null

  const supabase = await createClient()
  const { error } = await supabase.from('videos').insert({
    kind: video.kind,
    product_id: productId,
    caption: video.caption.trim() || null,
    url: video.url,
    public_id: video.publicId,
    width: video.width,
    height: video.height,
    duration: video.duration,
  })
  if (error) return { error: error.message }

  revalidateStorefront()
  return {}
}

/** Caption, product and position, from the card's inline form. */
export async function updateVideo(formData: FormData) {
  await requireAdmin()

  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('Missing video id')

  const productId = String(formData.get('product_id') ?? '').trim()
  const sortOrder = Number.parseInt(String(formData.get('sort_order') ?? '0'), 10)

  const supabase = await createClient()
  const { error } = await supabase
    .from('videos')
    .update({
      caption: String(formData.get('caption') ?? '').trim() || null,
      product_id: productId || null,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidateStorefront()
}

/** Takes a clip off the site, or puts it back, without deleting the file. */
export async function setVideoActive(formData: FormData) {
  await requireAdmin()

  const id = String(formData.get('id') ?? '')
  const active = formData.get('active') === 'true'
  if (!id) throw new Error('Missing video id')

  const supabase = await createClient()
  const { error } = await supabase.from('videos').update({ is_active: active }).eq('id', id)
  if (error) throw new Error(error.message)

  revalidateStorefront()
}

/**
 * Deletes the row and then the file.
 *
 * The row goes first: if Cloudinary is unreachable the clip is off the site
 * either way, and an orphaned file costs storage but shows nobody anything.
 * The other order could leave a live row pointing at a deleted file.
 */
export async function deleteVideo(formData: FormData) {
  await requireAdmin()

  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('Missing video id')

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('videos')
    .delete()
    .eq('id', id)
    .select('public_id')
    .maybeSingle()
  if (error) throw new Error(error.message)

  if (row?.public_id) {
    const { cloudName, apiKey, apiSecret } = credentials()
    const params: Record<string, string> = {
      public_id: row.public_id,
      invalidate: 'true',
      timestamp: String(Math.floor(Date.now() / 1000)),
    }
    const body = new FormData()
    for (const [k, v] of Object.entries(params)) body.append(k, v)
    body.append('api_key', apiKey)
    body.append('signature', sign(params, apiSecret))

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/destroy`, {
        method: 'POST',
        body,
      })
      if (!res.ok) console.error('Cloudinary destroy failed:', res.status, await res.text())
    } catch (err) {
      console.error('Cloudinary destroy error:', err)
    }
  }

  revalidateStorefront()
}
