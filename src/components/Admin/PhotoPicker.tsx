'use client'
// src/components/Admin/PhotoPicker.tsx
//
// One photo picker for the whole catalogue (admin upgrade K4), three ways:
//   1. Upload from the phone, straight to Cloudinary, signed by the server
//      (utils/adminImageUpload.ts). iPhone HEIC arrives as JPEG.
//   2. Paste a Cloudinary link.
//   3. Pick a photo the catalogue already uses, searchable by product name.
// Without the upload keys only the first fails, with a sentence saying so;
// Status shows uploads amber, and the other two ways still work.
//
// Single mode shows the chosen photo and replaces it; gallery mode (`multiple`)
// adds every photo chosen.

import { useState } from 'react'
import { ImagePlus, Link2, Images, Loader2, X, Check } from 'lucide-react'
import { uploadAdminImage } from '@/utils/adminImageUpload'
import { listCatalogueImages } from '@/app/actions/catalogue'

const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/\S+$/

type Props =
  | { multiple?: false; value: string; onChange: (url: string) => void; label?: string }
  | { multiple: true; onAdd: (urls: string[]) => void; label?: string }

const tab = 'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-sm border px-2 text-xs font-bold transition'

export default function PhotoPicker(props: Props) {
  const [mode, setMode] = useState<'none' | 'link' | 'pick'>('none')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [library, setLibrary] = useState<{ url: string; label: string }[] | null>(null)
  const [q, setQ] = useState('')

  const choose = (urls: string[]) => {
    if (!urls.length) return
    if (props.multiple) props.onAdd(urls)
    else props.onChange(urls[0])
    setMode('none')
    setError('')
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setError('')
    const done: string[] = []
    for (const file of Array.from(files)) {
      try {
        done.push(await uploadAdminImage(file))
      } catch (err) {
        setError(`${err instanceof Error ? err.message : 'The photo did not upload.'} You can paste a Cloudinary link or pick a photo we already use instead.`)
      }
    }
    setBusy(false)
    choose(done)
  }

  const openLibrary = async () => {
    setMode('pick')
    if (library === null) setLibrary(await listCatalogueImages())
  }

  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = (library ?? []).filter(p => words.every(w => p.label.toLowerCase().includes(w))).slice(0, 60)
  const value = props.multiple ? '' : props.value

  return (
    <div className="space-y-2">
      {!props.multiple && value && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- Admin preview: behind auth, never indexed. */}
          <img src={value} alt="" className="h-16 w-16 shrink-0 rounded-sm border border-stone-200 object-cover" />
          <button type="button" onClick={() => props.onChange('')} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-red-600">
            <X className="h-4 w-4" aria-hidden="true" /> Remove photo
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <label className={`${tab} cursor-pointer border-stone-300 bg-white text-stone-700 hover:border-orange-400 ${busy ? 'opacity-60' : ''}`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
          {busy ? 'Uploading…' : 'Upload'}
          <input
            type="file"
            accept="image/*"
            multiple={props.multiple}
            className="sr-only"
            disabled={busy}
            onChange={e => { void upload(e.target.files); e.target.value = '' }}
            aria-label={props.label ? `Upload ${props.label}` : 'Upload a photo'}
          />
        </label>
        <button type="button" onClick={() => setMode(mode === 'link' ? 'none' : 'link')} aria-expanded={mode === 'link'}
          className={`${tab} ${mode === 'link' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-orange-400'}`}>
          <Link2 className="h-4 w-4" aria-hidden="true" /> Paste link
        </button>
        <button type="button" onClick={() => (mode === 'pick' ? setMode('none') : void openLibrary())} aria-expanded={mode === 'pick'}
          className={`${tab} ${mode === 'pick' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-orange-400'}`}>
          <Images className="h-4 w-4" aria-hidden="true" /> Our photos
        </button>
      </div>

      {mode === 'link' && (
        <div className="flex gap-2">
          <label className="sr-only" htmlFor={`link-${props.label ?? 'photo'}`}>Cloudinary link</label>
          <input
            id={`link-${props.label ?? 'photo'}`}
            type="url"
            inputMode="url"
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="https://res.cloudinary.com/…"
            className="min-h-11 min-w-0 flex-1 rounded-sm border border-stone-300 bg-white px-3 text-base"
          />
          <button
            type="button"
            onClick={() => {
              const url = link.trim()
              if (!CLOUDINARY.test(url)) { setError('Paste a link that starts with https://res.cloudinary.com/ - the shop only shows photos from Cloudinary.'); return }
              setLink('')
              choose([url])
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm bg-stone-900 px-4 text-sm font-bold text-white"
          >
            <Check className="h-4 w-4" aria-hidden="true" /> Use
          </button>
        </div>
      )}

      {mode === 'pick' && (
        <div className="rounded-sm border border-stone-200 bg-white p-2">
          <label className="sr-only" htmlFor={`pick-${props.label ?? 'photo'}`}>Search our photos</label>
          <input
            id={`pick-${props.label ?? 'photo'}`}
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by product or colour"
            className="mb-2 min-h-11 w-full rounded-sm border border-stone-300 px-3 text-base"
          />
          {library === null ? (
            <p className="m-0 flex items-center gap-2 p-2 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading photos…</p>
          ) : shown.length === 0 ? (
            <p className="m-0 p-2 text-sm text-stone-500">No photos match that.</p>
          ) : (
            <ul className="m-0 grid max-h-72 list-none grid-cols-3 gap-2 overflow-y-auto p-0 sm:grid-cols-5">
              {shown.map(p => (
                <li key={p.url}>
                  <button type="button" onClick={() => choose([p.url])} className="block w-full text-left" title={p.label}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Admin preview: behind auth, never indexed. */}
                    <img src={p.url} alt="" loading="lazy" className="aspect-square w-full rounded-sm border border-stone-200 object-cover" />
                    <span className="mt-0.5 block truncate text-[10px] text-stone-500">{p.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p role="alert" className="m-0 text-xs font-semibold text-red-700">{error}</p>}
    </div>
  )
}
