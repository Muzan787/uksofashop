// src/app/actions/inventory.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addProduct(formData: FormData, variants: any[]) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const slug = formData.get('slug') as string
  const categoryId = formData.get('categoryId') as string
  const basePrice = parseFloat(formData.get('basePrice') as string)
  const description = formData.get('description') as string
  
  // Example of capturing JSONB specifications
  const style = formData.get('style') as string
  const dimensions = formData.get('dimensions') as string

  // 1. Insert the Base Product
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      title,
      slug,
      category_id: categoryId,
      base_price: basePrice,
      description,
      specifications: { style, dimensions } // Stored as JSONB!
    })
    .select('id')
    .single()

  if (productError || !product) {
    return { error: `Failed to add product: ${productError?.message}` }
  }

  // 2. Insert the Variants (Colors, Stock, etc.)
  if (variants.length > 0) {
    const variantData = variants.map(v => ({
      product_id: product.id,
      sku: v.sku,
      color: v.color,
      stock_quantity: parseInt(v.stock),
      price_adjustment: parseFloat(v.priceAdjustment || '0'),
      image_url: v.image_url || null
    }))

    const { error: variantError } = await supabase
      .from('product_variants')
      .insert(variantData)

    if (variantError) {
      return { error: 'Product created, but failed to add variants.' }
    }
  }

  // Refresh the inventory page to show the new item
  revalidatePath('/admin/inventory')
  return { success: true }
}

// Add this at the bottom of src/app/actions/inventory.ts

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

  // Refresh both the inventory page and the frontend homepage
  revalidatePath('/admin/inventory')
  revalidatePath('/')
  revalidatePath('/shop/[category]', 'layout')
}