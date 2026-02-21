// src/components/Admin/EditProductForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProduct } from '@/app/actions/inventory'
import { Plus, Trash2, Loader2, ImagePlus } from 'lucide-react'

export default function EditProductForm({ product, categories }: { product: any, categories: any[] }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  
  // Pre-load variants, mapping them to our component's state structure
  const [variants, setVariants] = useState(
    product.product_variants.map((v: any) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      stock: v.stock_quantity.toString(),
      priceAdjustment: v.price_adjustment.toString(),
      image_url: v.image_url || '',
      isUploading: false
    }))
  )

  const addVariantRow = () => {
    setVariants([...variants, { sku: '', color: '', stock: '10', priceAdjustment: '0', image_url: '', isUploading: false }])
  }

  const updateVariant = (index: number, field: string, value: string | boolean) => {
    setVariants((prev: any) => {
      const newVariants = [...prev]
      newVariants[index] = { ...newVariants[index], [field]: value }
      return newVariants
    })
  }

  // We only allow removing variants that haven't been saved to the DB yet (no ID).
  // For saved variants, the admin should just set stock to 0 to prevent breaking order history!
  const removeVariant = (index: number) => {
    setVariants(variants.filter((_: any, i: number) => i !== index))
  }

  const handleImageUpload = async (index: number, file: File) => {
    if (!file) return;
    updateVariant(index, 'isUploading', true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST', body: formData,
      });
      const data = await res.json();
      if (data.secure_url) updateVariant(index, 'image_url', data.secure_url);
    } catch (err) {
      alert("Failed to upload image.");
    } finally {
      updateVariant(index, 'isUploading', false);
    }
  };

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError('')
    const result = await updateProduct(formData, variants, product.id)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    } else {
      router.push('/admin/inventory')
      router.refresh()
    }
  }

  // Extract specs safely
  const specs = typeof product.specifications === 'object' && product.specifications !== null 
    ? product.specifications 
    : {};

  return (
    <form action={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-sm border border-stone-200">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Product Title</label>
          <input type="text" name="title" defaultValue={product.title} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">URL Slug</label>
          <input type="text" name="slug" defaultValue={product.slug} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
          <select name="categoryId" defaultValue={product.category_id} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-600 outline-none bg-white">
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Base Price (£)</label>
          <input type="number" step="0.01" name="basePrice" defaultValue={product.base_price} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
        <textarea name="description" rows={3} defaultValue={product.description} required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-600 outline-none"></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Style</label>
          <input type="text" name="style" defaultValue={specs.style || ''} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Dimensions</label>
          <input type="text" name="dimensions" defaultValue={specs.dimensions || ''} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" />
        </div>
      </div>

      <div className="pt-6 border-t border-stone-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-stone-900">Color Variants & Images</h3>
          <button type="button" onClick={addVariantRow} className="text-sm bg-stone-100 hover:bg-stone-200 text-stone-900 px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
            <Plus className="w-4 h-4" /> Add Variant
          </button>
        </div>

        <div className="space-y-4">
          {variants.map((variant: any, index: number) => (
            <div key={index} className="flex flex-col gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
              <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                <input type="text" placeholder="SKU" value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value)} required className="flex-1 p-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-amber-600" />
                <input type="text" placeholder="Color" value={variant.color} onChange={(e) => updateVariant(index, 'color', e.target.value)} required className="flex-1 p-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-amber-600" />
                <input type="number" placeholder="Stock" value={variant.stock} onChange={(e) => updateVariant(index, 'stock', e.target.value)} required className="w-24 p-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-amber-600" title="Set to 0 to mark out of stock" />
                <input type="number" step="0.01" placeholder="+£ Price" value={variant.priceAdjustment} onChange={(e) => updateVariant(index, 'priceAdjustment', e.target.value)} className="w-24 p-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-amber-600" />
                
                {/* Only allow deleting NEW variants. Existing variants must have stock set to 0. */}
                {!variant.id && (
                  <button type="button" onClick={() => removeVariant(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-md transition" title="Remove unsaved variant">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-stone-200">
                <div className="relative">
                  <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(index, e.target.files[0]) }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 font-medium rounded-md hover:bg-stone-200 transition pointer-events-none">
                    <ImagePlus className="w-4 h-4" /> <span className="text-sm">Change Image</span>
                  </div>
                </div>
                {variant.isUploading && <div className="flex items-center gap-2 text-sm text-stone-500"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div>}
                {variant.image_url && !variant.isUploading && (
                  <img src={variant.image_url} alt="Variant preview" className="w-10 h-10 object-cover rounded shadow-sm border border-stone-200" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={isPending || variants.some((v: any) => v.isUploading)} className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 transition disabled:opacity-70 flex justify-center items-center gap-2">
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
      </button>
    </form>
  )
}