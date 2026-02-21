// src/app/shop/[category]/[slug]/loading.tsx

export default function ProductLoading() {
  return (
    <main className="min-h-screen bg-white text-slate-900 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-10 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Image Gallery Skeleton */}
          <div className="relative aspect-square bg-stone-200 rounded-2xl"></div>

          {/* Product Details Skeleton */}
          <div className="flex flex-col justify-center">
            <div className="h-10 bg-stone-200 rounded-lg w-3/4 mb-4"></div>
            <div className="h-8 bg-stone-200 rounded-lg w-1/4 mb-8"></div>

            {/* Variant Swatches Skeleton */}
            <div className="mt-4">
              <div className="h-4 bg-stone-200 rounded w-32 mb-4"></div>
              <div className="flex flex-wrap gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-12 h-12 rounded-full bg-stone-200"></div>
                ))}
              </div>
            </div>

            {/* Description Skeleton */}
            <div className="mt-8 space-y-3">
              <div className="h-4 bg-stone-200 rounded w-full"></div>
              <div className="h-4 bg-stone-200 rounded w-full"></div>
              <div className="h-4 bg-stone-200 rounded w-5/6"></div>
              <div className="h-4 bg-stone-200 rounded w-4/6"></div>
            </div>

            {/* Button Skeleton */}
            <div className="mt-10 h-14 bg-stone-200 rounded-xl w-full"></div>
          </div>
        </div>
      </div>
    </main>
  )
}