// src/app/checkout/loading.tsx
//
// Safe here because nothing under /checkout calls notFound() or redirect().
//
// Deliberately NOT added to /collection: /collection/[slug] does call
// notFound(), and a loading boundary commits a 200 before that runs, turning
// every unknown collection into a soft 404 that Google indexes. Same reason
// the /shop loading files were removed.

import Skeleton from '@/components/UI/Skeleton';

export default function Loading() {
  return (
    <div aria-hidden className="min-h-screen bg-calico-50 px-4 py-8">
      <div className="mx-auto max-w-[960px]">
        <Skeleton className="mb-8 h-8 w-40 rounded-sm" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-sm" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
