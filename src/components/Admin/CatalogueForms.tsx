'use client'
// src/components/Admin/CatalogueForms.tsx
//
// The small catalogue forms (admin upgrade K5): a range (variant group), a
// fabric collection, and a fabric. Each saves and says so, or says why not;
// Delete asks first, and the database refuses it, with the reason, while
// anything still uses the item.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import PhotoPicker from './PhotoPicker'
import {
  deleteFabric, deleteFabricCollection, deleteVariantGroup, saveFabric, saveFabricCollection, saveVariantGroup,
  type ActionResult,
} from '@/app/actions/catalogue'
import { slugify } from '@/utils/catalogue'

const label = 'mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500'
const input = 'min-h-11 w-full rounded-sm border border-stone-200 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-orange-500'
const hint = 'mt-1 text-[11px] leading-relaxed text-stone-500'

/** Save and Delete buttons with the message under them. */
function Actions({ busy, saveText, onDelete, message }: {
  busy: boolean; saveText: string; onDelete?: () => void; message: { ok: boolean; text: string } | null
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-stone-900 px-5 text-sm font-bold text-white disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} {saveText}
        </button>
        {onDelete && (
          <button type="button" disabled={busy} onClick={onDelete} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-red-200 bg-white px-4 text-sm font-bold text-red-700 disabled:opacity-60">
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
          </button>
        )}
      </div>
      {message && <p role={message.ok ? 'status' : 'alert'} className={`m-0 text-sm font-semibold ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>}
    </>
  )
}

/** The shared plumbing: busy, message, refresh after a change. */
function useSave() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const run = async (action: () => Promise<ActionResult>, okText: string, after?: () => void) => {
    setBusy(true)
    const res = await action()
    setBusy(false)
    setMessage(res.ok ? { ok: true, text: okText } : { ok: false, text: res.text })
    if (res.ok) { after?.(); router.refresh() }
  }
  return { busy, message, run }
}

// ── Range ──────────────────────────────────────────────────────────────────

export function RangeForm({ group }: { group: { id: string; name: string; slug: string; subgroup_title: string } }) {
  const { busy, message, run } = useSave()
  return (
    <form className="space-y-3" onSubmit={e => {
      e.preventDefault()
      const form = new FormData(e.currentTarget)
      form.set('id', group.id)
      void run(() => saveVariantGroup(form), 'Saved.')
    }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor={`range-name-${group.id}`}>Name</label>
          <input id={`range-name-${group.id}`} name="name" defaultValue={group.name} className={input} />
        </div>
        <div>
          <label className={label} htmlFor={`range-slug-${group.id}`}>Web address</label>
          <input id={`range-slug-${group.id}`} name="slug" defaultValue={group.slug} className={`${input} font-mono`} autoCapitalize="none" />
        </div>
        <div>
          <label className={label} htmlFor={`range-title-${group.id}`}>Style choice is called</label>
          <input id={`range-title-${group.id}`} name="subgroupTitle" defaultValue={group.subgroup_title} className={input} placeholder="Style" />
        </div>
      </div>
      <p className={hint}>A range ties the sizes and styles of one sofa together on its product page. The style name is the heading above the style choice.</p>
      <Actions busy={busy} saveText="Save range" message={message}
        onDelete={() => { if (window.confirm(`Delete the ${group.name} range?`)) void run(() => deleteVariantGroup(group.id), 'Deleted.') }} />
    </form>
  )
}

// ── Fabric collection ──────────────────────────────────────────────────────

export interface CollectionRow {
  id: string; name: string; slug: string; description: string | null; supplier: string; supplier_handle: string | null; sort: number; is_active: boolean
}

export function CollectionForm({ collection }: { collection?: CollectionRow }) {
  const { busy, message, run } = useSave()
  const [slug, setSlug] = useState(collection?.slug ?? '')
  const [touched, setTouched] = useState(Boolean(collection))
  const key = collection?.id ?? 'new'
  return (
    <form className="space-y-3" onSubmit={e => {
      e.preventDefault()
      const formEl = e.currentTarget
      const form = new FormData(formEl)
      form.set('slug', slug)
      form.set('isActive', form.get('isActive') === 'on' ? 'true' : 'false')
      if (collection) form.set('id', collection.id)
      void run(() => saveFabricCollection(form), 'Saved. The shop shows it from the next visit.', () => { if (!collection) { formEl.reset(); setSlug(''); setTouched(false) } })
    }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={`col-name-${key}`}>Name</label>
          <input id={`col-name-${key}`} name="name" defaultValue={collection?.name ?? ''} onChange={e => { if (!touched) setSlug(slugify(e.target.value)) }} className={input} placeholder="e.g. Chenille" />
        </div>
        <div>
          <label className={label} htmlFor={`col-slug-${key}`}>Web address</label>
          <input id={`col-slug-${key}`} value={slug} onChange={e => { setSlug(e.target.value.toLowerCase()); setTouched(true) }} className={`${input} font-mono`} autoCapitalize="none" />
        </div>
        <div>
          <label className={label} htmlFor={`col-supplier-${key}`}>Supplier</label>
          <input id={`col-supplier-${key}`} name="supplier" defaultValue={collection?.supplier ?? 'R&S Components'} className={input} />
        </div>
        <div>
          <label className={label} htmlFor={`col-handle-${key}`}>Supplier&apos;s name for it (optional)</label>
          <input id={`col-handle-${key}`} name="supplierHandle" defaultValue={collection?.supplier_handle ?? ''} className={input} />
        </div>
        <div>
          <label className={label} htmlFor={`col-sort-${key}`}>Order</label>
          <input id={`col-sort-${key}`} name="sort" type="number" inputMode="numeric" min={0} defaultValue={collection?.sort ?? 99} className={input} />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-sm border border-stone-200 bg-stone-50 px-3">
          <input type="checkbox" name="isActive" defaultChecked={collection?.is_active ?? true} className="h-5 w-5 accent-orange-500" />
          <span className="text-sm font-semibold text-stone-800">Shown in the shop</span>
        </label>
      </div>
      <div>
        <label className={label} htmlFor={`col-desc-${key}`}>Description (optional)</label>
        <textarea id={`col-desc-${key}`} name="description" rows={2} maxLength={600} defaultValue={collection?.description ?? ''} className={input} />
      </div>
      <Actions busy={busy} saveText={collection ? 'Save collection' : 'Add collection'} message={message}
        onDelete={collection ? () => { if (window.confirm(`Delete the ${collection.name} collection?`)) void run(() => deleteFabricCollection(collection.id), 'Deleted.') } : undefined} />
    </form>
  )
}

// ── Fabric ─────────────────────────────────────────────────────────────────

export interface FabricRow {
  id: string; collection_id: string; code: string; name: string; supplier_title: string | null; hex: string | null
  image_url: string | null; sort: number; is_active: boolean; is_swatchable: boolean
}

export function FabricForm({ fabric, collectionId, collections }: { fabric?: FabricRow; collectionId: string; collections: { id: string; name: string }[] }) {
  const { busy, message, run } = useSave()
  const [imageUrl, setImageUrl] = useState(fabric?.image_url ?? '')
  const [hex, setHex] = useState(fabric?.hex ?? '')
  const key = fabric?.id ?? `new-${collectionId}`
  return (
    <form className="space-y-3" onSubmit={e => {
      e.preventDefault()
      const formEl = e.currentTarget
      const form = new FormData(formEl)
      form.set('imageUrl', imageUrl)
      form.set('hex', hex)
      form.set('isActive', form.get('isActive') === 'on' ? 'true' : 'false')
      form.set('isSwatchable', form.get('isSwatchable') === 'on' ? 'true' : 'false')
      if (fabric) form.set('id', fabric.id)
      void run(() => saveFabric(form), 'Saved. The shop shows it from the next visit.', () => { if (!fabric) { formEl.reset(); setImageUrl(''); setHex('') } })
    }}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={label} htmlFor={`fab-code-${key}`}>Code</label>
          <input id={`fab-code-${key}`} name="code" defaultValue={fabric?.code ?? ''} className={`${input} font-mono`} autoCapitalize="characters" placeholder="CH-114" />
        </div>
        <div>
          <label className={label} htmlFor={`fab-name-${key}`}>Colour name</label>
          <input id={`fab-name-${key}`} name="name" defaultValue={fabric?.name ?? ''} className={input} placeholder="Mink" />
        </div>
        <div className="col-span-2">
          <label className={label} htmlFor={`fab-supplier-${key}`}>Supplier&apos;s title (optional)</label>
          <input id={`fab-supplier-${key}`} name="supplierTitle" defaultValue={fabric?.supplier_title ?? ''} className={input} />
        </div>
        <div className="col-span-2">
          <label className={label} htmlFor={`fab-collection-${key}`}>Collection</label>
          <select id={`fab-collection-${key}`} name="collectionId" defaultValue={fabric?.collection_id ?? collectionId} className={input}>
            {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor={`fab-hex-${key}`}>Swatch colour</label>
          <div className="flex items-center gap-2">
            <input type="color" aria-label="Pick the swatch colour" value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#cccccc'} onChange={e => setHex(e.target.value)} className="h-11 w-11 shrink-0 cursor-pointer rounded-sm border border-stone-200 p-0.5" />
            <input id={`fab-hex-${key}`} value={hex} onChange={e => setHex(e.target.value)} placeholder="#808080" className={`${input} font-mono`} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor={`fab-sort-${key}`}>Order</label>
          <input id={`fab-sort-${key}`} name="sort" type="number" inputMode="numeric" min={0} defaultValue={fabric?.sort ?? 99} className={input} />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-stone-200 bg-stone-50 px-3">
          <input type="checkbox" name="isActive" defaultChecked={fabric?.is_active ?? true} className="h-5 w-5 accent-orange-500" />
          <span className="text-sm font-semibold text-stone-800">Shown in the shop</span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-stone-200 bg-stone-50 px-3">
          <input type="checkbox" name="isSwatchable" defaultChecked={fabric?.is_swatchable ?? true} className="h-5 w-5 accent-orange-500" />
          <span className="text-sm font-semibold text-stone-800">Can be sent as a sample</span>
        </label>
      </div>
      <div>
        <p className={label}>Swatch photo</p>
        <PhotoPicker value={imageUrl} onChange={setImageUrl} label={`fabric ${fabric?.code ?? 'swatch'}`} />
      </div>
      <Actions busy={busy} saveText={fabric ? 'Save fabric' : 'Add fabric'} message={message}
        onDelete={fabric ? () => { if (window.confirm(`Delete ${fabric.name} (${fabric.code})?`)) void run(() => deleteFabric(fabric.id), 'Deleted.') } : undefined} />
    </form>
  )
}
