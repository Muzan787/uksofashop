// src/app/admin/categories/page.tsx
import { createClient } from '@/utils/supabase/server'
import AddCategoryForm from '@/components/Admin/AddCategoryForm'
import { deleteCategory } from '@/app/actions/categories'
import { Trash2 } from 'lucide-react'
import Image from 'next/image'

export default async function AdminCategoriesPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-stone-900">Category Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Category List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-sm font-semibold text-stone-600 uppercase tracking-wider">
                <th className="p-4">Image</th>
                <th className="p-4">Name & Slug</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {categories?.map((category) => (
                <tr key={category.id} className="hover:bg-stone-50 transition-colors">
                  
                  {/* Column 1: Image */}
                  <td className="p-4 w-20">
                    <div className="relative w-12 h-12 bg-stone-100 rounded-lg overflow-hidden border border-stone-200">
                      <Image 
                        src={category.image_url || '/placeholder.svg'} 
                        alt={category.name} 
                        fill
                        sizes="48px"
                        className="object-cover" 
                      />
                    </div>
                  </td>

                  {/* Column 2: Name & Slug (THIS WAS MISSING!) */}
                  <td className="p-4">
                    <div className="font-semibold text-stone-900">{category.name}</div>
                    <div className="text-sm text-stone-500 font-mono mt-0.5">/{category.slug}</div>
                  </td>

                  {/* Column 3: Actions */}
                  <td className="p-4 text-right">
                    <form action={async (formData) => {
                      "use server";
                      await deleteCategory(formData)
                    }} className="inline-block">
                      <input type="hidden" name="categoryId" value={category.id} />
                      <button type="submit" className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete Category">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </form>
                  </td>

                </tr>
              ))}
              {(!categories || categories.length === 0) && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-stone-500">No categories found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Side: Add Form */}
        <div>
          <AddCategoryForm />
        </div>
      </div>
    </div>
  )
}