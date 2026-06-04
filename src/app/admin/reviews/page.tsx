// src/app/admin/reviews/page.tsx
export const dynamic = 'force-dynamic';

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { approveReview, deleteReview } from '@/app/actions/reviews'
import { Check, Trash2, Star, MessageSquare, Image as ImageIcon, AlertCircle, BadgeCheck } from 'lucide-react'

export default async function AdminReviewsPage() {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: reviews, error } = await supabaseAdmin
    .from('reviews')
    .select('*, products(title)')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-stone-900 tracking-tight">Review Moderation</h1>
        <p className="text-sm text-stone-500 mt-1">Approve or delete customer testimonials.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-sm">Database Error</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {reviews?.map((review: any) => {
          const isLive = review.is_approved === true || review.status === 'approved'

          return (
            <div key={review.id} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-200 flex flex-col sm:flex-row gap-4 sm:gap-6">
              
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    {/* Stars and Status Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-stone-200'}`} />
                        ))}
                      </div>
                      {isLive ? (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest">Live</span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest">Pending</span>
                      )}
                    </div>

                    {/* Customer Name and Verified Tick */}
                    <div className="mb-2">
                      <p className="text-base font-bold text-stone-900">
                        {review.customer_name || 'Anonymous Customer'}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <BadgeCheck className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-[11px] font-bold text-green-600 uppercase tracking-wide">
                          Verified Buyer
                        </span>
                      </div>
                    </div>

                    {/* Product Name */}
                    <p className="text-xs text-stone-500 font-medium">
                      Product: {review.products?.title || 'General Store'}
                    </p>
                  </div>
                </div>

                {/* Review Text */}
                <div className="bg-stone-50 p-4 rounded-xl text-sm text-stone-700 italic border border-stone-100">
                  "{review.comment}"
                </div>

                {/* Optional Image */}
                {review.image_url && (
                  <a href={review.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition">
                    <ImageIcon className="w-4 h-4" /> View Customer Photo
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-stone-100 sm:pl-6 shrink-0 justify-end">
                {!isLive && (
                  <form action={approveReview} className="flex-1 sm:flex-none">
                    <input type="hidden" name="reviewId" value={review.id} />
                    <button type="submit" className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-stone-800 active:scale-95 transition">
                      <Check className="w-4 h-4" /> Approve
                    </button>
                  </form>
                )}
                
                <form action={deleteReview} className="flex-1 sm:flex-none">
                  <input type="hidden" name="reviewId" value={review.id} />
                  <button type="submit" className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition active:scale-95 ${isLive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </form>
              </div>

            </div>
          )
        })}

        {(!reviews || reviews.length === 0) && !error && (
          <div className="py-16 flex flex-col items-center justify-center bg-white rounded-3xl border border-stone-200 shadow-sm">
            <MessageSquare className="w-12 h-12 text-stone-300 mb-4" />
            <p className="text-xl font-bold text-stone-900">No reviews yet</p>
            <p className="text-stone-500 mt-1">Customer feedback will appear here for moderation.</p>
          </div>
        )}
      </div>
    </div>
  )
}