// src/app/admin/reviews/page.tsx
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { approveReview, deleteReview } from '@/app/actions/reviews'
import { CheckCircle, Trash2, Star, MessageSquare, Image as ImageIcon } from 'lucide-react'

export default async function AdminReviewsPage() {
  // Use the Service Role Key to bypass RLS and fetch ALL reviews (pending & approved)
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select(`
      id, rating, comment, image_url, is_approved, created_at,
      product:products ( title )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Review Moderation</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-slate-600 uppercase tracking-wider">
              <th className="p-4">Reviewer & Product</th>
              <th className="p-4">Rating</th>
              <th className="p-4">Comment & Media</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reviews?.map((review: any) => (
              <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-slate-900">Verified Buyer</div>
                  <div className="text-sm text-slate-500 line-clamp-1">
                    On: {review.product?.title || 'General Store'}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 text-amber-500">
                    {review.rating} <Star className="w-4 h-4 fill-current" />
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-600 max-w-xs">
                  <p className="line-clamp-2 mb-2">{review.comment}</p>
                  {review.image_url && (
                    <a href={review.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                      <ImageIcon className="w-3 h-3" /> View Uploaded Image
                    </a>
                  )}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${review.is_approved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}
                  `}>
                    {review.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    {/* Approve Form */}
                    {!review.is_approved && (
                      <form action={approveReview}>
                        <input type="hidden" name="reviewId" value={review.id} />
                        <button type="submit" className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Approve">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      </form>
                    )}
                    
                    {/* Delete Form */}
                    <form action={deleteReview}>
                      <input type="hidden" name="reviewId" value={review.id} />
                      <button type="submit" className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(!reviews || reviews.length === 0) && (
              <tr>
                <td colSpan={5} className="p-12 text-center bg-white">
                  <div className="flex flex-col items-center justify-center">
                    <MessageSquare className="w-12 h-12 text-stone-200 mb-3" />
                    <p className="text-lg font-medium text-stone-900">No reviews to moderate</p>
                    <p className="text-stone-500 mt-1">You're all caught up! Customer reviews will show up here.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}