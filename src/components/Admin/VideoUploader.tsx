'use client'
// src/components/Admin/VideoUploader.tsx

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, Video } from 'lucide-react'
import { signVideoUpload, saveVideo } from '@/app/actions/videos'
import { MAX_VIDEO_BYTES, VIDEO_KINDS, VIDEO_KIND_LABELS, type VideoKind } from '@/constants/videos'

/** The parts of Cloudinary's upload response this form keeps. */
interface CloudinaryUpload {
  secure_url: string
  public_id: string
  width?: number
  height?: number
  duration?: number
}

interface ProductOption {
  id: string
  title: string
}

interface Props {
  products: ProductOption[]
}

/**
 * The upload form.
 *
 * The file goes from this browser straight to Cloudinary, with a signature
 * from the server - see actions/videos.ts for why it cannot go through a
 * Server Action. XMLHttpRequest rather than fetch because a 60MB clip from a
 * phone on mobile data takes a while, and fetch cannot report how far it is.
 */
export default function VideoUploader({ products }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [kind, setKind] = useState<VideoKind>('studio')
  const [productId, setProductId] = useState('')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  const needsProduct = kind !== 'warehouse'
  const busy = progress !== null

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!file) return setMessage({ tone: 'bad', text: 'Choose a video first.' })
    if (needsProduct && !productId) return setMessage({ tone: 'bad', text: 'Pick the product this clip shows.' })
    if (file.size > MAX_VIDEO_BYTES) {
      return setMessage({ tone: 'bad', text: 'That file is over 100MB, which is the most Cloudinary will take. Trim it, or export it at 1080p.' })
    }

    setProgress(0)
    try {
      const signed = await signVideoUpload(kind)

      const body = new FormData()
      body.append('file', file)
      for (const [k, v] of Object.entries(signed.fields)) body.append(k, v)

      const data = await new Promise<CloudinaryUpload>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', signed.url)
        xhr.upload.onprogress = ev => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100))
        }
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText)
            if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) resolve(json)
            else reject(new Error(json?.error?.message || `Upload failed (${xhr.status})`))
          } catch {
            reject(new Error('Upload failed: unreadable response'))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed: network error'))
        xhr.send(body)
      })

      const { error } = await saveVideo({
        kind,
        productId: needsProduct ? productId : null,
        caption,
        url: data.secure_url,
        publicId: data.public_id,
        width: typeof data.width === 'number' ? data.width : null,
        height: typeof data.height === 'number' ? data.height : null,
        duration: typeof data.duration === 'number' ? data.duration : null,
      })
      if (error) throw new Error(error)

      setMessage({ tone: 'ok', text: 'Uploaded. It is on the site now.' })
      setFile(null)
      setCaption('')
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch (err) {
      setMessage({ tone: 'bad', text: err instanceof Error ? err.message : 'Upload failed.' })
    } finally {
      setProgress(null)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-md border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <Video className="h-5 w-5 text-orange-500" />
        <h2 className="m-0 text-lg font-bold text-stone-900">Add a video</h2>
      </div>

      {/* What kind of clip. The kind decides where it appears, so the
          choice says where in plain words. */}
      <div className="grid gap-2 sm:grid-cols-3">
        {VIDEO_KINDS.map(k => {
          const { label, where } = VIDEO_KIND_LABELS[k]
          const active = kind === k
          return (
            <label
              key={k}
              className={`cursor-pointer rounded-sm border-2 p-3 transition ${
                active ? 'border-orange-500 bg-orange-50' : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={active}
                onChange={() => setKind(k)}
                className="sr-only"
              />
              <span className="block text-sm font-bold text-stone-900">{label}</span>
              <span className="mt-1 block text-xs leading-snug text-stone-500">{where}</span>
            </label>
          )
        })}
      </div>

      {needsProduct && (
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-stone-500">Product</label>
          <select
            value={productId}
            onChange={e => setProductId(e.target.value)}
            required
            className="w-full rounded-sm border border-stone-300 bg-white p-3 text-sm text-stone-900"
          >
            <option value="">Choose the product this clip shows…</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-stone-500">
          Caption <span className="font-normal normal-case tracking-normal text-stone-400">(optional)</span>
        </label>
        <input
          type="text"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          maxLength={140}
          placeholder={
            kind === 'customer' ? 'e.g. Sarah in Bolton, Verona 3 seater in grey'
            : kind === 'studio' ? 'e.g. The recliner going back, both sides'
            : 'e.g. Loading the van on a Thursday'
          }
          className="w-full rounded-sm border border-stone-300 p-3 text-sm text-stone-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-stone-500">Video file</label>
        <label className={`flex cursor-pointer items-center justify-center gap-3 rounded-sm border-2 border-dashed p-5 transition ${
          file ? 'border-green-500 bg-green-50' : 'border-stone-300 bg-white hover:border-orange-500'
        }`}>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/*"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
            disabled={busy}
          />
          <Upload className="h-5 w-5 shrink-0 text-stone-400" />
          <span className="min-w-0 truncate text-sm font-semibold text-stone-700">
            {file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)}MB` : 'Tap to choose a video'}
          </span>
        </label>
        <p className="mt-2 text-xs text-stone-500">
          Up to 100MB. A minute at 1080p from a phone is about 60MB. Cloudinary makes the poster frame and the mobile version itself.
        </p>
      </div>

      {busy && (
        <div>
          <div className="h-2 overflow-hidden rounded-pill bg-stone-200">
            <div className="h-full bg-orange-500 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-stone-500">{progress! < 100 ? `Uploading… ${progress}%` : 'Saving…'}</p>
        </div>
      )}

      {message && (
        <p className={`m-0 text-sm font-semibold ${message.tone === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-sm bg-stone-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-50 sm:w-auto"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? 'Uploading' : 'Upload video'}
      </button>
    </form>
  )
}
