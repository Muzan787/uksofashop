// src/app/checkout/loading.tsx
//
// Safe here because nothing under /checkout calls notFound() or redirect().
//
// Deliberately NOT added to /collection: /collection/[slug] does call
// notFound(), and a loading boundary commits a 200 before that runs, turning
// every unknown collection into a soft 404 that Google indexes. Same reason
// the /shop loading files were removed.

export default function Loading() {
  return (
    <div aria-hidden className="min-h-screen bg-[#f8f6f2] px-4 py-10">
      <div className="max-w-[960px] mx-auto">
        <div className="h-8 w-40 bg-[#ede8df] rounded mb-8 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-[#ede8df] rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-72 bg-[#ede8df] rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}
