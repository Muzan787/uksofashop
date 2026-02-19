'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addProduct } from '@/app/actions/inventory'
import { Plus, Trash2, Loader2 } from 'lucide-react'

export default function AddProductForm({ categories }: { categories: any[] }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  
  // State to hold our dynamic color variants
  const [variants, setVariants] = useState([
    { sku: '', color: '', stock: '10', priceAdjustment: '0' }
  ])

  const addVariantRow = () => {
    setVariants([...variants, { sku: '', color: '', stock: '10', priceAdjustment: '0' }])
  }

  const updateVariant = (index: number, field: string, value: string) => {
    const newVariants = [...variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setVariants(newVariants)
  }

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError('')

    // Call our Server Action from Step 9
    const result = await addProduct(formData, variants)

    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    } else {
      router.push('/admin/inventory')
      router.refresh()
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Product Title</label>
          <input type="text" name="title" required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="e.g. The Cloud Sofa" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">URL Slug (Unique)</label>
          <input type="text" name="slug" required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="e.g. the-cloud-sofa" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select name="categoryId" required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none bg-white">
            <option value="">Select a category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Base Price (£)</label>
          <input type="number" step="0.01" name="basePrice" required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="499.99" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea name="description" rows={3} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="Product description..."></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Style (For Filters)</label>
          <input type="text" name="style" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="e.g. Modern" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Dimensions</label>
          <input type="text" name="dimensions" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" placeholder="e.g. 3-Seater" />
        </div>
      </div>

      {/* Dynamic Variants Section */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900">Color Variants & Stock</h3>
          <button type="button" onClick={addVariantRow} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-900 px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
            <Plus className="w-4 h-4" /> Add Variant
          </button>
        </div>

        <div className="space-y-3">
          {variants.map((variant, index) => (
            <div key={index} className="flex flex-wrap md:flex-nowrap items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <input type="text" placeholder="SKU (e.g. CLD-BLU)" value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value)} required className="flex-1 p-2 border rounded-md text-sm" />
              <input type="text" placeholder="Color (e.g. Blue)" value={variant.color} onChange={(e) => updateVariant(index, 'color', e.target.value)} required className="flex-1 p-2 border rounded-md text-sm" />
              <input type="number" placeholder="Stock" value={variant.stock} onChange={(e) => updateVariant(index, 'stock', e.target.value)} required className="w-24 p-2 border rounded-md text-sm" />
              <input type="number" step="0.01" placeholder="+£ Price" value={variant.priceAdjustment} onChange={(e) => updateVariant(index, 'priceAdjustment', e.target.value)} className="w-24 p-2 border rounded-md text-sm" />
              
              {variants.length > 1 && (
                <button type="button" onClick={() => removeVariant(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-md transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6">
        <button type="submit" disabled={isPending} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition disabled:opacity-70 flex justify-center items-center gap-2">
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Product & Variants'}
        </button>
      </div>
    </form>
  )
}