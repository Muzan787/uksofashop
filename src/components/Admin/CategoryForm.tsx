'use client'
// src/components/Admin/CategoryForm.tsx
//
// Add or edit a category (admin upgrade K5): name, web address, parent,
// order, shown, photo, introduction and search words. The database stops a
// category ending up inside itself, and refuses to delete one while products
// or sub-categories still use it, saying which.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import PhotoPicker from './PhotoPicker'
import { deleteCategory, saveCategory } from '@/app/actions/catalogue'
import { slugify } from '@/utils/catalogue'

export interface CategoryRow {
  id: string
  name: string
  slug: string
  parent_id: string | null
  sort: number
  is_active: boolean
  image_url: string | null
  intro: string | null
  search_words: string | null
}

const label = 'mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500'
const input = 'min-h-11 w-full rounded-sm border border-stone-200 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-orange-500'
const hint = 'mt-1 text-[11px] leading-relaxed text-stone-500'

/** A category and everything beneath it, so it can't be put inside its own branch. */
function branchOf(id: string, all: { id: string; parent_id: string | null }[]): Set<string> {
  const branch = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const c of all) if (c.parent_id && branch.has(c.parent_id) && !branch.has(c.id)) { branch.add(c.id); grew = true }
  }
  return branch
}

export default function CategoryForm({ category, categories }: { category?: CategoryRow; categories: CategoryRow[] }) {
  const router = useRouter()
  const [name, setName] = useState(category?.name ?? '')
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(category))
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const branch = category ? branchOf(category.id, categories) : new Set<string>()
  const key = category?.id ?? 'new'

  return (
    <form
      className="space-y-3"
      onSubmit={async e => {
        e.preventDefault()
        const formEl = e.currentTarget
        const form = new FormData(formEl)
        form.set('slug', slug)
        form.set('imageUrl', imageUrl)
        form.set('isActive', form.get('isActive') === 'on' ? 'true' : 'false')
        if (category) form.set('id', category.id)
        setBusy(true)
        const res = await saveCategory(form)
        setBusy(false)
        setMessage(res.ok ? { ok: true, text: 'Saved. The shop shows it from the next visit.' } : { ok: false, text: res.text })
        if (res.ok) {
          if (!category) { setName(''); setSlug(''); setSlugTouched(false); setImageUrl(''); formEl.reset() }
          router.refresh()
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`cat-name-${key}`}>Name</label>
          <input id={`cat-name-${key}`} name="name" value={name} onChange={e => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)) }} className={input} placeholder="e.g. Corner Sofas" />
        </div>
        <div>
          <label className={label} htmlFor={`cat-slug-${key}`}>Web address</label>
          <input id={`cat-slug-${key}`} value={slug} onChange={e => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true) }} className={`${input} font-mono`} autoCapitalize="none" spellCheck={false} />
          {category && <p className={hint}>Changing it breaks links to /shop/{category.slug} and every product address under it.</p>}
        </div>
        <div>
          <label className={label} htmlFor={`cat-parent-${key}`}>Inside</label>
          <select id={`cat-parent-${key}`} name="parentId" defaultValue={category?.parent_id ?? ''} className={input}>
            <option value="">Nothing (a top-level category)</option>
            {categories.filter(c => !branch.has(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor={`cat-sort-${key}`}>Order</label>
          <input id={`cat-sort-${key}`} name="sort" type="number" inputMode="numeric" min={0} max={9999} defaultValue={category?.sort ?? 99} className={input} />
          <p className={hint}>Lower comes first in the menu. Equal numbers go in name order.</p>
        </div>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-stone-200 bg-stone-50 px-3">
        <input type="checkbox" name="isActive" defaultChecked={category?.is_active ?? true} className="h-5 w-5 accent-orange-500" />
        <span className="text-sm font-semibold text-stone-800">Shown in the menu, the home page and the sitemap</span>
      </label>
      <p className={hint}>Hiding a category takes it out of those lists only. Its page and its products still open from a link or an ad.</p>
      <div>
        <p className={label}>Photo</p>
        <PhotoPicker value={imageUrl} onChange={setImageUrl} label={`category ${name || 'photo'}`} />
      </div>
      <div>
        <label className={label} htmlFor={`cat-intro-${key}`}>Introduction (optional)</label>
        <textarea id={`cat-intro-${key}`} name="intro" rows={3} maxLength={600} defaultValue={category?.intro ?? ''} className={input} />
        <p className={hint}>A line or two under the category&apos;s name on its page. Leave it empty and the page stays as it is.</p>
      </div>
      <div>
        <label className={label} htmlFor={`cat-words-${key}`}>Search words (optional)</label>
        <input id={`cat-words-${key}`} name="searchWords" maxLength={300} defaultValue={category?.search_words ?? ''} className={input} placeholder="e.g. l shape, l-shaped, corner couch" />
        <p className={hint}>Other words people search for. The shop&apos;s search shows this category&apos;s products for them too.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-stone-900 px-5 text-sm font-bold text-white disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} {category ? 'Save category' : 'Add category'}
        </button>
        {category && (
          <button type="button" disabled={busy} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-red-200 bg-white px-4 text-sm font-bold text-red-700 disabled:opacity-60"
            onClick={async () => {
              if (!window.confirm(`Delete the ${category.name} category?`)) return
              setBusy(true)
              const res = await deleteCategory(category.id)
              setBusy(false)
              if (res.ok) router.refresh()
              else setMessage({ ok: false, text: res.text })
            }}>
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
          </button>
        )}
      </div>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`m-0 text-sm font-semibold ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>
      )}
    </form>
  )
}
