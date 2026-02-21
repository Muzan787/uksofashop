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
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.secure_url) {
        setImageUrl(data.secure_url)
      } else {
        throw new Error('Upload failed')
      }
    } catch (err) {
      alert("Failed to upload image.")
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError('')

    const result = await addCategory(formData, imageUrl)

    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    } else {
      // Reset form on success
      const form = document.getElementById('category-form') as HTMLFormElement
      form.reset()
      setImageUrl('')
      setIsPending(false)
      router.refresh()
    }
  }

  return (
    <form id="category-form" action={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-stone-200">
      <h2 className="text-xl font-bold text-stone-900">Add New Category</h2>
      
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Category Name</label>
          <input type="text" name="name" required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="e.g. Dining Tables" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">URL Slug</label>
          <input type="text" name="slug" required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" placeholder="e.g. dining-tables" />
        </div>
        
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Category Image (Required for Homepage)</label>
          <div className="flex items-center gap-4 bg-stone-50 p-3 rounded-lg border border-stone-200">
            <div className="relative">
              <input 
                type="file" accept="image/*" onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 text-stone-700 font-medium rounded-md hover:bg-stone-50 transition pointer-events-none">
                <ImagePlus className="w-4 h-4" />
                <span className="text-sm">Choose Image</span>
              </div>
            </div>
            {isUploading && <Loader2 className="w-4 h-4 animate-spin text-stone-500" />}
            {imageUrl && !isUploading && (
              <img src={imageUrl} alt="Preview" className="w-12 h-12 object-cover rounded shadow-sm border border-stone-200" />
            )}
          </div>
        </div>
      </div>

      <button type="submit" disabled={isPending || isUploading} className="w-full bg-stone-900 text-white py-2.5 rounded-lg font-bold hover:bg-stone-800 transition disabled:opacity-70 flex justify-center items-center gap-2">
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Category'}
      </button>
    </form>
  )
}