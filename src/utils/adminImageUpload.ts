// src/utils/adminImageUpload.ts
//
// Browser side of a product or category photo upload: get a signature from
// the server (admins only), then post the file straight to Cloudinary with it.
// See actions/image-upload.ts for why the upload is signed.

import { signImageUpload } from '@/app/actions/image-upload'

function isHeic(file: File): boolean {
  // Some phones and Windows hand over HEIC with no type at all, so the
  // extension counts too.
  return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
}

/** Uploads one photo and returns its Cloudinary URL, or throws with a reason. */
export async function uploadAdminImage(file: File): Promise<string> {
  const signed = await signImageUpload({ heic: isHeic(file) })
  if ('error' in signed) throw new Error(signed.error)

  const body = new FormData()
  for (const [key, value] of Object.entries(signed.fields)) body.append(key, value)
  body.append('file', file)

  const res = await fetch(signed.url, { method: 'POST', body })
  const data = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null
  if (!res.ok || !data?.secure_url) {
    throw new Error(data?.error?.message || 'Cloudinary did not accept the photo.')
  }
  return data.secure_url
}
