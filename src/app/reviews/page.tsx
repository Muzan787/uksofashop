// src/app/reviews/page.tsx
import type { Metadata } from 'next'
import { pageMetadata } from '@/utils/pageMetadata'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Star, BadgeCheck } from 'lucide-react'
import ReviewFormModal from './ReviewFormModal'
import EditorialSchema from '@/components/Editorial/EditorialSchema'
import VideoStrip from '@/components/UI/VideoStrip'
import ReviewCard from '@/components/UI/ReviewCard'
import { CUSTOMER_REVIEWS } from '@/constants/socialReviews'


const DESCRIPTION =
  'Genuine reviews from UK Sofa Shop customers. Every review here comes from someone who actually bought from us.'

export const metadata: Metadata = pageMetadata({
  title: 'Customer Reviews',
  description: DESCRIPTION,
  path: '/reviews',
})

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

  // Clips customers sent us of their sofas in place. The product's name
  // stands in for a caption where none was written.
  const { data: clips } = await supabase
    .from('videos')
    .select('id, url, caption, width, height, product:products(title)')
    .eq('kind', 'customer')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(12)

  const customerVideos = (clips ?? []).map(v => ({
    id: v.id,
    url: v.url,
    caption: v.caption || (v.product as { title: string } | null)?.title || null,
    width: v.width,
    height: v.height,
  }))

  const { data: { user } } = await supabase.auth.getUser()

  const siteReviews = reviews ?? []
  const total = siteReviews.length + CUSTOMER_REVIEWS.length

  return (
    <div className="min-h-screen bg-calico-50 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      {/* CollectionPage rather than Article: this is a list of other
          people's writing, not ours. The individual ratings are already
          marked up per product where they belong, so no aggregateRating is
          claimed here - one on a page that mixes products would be an
          average of unrelated things, and much of what is here carries no
          rating at all. */}
      <EditorialSchema
        type="CollectionPage"
        headline="Customer Reviews"
        path="/reviews"
        updated="2026-10-25"
        description={DESCRIPTION}
      />

      <div className="max-w-shell mx-auto">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 lg:mb-16">
          <div>
            <p className="eyebrow m-0 mb-3 flex items-center gap-3 text-fern-700">
              <span aria-hidden="true" className="block h-px w-8 bg-fern-500" />
              {total > 0 ? `${total} reviews` : 'Reviews'}
            </p>
            <h1 className="text-h1 font-display font-bold text-ink-900 mb-2">
              Customer Reviews
            </h1>
            <p className="text-ink-500">See what our customers are saying about UK Sofa Shop.</p>
          </div>

          <ReviewFormModal isLoggedIn={!!user} />
        </div>

        <VideoStrip
          videos={customerVideos}
          eyebrow="In customers' homes"
          heading="Delivered and in place."
          emphasise="place."
          fallbackTitle="A sofa in a customer's home"
          className="mb-12 lg:mb-16"
        />

        {/* Reviews Grid */}
        {total > 0 ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
            {siteReviews.map((review) => {
              // Extract the name from wherever it might be saved, or fallback
              const displayName = review.customer_name || 'Anonymous Customer';
              // PostgREST returns an embedded to-one relation as an object,
              // but types it as either shape depending on the foreign keys it
              // can see. Narrowed once here rather than cast to `any` twice
              // at the point of use.
              const product = Array.isArray(review.product) ? review.product[0] : review.product;

              return (
                <div key={review.id} className="mb-6 break-inside-avoid bg-white p-6 rounded-md border border-calico-300 border-t-[3px] border-t-fern-500 shadow-e1">

                  {/* Rating & User */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      {/* Stars */}
                      <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            aria-hidden="true"
                            className={`w-4 h-4 ${i < review.rating ? 'fill-fern-500 text-fern-500' : 'fill-none text-calico-300'}`}
                          />
                        ))}
                        <span className="sr-only">Rated {review.rating} out of 5</span>
                      </div>

                      {/* Customer Name & Verified Badge */}
                      <p className="text-body font-bold text-ink-900">
                        {displayName}
                      </p>
                      {/* Only where the review is genuinely tied to a delivered
                          order. This badge used to render on every review with
                          nothing behind it - an unverifiable verified-purchase
                          claim, which the DMCC Act 2024 treats as a misleading
                          practice. review.order_id is set only by the signed
                          link in the post-delivery email. */}
                      {review.order_id && (
                        <div className="flex items-center gap-1 mt-1">
                          <BadgeCheck className="w-3.5 h-3.5 text-fern-700" />
                          <span className="eyebrow font-bold text-fern-700 tracking-wide">
                            Verified Buyer
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <span className="text-caption text-ink-500 mt-1">
                      {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-ink-700 text-body-sm leading-relaxed mb-4 italic">&quot;{review.comment}&quot;</p>
                  )}

                  {/* Optional Image */}
                  {review.image_url && (
                    <div className="mb-4 rounded-sm overflow-hidden border border-gray-100">
                      <Image
                        src={review.image_url}
                        alt={`Sofa bought by ${displayName}`}
                        width={600}
                        height={600}
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  {/* Product Link Snippet */}
                  {product && (
                    <div className="pt-4 mt-4 border-t border-calico-300">
                      <Link href={`/shop/all/${product.slug}`} className="text-caption font-semibold text-fern-700 hover:underline flex items-center gap-1">
                        View {product.title} →
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}

            {CUSTOMER_REVIEWS.map(review => (
              <ReviewCard key={review.id} review={review} className="mb-6 break-inside-avoid" />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6 bg-white rounded-sm border border-calico-300">
            <div className="w-14 h-14 rounded-pill bg-fern-50 border border-fern-500/20 flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 text-fern-700" />
            </div>
            <h2 className="text-h3 font-display font-bold text-ink-900 mb-2">
              No reviews yet
            </h2>
            <p className="text-ink-500 text-body-sm max-w-sm mx-auto leading-relaxed mb-6">
              We&apos;re a new shop, so this page is genuinely empty — every review here
              will come from a real customer. If you&apos;ve bought from us, yours would
              be the first.
            </p>
            {user ? (
              <p className="text-caption text-ink-500">
                Use the button above to write the first one.
              </p>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-ember-500 text-ink-900 px-6 py-3 rounded-sm eyebrow font-bold tracking-widest hover:bg-ember-700 hover:text-calico-50 transition-colors"
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
