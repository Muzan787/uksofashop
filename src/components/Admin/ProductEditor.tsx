'use client'
// src/components/Admin/ProductEditor.tsx
//
// The one product editor (admin upgrade K2), for adding, editing and copying.
// It carries every field the old add and edit forms had - price and was
// price, main collection, where it's made, made to order, featured, range
// with its size and style labels, gallery, categories, description,
// specifications and colourways - in sections, and adds:
//   * a web address filled in from the name until it is changed by hand
//     (never on an existing product, whose address is already in use);
//   * the offer tier;
//   * shown or hidden, for the product and each colourway, and their order;
//   * search title and description, each with a character counter;
//   * the photo picker (K4) for colourways and the gallery;
//   * a warning before leaving with unsaved changes.
// Saving is one database transaction (save_product, K3). A colourway taken
// off the form is deleted, or hidden instead if it has ever been ordered.
// Each refusal shows as a sentence beside its field.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Plus, Trash2 } from 'lucide-react'
import PriceFields from './PriceFields'
import PhotoPicker from './PhotoPicker'
import { saveProduct, createVariantGroup, saveSubgroupTitle, type ColourwayInput, type ProductInput } from '@/app/actions/catalogue'
import {
  slugify, SEO_DESCRIPTION_GUIDE, SEO_DESCRIPTION_MAX, SEO_TITLE_GUIDE, SEO_TITLE_MAX, type EditorField,
} from '@/utils/catalogue'
import { useShopSettings } from '@/components/ShopSettingsProvider'
import type { OfferTier } from '@/utils/shopSettings'

export interface EditorProps {
  mode: 'new' | 'edit' | 'copy'
  initial: Omit<ProductInput, 'basePrice' | 'wasPrice'> & { basePrice: number | null; wasPrice: number | null }
  categories: { id: string; name: string }[]
  groups: { id: string; name: string; subgroup_title: string }[]
  subgroupsByGroup: Record<string, string[]>
  collections: { id: string; name: string; status: string }[]
}

const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500'
const input = 'w-full min-h-11 rounded-sm border border-stone-200 bg-stone-50 p-3 text-base text-stone-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30'
const hint = 'mt-1.5 text-[11px] leading-relaxed text-stone-500'
const section = 'space-y-4 rounded-md border border-stone-200 bg-white p-4 shadow-sm lg:p-6'
const sectionTitle = 'm-0 text-sm font-bold uppercase tracking-[0.14em] text-stone-700'

function FieldError({ text }: { text?: string }) {
  if (!text) return null
  return (
    <p role="alert" className="m-0 mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-red-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {text}
    </p>
  )
}

function Counter({ value, guide, max }: { value: string; guide: number; max: number }) {
  const n = value.trim().length
  const tone = n > max ? 'text-red-700' : n > guide ? 'text-amber-700' : 'text-stone-500'
  return (
    <p className={`m-0 mt-1 text-right text-xs tabular-nums ${tone}`} aria-live="polite">
      {n} / {guide}{n > guide && n <= max ? ' - search results cut it off here' : ''}{n > max ? ` - too long, the limit is ${max}` : ''}
    </p>
  )
}

const blankColourway = (priority: number): ColourwayInput => ({
  sku: '', color: '', colorHex: '#000000', material: '', priceAdjustment: '0', imageUrl: '', isActive: true, priority: String(priority),
})

export default function ProductEditor({ mode, initial, categories, groups: initialGroups, subgroupsByGroup, collections }: EditorProps) {
  const router = useRouter()
  const { tierAmounts, offerWindowHours } = useShopSettings()
  const formRef = useRef<HTMLFormElement>(null)

  const [title, setTitle] = useState(initial.title)
  const [slug, setSlug] = useState(initial.slug)
  // New products (and copies) follow the name until the address is typed in.
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [tier, setTier] = useState(initial.tier)
  const [groups, setGroups] = useState(initialGroups)
  const [groupId, setGroupId] = useState(initial.variantGroupId)
  const [sizeLabel, setSizeLabel] = useState(initial.sizeLabel)
  const [subgroupLabel, setSubgroupLabel] = useState(initial.subgroupLabel)
  const [newGroup, setNewGroup] = useState<string | null>(null)
  const [groupMessage, setGroupMessage] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>(initial.categoryIds)
  const [collectionId, setCollectionId] = useState(initial.mainCollectionId)
  const [isActive, setIsActive] = useState(initial.isActive)
  const [isFeatured, setIsFeatured] = useState(initial.isFeatured)
  const [origin, setOrigin] = useState(initial.origin)
  const [customMade, setCustomMade] = useState(initial.customMade)
  const [specs, setSpecs] = useState(initial.specifications.length ? initial.specifications : [{ key: 'Style', value: '' }, { key: 'Dimensions', value: '' }])
  const [colourways, setColourways] = useState<ColourwayInput[]>(initial.colourways.length ? initial.colourways : [blankColourway(1)])
  const [gallery, setGallery] = useState(initial.galleryImages)
  const [description, setDescription] = useState(initial.description)
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle)
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription)

  const [dirty, setDirty] = useState(mode === 'copy')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<EditorField, string>>>({})
  const [badSku, setBadSku] = useState<string | undefined>()
  const [saved, setSaved] = useState<string>('')

  const touch = <T,>(set: (v: T) => void) => (v: T) => { set(v); setDirty(true); setSaved('') }
  const selectedGroup = groups.find(g => g.id === groupId)
  const knownSubgroups = useMemo(() => subgroupsByGroup[groupId] ?? [], [subgroupsByGroup, groupId])

  // Warn before leaving with unsaved changes: closing or reloading the tab,
  // and any link inside the admin.
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      if (!window.confirm('You have changes that are not saved. Leave without saving them?')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty])

  const updateColourway = (index: number, patch: Partial<ColourwayInput>) => {
    setColourways(prev => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
    setDirty(true)
    setSaved('')
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSaving(true)
    setErrors({})
    setBadSku(undefined)
    const result = await saveProduct({
      id: mode === 'edit' ? initial.id : null,
      title, slug,
      basePrice: String(form.get('basePrice') ?? ''),
      wasPrice: String(form.get('wasPrice') ?? ''),
      tier, variantGroupId: groupId,
      sizeLabel: groupId ? sizeLabel : '', subgroupLabel: groupId ? subgroupLabel : '',
      categoryIds, mainCollectionId: collectionId, isActive, isFeatured, origin, customMade,
      specifications: specs, colourways, galleryImages: gallery, description, seoTitle, seoDescription,
    })
    setSaving(false)
    if (!result.ok) {
      setErrors({ [result.field]: result.text })
      setBadSku(result.sku)
      const target = document.querySelector(`[data-field="${result.field}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setDirty(false)
    const note = result.hidden
      ? ` ${result.hidden} colourway${result.hidden === 1 ? ' had' : 's had'} been ordered, so ${result.hidden === 1 ? 'it was' : 'they were'} hidden rather than deleted.`
      : ''
    if (mode === 'edit') {
      setSaved(`Saved. The shop shows it from the next visit.${note}`)
      router.refresh()
    } else {
      router.replace(`/admin/inventory/${result.id}/edit?saved=1`)
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} onInput={() => { setDirty(true); setSaved('') }} className="space-y-5" noValidate>
      {errors.form && <FieldError text={errors.form} />}
      {saved && (
        <p role="status" className="m-0 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {saved}
        </p>
      )}

      {/* ── Basics ─────────────────────────────────────────────────── */}
      <section className={section} aria-labelledby="basics-heading">
        <h2 id="basics-heading" className={sectionTitle}>Basics</h2>
        <div data-field="title">
          <label className={label} htmlFor="title">Name</label>
          <input id="title" value={title} onChange={e => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)) }} className={input} placeholder="e.g. Verona 3 Seater Corner Sofa" />
          <FieldError text={errors.title} />
        </div>
        <div data-field="slug">
          <label className={label} htmlFor="slug">Web address</label>
          <div className="flex items-center gap-1 text-sm text-stone-500">
            <span className="shrink-0">/shop/…/</span>
            <input id="slug" value={slug} onChange={e => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true) }} className={input} autoCapitalize="none" spellCheck={false} />
          </div>
          <p className={hint}>
            {mode === 'edit'
              ? 'Changing this breaks old links and ads that point at the product. Leave it unless you have to.'
              : slugTouched ? 'Typed by hand.' : 'Filled in from the name until you change it.'}
          </p>
          <FieldError text={errors.slug} />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-field="base_price">
          <PriceFields basePrice={initial.basePrice} wasPrice={initial.wasPrice} />
        </div>
        <FieldError text={errors.base_price ?? errors.was_price} />
        <div data-field="tier">
          <label className={label} htmlFor="tier">Offer tier</label>
          <select id="tier" value={tier} onChange={e => touch(setTier)(e.target.value)} className={input}>
            <option value="">Not set (no ad offer)</option>
            {(Object.keys(tierAmounts) as OfferTier[]).map(t => (
              <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()} - £{tierAmounts[t]} off</option>
            ))}
          </select>
          <p className={hint}>What an ad visitor gets off this sofa inside their {offerWindowHours}-hour window. Changing it changes what customers pay.</p>
          <FieldError text={errors.tier} />
        </div>

        <div className="rounded-sm border border-stone-200 bg-stone-50 p-4" data-field="range">
          <p className={label}>Range (optional)</p>
          {newGroup === null ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="range">Range</label>
              <select id="range" value={groupId} onChange={e => { touch(setGroupId)(e.target.value); if (!e.target.value) { setSizeLabel(''); setSubgroupLabel('') } }} className={`${input} bg-white`}>
                <option value="">No range (a product on its own)</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button type="button" onClick={() => setNewGroup('')} className="min-h-11 shrink-0 rounded-sm border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700">New range</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="new-range">New range name</label>
              <input id="new-range" value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="e.g. Havana Sofa Set" className={`${input} bg-white`} />
              <button type="button" className="min-h-11 shrink-0 rounded-sm bg-stone-900 px-4 text-sm font-bold text-white" onClick={async () => {
                const res = await createVariantGroup(newGroup)
                if (!res.ok) { setGroupMessage(res.text); return }
                setGroups(prev => [...prev, res.group].sort((a, b) => a.name.localeCompare(b.name)))
                setGroupId(res.group.id)
                setNewGroup(null)
                setGroupMessage('')
                setDirty(true)
              }}>Save range</button>
              <button type="button" onClick={() => { setNewGroup(null); setGroupMessage('') }} className="min-h-11 shrink-0 rounded-sm border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700">Cancel</button>
            </div>
          )}
          {groupMessage && <FieldError text={groupMessage} />}
          <FieldError text={errors.range} />
          {groupId && (
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-stone-200 pt-4 sm:grid-cols-2">
              <div data-field="size_label">
                <label className={label} htmlFor="size-label">Size label (on the size button)</label>
                <input id="size-label" value={sizeLabel} onChange={e => touch(setSizeLabel)(e.target.value)} placeholder="e.g. 3 Seater, Corner" className={`${input} bg-white`} />
                <FieldError text={errors.size_label} />
              </div>
              <div>
                <label className={label} htmlFor="subgroup-label">{selectedGroup?.subgroup_title || 'Style'} label (optional)</label>
                <input id="subgroup-label" list="known-subgroups" value={subgroupLabel} onChange={e => touch(setSubgroupLabel)(e.target.value)} placeholder="e.g. High Back" className={`${input} bg-white`} />
                <datalist id="known-subgroups">{knownSubgroups.map(s => <option key={s} value={s} />)}</datalist>
                <p className={hint}>Leave blank if this range only varies by size. Products sharing a label appear together as one style.</p>
              </div>
              {(subgroupLabel.trim() || knownSubgroups.length > 0) && (
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="subgroup-title">What customers see this choice called</label>
                  <input id="subgroup-title" key={selectedGroup?.id} defaultValue={selectedGroup?.subgroup_title || 'Style'} placeholder="e.g. Back Style" className={`${input} bg-white`}
                    onBlur={async e => {
                      const value = e.target.value.trim() || 'Style'
                      setGroups(prev => prev.map(g => (g.id === groupId ? { ...g, subgroup_title: value } : g)))
                      const res = await saveSubgroupTitle(groupId, value)
                      setGroupMessage(res.ok ? '' : res.text)
                    }} />
                  <p className={hint}>The heading above the choice on the product page. It applies to the whole range and saves as soon as you click away.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Where it appears ───────────────────────────────────────── */}
      <section className={section} aria-labelledby="where-heading">
        <h2 id="where-heading" className={sectionTitle}>Where it appears</h2>
        <fieldset data-field="categories" className="m-0 border-0 p-0">
          <legend className={label}>Categories</legend>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {categories.map(c => (
              <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 hover:bg-stone-50">
                <input type="checkbox" checked={categoryIds.includes(c.id)} onChange={e => touch(setCategoryIds)(e.target.checked ? [...categoryIds, c.id] : categoryIds.filter(id => id !== c.id))} className="h-5 w-5 accent-orange-500" />
                <span className="font-medium text-stone-800">{c.name}</span>
              </label>
            ))}
          </div>
          <p className={hint}>One of these gives the product its web address, by the shop&apos;s usual rule; the others are extra places it can be browsed.</p>
          <FieldError text={errors.categories} />
        </fieldset>
        <div data-field="main_collection">
          <label className={label} htmlFor="collection">Main collection</label>
          <select id="collection" value={collectionId} onChange={e => touch(setCollectionId)(e.target.value)} className={input}>
            <option value="">None - hidden from /collection</option>
            {collections.map(c => <option key={c.id} value={c.id}>{c.name}{c.status === 'coming_soon' ? ' (not open yet)' : ''}</option>)}
          </select>
          <p className={hint}>The top level of the Collections page. Leave it unset and the product still sells, it just won&apos;t appear under any collection.</p>
          <FieldError text={errors.main_collection} />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-stone-200 bg-stone-50 p-3.5">
          <input type="checkbox" checked={isActive} onChange={e => touch(setIsActive)(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-orange-500" />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-stone-900">{isActive ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />} Shown in the shop</span>
            <span className={hint}>Untick to hide it everywhere in the shop. It keeps its orders, reviews and address.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-stone-200 bg-stone-50 p-3.5">
          <input type="checkbox" checked={isFeatured} onChange={e => touch(setIsFeatured)(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-orange-500" />
          <span>
            <span className="block text-sm font-bold text-stone-900">Feature on the homepage</span>
            <span className={hint}>The homepage rail shows six products. Ticked ones go first, newest fills the rest.</span>
          </span>
        </label>
      </section>

      {/* ── Specifications (sizes live here as Dimensions) ─────────── */}
      <section className={section} aria-labelledby="specs-heading" data-field="specifications">
        <div className="flex items-center justify-between gap-3">
          <h2 id="specs-heading" className={sectionTitle}>Specifications and sizes</h2>
          <button type="button" onClick={() => touch(setSpecs)([...specs, { key: '', value: '' }])} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-orange-50 px-3 text-sm font-bold text-orange-700"><Plus className="h-4 w-4" aria-hidden="true" /> Add line</button>
        </div>
        <p className={hint}>Put sizes on the Dimensions line in cm, including corner sides and any named pieces in a set. The list flags a product with no Dimensions.</p>
        <div className="space-y-2">
          {specs.map((spec, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-sm border border-stone-200 bg-stone-50 p-2 sm:flex-row">
              <label className="sr-only" htmlFor={`spec-key-${i}`}>Name</label>
              <input id={`spec-key-${i}`} value={spec.key} placeholder="Name" onChange={e => touch(setSpecs)(specs.map((s, j) => (j === i ? { ...s, key: e.target.value } : s)))} className={`${input} bg-white sm:flex-1`} />
              <div className="flex gap-2 sm:flex-[2]">
                <label className="sr-only" htmlFor={`spec-value-${i}`}>Value</label>
                <input id={`spec-value-${i}`} value={spec.value} placeholder="Value" onChange={e => touch(setSpecs)(specs.map((s, j) => (j === i ? { ...s, value: e.target.value } : s)))} className={`${input} bg-white`} />
                <button type="button" aria-label={`Remove ${spec.key || 'line'}`} onClick={() => touch(setSpecs)(specs.filter((_, j) => j !== i))} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-stone-200 bg-white text-red-600"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            </div>
          ))}
        </div>
        <FieldError text={errors.specifications} />
      </section>

      {/* ── Where it's made ────────────────────────────────────────── */}
      <section className={section} aria-labelledby="made-heading">
        <h2 id="made-heading" className={sectionTitle}>Where it&apos;s made</h2>
        <div data-field="origin">
          <label className={label} htmlFor="origin">Where is it made?</label>
          <select id="origin" value={origin} onChange={e => touch(setOrigin)(e.target.value)} className={input}>
            <option value="unspecified">Not specified - no badge shown</option>
            <option value="uk">Made in the UK - shows the badge</option>
            <option value="imported">Imported - no badge shown</option>
          </select>
          <p className={hint}>Only pick &quot;Made in the UK&quot; if you can evidence it. Recliner ranges are imported.</p>
          <FieldError text={errors.origin} />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-stone-200 bg-stone-50 p-3.5">
          <input type="checkbox" checked={customMade} onChange={e => touch(setCustomMade)(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-orange-500" />
          <span>
            <span className="block text-sm font-bold text-stone-900">Can be made to order</span>
            <span className={hint}>Shows the &quot;Made to your specification&quot; block with a WhatsApp button, and warns that made-to-measure orders are exempt from the 14-day return right. Fabric sofas only, not recliners.</span>
          </span>
        </label>
      </section>

      {/* ── Colourways ─────────────────────────────────────────────── */}
      <section className={section} aria-labelledby="colourways-heading" data-field="colourways">
        <div className="flex items-center justify-between gap-3">
          <h2 id="colourways-heading" className={sectionTitle}>Colourways</h2>
          <button type="button" onClick={() => touch(setColourways)([...colourways, blankColourway(colourways.length + 1)])} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-stone-900 px-3 text-sm font-bold text-white"><Plus className="h-4 w-4" aria-hidden="true" /> Add colourway</button>
        </div>
        <p className={hint}>Removing a colourway that has ever been ordered hides it instead, so old orders keep their details. Lower order numbers come first.</p>
        <FieldError text={errors.colourways} />
        <div className="space-y-3">
          {colourways.map((c, i) => (
            <div key={c.id ?? `new-${i}`} className={`space-y-3 rounded-md border p-3 ${badSku && badSku === c.sku.trim() ? 'border-red-400 bg-red-50' : c.isActive ? 'border-stone-200 bg-stone-50' : 'border-amber-300 bg-amber-50/50'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="m-0 text-xs font-bold uppercase tracking-wider text-stone-500">{c.optionsLabel || (c.id ? `Colourway ${i + 1}` : `New colourway ${i + 1}`)}{!c.isActive && ' · hidden'}</p>
                <button type="button" onClick={() => touch(setColourways)(colourways.filter((_, j) => j !== i))} className="inline-flex min-h-11 items-center gap-1 rounded-sm px-2 text-xs font-bold text-red-600" aria-label={`Remove colourway ${c.color || i + 1}`}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="col-span-2">
                  <label className={label} htmlFor={`colour-${i}`}>Colour name and swatch</label>
                  <div className="flex items-center gap-2 rounded-sm border border-stone-200 bg-white p-1.5 focus-within:border-orange-500">
                    <input type="color" aria-label="Swatch colour" value={/^#[0-9a-f]{6}$/i.test(c.colorHex) ? c.colorHex : '#000000'} onChange={e => updateColourway(i, { colorHex: e.target.value })} className="h-11 w-11 shrink-0 cursor-pointer border-0 p-0" />
                    <input id={`colour-${i}`} value={c.color} onChange={e => updateColourway(i, { color: e.target.value })} placeholder="e.g. Grey" className="min-h-11 w-full p-1 text-base outline-none" />
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className={label} htmlFor={`material-${i}`}>Material</label>
                  <input id={`material-${i}`} value={c.material} onChange={e => updateColourway(i, { material: e.target.value })} placeholder="e.g. Velvet" className={`${input} bg-white`} />
                </div>
                <div className="col-span-1">
                  <label className={label} htmlFor={`sku-${i}`}>SKU</label>
                  <input id={`sku-${i}`} value={c.sku} onChange={e => updateColourway(i, { sku: e.target.value })} placeholder="VER-3C-GRY" autoCapitalize="characters" className={`${input} bg-white font-mono`} />
                </div>
                <div className="col-span-1">
                  <label className={label} htmlFor={`price-${i}`}>+ Price (£)</label>
                  <input id={`price-${i}`} type="number" step="0.01" inputMode="decimal" value={c.priceAdjustment} onChange={e => updateColourway(i, { priceAdjustment: e.target.value })} className={`${input} bg-white`} />
                </div>
                <div className="col-span-1">
                  <label className={label} htmlFor={`order-${i}`}>Order</label>
                  <input id={`order-${i}`} type="number" inputMode="numeric" min={0} value={c.priority} onChange={e => updateColourway(i, { priority: e.target.value })} className={`${input} bg-white`} />
                </div>
                <label className="col-span-1 flex min-h-11 cursor-pointer items-center gap-2 self-end rounded-sm border border-stone-200 bg-white px-3">
                  <input type="checkbox" checked={c.isActive} onChange={e => updateColourway(i, { isActive: e.target.checked })} className="h-5 w-5 accent-orange-500" />
                  <span className="text-sm font-semibold text-stone-800">Shown</span>
                </label>
              </div>
              <div>
                <p className={label}>Photo</p>
                <PhotoPicker value={c.imageUrl} onChange={url => updateColourway(i, { imageUrl: url })} label={`colourway ${i + 1}`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gallery ────────────────────────────────────────────────── */}
      <section className={section} aria-labelledby="gallery-heading">
        <h2 id="gallery-heading" className={sectionTitle}>Gallery photos</h2>
        <p className={hint}>Shown in the main slider with the colourway photos: back, side and room shots.</p>
        {gallery.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
            {gallery.map((url, i) => (
              <li key={`${url}-${i}`} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- Admin preview: behind auth, never indexed. */}
                <img src={url} alt={`Gallery photo ${i + 1}`} className="h-24 w-24 rounded-sm border border-stone-200 object-cover" />
                <button type="button" onClick={() => touch(setGallery)(gallery.filter((_, j) => j !== i))} aria-label={`Remove gallery photo ${i + 1}`} className="absolute -right-2 -top-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white shadow">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <PhotoPicker multiple onAdd={urls => touch(setGallery)([...gallery, ...urls])} label="gallery photos" />
      </section>

      {/* ── Words ──────────────────────────────────────────────────── */}
      <section className={section} aria-labelledby="words-heading">
        <h2 id="words-heading" className={sectionTitle}>Words</h2>
        <div data-field="description">
          <label className={label} htmlFor="description">Description</label>
          <textarea id="description" rows={6} value={description} onChange={e => touch(setDescription)(e.target.value)} className={input} />
          <p className={hint}>The main text on the product page. Highlights go in Specifications.</p>
          <FieldError text={errors.description} />
        </div>
        <div data-field="seo_title">
          <label className={label} htmlFor="seo-title">Search title (optional)</label>
          <input id="seo-title" value={seoTitle} onChange={e => touch(setSeoTitle)(e.target.value)} placeholder={title || 'Uses the name when empty'} className={input} />
          <Counter value={seoTitle} guide={SEO_TITLE_GUIDE} max={SEO_TITLE_MAX} />
          <p className={hint}>The shop adds &quot; | UK Sofa Shop&quot; after it, so leave that off.</p>
          <FieldError text={errors.seo_title} />
        </div>
        <div data-field="seo_description">
          <label className={label} htmlFor="seo-description">Search description (optional)</label>
          <textarea id="seo-description" rows={3} value={seoDescription} onChange={e => touch(setSeoDescription)(e.target.value)} placeholder="Uses the start of the description when empty" className={input} />
          <Counter value={seoDescription} guide={SEO_DESCRIPTION_GUIDE} max={SEO_DESCRIPTION_MAX} />
          <FieldError text={errors.seo_description} />
        </div>
      </section>

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 rounded-md border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <button type="submit" disabled={saving} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-orange-500 text-lg font-black text-white transition hover:bg-orange-600 disabled:opacity-70">
          {saving ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Saving…</> : mode === 'edit' ? 'Save changes' : 'Save product'}
        </button>
        {dirty && !saving && <p className="m-0 mt-1.5 text-center text-xs font-semibold text-amber-700">You have changes that are not saved.</p>}
      </div>
    </form>
  )
}
