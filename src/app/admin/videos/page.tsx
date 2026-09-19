import type { Metadata } from 'next'
// src/app/admin/videos/page.tsx
export const dynamic = 'force-dynamic'

import Image from 'next/image'
import { Clapperboard, Eye, EyeOff, Save, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { deleteVideo, setVideoActive, updateVideo } from '@/app/actions/videos'
import { videoPoster } from '@/utils/cloudinary'
import { VIDEO_KINDS, VIDEO_KIND_LABELS, type VideoKind } from '@/constants/videos'
import VideoUploader from '@/components/Admin/VideoUploader'

export const metadata: Metadata = { title: 'Videos' }

interface Row {
  id: string
  kind: VideoKind
  product_id: string | null
  url: string
  caption: string | null
  width: number | null
  height: number | null
  duration: number | null
  sort_order: number
  is_active: boolean
  created_at: string
  product: { title: string } | null
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const length = (s: number | null) => {
  if (!s) return null
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return m ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`
}

/**
 * The video library.
 *
 * Upload at the top; below it every clip grouped by kind, each with the
 * caption and product editable in place, a hide switch that takes it off
 * the site without deleting the file, and a delete that does both.
 */
export default async function AdminVideosPage() {
  const supabase = await createClient()

  const [{ data: rows, error }, { data: products }] = await Promise.all([
    supabase
      .from('videos')
      .select('*, product:products(title)')
      .order('kind')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('products')
      .select('id, title')
      .order('title'),
  ])

  const videos = (rows ?? []) as unknown as Row[]
  const productOptions = products ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 lg:text-3xl">Videos</h1>
        <p className="mt-1 text-sm text-stone-500">
          Studio clips go in the product gallery, customer clips on the product and reviews pages, warehouse clips on About and Showroom.
        </p>
      </div>

      <VideoUploader products={productOptions} />

      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.message}</div>
      )}

      {VIDEO_KINDS.map(kind => {
        const group = videos.filter(v => v.kind === kind)
        if (!group.length) return null
        const { label, where } = VIDEO_KIND_LABELS[kind]
        return (
          <section key={kind} className="space-y-4">
            <div className="flex items-baseline gap-3">
              <h2 className="m-0 flex items-center gap-2 text-lg font-bold text-stone-900">
                <Clapperboard className="h-5 w-5 text-stone-400" />
                {label}
                <span className="text-sm font-normal text-stone-400">{group.length}</span>
              </h2>
              <span className="text-xs text-stone-500">{where}</span>
            </div>

            <div className="grid gap-4">
              {group.map(v => (
                <div
                  key={v.id}
                  className={`flex flex-col gap-4 rounded-md border bg-white p-4 shadow-sm sm:flex-row ${
                    v.is_active ? 'border-stone-200' : 'border-amber-300 bg-amber-50/40'
                  }`}
                >
                  {/* The first frame, linked to the clip itself for a quick check. */}
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block h-40 w-full shrink-0 overflow-hidden rounded-sm bg-stone-900 sm:h-32 sm:w-32"
                  >
                    <Image
                      src={videoPoster(v.url, 400)}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 128px"
                      className="object-cover"
                    />
                    {length(v.duration) && (
                      <span className="absolute bottom-1 right-1 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
                        {length(v.duration)}
                      </span>
                    )}
                  </a>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      {v.is_active ? (
                        <span className="rounded-sm bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-green-700">Live</span>
                      ) : (
                        <span className="rounded-sm bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">Hidden</span>
                      )}
                      <span>{when(v.created_at)}</span>
                      {v.width && v.height && <span>{v.width}×{v.height}</span>}
                    </div>

                    <form action={updateVideo} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <input type="hidden" name="id" value={v.id} />
                      <input
                        type="text"
                        name="caption"
                        defaultValue={v.caption ?? ''}
                        placeholder="Caption (optional)"
                        maxLength={140}
                        className="w-full rounded-sm border border-stone-300 p-2 text-sm text-stone-900"
                      />
                      {kind !== 'warehouse' ? (
                        <select
                          name="product_id"
                          defaultValue={v.product_id ?? ''}
                          className="rounded-sm border border-stone-300 bg-white p-2 text-sm text-stone-900"
                        >
                          <option value="">No product</option>
                          {productOptions.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      ) : (
                        <input type="hidden" name="product_id" value="" />
                      )}
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-stone-500" title="Lower numbers come first">Order</label>
                        <input
                          type="number"
                          name="sort_order"
                          defaultValue={v.sort_order}
                          className="w-16 rounded-sm border border-stone-300 p-2 text-sm text-stone-900"
                        />
                        <button
                          type="submit"
                          className="flex h-9 items-center gap-1 rounded-sm bg-stone-900 px-3 text-xs font-bold text-white hover:bg-orange-500"
                        >
                          <Save className="h-3.5 w-3.5" /> Save
                        </button>
                      </div>
                    </form>

                    <div className="flex flex-wrap gap-2">
                      <form action={setVideoActive}>
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="active" value={v.is_active ? 'false' : 'true'} />
                        <button
                          type="submit"
                          className="flex h-9 items-center gap-1.5 rounded-sm border border-stone-300 px-3 text-xs font-bold text-stone-700 hover:bg-stone-100"
                        >
                          {v.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {v.is_active ? 'Hide from site' : 'Show on site'}
                        </button>
                      </form>
                      <form action={deleteVideo}>
                        <input type="hidden" name="id" value={v.id} />
                        <button
                          type="submit"
                          className="flex h-9 items-center gap-1.5 rounded-sm border border-red-200 px-3 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {!videos.length && !error && (
        <p className="text-sm text-stone-500">No videos yet. The first one you upload appears here.</p>
      )}
    </div>
  )
}
