// src/components/UI/ReviewCard.tsx
//
// One review gathered from elsewhere (constants/socialReviews.ts). The full
// card on /reviews, the compact one - no photo, the quote clamped - on every
// product page.

import Image from 'next/image'
import { BadgeCheck, Quote } from 'lucide-react'
import Stars from '@/components/Product/Stars'
import type { SocialReview } from '@/constants/socialReviews'

// UTC, because the product page renders this on the server and again in the
// visitor's browser: a date-only string read in two time zones can come out a
// day apart, and the two renders then disagree.
const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/**
 * Stars where the customer gave some, a quote mark where they didn't - never
 * a rating chosen for them. No card says where its review came from, at
 * Muaz's request (2026-10-26, and 2026-10-31 for the last of them); where
 * each was said is recorded in constants/socialReviews.ts.
 */
export default function ReviewCard({ review, compact = false, className = '' }: {
  review: SocialReview
  compact?: boolean
  className?: string
}) {
  const name = review.name ?? 'A customer'

  return (
    <figure className={`m-0 overflow-hidden rounded-md border border-calico-300 border-t-[3px] border-t-fern-500 bg-white shadow-e1 ${className}`}>
      {!compact && review.photo && (
        <Image
          src={review.photo.src}
          alt={review.photo.alt}
          width={review.photo.width}
          height={review.photo.height}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          // Capped, because the tallest of these filled a whole phone screen
          // before the customer's words began.
          className="block h-auto max-h-[22rem] w-full object-cover"
        />
      )}

      <div className={compact ? 'p-5' : 'p-6'}>
        <div className="flex items-center justify-between gap-3">
          {review.rating ? (
            <Stars rating={review.rating} size="lg" />
          ) : (
            <Quote aria-hidden="true" className="h-6 w-6 text-fern-500" strokeWidth={1.75} />
          )}
          {review.date && (
            <time dateTime={review.date} className="shrink-0 font-data text-caption tabular-nums text-ink-500">
              {DATE.format(new Date(review.date))}
            </time>
          )}
        </div>

        {review.prompt && (
          <p className="m-0 mt-3 text-caption italic text-ink-500">
            We asked: &ldquo;{review.prompt}&rdquo;
          </p>
        )}

        <blockquote className={`m-0 mt-3 text-body-sm leading-relaxed text-ink-700 ${compact ? 'line-clamp-5' : ''}`}>
          &ldquo;{review.quote}{review.truncated ? '…' : ''}&rdquo;
        </blockquote>

        <figcaption className="mt-5 border-t border-calico-300 pt-4">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-body-sm font-semibold text-ink-900">{name}</span>
            {/* Only where the reviewer matches a delivered order of ours -
                see constants/socialReviews.ts. */}
            {review.verified && (
              <span className="flex items-center gap-1 font-data text-caption text-fern-700">
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Verified buyer
              </span>
            )}
          </span>
        </figcaption>
      </div>
    </figure>
  )
}
