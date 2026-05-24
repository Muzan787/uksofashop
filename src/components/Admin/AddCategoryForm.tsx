// src/components/Admin/AddCategoryForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addCategory } from '@/app/actions/categories'
import { Loader2, ImagePlus } from 'lucide-react'

export default function AddCategoryForm() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_PRODUCT_UPLOAD_PRESET!)

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST', body: formData,
      })
      const data = await res.json()
      if (data.secure_url) setImageUrl(data.secure_url)
      else throw new Error('Upload failed')
    } catch (err) { alert("Failed to upload image.") } finally { setIsUploading(false) }
  }

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError('')
    const result = await addCategory(formData, imageUrl)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    } else {
      const form = document.getElementById('category-form') as HTMLFormElement
      form.reset()
      setImageUrl('')
      setIsPending(false)
      router.refresh()
    }
  }

  return (
    <form id="category-form" action={handleSubmit} className="space-y-6 bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-stone-200">
      <h2 className="text-xl font-bold text-stone-900 tracking-tight">Add New Category</h2>
      
      {error && <div className="p-4 bg-red-50 text-red-600 font-medium rounded-xl text-sm">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Category Name</label>
          <input type="text" name="name" required className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium" placeholder="e.g. Corner Sofas" />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">URL Slug</label>
          <input type="text" name="slug" required className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium" placeholder="e.g. corner-sofas" />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Thumbnail Image</label>
          <div className="relative">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <div className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed transition ${imageUrl ? 'border-green-500 bg-green-50' : 'border-stone-300 bg-stone-50 hover:border-orange-500'}`}>
              {isUploading ? (
                <div className="flex items-center gap-2 text-stone-500 font-medium"><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</div>
              ) : imageUrl ? (
                <>
                  <img src={imageUrl} alt="Preview" className="w-10 h-10 object-cover rounded-lg shadow-sm" />
                  <span className="text-green-700 font-bold text-sm">Image Uploaded</span>
                </>
              ) : (
                <>
                  <ImagePlus className="w-5 h-5 text-stone-400" />
                  <span className="font-bold text-stone-600 text-sm">Tap to Upload Image</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <button type="submit" disabled={isPending || isUploading} className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-bold hover:bg-stone-800 transition shadow-md disabled:opacity-70 flex justify-center items-center gap-2 active:scale-[0.98]">
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Category'}
      </button>
    </form>
  )
}