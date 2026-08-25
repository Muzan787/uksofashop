// src/app/reviews/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Star, BadgeCheck } from 'lucide-react'
import ReviewFormModal from './ReviewFormModal'


export const metadata: Metadata = {
  title: 'Customer Reviews',
  description:
    'Genuine reviews from UK Sofa Shop customers. Every review here comes from someone who actually bought from us.',
  alternates: { canonical: '/reviews' },
}

export default async function ReviewsPage() {
  const supabase = await createClient()

  // Fetch approved reviews and join with products if a product_id exists
  // Also attempting to fetch from a profiles table if you have one linked by user_id
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
            <p className="text-[#57534e]">See what our customers are saying about UK Sofa Shop.</p>
          </div>
          
          <ReviewFormModal isLoggedIn={!!user} />
        </div>
 
        {/* Reviews Grid */}
        {reviews && reviews.length > 0 ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {reviews.map((review) => {
              // Extract the name from wherever it might be saved, or fallback
              const displayName = review.customer_name || 'Anonymous Customer';

              return (
                <div key={review.id} className="break-inside-avoid bg-white p-6 rounded-xl border border-[#f0ede8] shadow-sm">
                  
                  {/* Rating & User */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      {/* Stars */}
                      <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-[#d4871a] text-[#d4871a]' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      
                      {/* Customer Name & Verified Badge */}
                      <p className="text-base font-bold text-[#1c1917]">
                        {displayName}
                      </p>
                      {/* Only where the review is genuinely tied to a delivered
                          order. This badge used to render on every review with
                          nothing behind it - an unverifiable verified-purchase
                          claim, which the DMCC Act 2024 treats as a misleading
                          practice. review.order_id is set only by the signed
                          link in the post-delivery email. */}
                      {review.order_id && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <BadgeCheck className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-[11px] font-bold text-green-600 uppercase tracking-wide">
                            Verified Buyer
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Date */}
                    <span className="text-xs text-[#a8a29e] mt-1">
                      {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-[#44403c] text-sm leading-relaxed mb-4 italic">&quot;{review.comment}&quot;</p>
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
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20 px-6 bg-white rounded-xl border border-[#f0ede8]">
            <div className="w-14 h-14 rounded-full bg-[#fef9f0] border border-[#d4871a]/20 flex items-center justify-center mx-auto mb-5">
              <Star className="w-6 h-6 text-[#d4871a]" />
            </div>
            <h2 className="text-xl font-playfair font-bold text-[#1c1917] mb-2">
              No reviews yet
            </h2>
            <p className="text-[#57534e] text-sm max-w-sm mx-auto leading-relaxed mb-6">
              We&apos;re a new shop, so this page is genuinely empty — every review here
              will come from a real customer. If you&apos;ve bought from us, yours would
              be the first.
            </p>
            {user ? (
              <p className="text-xs text-[#a8a29e]">
                Use the button above to write the first one.
              </p>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-[#d4871a] text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#b67316] transition-colors"
              >
                Sign in to leave a review
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}