// src/app/admin/reviews/page.tsx
export const dynamic = 'force-dynamic'

import { createClient as createAdmin } from '@supabase/supabase-js'
import { approveReview, deleteReview } from '@/app/actions/reviews'
import { CheckCircle, Trash2, Star, MessageSquare, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const ACCENT = '#d4871a'

export default async function AdminReviewsPage() {
  const supabase = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, customer_name, rating, comment, image_url, status, is_approved, created_at, product:products(id, title, slug)')
    .order('created_at', { ascending: false })

  const pending   = reviews?.filter((r: any) => !r.is_approved).length || 0
  const approved  = reviews?.filter((r: any) => r.is_approved).length || 0

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1c1917', letterSpacing: '-0.02em' }}>Reviews</h1>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ padding: '3px 10px', background: '#fef9ec', borderRadius: 20, fontSize: 11, color: '#b45309', fontWeight: 700 }}>⏳ {pending} Pending</span>
          <span style={{ padding: '3px 10px', background: '#f0fdf4', borderRadius: 20, fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✓ {approved} Approved</span>
        </div>
      </div>

      {(!reviews || reviews.length === 0) ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e2da', padding: '60px 20px', textAlign: 'center' }}>
          <MessageSquare style={{ width: 36, height: 36, color: '#d6d3d1', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1c1917', marginBottom: 4 }}>No reviews yet</p>
          <p style={{ fontSize: 12, color: '#a8a29e' }}>Customer reviews will appear here for moderation.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map((review: any) => (
            <div key={review.id} style={{
              background: '#fff', borderRadius: 12,
              border: `1px solid ${review.is_approved ? '#e8e2da' : '#fde68a'}`,
              borderLeft: `3px solid ${review.is_approved ? '#16a34a' : '#d97706'}`,
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', gap: 16, padding: '16px 20px', flexWrap: 'wrap' }}>

                {/* Left: Meta */}
                <div style={{ minWidth: 160, flex: '0 0 auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{(review.customer_name || 'A').charAt(0).toUpperCase()}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1917' }}>{review.customer_name || 'Buyer'}</span>
                  </div>
                  {/* Stars */}
                  <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} style={{ width: 12, height: 12, fill: s <= review.rating ? ACCENT : '#e7e5e4', color: s <= review.rating ? ACCENT : '#e7e5e4' }} />
                    ))}
                  </div>
                  {/* Product link */}
                  {review.product && (
                    <div style={{ fontSize: 10, color: '#a8a29e' }}>
                      On: <span style={{ color: '#57534e', fontWeight: 600 }}>{review.product.title}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: '#d6d3d1', marginTop: 4 }}>
                    {new Date(review.created_at).toLocaleDateString('en-GB')}
                  </div>
                </div>

                {/* Middle: Comment */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.7, margin: 0 }}>{review.comment}</p>
                  {review.image_url && (
                    <a href={review.image_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 11, color: '#2563eb', textDecoration: 'none' }}>
                      <ExternalLink style={{ width: 11, height: 11 }} /> View photo
                    </a>
                  )}
                </div>

                {/* Right: Status + Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                  <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: review.is_approved ? '#f0fdf4' : '#fef9ec', color: review.is_approved ? '#16a34a' : '#b45309' }}>
                    {review.is_approved ? 'Approved' : 'Pending'}
                  </span>
                  <div style={{ display: 'flex', gap: 7 }}>
                    {!review.is_approved && (
                      <form action={approveReview}>
                        <input type="hidden" name="reviewId" value={review.id} />
                        <button type="submit"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, cursor: 'pointer', color: '#16a34a', fontSize: 11, fontWeight: 700, transition: 'all 0.15s' }}>
                          <CheckCircle style={{ width: 12, height: 12 }} /> Approve
                        </button>
                      </form>
                    )}
                    <form action={deleteReview}>
                      <input type="hidden" name="reviewId" value={review.id} />
                      <button type="submit"
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 8px', background: 'transparent', border: '1px solid #e8e2da', borderRadius: 7, cursor: 'pointer', color: '#d6d3d1', transition: 'all 0.15s' }}
                        onMouseEnter={(e: any) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}
                        onMouseLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d6d3d1'; e.currentTarget.style.borderColor = '#e8e2da'; }}
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}