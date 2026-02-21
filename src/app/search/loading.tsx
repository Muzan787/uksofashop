// src/app/search/loading.tsx

export default function SearchLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-10 min-h-screen animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8 border-b border-stone-200 pb-8">
        <div className="h-10 bg-stone-200 rounded-lg w-96 mb-3"></div>
        <div className="h-4 bg-stone-200 rounded w-32"></div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="group block">
            <div className="aspect-square bg-stone-200 rounded-xl mb-4"></div>
            <div className="h-5 bg-stone-200 rounded w-3/4 mb-2"></div>
            <div className="h-5 bg-stone-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    </main>
  )
}