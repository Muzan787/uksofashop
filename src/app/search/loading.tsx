// src/app/search/loading.tsx

import Skeleton, { CardSkeleton } from '@/components/UI/Skeleton';

export default function SearchLoading() {
  return (
    <main aria-hidden className="mx-auto mt-8 min-h-screen max-w-shell px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-calico-300 pb-8">
        <Skeleton className="mb-3 h-10 w-full max-w-96 rounded-sm" />
        <Skeleton className="h-4 w-32 rounded-sm" />
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
