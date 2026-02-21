// src/app/shop/[category]/loading.tsx

export default function CategoryLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-10 animate-pulse">
      {/* Title Skeleton */}
      <div className="h-10 bg-stone-200 rounded-lg w-64 mb-8"></div>
      
      <div className="flex flex-col md:flex-row">
        {/* Sidebar Skeleton */}
        <aside className="w-full md:w-64 flex-shrink-0 pr-8 mb-8 md:mb-0">
          <div className="h-6 bg-stone-200 rounded w-24 mb-6"></div>
          {[1, 2].map((section) => (
            <div key={section} className="mb-8">
              <div className="h-4 bg-stone-200 rounded w-20 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-stone-200"></div>
                    <div className="h-4 bg-stone-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Product Grid Skeleton */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="group">
              <div className="aspect-square bg-stone-200 rounded-xl mb-4"></div>
              <div className="h-5 bg-stone-200 rounded w-3/4 mb-2"></div>
              <div className="h-5 bg-stone-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}