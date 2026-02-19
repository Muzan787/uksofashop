// src/app/admin/reviews/page.tsx
import { createClient } from '@/utils/supabase/server'
import { approveReview, deleteReview } from '@/app/actions/reviews'
import { CheckCircle, Trash2, Star } from 'lucide-react'

export default async function AdminReviewsPage() {
  const supabase = await createClient()

  // Fetch all reviews, including the product title they belong to
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id, customer_name, rating, comment, status, created_at,
      products ( title )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Review Moderation</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-slate-600 uppercase tracking-wider">
              <th className="p-4">Customer & Product</th>
              <th className="p-4">Rating</th>
              <th className="p-4">Comment</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reviews?.map((review) => (
              <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-slate-900">{review.customer_name}</div>
                  <div className="text-sm text-slate-500 line-clamp-1">On: {review.products?.title}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 text-amber-500">
                    {review.rating} <Star className="w-4 h-4 fill-current" />
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-600 max-w-xs">
                  <p className="line-clamp-2">{review.comment}</p>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${review.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}
                  `}>
                    {review.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    {/* Approve Form */}
                    {review.status === 'pending' && (
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
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No reviews found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}