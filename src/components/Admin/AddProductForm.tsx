'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addProduct } from '@/app/actions/inventory'
import { Plus, Trash2, Loader2, ImagePlus } from 'lucide-react'

export default function AddProductForm({ categories }: { categories: any[] }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  
  // Notice we added image_url and isUploading state to the variants
  const [variants, setVariants] = useState([
    { sku: '', color: '', stock: '10', priceAdjustment: '0', image_url: '', isUploading: false }
  ])

  const addVariantRow = () => {
    setVariants([...variants, { sku: '', color: '', stock: '10', priceAdjustment: '0', image_url: '', isUploading: false }])
  }

  const updateVariant = (index: number, field: string, value: string | boolean) => {
    setVariants((prevVariants) => {
      const newVariants = [...prevVariants]
      newVariants[index] = { ...newVariants[index], [field]: value }
      return newVariants
    })
  }

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  // --- CLOUDINARY UPLOAD LOGIC ---
  const handleImageUpload = async (index: number, file: File) => {
    if (!file) return;
    
    updateVariant(index, 'isUploading', true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (data.secure_url) {
        updateVariant(index, 'image_url', data.secure_url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      alert("Failed to upload image. Check your Cloudinary details in .env.local");
    } finally {
      updateVariant(index, 'isUploading', false);
    }
  };

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError('')

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

      {/* --- Main Product Details --- */}
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

      {/* --- Dynamic Variants Section --- */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900">Color Variants & Images</h3>
          <button type="button" onClick={addVariantRow} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-900 px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
            <Plus className="w-4 h-4" /> Add Variant
          </button>
        </div>

        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={index} className="flex flex-col gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              
              {/* Text Inputs */}
              <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                <input type="text" placeholder="SKU (e.g. CLD-BLU)" value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value)} required className="flex-1 p-2 border rounded-md text-sm outline-none" />
                <input type="text" placeholder="Color (e.g. Blue)" value={variant.color} onChange={(e) => updateVariant(index, 'color', e.target.value)} required className="flex-1 p-2 border rounded-md text-sm outline-none" />
                <input type="number" placeholder="Stock" value={variant.stock} onChange={(e) => updateVariant(index, 'stock', e.target.value)} required className="w-24 p-2 border rounded-md text-sm outline-none" />
                <input type="number" step="0.01" placeholder="+£ Price" value={variant.priceAdjustment} onChange={(e) => updateVariant(index, 'priceAdjustment', e.target.value)} className="w-24 p-2 border rounded-md text-sm outline-none" />
                
                {variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-md transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Image Upload Input */}
              <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageUpload(index, e.target.files[0])
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 transition pointer-events-none">
                    <ImagePlus className="w-4 h-4" />
                    <span className="text-sm">Upload Image</span>
                  </div>
                </div>

                {variant.isUploading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                  </div>
                )}

                {variant.image_url && !variant.isUploading && (
                  <div className="flex items-center gap-3">
                    <img src={variant.image_url} alt="Variant preview" className="w-10 h-10 object-cover rounded shadow-sm border border-gray-200" />
                    <span className="text-xs text-green-600 font-medium">Uploaded Successfully</span>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

      <div className="pt-6">
        <button type="submit" disabled={isPending || variants.some(v => v.isUploading)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition disabled:opacity-70 flex justify-center items-center gap-2">
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Product & Variants'}
        </button>
      </div>
    </form>
  )
}