// src/app/admin/categories/page.tsx
import { createClient } from '@/utils/supabase/server'
import AddCategoryForm from '@/components/Admin/AddCategoryForm'
import { deleteCategory } from '@/app/actions/categories'
import { Trash2, FolderOpen } from 'lucide-react'
import Image from 'next/image'

export default async function AdminCategoriesPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase.from('categories').select('*').order('name')

  return (
    <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-stone-900 tracking-tight">Categories</h1>
        <p className="text-sm text-stone-500 mt-1">Organize your storefront collections.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 flex-col-reverse lg:flex-row">
        
        {/* Left Side: Category Grid (Mobile first!) */}
        <div className="lg:col-span-2 order-2 lg:order-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories?.map((category) => (
              <div key={category.id} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 flex items-center gap-4 group">
                <div className="relative w-16 h-16 bg-stone-100 rounded-xl overflow-hidden shrink-0">
                  <Image src={category.image_url || '/placeholder.svg'} alt={category.name} fill sizes="64px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-stone-900 truncate">{category.name}</h3>
                  <p className="text-xs text-stone-400 font-mono mt-0.5 truncate">/{category.slug}</p>
                </div>
                <form action={async (formData) => {
                  "use server";
                  await deleteCategory(formData)
                }}>
                  <input type="hidden" name="categoryId" value={category.id} />
                  <button type="submit" className="w-10 h-10 flex items-center justify-center text-stone-400 bg-stone-50 hover:bg-red-50 hover:text-red-600 rounded-xl transition active:scale-95" title="Delete Category">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>

          {(!categories || categories.length === 0) && (
            <div className="py-12 flex flex-col items-center justify-center bg-white rounded-3xl border border-stone-200 shadow-sm">
              <FolderOpen className="w-12 h-12 text-stone-300 mb-3" />
              <p className="text-lg font-bold text-stone-900">No categories found</p>
            </div>
          )}
        </div>

        {/* Right Side / Top on Mobile: Add Form */}
        <div className="order-1 lg:order-2">
          <div className="sticky top-6">
            <AddCategoryForm />
          </div>
        </div>
      </div>
    </div>
  )
}