// src/app/not-found.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, Search, Sofa } from 'lucide-react';

// The 404 status alone keeps this out of the index, but the explicit noindex
// covers the case where a soft 404 is served with a 200.
export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center bg-calico-50 px-6 text-center animate-in fade-in duration-settle">
      
      {/* Icon & 404 Header */}
      <div className="w-20 h-20 bg-white rounded-pill shadow-e1 border border-calico-300 flex items-center justify-center mb-6 text-ember-700">
        <Sofa className="w-10 h-10" />
      </div>
      
      <h1 className="font-display text-display-l md:text-8xl font-black text-ink-900 mb-4 tracking-tight">
        404
      </h1>
      
      <h2 className="text-h2 md:text-h1 font-bold text-ink-900 mb-4">
        We can&apos;t find that page
      </h2>
      
      <p className="text-ink-500 max-w-md mx-auto mb-8 text-lead">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link 
          href="/" 
          className="flex items-center justify-center gap-2 px-8 py-4 bg-ink-900 text-white rounded-sm font-bold hover:bg-black transition active:scale-95 shadow-e2"
        >
          <Home className="w-5 h-5" /> 
          Back to Homepage
        </Link>
        
        <Link 
          href="/shop/all" 
          className="flex items-center justify-center gap-2 px-8 py-4 bg-white border border-calico-300 text-ink-900 rounded-sm font-bold hover:bg-stone-50 hover:border-stone-300 transition active:scale-95 shadow-e1"
        >
          <Search className="w-5 h-5" /> 
          Browse All Sofas
        </Link>
      </div>

    </div>
  );
}