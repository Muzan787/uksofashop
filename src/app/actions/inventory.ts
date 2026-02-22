// src/app/actions/inventory.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export interface VariantInput {
  id?: string;
  sku: string;
  color: string;
  stock: string;
  priceAdjustment: string;
  image_url: string;
}

// 1. Define Product Schema
const productSchema = z.object({
  title: z.string().min(3, 'Product title must be at least 3 characters.'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens.'),
  categoryId: z.string().uuid('Please select a valid category.'),
  basePrice: z.number().positive('Base price must be greater than 0.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  style: z.string().optional(),
  dimensions: z.string().optional(),
})

export async function addProduct(formData: FormData, variants: VariantInput[]) {
  const supabase = await createClient()

  // 2. Validate the Form Data
  const rawData = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    categoryId: formData.get('categoryId'),
    basePrice: parseFloat(formData.get('basePrice') as string),
    description: formData.get('description'),
    style: formData.get('style') || '',
    dimensions: formData.get('dimensions') || '',
  }

  const validatedData = productSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.issues[0].message }
  }

  const { title, slug, categoryId, basePrice, description, style, dimensions } = validatedData.data

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      title,
      slug,
      category_id: categoryId,
      base_price: basePrice,
      description,
      specifications: { style, dimensions } 
    })
    .select('id')
    .single()

  if (productError || !product) {
    // Check for unique constraint violation on the slug
    if (productError?.code === '23505') {
      return { error: 'A product with this URL slug already exists.' }
    }
    return { error: `Failed to add product: ${productError?.message}` }
  }

  // Insert variants... (keep the existing variants code here)
  if (variants.length > 0) {
    const variantData = variants.map(v => ({
      product_id: product.id,
      sku: v.sku,
      color: v.color,
      stock_quantity: parseInt(v.stock),
      price_adjustment: parseFloat(v.priceAdjustment || '0'),
      image_url: v.image_url || null
    }))

    const { error: variantError } = await supabase.from('product_variants').insert(variantData)
    if (variantError) return { error: 'Product created, but failed to add variants.' }
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
    .delete()
    .eq('id', productId)

  if (error) {
    return { error: 'Failed to delete product.' }
  }

  revalidatePath('/admin/inventory')
  revalidatePath('/')
  revalidatePath('/shop/[category]', 'layout')
}

// 2. Replace 'any[]' with 'VariantInput[]'
export async function updateProduct(formData: FormData, variants: VariantInput[], productId: string) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const slug = formData.get('slug') as string
  const categoryId = formData.get('categoryId') as string
  const basePrice = parseFloat(formData.get('basePrice') as string)
  const description = formData.get('description') as string
  const style = formData.get('style') as string
  const dimensions = formData.get('dimensions') as string

  const { error: productError } = await supabase
    .from('products')
    .update({
      title,
      slug,
      category_id: categoryId,
      base_price: basePrice,
      description,
      specifications: { style, dimensions }
    })
    .eq('id', productId)

  if (productError) {
    return { error: `Failed to update product: ${productError.message}` }
  }

  if (variants.length > 0) {
    const variantData = variants.map(v => ({
      ...(v.id ? { id: v.id } : {}), 
      product_id: productId,
      sku: v.sku,
      color: v.color,
      stock_quantity: parseInt(v.stock),
      price_adjustment: parseFloat(v.priceAdjustment || '0'),
      image_url: v.image_url || null
    }))

    const { error: variantError } = await supabase
      .from('product_variants')
      .upsert(variantData)

    if (variantError) {
      return { error: 'Product updated, but failed to sync variants.' }
    }
  }

  revalidatePath('/admin/inventory')
  revalidatePath(`/shop/${categoryId}/${slug}`) 
  return { success: true }
}