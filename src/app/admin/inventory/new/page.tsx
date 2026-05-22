// src/app/admin/inventory/new/page.tsx
import { createClient } from '@/utils/supabase/server'
import AddProductForm from '@/components/Admin/AddProductForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewProductPage() {
  const supabase = await createClient()

  // Fetch categories so the admin can select which category this product belongs to
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/inventory" className="p-2 hover:bg-gray-100 rounded-lg transition text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Add New Product</h1>
      </div>

      <p className="text-slate-600">
        Create a base product and add its specific color/material variants below.
      </p>

      {/* Pass the categories down to our Client Component form */}
      <AddProductForm categories={categories || []} />
    </div>
  )
}