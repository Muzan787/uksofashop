// src/app/reviews/page.tsx
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Star } from 'lucide-react'
import ReviewFormModal from './ReviewFormModal' // We will create this client component next

export default async function ReviewsPage() {
  const supabase = await createClient()

  // Fetch approved reviews and join with products if a product_id exists
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      product:products(title, slug)
    `)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-[#f8f6f2] pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-playfair font-bold text-[#1c1917] mb-2">
              Customer Reviews
            </h1>
            <p className="text-[#57534e]">See what our customers are saying about UK Sofashop LTD.</p>
          </div>
          
          <ReviewFormModal isLoggedIn={!!user} />
        </div>

        {/* Reviews Grid */}
        {reviews && reviews.length > 0 ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="break-inside-avoid bg-white p-6 rounded-xl border border-[#f0ede8] shadow-sm">
                
                {/* Rating & User */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-[#d4871a] text-[#d4871a]' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-[#1c1917]">Verified Buyer</span>
                  </div>
                  <span className="text-xs text-[#a8a29e]">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Comment */}
                {review.comment && (
                  <p className="text-[#44403c] text-sm leading-relaxed mb-4">{review.comment}</p>
                )}

                {/* Optional Image */}
                {review.image_url && (
                  <div className="mb-4 rounded-lg overflow-hidden border border-gray-100">
                    <img src={review.image_url} alt="Customer review" className="w-full h-auto object-cover" />
                  </div>
                )}

                {/* Product Link Snippet */}
                {review.product && (
                  <div className="pt-4 mt-4 border-t border-[#f0ede8]">
                    <Link href={`/shop/all/${(review.product as any).slug}`} className="text-xs font-semibold text-[#d4871a] hover:underline flex items-center gap-1">
                      View {(review.product as any).title} →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-[#f0ede8]">
            <p className="text-[#a8a29e]">No reviews yet. Be the first to share your experience!</p>
          </div>
        )}
      </div>
    </div>
  )
}