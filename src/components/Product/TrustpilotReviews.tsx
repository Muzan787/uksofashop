// src/components/Product/TrustpilotReviews.tsx

import { ArrowUpRight } from 'lucide-react';
import SectionHeading from '@/components/UI/SectionHeading';
import TrustBox from '@/components/UI/TrustBox';
import { TRUSTPILOT_PROFILE_URL, TRUSTPILOT_WIDGETS_ENABLED } from '@/constants/trustpilot';

/**
 * The shop's 5-star Trustpilot reviews, on every product page.
 *
 * Shop-wide, not about this sofa: Trustpilot reviews the business, so this
 * sits beside the product's own reviews (Reviews.tsx) rather than inside them,
 * and feeds nothing into the product's rating.
 *
 * Filtered to five stars at Muaz's request on 2026-10-25. That is allowed
 * because Trustpilot's carousel says so itself ("Showing our 5 star reviews")
 * and keeps the real TrustScore and count beside them - 4.2 from 11 that day,
 * one of them a 1-star. Covering that, or setting our own score next to it,
 * would be the cherry-picking the DMCC Act bans. The link to every review is
 * part of the same bargain: the bad one is one tap away.
 *
 * Nothing renders until NEXT_PUBLIC_TRUSTPILOT_WIDGETS is on, and the switch
 * must wait for a paid Trustpilot plan: on Free the carousel draws only a
 * logo (see constants/trustpilot.ts).
 */
export default function TrustpilotReviews() {
  if (!TRUSTPILOT_WIDGETS_ENABLED) return null;

  return (
    <section data-journey-section="reviews" aria-label="Trustpilot reviews" className="mb-12 lg:mb-16">
      <SectionHeading
        eyebrow="Independent reviews"
        heading="Reviewed on Trustpilot."
        emphasise="Trustpilot."
        level="section"
        accent="fern"
        className="mb-6 lg:mb-8"
      />

      <div className="rounded-md border border-fern-500/30 bg-fern-50 px-4 py-5 sm:px-6">
        <TrustBox kind="carousel" stars="5" />
      </div>

      <a
        href={TRUSTPILOT_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hover-link mt-3 inline-flex min-h-11 items-center gap-1.5 text-body-sm text-ink-500 no-underline"
      >
        Read every review on Trustpilot
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-fern-500" />
      </a>
    </section>
  );
}
