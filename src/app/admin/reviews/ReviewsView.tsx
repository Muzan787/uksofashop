// src/app/admin/reviews/ReviewsView.tsx
//
// Reviews (admin upgrade J1-J3), given what page.tsx loaded. Each review: its
// stars, read out as "4 out of 5"; who wrote it and whether it came through a
// real order's review link; the text and any photo; links to the product in
// the shop and to the order; a Test tag when the order was a test. Publish,
// Hide from the shop, or Delete (which asks first).
import Link from 'next/link'
import { AlertCircle, BadgeCheck, CheckCircle2, ExternalLink, Eye, EyeOff, Image as ImageIcon, MessageSquare, Star, Trash2 } from 'lucide-react'
import { approveReview, deleteReview, hideReview } from '@/app/actions/reviews'
import ConfirmSubmit from '@/components/Admin/ConfirmSubmit'
import { shortCode } from '@/app/admin/orders/OrderBits'
import { canonicalProductPath } from '@/utils/productUrl'
import { dualTimeText } from '@/utils/adminTime'

export type ReviewRow = {
  id: string
  rating: number
  comment: string | null
  customer_name: string | null
  image_url: string | null
  order_id: string | null
  is_approved: boolean
  created_at: string
  products: { title: string; slug: string; categories: unknown; product_categories: unknown } | null
}

const button = 'flex min-h-11 w-full items-center justify-center gap-2 rounded-sm px-4 text-sm font-bold transition active:scale-95 disabled:opacity-60'

export default function ReviewsView({ reviews, testOrders, knownOrders, done, failed, loadError }: {
  reviews: ReviewRow[]
  /** Orders behind these reviews that were tests. */
  testOrders: string[]
  /** Orders behind these reviews that still exist, so the link goes somewhere. */
  knownOrders: string[]
  done: string | null
  failed: boolean
  loadError: string | null
}) {

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in duration-500 lg:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 lg:text-3xl">Reviews</h1>
        <p className="mt-1 text-sm text-stone-600">
          Publish genuine reviews, good or bad. Hide or delete only spam, abuse or private details.
        </p>
      </div>

      {done && (
        <p role="status" className="m-0 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> {done}
        </p>
      )}
      {(failed || loadError) && (
        <div role="alert" className="flex items-start gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="m-0 text-sm font-semibold">{loadError ? `Could not load reviews: ${loadError}` : "That didn't save. Try again."}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {reviews.map(review => {
          // is_approved is the table's only approval flag: true is in the shop.
          const isLive = review.is_approved === true
          const product = review.products
          const productHref = product?.slug
            ? canonicalProductPath(product as Parameters<typeof canonicalProductPath>[0])
            : null
          const isTest = review.order_id ? testOrders.includes(review.order_id) : false

          return (
            <div key={review.id} className="flex flex-col gap-4 rounded-md border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:gap-6 sm:p-6">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex text-amber-500" role="img" aria-label={`${review.rating} out of 5`}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-stone-200'}`} aria-hidden="true" />
                    ))}
                  </div>
                  <span className={`rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${isLive ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                    {isLive ? 'In the shop' : 'Not in the shop'}
                  </span>
                  {isTest && (
                    <span className="rounded-pill border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-800">Test</span>
                  )}
                </div>

                <div>
                  <p className="m-0 text-base font-bold text-stone-900">{review.customer_name || 'Anonymous customer'}</p>
                  {/* Which reviews came through the signed link in a
                      post-delivery email, and which arrived some other way. */}
                  {review.order_id ? (
                    <p className="m-0 mt-0.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-green-600">
                      <BadgeCheck className="h-3.5 w-3.5 text-green-500" aria-hidden="true" /> Verified buyer
                    </p>
                  ) : (
                    <p className="m-0 mt-0.5 text-[11px] font-bold uppercase tracking-wide text-stone-400">Unverified</p>
                  )}
                  {review.created_at && <p className="m-0 mt-1 text-xs text-stone-400">Sent {dualTimeText(review.created_at)}</p>}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {productHref ? (
                    <a href={productHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-stone-700 underline">
                      {product?.title} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="inline-flex min-h-11 items-center text-stone-500">{product?.title ?? 'The shop in general'}</span>
                  )}
                  {review.order_id && knownOrders.includes(review.order_id) && (
                    <Link href={`/admin/orders/${review.order_id}`} className="inline-flex min-h-11 items-center font-semibold text-stone-700 underline">
                      Order #{shortCode(review.order_id)}
                    </Link>
                  )}
                </div>

                <p className="m-0 whitespace-pre-line break-words rounded-sm border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700">
                  {review.comment?.trim() || <span className="text-stone-400">No text, just the stars.</span>}
                </p>

                {review.image_url && (
                  <a href={review.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-blue-50 px-3 text-xs font-bold text-blue-600 transition hover:bg-blue-100">
                    <ImageIcon className="h-4 w-4" aria-hidden="true" /> View customer photo
                  </a>
                )}
              </div>

              <div className="flex shrink-0 gap-2 border-t border-stone-100 pt-4 sm:w-44 sm:flex-col sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                <form action={isLive ? hideReview : approveReview} className="flex-1 sm:flex-none">
                  <input type="hidden" name="reviewId" value={review.id} />
                  <ConfirmSubmit className={isLive ? `${button} border border-stone-300 bg-white text-stone-700 hover:border-stone-500` : `${button} bg-stone-900 text-white hover:bg-stone-800`}>
                    {isLive ? <><EyeOff className="h-4 w-4" aria-hidden="true" /> Hide from the shop</> : <><Eye className="h-4 w-4" aria-hidden="true" /> Publish</>}
                  </ConfirmSubmit>
                </form>
                <form action={deleteReview} className="flex-1 sm:flex-none">
                  <input type="hidden" name="reviewId" value={review.id} />
                  <ConfirmSubmit
                    question={`Delete ${review.customer_name || 'this'}'s review for good? Hide it instead if you might want it back.`}
                    className={`${button} bg-red-50 text-red-700 hover:bg-red-100`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                  </ConfirmSubmit>
                </form>
              </div>
            </div>
          )
        })}

        {reviews.length === 0 && !loadError && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-stone-200 bg-white px-4 py-16 text-center shadow-sm">
            <MessageSquare className="mb-4 h-12 w-12 text-stone-300" aria-hidden="true" />
            <p className="m-0 text-xl font-bold text-stone-900">No reviews yet</p>
            <p className="m-0 mt-1 text-stone-500">Reviews customers write appear here before they show in the shop.</p>
          </div>
        )}
      </div>
    </div>
  )
}
