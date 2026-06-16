// src/app/actions/inventory.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export interface VariantInput {
  id?: string;
  sku: string;
  color: string;
  color_hex: string;
  material: string;
  stock: string;
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
  gallery_images: z.string().optional(), // <-- NEW: Accepts stringified array of URLs
})

export async function addProduct(formData: FormData, variants: VariantInput[]) {
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
    gallery_images: formData.get('gallery_images') as string || '[]',
  }

  const validatedData = productSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.issues[0].message }
  }

  const { title, slug, categoryIds, basePrice, description, specifications, variantGroupId, sizeLabel, gallery_images } = validatedData.data

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
      description,
      specifications: parsedSpecs,
      variant_group_id: variantGroupId || null,
      size_label: sizeLabel || null,
      gallery_images: parsedGallery
    })
    .select('id')
    .single()

  if (productError || !product) return { error: `Failed to add product: ${productError?.message}` }

  const productCategoryData = categoryIds.map(id => ({
    product_id: product.id,
    category_id: id
  }))
  await supabase.from('product_categories').insert(productCategoryData)

  if (variants.length > 0) {
    const variantData = variants.map(v => ({
      product_id: product.id,
      sku: v.sku,
      color: v.color,
      color_hex: v.color_hex || null,
      material: v.material,
      stock_quantity: parseInt(v.stock),
      price_adjustment: parseFloat(v.priceAdjustment || '0'),
      image_url: v.image_url || null
    }))
    await supabase.from('product_variants').insert(variantData)
  }

  revalidatePath('/admin/inventory')
  return { success: true }
}

export async function deleteProduct(formData: FormData) {
  const supabase = await createClient()
  const productId = formData.get('productId') as string

  if (!productId) return { error: 'Product ID is required' }

  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', productId)

  if (error) return { error: 'Failed to delete product.' }

  revalidatePath('/admin/inventory')
  revalidatePath('/')
  revalidatePath('/shop/[category]', 'layout')
}

export async function activateProduct(formData: FormData) {
  const productId = formData.get('productId') as string
  if (!productId) return
  const supabase = await createClient()

  await supabase.from('products').update({ is_active: true }).eq('id', productId)

  revalidatePath('/admin/inventory')
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function updateProduct(formData: FormData, variants: VariantInput[], productId: string) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const slug = formData.get('slug') as string
  const categoryIds = formData.getAll('categoryIds') as string[]
  const basePrice = parseFloat(formData.get('basePrice') as string)
  const description = formData.get('description') as string
  const specifications = formData.get('specifications') as string || '{}'
  const variantGroupId = formData.get('variantGroupId') as string || null
  const sizeLabel = formData.get('sizeLabel') as string || null
  const gallery_images = formData.get('gallery_images') as string || '[]'

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
      description,
      specifications: parsedSpecs,
      variant_group_id: variantGroupId,
      size_label: sizeLabel,
      gallery_images: parsedGallery
    })
    .eq('id', productId)

  if (productError) {
    return { error: `Failed to update product: ${productError.message}` }
  }

  if (categoryIds.length > 0) {
    await supabase.from('product_categories').delete().eq('product_id', productId)
    const productCategoryData = categoryIds.map(id => ({ product_id: productId, category_id: id }))
    await supabase.from('product_categories').insert(productCategoryData)
  }

  if (variants.length > 0) {
    const variantData = variants.map(v => ({
      ...(v.id ? { id: v.id } : {}), 
      product_id: productId,
      sku: v.sku,
      color: v.color,
      color_hex: v.color_hex || null,
      material: v.material || null,
      stock_quantity: parseInt(v.stock),
      price_adjustment: parseFloat(v.priceAdjustment || '0'),
      image_url: v.image_url || null
    }))

    const { error: variantError } = await supabase.from('product_variants').upsert(variantData)
    if (variantError) return { error: 'Product updated, but failed to sync variants.' }
  }

  revalidatePath('/admin/inventory')
  revalidatePath(`/shop/${categoryIds}/${slug}`) 
  return { success: true }
}