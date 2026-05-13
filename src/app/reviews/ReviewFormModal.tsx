'use client'
// src/app/reviews/ReviewFormModal.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitGlobalReview } from '@/app/actions/reviews'
import { uploadToCloudinary } from '@/app/actions/upload'
import { Star, X, Loader2, ImagePlus } from 'lucide-react'

export default function ReviewFormModal({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const handleOpen = () => {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    const formData = new FormData(e.currentTarget)
    formData.append('rating', rating.toString())

    try {
      let imageUrl = null;
      if (file) {
        imageUrl = await uploadToCloudinary(file)
      }

      const result = await submitGlobalReview(formData, imageUrl)
      
      if (result.error) {
        setMessage({ text: result.error, type: 'error' })
      } else {
        setMessage({ text: 'Thank you! Your review is pending approval.', type: 'success' })
        setTimeout(() => setIsOpen(false), 3000) // Close after 3 seconds
      }
    } catch (err) {
      setMessage({ text: 'Something went wrong. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={handleOpen} className="bg-[#1c1917] text-white px-6 py-3 rounded-lg text-sm font-bold tracking-wider uppercase hover:bg-[#d4871a] transition-colors">
        Write a Review
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 relative shadow-2xl">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-playfair font-bold mb-6">Share Your Experience</h2>
            
            {message.text && (
              <div className={`p-3 mb-4 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star Rating */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                      <Star className={`w-8 h-8 ${star <= rating ? 'fill-[#d4871a] text-[#d4871a]' : 'text-gray-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your Review</label>
                <textarea name="comment" required rows={4} className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#d4871a] outline-none" placeholder="What did you love about your purchase?" />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Add a Photo (Optional)</label>
                <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <ImagePlus className="text-gray-400 w-6 h-6" />
                  <span className="text-sm text-gray-500">{file ? file.name : 'Click to upload an image'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-[#d4871a] text-white py-3 rounded-lg font-bold tracking-wider uppercase text-sm hover:bg-[#b8721a] transition-colors flex justify-center items-center gap-2 mt-4">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}