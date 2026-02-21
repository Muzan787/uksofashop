// src/components/Product/ReviewForm.tsx
'use client'

import { useState } from 'react'
import { submitReview } from '@/app/actions/reviews'
import { Star, Loader2, CheckCircle } from 'lucide-react'

export default function ReviewForm({ productId }: { productId: string }) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [rating, setRating] = useState(5)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError('')
    
    // Add rating manually since it's controlled by UI stars, not a standard input
    formData.append('rating', rating.toString())

    const result = await submitReview(formData, productId)

    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    } else if (result?.success) {
      setSuccess(true)
      setIsPending(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 p-6 rounded-xl border border-green-100 flex flex-col items-center text-center">
        <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
        <h4 className="text-lg font-bold text-green-900 mb-1">Thank you for your review!</h4>
        <p className="text-green-700 text-sm">Your review has been submitted and is pending approval.</p>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="bg-stone-50 p-6 rounded-xl border border-stone-200 space-y-4">
      <h3 className="text-lg font-bold text-stone-900">Write a Review</h3>
      
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="focus:outline-none"
            >
              <Star 
                className={`w-6 h-6 ${rating >= star ? 'text-amber-500 fill-amber-500' : 'text-stone-300'}`} 
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Your Name</label>
        <input 
          type="text" 
          name="customerName" 
          required 
          className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" 
          placeholder="John Doe" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Your Review</label>
        <textarea 
          name="comment" 
          rows={3} 
          required 
          className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none" 
          placeholder="What did you think about this sofa?"
        ></textarea>
      </div>

      <button 
        type="submit" 
        disabled={isPending} 
        className="bg-stone-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-stone-800 transition disabled:opacity-70 flex items-center gap-2"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit Review
      </button>
    </form>
  )
}