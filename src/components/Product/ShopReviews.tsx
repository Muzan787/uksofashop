// src/components/Product/ShopReviews.tsx

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SectionHeading from '@/components/UI/SectionHeading';
import ReviewCard from '@/components/UI/ReviewCard';
import { PRODUCT_PAGE_REVIEWS } from '@/constants/socialReviews';

/**
 * Three reviews of the shop on every product page, and the way to the rest.
 *
 * About UK Sofa Shop, not this sofa: the heading says so, and none of them
 * touches the product's own rating or the review count Google reads. The
 * product's own reviews (Reviews.tsx) still follow further down when it has
 * any.
 *
 * Under the photograph on desktop, beside the pinned buy box, so they pass
 * while the price and the button stay in view. On a phone they come after the
 * buy box and the agent and postcode blocks, as a row to swipe, so three
 * cards cost one card's height.
 */
export default function ShopReviews() {
  if (!PRODUCT_PAGE_REVIEWS.length) return null;

  return (
    <section data-journey-section="reviews" aria-label="Reviews of UK Sofa Shop">
      <SectionHeading
        eyebrow="Customer reviews"
        heading="What customers say about us."
        emphasise="us."
        level="section"
        accent="fern"
        className="mb-5 lg:mb-6"
      />

      {/* scroll-px matches px, or the snap lines the first card up with the
          screen edge instead of the page margin. */}
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
        {PRODUCT_PAGE_REVIEWS.map(review => (
          <ReviewCard
            key={review.id}
            review={review}
            compact
            className="w-[85%] shrink-0 snap-start md:w-auto"
          />
        ))}
      </div>

      <Link
        href="/reviews"
        className="hover-link mt-3 inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold text-fern-700 no-underline"
      >
        Read all our reviews
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}
