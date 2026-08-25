// src/app/shop/[category]/Skeletons.tsx
//
// Fallbacks for the Suspense boundaries in page.tsx. These live inside the
// page rather than in a route-level loading.tsx on purpose: a loading.tsx
// commits a 200 response before the page's own notFound()/redirect() has run,
// which turned every unknown category into a soft 404. Suspending inside the
// page means the status code is settled first and only the slow parts stream.

const CARD_COUNT = 9

export function ProductGridSkeleton() {
  return (
    <div aria-hidden className="w-full">
      {/* Mirrors the real count line so nothing shifts when results arrive. */}
      <div className="h-4 w-24 bg-[#ede8df] rounded mb-5 animate-pulse" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 mb-10 w-full">
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <div key={i} className="w-full">
            <div className="w-full aspect-square md:aspect-[3/4] bg-[#ede8df] rounded-[10px] mb-3 animate-pulse" />
            <div className="px-1 flex flex-col gap-2">
              <div className="h-3 w-full bg-[#ede8df] rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-[#ede8df] rounded animate-pulse" />
              <div className="h-4 w-14 bg-[#ede8df] rounded mt-1 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FilterSidebarSkeleton() {
  return (
    <div aria-hidden className="w-full flex flex-col gap-5">
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="flex flex-col gap-2.5">
          <div className="h-3 w-20 bg-[#ede8df] rounded animate-pulse" />
          {Array.from({ length: 4 }).map((_, row) => (
            <div key={row} className="h-3 w-full bg-[#ede8df] rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}
