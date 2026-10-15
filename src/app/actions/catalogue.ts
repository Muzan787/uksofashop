// src/app/actions/catalogue.ts
'use server'
//
// The catalogue admin (admin upgrade K1-K5). The product editor saves through
// save_product(), one database transaction for the product, its categories,
// offer tier and colourways; categories, ranges and fabrics save under the
// admin's own session (RLS admits admins), and every delete goes through a
// database function that refuses, with the reason, while anything uses the
// item. After any change the shop's caches are refreshed, so an edit shows
// on the next visit.

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { adminGuard } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { pickCanonicalCategorySlug } from '@/utils/productUrl'
import { deleteRefusal, saveRefusal, slugify, type EditorField } from '@/utils/catalogue'
import type { Json } from '@/types/supabase'

/** The shop reads the catalogue through these caches; refresh them all. */
function refreshShop() {
  updateTag('product')
  updateTag('home')
  updateTag('nav-categories')
  revalidatePath('/', 'layout')
}

const uuid = z.string().uuid()
const slugRule = /^[a-z0-9]+(-[a-z0-9]+)*$/
const cloudinaryUrl = /^https:\/\/res\.cloudinary\.com\//

// ── Products ───────────────────────────────────────────────────────────────

export interface ColourwayInput {
  id?: string
  sku: string
  color: string
  colorHex: string
  material: string
  priceAdjustment: string
  imageUrl: string
  isActive: boolean
  priority: string
}

export interface ProductInput {
  id: string | null
  title: string
  slug: string
  basePrice: string
  wasPrice: string
  tier: string
  variantGroupId: string
  sizeLabel: string
  subgroupLabel: string
  categoryIds: string[]
  mainCollectionId: string
  isActive: boolean
  isFeatured: boolean
  origin: string
  customMade: boolean
  specifications: { key: string; value: string }[]
  colourways: ColourwayInput[]
  galleryImages: string[]
  description: string
  seoTitle: string
  seoDescription: string
}

export type SaveProductResult =
  | { ok: true; id: string; hidden: number; deleted: number }
  | { ok: false; field: EditorField; text: string; sku?: string }

export async function saveProduct(input: ProductInput): Promise<SaveProductResult> {
  const denied = await adminGuard()
  if (denied) return { ok: false, field: 'form', text: 'You are not signed in as an admin any more. Sign in again.' }
  if (input.id !== null && !uuid.safeParse(input.id).success) return { ok: false, field: 'form', text: 'This product no longer exists.' }

  const supabase = await createClient()
  const categoryIds = [...new Set(input.categoryIds.filter(id => uuid.safeParse(id).success))]

  // The one category that decides the product's address (products.category_id):
  // the same rule as always, from the categories ticked.
  let canonical: string | null = null
  if (categoryIds.length) {
    const { data: cats } = await supabase.from('categories').select('id, slug').in('id', categoryIds)
    if (cats?.length) {
      const winner = pickCanonicalCategorySlug(cats)
      canonical = cats.find(c => c.slug === winner)?.id ?? cats[0].id
    }
  }

  const specifications: Record<string, string> = {}
  for (const { key, value } of input.specifications) {
    if (key.trim()) specifications[key.trim()] = value.trim()
  }

  const product = {
    title: input.title,
    slug: input.slug.trim(),
    base_price: input.basePrice.trim(),
    was_price: input.wasPrice.trim(),
    description: input.description,
    specifications,
    variant_group_id: input.variantGroupId,
    size_label: input.sizeLabel,
    subgroup_label: input.subgroupLabel,
    gallery_images: input.galleryImages.filter(Boolean),
    origin: input.origin,
    custom_made: input.customMade,
    is_featured: input.isFeatured,
    is_active: input.isActive,
    main_collection_id: input.mainCollectionId,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
  }
  const variants = input.colourways.map(c => ({
    ...(c.id ? { id: c.id } : {}),
    sku: c.sku,
    color: c.color,
    color_hex: c.colorHex,
    material: c.material,
    price_adjustment: c.priceAdjustment.trim() || '0',
    image_url: c.imageUrl,
    is_active: c.isActive,
    priority: c.priority.trim(),
  }))

  const { data, error } = await supabase.rpc('save_product', {
    p_id: input.id,
    p_product: product as unknown as Json,
    p_category_ids: categoryIds,
    p_canonical_category_id: canonical,
    p_tier: input.tier || null,
    p_variants: variants as unknown as Json,
  })
  if (error || !data) {
    if (error) console.error('save_product refused:', error.message, error.details)
    return { ok: false, ...saveRefusal(error?.message ?? '', error?.details) }
  }

  const saved = data as { id: string; hidden: number; deleted: number }
  revalidatePath('/admin/inventory')
  revalidatePath('/admin/catalogue')
  refreshShop()
  return { ok: true, id: saved.id, hidden: saved.hidden, deleted: saved.deleted }
}

/** Deletes a product for good, only if never ordered and after typing DELETE (K2). */
export async function deleteProductForGood(id: string, typed: string): Promise<{ ok: true } | { ok: false; text: string }> {
  const denied = await adminGuard()
  if (denied) return { ok: false, text: 'You are not signed in as an admin any more. Sign in again.' }
  if (typed.trim() !== 'DELETE') return { ok: false, text: 'Type DELETE in capitals to delete this product.' }
  if (!uuid.safeParse(id).success) return { ok: false, text: 'This product no longer exists.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_product', { p_id: id })
  if (error) return { ok: false, text: deleteRefusal(error.message, error.details, 'product') }

  revalidatePath('/admin/inventory')
  revalidatePath('/admin/catalogue')
  refreshShop()
  return { ok: true }
}

/** A range (variant group), created from the product editor. */
export async function createVariantGroup(name: string): Promise<{ ok: true; group: { id: string; name: string; subgroup_title: string } } | { ok: false; text: string }> {
  const denied = await adminGuard()
  if (denied) return { ok: false, text: 'You are not signed in as an admin any more.' }
  const clean = name.trim()
  if (clean.length < 2) return { ok: false, text: 'Give the range a name.' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('variant_groups')
    .insert({ name: clean, slug: slugify(clean) })
    .select('id, name, subgroup_title')
    .single()
  if (error || !data) {
    return { ok: false, text: error?.code === '23505' ? 'A range with this name already exists. Pick it from the list.' : "That range didn't save. Try again." }
  }
  revalidatePath('/admin/catalogue/ranges')
  return { ok: true, group: data }
}

/** Every photo the catalogue already uses, for the photo picker (K4). */
export async function listCatalogueImages(): Promise<{ url: string; label: string }[]> {
  const denied = await adminGuard()
  if (denied) return []
  const supabase = await createClient()
  const [{ data: products }, { data: categories }, { data: fabrics }] = await Promise.all([
    supabase.from('products').select('title, gallery_images, product_variants(color, image_url)'),
    supabase.from('categories').select('name, image_url'),
    supabase.from('fabrics').select('name, code, image_url, fabric_collections(name)'),
  ])

  const seen = new Set<string>()
  const out: { url: string; label: string }[] = []
  const add = (url: string | null | undefined, label: string) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    out.push({ url, label })
  }
  for (const p of products ?? []) {
    for (const v of p.product_variants ?? []) add(v.image_url, `${p.title} · ${v.color ?? ''}`.trim())
    for (const g of p.gallery_images ?? []) add(g, `${p.title} · gallery`)
  }
  for (const c of categories ?? []) add(c.image_url, `Category · ${c.name}`)
  for (const f of (fabrics ?? []) as unknown as { name: string; code: string; image_url: string | null; fabric_collections: { name: string } | null }[]) {
    add(f.image_url, `Fabric · ${f.fabric_collections?.name ?? ''} ${f.name} (${f.code})`.replace(/\s+/g, ' '))
  }
  return out
}

// ── Categories ─────────────────────────────────────────────────────────────

const categorySchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  name: z.string().trim().min(2, 'Give the category a name.').max(80),
  slug: z.string().trim().regex(slugRule, 'The web address can only have small letters, numbers and single dashes.'),
  parentId: z.string().uuid().optional().or(z.literal('')),
  sort: z.coerce.number().int().min(0).max(9999).default(99),
  isActive: z.boolean(),
  imageUrl: z.string().trim().refine(v => v === '' || cloudinaryUrl.test(v), 'Photos have to be Cloudinary links.'),
  intro: z.string().trim().max(600, 'Keep the introduction under 600 characters.'),
  searchWords: z.string().trim().max(300, 'Keep the search words under 300 characters.'),
})

export type ActionResult = { ok: true } | { ok: false; text: string }

export async function saveCategory(formData: FormData): Promise<ActionResult> {
  const denied = await adminGuard()
  if (denied) return { ok: false, text: denied.error }
  const parsed = categorySchema.safeParse({
    id: formData.get('id') ?? '',
    name: formData.get('name'),
    slug: formData.get('slug'),
    parentId: formData.get('parentId') ?? '',
    sort: formData.get('sort') || 99,
    isActive: formData.get('isActive') === 'true',
    imageUrl: formData.get('imageUrl') ?? '',
    intro: formData.get('intro') ?? '',
    searchWords: formData.get('searchWords') ?? '',
  })
  if (!parsed.success) return { ok: false, text: parsed.error.issues[0].message }
  const c = parsed.data
  if (c.id && c.parentId === c.id) return { ok: false, text: "A category can't sit inside itself." }

  const row = {
    name: c.name,
    slug: c.slug,
    parent_id: c.parentId || null,
    sort: c.sort,
    is_active: c.isActive,
    image_url: c.imageUrl || null,
    intro: c.intro || null,
    search_words: c.searchWords || null,
  }
  const supabase = await createClient()
  const { error } = c.id
    ? await supabase.from('categories').update(row).eq('id', c.id)
    : await supabase.from('categories').insert(row)
  if (error) {
    if (error.message.includes('CATEGORY_LOOP')) return { ok: false, text: "A category can't sit inside itself, or inside one of its own sub-categories." }
    if (error.code === '23505') return { ok: false, text: 'Another category already uses this web address.' }
    return { ok: false, text: "That category didn't save. Try again." }
  }
  revalidatePath('/admin/categories')
  revalidatePath('/admin/catalogue')
  refreshShop()
  return { ok: true }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const denied = await adminGuard()
  if (denied) return { ok: false, text: denied.error }
  if (!uuid.safeParse(id).success) return { ok: false, text: 'This category no longer exists.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_category', { p_id: id })
  if (error) return { ok: false, text: deleteRefusal(error.message, error.details, 'category') }
  revalidatePath('/admin/categories')
  revalidatePath('/admin/catalogue')
  refreshShop()
  return { ok: true }
}

// ── Ranges (variant groups) ────────────────────────────────────────────────

const groupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, 'Give the range a name.').max(80),
  slug: z.string().trim().regex(slugRule, 'The web address can only have small letters, numbers and single dashes.'),
  subgroupTitle: z.string().trim().max(40).transform(v => v || 'Style'),
})

export async function saveVariantGroup(formData: FormData): Promise<ActionResult> {
  const denied = await adminGuard()
  if (denied) return { ok: false, text: denied.error }
  const parsed = groupSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    slug: formData.get('slug'),
    subgroupTitle: formData.get('subgroupTitle') ?? '',
  })
  if (!parsed.success) return { ok: false, text: parsed.error.issues[0].message }
  const g = parsed.data
  const supabase = await createClient()
  const { error } = await supabase
    .from('variant_groups')
    .update({ name: g.name, slug: g.slug, subgroup_title: g.subgroupTitle })
    .eq('id', g.id)
  if (error) return { ok: false, text: error.code === '23505' ? 'Another range already uses this web address.' : "That range didn't save. Try again." }
  revalidatePath('/admin/catalogue/ranges')
  refreshShop()
  return { ok: true }
}

/** The name customers see above a range's style choice, saved on its own. */
export async function saveSubgroupTitle(id: string, title: string): Promise<ActionResult> {
  const denied = await adminGuard()
  if (denied) return { ok: false, text: denied.error }
  if (!uuid.safeParse(id).success) return { ok: false, text: 'That range no longer exists.' }
  const supabase = await createClient()
  const { error } = await supabase.from('variant_groups').update({ subgroup_title: title.trim().slice(0, 40) || 'Style' }).eq('id', id)
  if (error) return { ok: false, text: "That didn't save. Try again." }
  refreshShop()
  return { ok: true }
}

export async function deleteVariantGroup(id: string): Promise<ActionResult> {
  const denied = await adminGuard()
  if (denied) return { ok: false, text: denied.error }
  if (!uuid.safeParse(id).success) return { ok: false, text: 'That range no longer exists.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_variant_group', { p_id: id })
  if (error) return { ok: false, text: deleteRefusal(error.message, error.details, 'range') }
  revalidatePath('/admin/catalogue/ranges')
  revalidatePath('/admin/catalogue')
  return { ok: true }
}

// ── Fabrics ────────────────────────────────────────────────────────────────

const collectionSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  name: z.string().trim().min(2, 'Give the collection a name.').max(80),
  slug: z.string().trim().regex(slugRule, 'The web address can only have small letters, numbers and single dashes.'),
  description: z.string().trim().max(600),
  supplier: z.string().trim().min(1, 'Name the supplier.').max(80),
  supplierHandle: z.string().trim().max(120),
  sort: z.coerce.number().int().min(0).max(9999).default(99),
  isActive: z.boolean(),
})

export async function saveFabricCollection(formData: FormData): Promise<ActionResult> {
  const denied = await adminGuard()
  if (denied) return { ok: false, text: denied.error }
  const parsed = collectionSchema.safeParse({
    id: formData.get('id') ?? '',
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') ?? '',
    supplier: formData.get('supplier') ?? '',
    supplierHandle: formData.get('supplierHandle') ?? '',
    sort: formData.get('sort') || 99,
    isActive: formData.get('isActive') === 'true',
  })
  if (!parsed.success) return { ok: false, text: parsed.error.issues[0].message }
  const c = parsed.data
  const row = {
    name: c.name, slug: c.slug, description: c.description || null, supplier: c.supplier,
    supplier_handle: c.supplierHandle || null, sort: c.sort, is_active: c.isActive,
  }
  const supabase = await createClient()
  const { error } = c.id
    ? await supabase.from('fabric_collections').update(row).eq('id', c.id)
    : await supabase.from('fabric_collections').insert(row)
  if (error) return { ok: false, text: error.code === '23505' ? 'Another collection already uses this web address.' : "That collection didn't save. Try again." }
  revalidatePath('/admin/catalogue/fabrics')
  refreshShop()
  return { ok: true }
}

export async function deleteFabricCollection(id: string): Promise<ActionResult> {
  const denied = await adminGuard()
  if (denied) return { ok: false, text: denied.error }
  if (!uuid.safeParse(id).success) return { ok: false, text: 'That collection no longer exists.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_fabric_collection', { p_id: id })
  if (error) return { ok: false, text: deleteRefusal(error.message, error.details, 'collection') }
  revalidatePath('/admin/catalogue/fabrics')
  refreshShop()
  return { ok: true }
}

const fabricSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  collectionId: z.string().uuid('Choose the collection.'),
  code: z.string().trim().min(1, 'Give the fabric its code, e.g. CH-114.').max(40),
  name: z.string().trim().min(1, 'Give the fabric a colour name.').max(80),
  supplierTitle: z.string().trim().max(120),
  hex: z.string().trim().refine(v => v === '' || /^#[0-9a-f]{6}$/i.test(v), 'The swatch colour has to be a colour, e.g. #808080.'),
  imageUrl: z.string().trim().refine(v => v === '' || cloudinaryUrl.test(v), 'Photos have to be Cloudinary links.'),
  sort: z.coerce.number().int().min(0).max(9999).default(99),
  isActive: z.boolean(),
  isSwatchable: z.boolean(),
})

export async function saveFabric(formData: FormData): Promise<ActionResult> {
  const denied = await adminGuard()
  if (denied) return { ok: false, text: denied.error }
  const parsed = fabricSchema.safeParse({
    id: formData.get('id') ?? '',
    collectionId: formData.get('collectionId'),
    code: formData.get('code'),
    name: formData.get('name'),
    supplierTitle: formData.get('supplierTitle') ?? '',
    hex: formData.get('hex') ?? '',
    imageUrl: formData.get('imageUrl') ?? '',
    sort: formData.get('sort') || 99,
    isActive: formData.get('isActive') === 'true',
    isSwatchable: formData.get('isSwatchable') === 'true',
  })
  if (!parsed.success) return { ok: false, text: parsed.error.issues[0].message }
  const f = parsed.data
  const row = {
    collection_id: f.collectionId, code: f.code, name: f.name, supplier_title: f.supplierTitle || null,
    hex: f.hex || null, image_url: f.imageUrl || null, sort: f.sort, is_active: f.isActive, is_swatchable: f.isSwatchable,
  }
  const supabase = await createClient()
  const { error } = f.id
    ? await supabase.from('fabrics').update(row).eq('id', f.id)
    : await supabase.from('fabrics').insert(row)
  if (error) return { ok: false, text: error.code === '23505' ? 'This collection already has a fabric with that code.' : "That fabric didn't save. Try again." }
  revalidatePath('/admin/catalogue/fabrics')
  refreshShop()
  return { ok: true }
}

export async function deleteFabric(id: string): Promise<ActionResult> {
  const denied = await adminGuard()
  if (denied) return { ok: false, text: denied.error }
  if (!uuid.safeParse(id).success) return { ok: false, text: 'That fabric no longer exists.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_fabric', { p_id: id })
  if (error) return { ok: false, text: deleteRefusal(error.message, error.details, 'fabric') }
  revalidatePath('/admin/catalogue/fabrics')
  refreshShop()
  return { ok: true }
}
