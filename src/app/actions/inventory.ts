// src/app/actions/inventory.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath, updateTag } from 'next/cache'
import { adminGuard, requireAdmin } from '@/utils/auth'
import { pickCanonicalCategorySlug } from '@/utils/productUrl'
import { z } from 'zod'

export interface VariantInput {
  id?: string;
  sku: string;
  color: string;
  color_hex: string;
  material: string;
  priceAdjustment: string;
  image_url: string;
}

const productSchema = z.object({
  title: z.string().min(3, 'Product title must be at least 3 characters.'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens.'),
  categoryIds: z.array(z.string().uuid()).min(1, 'Select at least one category.'),
  basePrice: z.number().positive('Base price must be greater than 0.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  specifications: z.string().optional(),
  variantGroupId: z.string().uuid().optional().nullable().or(z.literal('')),
  sizeLabel: z.string().optional().nullable().or(z.literal('')),
  subgroupLabel: z.string().optional().nullable().or(z.literal('')),
  gallery_images: z.string().optional(),
  // Only 'uk' ever renders a claim; anything else is silent.
  origin: z.enum(['uk', 'imported', 'unspecified']).default('unspecified'),
  customMade: z.boolean().default(false),
  // Pins a product to the homepage rail and the top of the shop's Featured sort.
  isFeatured: z.boolean().default(false),
})


/**
 * The optional "was" price, read off the form and checked against the price it
 * claims to beat.
 *
 * Blank is the normal answer and means no discount: the column goes back to
 * NULL and every storefront surface draws what it drew before. A figure at or
 * below the selling price is refused here, with a sentence the shop owner can
 * act on, rather than being left to the CHECK constraint and Postgres's
 * wording — see the migration for why that constraint exists anyway.
 */
function readWasPrice(
  formData: FormData,
  basePrice: number,
): { value: number | null; error?: undefined } | { value?: undefined; error: string } {
  const raw = ((formData.get('wasPrice') as string | null) ?? '').trim()
  if (!raw) return { value: null }

  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) {
    return { error: 'Was price must be a number greater than 0, or left blank for no discount.' }
  }
  if (value <= basePrice) {
    return { error: 'The was price has to be higher than the price you are selling at. Leave it blank for no discount.' }
  }
  return { value }
}

/**
 * products.category_id is the single canonical category that decides a
 * product's URL. product_categories says where it can be BROWSED; this says
 * where it LIVES. Without setting it, every new product lands with a null
 * category_id and the sitemap and Merchant feed fall back to different
 * placeholder paths - which is exactly the duplicate-URL bug this fixes.
 */
async function resolveCanonicalCategoryId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryIds: string[],
): Promise<string | null> {
  if (categoryIds.length === 0) return null

  const { data: cats } = await supabase
    .from('categories')
    .select('id, slug')
    .in('id', categoryIds)

  if (!cats || cats.length === 0) return null

  const winner = pickCanonicalCategorySlug(cats)
  return cats.find(c => c.slug === winner)?.id ?? cats[0].id
}

export async function addProduct(formData: FormData, variants: VariantInput[]) {
  const denied = await adminGuard()
  if (denied) return { error: denied.error }

  const supabase = await createClient()
  const formCategoryIds = formData.getAll('categoryIds') as string[];

  const rawData = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    categoryIds: formCategoryIds,
    basePrice: parseFloat(formData.get('basePrice') as string),
    description: formData.get('description'),
    specifications: formData.get('specifications') as string || '{}',
    variantGroupId: formData.get('variantGroupId') || null,
    sizeLabel: formData.get('sizeLabel') || null,
    subgroupLabel: formData.get('subgroupLabel') || null,
    gallery_images: formData.get('gallery_images') as string || '[]',
    origin: (formData.get('origin') as string) || 'unspecified',
    customMade: formData.get('customMade') === 'true',
    isFeatured: formData.get('isFeatured') === 'true',
  }

  const validatedData = productSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.issues[0].message }
  }

  const { title, slug, categoryIds, basePrice, description, specifications, variantGroupId, sizeLabel, subgroupLabel, gallery_images, origin, customMade, isFeatured } = validatedData.data

  // After the schema, because the rule it enforces is "higher than basePrice"
  // and basePrice is only known to be a positive number once zod has said so.
  const wasPrice = readWasPrice(formData, basePrice)
  if (wasPrice.error) return { error: wasPrice.error }

  let parsedSpecs = {};
  try { parsedSpecs = JSON.parse(specifications || '{}'); } catch { }
  
  let parsedGallery: string[] = [];
  try { parsedGallery = JSON.parse(gallery_images || '[]'); } catch { }

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      title,
      slug,
      base_price: basePrice,
      // Display only. Null is the normal state: no strikethrough, no badge.
      was_price: wasPrice.value,
      description,
      specifications: parsedSpecs,
      variant_group_id: variantGroupId || null,
      size_label: sizeLabel || null,
      subgroup_label: subgroupLabel || null,
      gallery_images: parsedGallery,
      origin,
      custom_made: customMade,
      is_featured: isFeatured
    })
    .select('id')
    .single()

  if (productError || !product) return { error: `Failed to add product: ${productError?.message}` }

  const productCategoryData = categoryIds.map(id => ({
    product_id: product.id,
    category_id: id
  }))
  await supabase.from('product_categories').insert(productCategoryData)

  const canonicalCategoryId = await resolveCanonicalCategoryId(supabase, categoryIds)
  if (canonicalCategoryId) {
    await supabase.from('products').update({ category_id: canonicalCategoryId }).eq('id', product.id)
  }

  if (variants.length > 0) {
    const variantData = variants.map(v => ({
      product_id: product.id,
      sku: v.sku,
      color: v.color,
      color_hex: v.color_hex || null,
      material: v.material,
      price_adjustment: parseFloat(v.priceAdjustment || '0'),
      image_url: v.image_url || null
    }))
    await supabase.from('product_variants').insert(variantData)
  }

  revalidatePath('/admin/inventory')
  // The cached storefront reads (homepage, product pages) pick the change up
  // now rather than at their five-minute mark.
  updateTag('home')
  updateTag('product')
  return { success: true }
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin()

  const supabase = await createClient()
  const productId = formData.get('productId') as string

  if (!productId) return { error: 'Product ID is required' }

  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', productId)

  if (error) return { error: 'Failed to delete product.' }

  revalidatePath('/admin/inventory')
  // The cached storefront reads (homepage, product pages) pick the change up
  // now rather than at their five-minute mark.
  updateTag('home')
  updateTag('product')
  revalidatePath('/')
  revalidatePath('/shop/[category]', 'layout')
}

export async function activateProduct(formData: FormData) {
  await requireAdmin()

  const productId = formData.get('productId') as string
  if (!productId) return
  const supabase = await createClient()

  await supabase.from('products').update({ is_active: true }).eq('id', productId)

  revalidatePath('/admin/inventory')
  // The cached storefront reads (homepage, product pages) pick the change up
  // now rather than at their five-minute mark.
  updateTag('home')
  updateTag('product')
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function updateProduct(formData: FormData, variants: VariantInput[], productId: string) {
  const denied = await adminGuard()
  if (denied) return { error: denied.error }

  const supabase = await createClient()

  const title = formData.get('title') as string
  const slug = formData.get('slug') as string
  const categoryIds = formData.getAll('categoryIds') as string[]
  const basePrice = parseFloat(formData.get('basePrice') as string)
  const description = formData.get('description') as string
  const specifications = formData.get('specifications') as string || '{}'
  const variantGroupId = formData.get('variantGroupId') as string || null
  const sizeLabel = formData.get('sizeLabel') as string || null
  const subgroupLabel = formData.get('subgroupLabel') as string || null
  const gallery_images = formData.get('gallery_images') as string || '[]'
  const originRaw = formData.get('origin') as string
  const origin = ['uk', 'imported', 'unspecified'].includes(originRaw) ? originRaw : 'unspecified'
  const customMade = formData.get('customMade') === 'true'
  const isFeatured = formData.get('isFeatured') === 'true'

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return { error: 'Base price must be greater than 0.' }
  }
  const wasPrice = readWasPrice(formData, basePrice)
  if (wasPrice.error) return { error: wasPrice.error }

  let parsedSpecs = {};
  try { parsedSpecs = JSON.parse(specifications); } catch { }
  
  let parsedGallery: string[] = [];
  try { parsedGallery = JSON.parse(gallery_images); } catch { }

  const { error: productError } = await supabase
    .from('products')
    .update({
      title,
      slug,
      base_price: basePrice,
      // Display only, and cleared by emptying the field — see readWasPrice.
      was_price: wasPrice.value,
      description,
      specifications: parsedSpecs,
      variant_group_id: variantGroupId,
      size_label: sizeLabel,
      subgroup_label: subgroupLabel,
      gallery_images: parsedGallery,
      origin,
      custom_made: customMade,
      is_featured: isFeatured
    })
    .eq('id', productId)

  if (productError) {
    return { error: `Failed to update product: ${productError.message}` }
  }

  if (categoryIds.length > 0) {
    await supabase.from('product_categories').delete().eq('product_id', productId)
    const productCategoryData = categoryIds.map(id => ({ product_id: productId, category_id: id }))
    await supabase.from('product_categories').insert(productCategoryData)

    const canonicalCategoryId = await resolveCanonicalCategoryId(supabase, categoryIds)
    if (canonicalCategoryId) {
      await supabase.from('products').update({ category_id: canonicalCategoryId }).eq('id', productId)
    }
  }

  if (variants.length > 0) {
    const variantData = variants.map(v => ({
      ...(v.id ? { id: v.id } : {}), 
      product_id: productId,
      sku: v.sku,
      color: v.color,
      color_hex: v.color_hex || null,
      material: v.material || null,
      price_adjustment: parseFloat(v.priceAdjustment || '0'),
      image_url: v.image_url || null
    }))

    const { error: variantError } = await supabase.from('product_variants').upsert(variantData)
    if (variantError) return { error: 'Product updated, but failed to sync variants.' }
  }

  revalidatePath('/admin/inventory')
  // The cached storefront reads (homepage, product pages) pick the change up
  // now rather than at their five-minute mark.
  updateTag('home')
  updateTag('product')
  revalidatePath(`/shop/${categoryIds}/${slug}`) 
  return { success: true }
}