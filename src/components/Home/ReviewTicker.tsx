// src/components/Home/ReviewTicker.tsx

import Link from 'next/link';
import { Star, BadgeCheck, ArrowRight, Quote } from 'lucide-react';
import { Marquee, Reveal } from '@/components/Motion';
import SectionHeading from '@/components/UI/SectionHeading';

export interface HomeReview {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string | null;
  /** True where the review is attached to a real order. */
  verified: boolean;
  productTitle?: string | null;
}

/** Reviews are signed with a first name, not a full one. */
function firstName(name: string | null): string {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first || 'A customer';
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${n <= rating ? 'fill-ember-500 text-ember-500' : 'text-calico-300'}`}
        />
      ))}
      <span className="sr-only">{rating} out of 5</span>
    </span>
  );
}

/**
 * The homepage review ticker.
 *
 * The three testimonials that used to sit here were invented and were removed
 * rather than re-worded, which left the homepage with no social proof at all.
 * These are real approved reviews or nothing.
 *
 * Below three, the section becomes an invitation instead. A ticker carrying two
 * cards loops visibly every few seconds and advertises how few there are — a
 * quiet ask reads better and is honest about where the shop is.
 *
 * The track is faded at both edges rather than clipped. A marquee that stops
 * dead at the viewport edge looks like an overflow bug; one that dissolves into
 * the ground reads as a band passing behind the page.
 */
export default function ReviewTicker({ reviews }: { reviews: HomeReview[] }) {
  if (reviews.length < 3) {
    return (
      <section
        aria-label="Customer reviews"
        className="grain-light section-y relative bg-calico-100"
      >
        <div className="relative mx-auto max-w-read px-4 text-center sm:px-6">
          <Reveal distance={12} amount={0.3}>
            <p className="eyebrow m-0 flex items-center justify-center gap-3 text-ember-700">
              <span aria-hidden="true" className="block h-px w-8 bg-ember-500" />
              Reviews
              <span aria-hidden="true" className="block h-px w-8 bg-ember-500" />
            </p>
          </Reveal>

          <Reveal delay={0.1} distance={16} amount={0.3}>
            <h2 className="m-0 mt-4 font-display text-h1 font-semibold leading-tight text-ink-900">
              Be the first to say how it went.
            </h2>
            <p className="mx-auto mt-5 max-w-[46ch] text-body text-ink-500">
              We are a new shop and we would rather show you nothing than show
              you something we made up. If you have bought from us, a couple of
              lines about how the delivery went would help the next person
              decide.
            </p>
            <Link
              href="/reviews"
              className="hover-btn sheen btn-ember shadow-ember mt-9 inline-flex h-14 items-center gap-3 rounded-pill bg-ember-500 px-8 text-body font-semibold text-ink-900 no-underline"
            >
              Leave a review
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Customer reviews"
      className="grain-light section-y relative bg-calico-100"
      style={{ ['--fade-from' as string]: 'var(--color-calico-100)' }}
    >
      <div className="relative mx-auto mb-10 max-w-shell px-4 sm:px-6">
        <SectionHeading
          eyebrow="Reviews"
          heading="In their own words."
          emphasise="words"
          href="/reviews"
          linkLabel="All reviews"
          className="mb-0"
        />
      </div>

      {/* Marquee handles the accessible copy, the duplicate track and the pause
          on hover and focus — see the primitive for why each matters. */}
      <div className="relative">
        <Marquee duration={70} gap="1.5rem">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="relative flex w-[300px] shrink-0 flex-col rounded-md border border-calico-300 bg-calico-50 p-6 shadow-e1 sm:w-[360px]"
            >
              {/* A quote mark, large and pale, behind the top corner. It is the
                  only decoration on the card and it stops a wall of identical
                  bordered boxes reading as a table. */}
              <Quote
                aria-hidden="true"
                className="absolute right-4 top-4 h-10 w-10 text-calico-200"
                strokeWidth={1.5}
              />

              <div className="relative flex items-center gap-3">
                <Stars rating={review.rating} />
                {review.verified && (
                  <span className="flex items-center gap-1 font-data text-caption text-sage-700">
                    <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </div>

              <p className="relative m-0 mt-4 line-clamp-4 text-body-sm leading-relaxed text-ink-700">
                {review.comment}
              </p>

              <span aria-hidden="true" className="mt-5 block h-px w-10 bg-ember-500" />

              <p className="m-0 mt-3 text-caption text-ink-500">
                <span className="font-semibold text-ink-900">
                  {firstName(review.customerName)}
                </span>
                {review.productTitle && <> · {review.productTitle}</>}
              </p>
            </article>
          ))}
        </Marquee>

        <span aria-hidden="true" className="rail-fade rail-fade-start" />
        <span aria-hidden="true" className="rail-fade rail-fade-end" />
      </div>

      <div className="mx-auto mt-8 max-w-shell px-4 sm:hidden sm:px-6">
        <Link
          href="/reviews"
          className="hover-link inline-flex items-center gap-1.5 text-body-sm text-ink-500 no-underline"
        >
          All reviews
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
