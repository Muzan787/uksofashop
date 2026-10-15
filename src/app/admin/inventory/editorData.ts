// src/app/admin/inventory/editorData.ts
//
// What the product editor needs from the database, for adding, editing and
// copying (admin upgrade K2): the choices (categories, ranges with their
// known style labels, main collections) and a product turned into the
// editor's starting values.

import 'server-only'
import type { createClient } from '@/utils/supabase/server'
import type { EditorProps } from '@/components/Admin/ProductEditor'

type Db = Awaited<ReturnType<typeof createClient>>

export async function loadEditorOptions(supabase: Db): Promise<Omit<EditorProps, 'mode' | 'initial'>> {
  const [{ data: categories }, { data: groups }, { data: labels }, { data: collections }] = await Promise.all([
    supabase.from('categories').select('id, name').order('sort').order('name'),
    supabase.from('variant_groups').select('id, name, subgroup_title').order('name'),
    supabase.from('products').select('variant_group_id, subgroup_label').not('variant_group_id', 'is', null).not('subgroup_label', 'is', null),
    supabase.from('main_collections').select('id, name, status').order('position'),
  ])
  const subgroupsByGroup: Record<string, string[]> = {}
  for (const row of labels ?? []) {
    const list = (subgroupsByGroup[row.variant_group_id as string] ??= [])
    if (row.subgroup_label && !list.includes(row.subgroup_label)) list.push(row.subgroup_label)
  }
  return {
    categories: categories ?? [],
    groups: groups ?? [],
    subgroupsByGroup,
    collections: collections ?? [],
  }
}

export const EDITOR_PRODUCT_SELECT =
  '*, product_variants(id, sku, color, color_hex, material, price_adjustment, image_url, is_active, priority, created_at), product_categories(category_id)' as const

export type EditorSource = {
  id: string
  title: string
  slug: string
  base_price: number
  was_price: number | null
  variant_group_id: string | null
  size_label: string | null
  subgroup_label: string | null
  main_collection_id: string | null
  is_active: boolean | null
  is_featured: boolean | null
  origin: string
  custom_made: boolean
  specifications: unknown
  gallery_images: string[] | null
  description: string | null
  seo_title: string | null
  seo_description: string | null
  product_variants: {
    id: string; sku: string; color: string | null; color_hex: string | null; material: string | null
    price_adjustment: number | null; image_url: string | null; is_active: boolean; priority: number | null; created_at: string | null
  }[]
  product_categories: { category_id: string }[]
}

/** A product as the editor's starting values. `copy` drops the id and every SKU, and starts hidden. */
export function toEditorInitial(p: EditorSource, tier: string | null, copy = false): EditorProps['initial'] {
  const specs = p.specifications && typeof p.specifications === 'object' && !Array.isArray(p.specifications)
    ? Object.entries(p.specifications as Record<string, unknown>).map(([key, value]) => ({ key, value: String(value ?? '') }))
    : []
  const variants = [...p.product_variants].sort((a, b) =>
    (a.priority ?? 99) - (b.priority ?? 99) || String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
  return {
    id: copy ? null : p.id,
    title: copy ? `${p.title} (copy)` : p.title,
    slug: copy ? `${p.slug}-copy` : p.slug,
    basePrice: Number(p.base_price),
    wasPrice: p.was_price === null ? null : Number(p.was_price),
    tier: tier ?? '',
    variantGroupId: p.variant_group_id ?? '',
    sizeLabel: p.size_label ?? '',
    subgroupLabel: p.subgroup_label ?? '',
    categoryIds: p.product_categories.map(c => c.category_id),
    mainCollectionId: p.main_collection_id ?? '',
    isActive: copy ? false : p.is_active !== false,
    isFeatured: p.is_featured === true,
    origin: p.origin ?? 'unspecified',
    customMade: p.custom_made === true,
    specifications: specs,
    colourways: variants.map(v => ({
      ...(copy ? {} : { id: v.id }),
      sku: copy ? '' : v.sku,
      color: v.color ?? '',
      colorHex: v.color_hex ?? '#000000',
      material: v.material ?? '',
      priceAdjustment: String(v.price_adjustment ?? 0),
      imageUrl: v.image_url ?? '',
      isActive: copy ? true : v.is_active !== false,
      priority: String(v.priority ?? 99),
    })),
    galleryImages: p.gallery_images ?? [],
    description: p.description ?? '',
    seoTitle: p.seo_title ?? '',
    seoDescription: p.seo_description ?? '',
  }
}

/** A new product's starting values. */
export function blankEditorInitial(): EditorProps['initial'] {
  return {
    id: null, title: '', slug: '', basePrice: null, wasPrice: null, tier: '', variantGroupId: '', sizeLabel: '',
    subgroupLabel: '', categoryIds: [], mainCollectionId: '', isActive: true, isFeatured: false, origin: 'unspecified',
    customMade: false, specifications: [], colourways: [], galleryImages: [], description: '', seoTitle: '', seoDescription: '',
  }
}
