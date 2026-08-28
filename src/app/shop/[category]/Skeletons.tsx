// src/app/shop/[category]/Skeletons.tsx
//
// Fallbacks for the Suspense boundaries in page.tsx. These live inside the
// page rather than in a route-level loading.tsx on purpose: a loading.tsx
// commits a 200 response before the page's own notFound()/redirect() has run,
// which turned every unknown category into a soft 404. Suspending inside the
// page means the status code is settled first and only the slow parts stream.

import Skeleton, { CardSkeleton } from '@/components/UI/Skeleton'

const CARD_COUNT = 9

/**
 * The grid's placeholder, built to the real card's measurements.
 *
 * It matters that these agree. The old skeleton drew a square well on mobile
 * and 3:4 above it, against a card that is 4:5 everywhere, and left out the
 * swatch row entirely — so every listing jumped as the products arrived. Each
 * block below is the same size as the thing it stands in for: the 4:5 well,
 * two lines of 16px title, the 17px price, and the 16px swatch dots.
 */
export function ProductGridSkeleton() {
  return (
    <div aria-hidden className="w-full">
      {/* The count line above the grid. */}
      <Skeleton className="mb-4 h-4 w-24 rounded-sm" />

      <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function FilterSidebarSkeleton() {
  return (
    <div aria-hidden className="flex w-full flex-col gap-6">
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="flex flex-col gap-3">
          <Skeleton className="h-3 w-20 rounded-sm" />
          {Array.from({ length: 4 }).map((_, row) => (
            <Skeleton key={row} className="h-3 w-full rounded-sm" />
          ))}
        </div>
      ))}
    </div>
  )
}
