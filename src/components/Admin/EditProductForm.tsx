// src/components/Admin/EditProductForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProduct, VariantInput } from '@/app/actions/inventory'
import { Plus, Trash2, Loader2, ImagePlus } from 'lucide-react'
import { Database } from '@/types/supabase'

type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name'>
type DBVariant = Database['public']['Tables']['product_variants']['Row']
type Product = Database['public']['Tables']['products']['Row'] & {
  product_variants: DBVariant[];
  product_categories?: { category_id: string }[];
}

interface VariantState extends Omit<VariantInput, 'stock'> {
  isUploading: boolean;
}

export default function EditProductForm({ product, categories }: { product: Product, categories: Category[] }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  
  // Strip stock out of the UI
  const [variants, setVariants] = useState<VariantState[]>(
    product.product_variants.map((v) => ({
      id: v.id, sku: v.sku, color: v.color || '', color_hex: v.color_hex || '#000000', material: v.material || '', priceAdjustment: (v.price_adjustment || 0).toString(), image_url: v.image_url || '', isUploading: false
    }))
  )

  const existingSpecs = typeof product.specifications === 'object' && product.specifications !== null 
    ? (product.specifications as Record<string, string>) : {};
  const initialSpecs = Object.keys(existingSpecs).length > 0 
    ? Object.entries(existingSpecs).map(([k, v]) => ({ key: k, value: String(v) }))
    : [{ key: 'Style', value: '' }, { key: 'Dimensions', value: '' }];

  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(initialSpecs);

  const addVariantRow = () => setVariants([...variants, { sku: '', color: '', color_hex: '#000000', material: '', priceAdjustment: '0', image_url: '', isUploading: false }])
  const updateVariant = (index: number, field: keyof VariantState, value: string | boolean) => {
    setVariants(prev => { const newVariants = [...prev]; /* @ts-ignore */ newVariants[index] = { ...newVariants[index], [field]: value }; return newVariants })
  }
  const removeVariant = (index: number) => setVariants(variants.filter((_, i) => i !== index))

  const handleAddSpec = () => setSpecs([...specs, { key: '', value: '' }])
  const handleRemoveSpec = (index: number) => setSpecs(specs.filter((_, i) => i !== index))
  const handleSpecChange = (index: number, field: 'key' | 'value', val: string) => {
    const newSpecs = [...specs]; newSpecs[index][field] = val; setSpecs(newSpecs)
  }

  const handleImageUpload = async (index: number, file: File) => {
    if (!file) return;
    updateVariant(index, 'isUploading', true);
    const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_PRODUCT_UPLOAD_PRESET!);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) updateVariant(index, 'image_url', data.secure_url);
    } catch (err) { alert("Failed to upload image."); } finally { updateVariant(index, 'isUploading', false); }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const specificationsObject = specs.reduce((acc, curr) => {
      const trimmedKey = curr.key.trim()
      if (trimmedKey) acc[trimmedKey] = curr.value.trim()
      return acc
    }, {} as Record<string, string>)
    formData.append('specifications', JSON.stringify(specificationsObject))

    // Automatically inject dummy stock to appease backend constraints
    const variantsWithDummyStock = variants.map(v => ({ ...v, stock: '999' }))
    const result = await updateProduct(formData, variantsWithDummyStock, product.id)
    
    if (result?.error) { setError(result.error); setIsPending(false); } 
    else { router.push('/admin/inventory'); router.refresh(); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-5 lg:p-8 rounded-2xl shadow-sm border border-stone-200">
      {error && <div className="p-4 bg-red-50 text-red-600 font-medium rounded-xl">{error}</div>}

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Product Title</label>
          <input type="text" name="title" defaultValue={product.title} required className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">URL Slug</label>
            <input type="text" name="slug" defaultValue={product.slug} required className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium" />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Base Price (£)</label>
            <input type="number" step="0.01" inputMode="decimal" name="basePrice" defaultValue={product.base_price || ''} required className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-lg" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Categories</label>
          <div className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl max-h-48 overflow-y-auto space-y-3">
            {categories.map(c => (
              <label key={c.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-stone-100 rounded-lg transition">
                <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={product.product_categories?.some(pc => pc.category_id === c.id)} className="w-5 h-5 rounded border-stone-300 text-orange-500 focus:ring-orange-500" />
                <span className="font-medium text-stone-700">{c.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Description</label>
          <textarea name="description" rows={4} defaultValue={product.description || ''} required className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"></textarea>
        </div>
      </div>

      {/* Specifications */}
      <div className="pt-6 border-t border-stone-100">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Specifications</label>
          <button type="button" onClick={handleAddSpec} className="flex items-center gap-2 text-sm bg-orange-50 text-orange-600 font-bold px-4 py-2 rounded-xl transition hover:bg-orange-100">
            <Plus className="w-4 h-4" /> Add Spec
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {specs.map((spec, index) => (
            <div key={index} className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
              <input type="text" placeholder="Name" value={spec.key} onChange={(e) => handleSpecChange(index, 'key', e.target.value)} className="w-full sm:flex-1 p-3 bg-white border border-stone-200 rounded-lg outline-none font-medium text-sm focus:border-orange-500" />
              <div className="flex w-full sm:flex-[2] gap-2">
                <input type="text" placeholder="Value" value={spec.value} onChange={(e) => handleSpecChange(index, 'value', e.target.value)} className="w-full p-3 bg-white border border-stone-200 rounded-lg outline-none font-medium text-sm focus:border-orange-500" />
                <button type="button" onClick={() => handleRemoveSpec(index)} className="p-3 text-red-500 bg-white border border-stone-200 hover:bg-red-50 rounded-lg transition shrink-0">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Variants */}
      <div className="pt-6 border-t border-stone-100">
        <div className="flex justify-between items-center mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Color Variants</label>
          <button type="button" onClick={addVariantRow} className="text-sm bg-stone-900 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition hover:bg-stone-800">
            <Plus className="w-4 h-4" /> Add Color
          </button>
        </div>
        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={index} className="flex flex-col gap-4 p-5 bg-stone-50 rounded-2xl border border-stone-200 relative">
              {(!variant.id) && (
                <button type="button" onClick={() => removeVariant(index)} className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-100 rounded-lg transition">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pr-10 sm:pr-0">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Color Name</label>
                  <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl p-1.5 focus-within:border-orange-500">
                    <input type="color" value={variant.color_hex} onChange={(e) => updateVariant(index, 'color_hex', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0" />
                    <input type="text" placeholder="e.g. Royal Blue" value={variant.color} onChange={(e) => updateVariant(index, 'color', e.target.value)} required className="w-full p-2 text-sm outline-none font-medium" />
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Material</label>
                  <input type="text" placeholder="e.g. Velvet" value={variant.material} onChange={(e) => updateVariant(index, 'material', e.target.value)} required className="w-full p-3 bg-white border border-stone-200 rounded-xl text-sm font-medium outline-none focus:border-orange-500" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">SKU</label>
                  <input type="text" placeholder="SOFA-BLU" value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value)} required className="w-full p-3 bg-white border border-stone-200 rounded-xl text-sm font-medium outline-none focus:border-orange-500" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">+ Price (£)</label>
                  <input type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={variant.priceAdjustment} onChange={(e) => updateVariant(index, 'priceAdjustment', e.target.value)} className="w-full p-3 bg-white border border-stone-200 rounded-xl text-sm font-bold outline-none focus:border-orange-500" />
                </div>
              </div>

              <div className="relative mt-2">
                <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(index, e.target.files[0]) }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed transition ${variant.image_url ? 'border-green-500 bg-green-50' : 'border-stone-300 bg-white hover:border-orange-500'}`}>
                  {variant.isUploading ? (
                    <div className="flex items-center gap-2 text-stone-500 font-medium"><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</div>
                  ) : variant.image_url ? (
                    <>
                      <img src={variant.image_url} alt="Variant" className="w-12 h-12 object-cover rounded-lg shadow-sm" />
                      <span className="text-green-700 font-bold text-sm">Image Uploaded (Tap to change)</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-6 h-6 text-stone-400" />
                      <span className="font-bold text-stone-600 text-sm">Tap to Change Photo</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-8">
        <button type="submit" disabled={isPending || variants.some((v: any) => v.isUploading)} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-600 transition shadow-lg disabled:opacity-70 flex justify-center items-center gap-2 active:scale-[0.98]">
          {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}