// src/app/admin/inventory/[id]/edit/page.tsx
import { createClient } from '@/utils/supabase/server'
import EditProductForm from '@/components/Admin/EditProductForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient()

  // 1. Fetch Categories
  const { data: categories } = await supabase.from('categories').select('id, name')

  // 2. Fetch the specific Product and its variants
  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('id', id)
    .single()

  if (error || !product) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/inventory" className="p-2 hover:bg-stone-100 rounded-lg transition text-stone-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold text-stone-900">Edit Product: {product.title}</h1>
      </div>

      <p className="text-stone-600">
        Update product details, upload new variant images, or set stock to 0 to mark an item as sold out.
      </p>

      <EditProductForm product={product} categories={categories || []} />
    </div>
  )
}