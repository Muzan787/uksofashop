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
  stock: string;
  priceAdjustment: string;
  image_url: string;
}

// 1. Define Product Schema
const productSchema = z.object({
  title: z.string().min(3, 'Product title must be at least 3 characters.'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens.'),
  categoryIds: z.array(z.string().uuid()).min(1, 'Select at least one category.'),
  basePrice: z.number().positive('Base price must be greater than 0.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  style: z.string().optional(),
  dimensions: z.string().optional(),
})

export async function addProduct(formData: FormData, variants: VariantInput[]) {
  const supabase = await createClient()

  // Grab multiple categories from the checkboxes
  const formCategoryIds = formData.getAll('categoryIds') as string[];

  // 2. Validate the Form Data
  const rawData = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    categoryIds: formCategoryIds, // <-- UPDATED
    basePrice: parseFloat(formData.get('basePrice') as string),
    description: formData.get('description'),
    style: formData.get('style') || '',
    dimensions: formData.get('dimensions') || '',
  }

  const validatedData = productSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.issues[0].message }
  }

  const { title, slug, categoryIds, basePrice, description, style, dimensions } = validatedData.data

// 1. Insert Product (without category_id)
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      title,
      slug,
      base_price: basePrice,
      description,
      specifications: { style, dimensions } 
    })
    .select('id')
    .single()

  if (productError || !product) return { error: `Failed to add product: ${productError?.message}` }

  // 2. Insert into the Product Categories Junction Table <-- NEW
  const productCategoryData = categoryIds.map(id => ({
    product_id: product.id,
    category_id: id
  }))
  await supabase.from('product_categories').insert(productCategoryData)

  // 3. Insert Variants with color_hex <-- UPDATED
  if (variants.length > 0) {
    const variantData = variants.map(v => ({
      product_id: product.id,
      sku: v.sku,
      color: v.color,
      color_hex: v.color_hex || null, // <-- NEW
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