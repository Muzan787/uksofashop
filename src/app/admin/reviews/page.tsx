// src/app/admin/reviews/page.tsx
export const dynamic = 'force-dynamic';

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { approveReview, deleteReview } from '@/app/actions/reviews'
import { Check, Trash2, Star, MessageSquare, Image as ImageIcon } from 'lucide-react'

export default async function AdminReviewsPage() {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select(`id, rating, comment, image_url, is_approved, created_at, product:products ( title )`)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-stone-900 tracking-tight">Review Moderation</h1>
        <p className="text-sm text-stone-500 mt-1">Approve or delete customer testimonials.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {reviews?.map((review: any) => (
          <div key={review.id} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-200 flex flex-col sm:flex-row gap-4 sm:gap-6">
            
            {/* Review Content */}
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-stone-200'}`} />
                      ))}
                    </div>
                    {review.is_approved ? (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest">Live</span>
                    ) : (
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest">Pending</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-stone-900">Verified Buyer</p>
                  <p className="text-xs text-stone-500">Product: {review.product?.title || 'General Store'}</p>
                </div>
              </div>

              <div className="bg-stone-50 p-4 rounded-xl text-sm text-stone-700 italic border border-stone-100">
                "{review.comment}"
              </div>

              {review.image_url && (
                <a href={review.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition">
                  <ImageIcon className="w-4 h-4" /> View Customer Photo
                </a>
              )}
            </div>

            {/* Action Buttons (Ergonomic Stack) */}
            <div className="flex sm:flex-col gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-stone-100 sm:pl-6 shrink-0 justify-end">
              {!review.is_approved && (
                <form action={approveReview} className="flex-1 sm:flex-none">
                  <input type="hidden" name="reviewId" value={review.id} />
                  <button type="submit" className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-stone-800 active:scale-95 transition">
                    <Check className="w-4 h-4" /> Approve
                  </button>
                </form>
              )}
              
              <form action={deleteReview} className="flex-1 sm:flex-none">
                <input type="hidden" name="reviewId" value={review.id} />
                <button type="submit" className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition active:scale-95 ${review.is_approved ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </form>
            </div>

          </div>
        ))}

        {(!reviews || reviews.length === 0) && (
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