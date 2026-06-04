// src/app/not-found.tsx
import Link from 'next/link';
import { Home, Search, Sofa } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center bg-[#f8f6f2] px-6 text-center animate-in fade-in duration-700">
      
      {/* Icon & 404 Header */}
      <div className="w-20 h-20 bg-white rounded-full shadow-sm border border-[#e7e5e4] flex items-center justify-center mb-6 text-[#d4871a]">
        <Sofa className="w-10 h-10" />
      </div>
      
      <h1 className="font-playfair text-6xl md:text-8xl font-black text-[#1c1917] mb-4 tracking-tight">
        404
      </h1>
      
      <h2 className="text-2xl md:text-3xl font-bold text-[#1c1917] mb-4">
        We can't find that page
      </h2>
      
      <p className="text-[#57534e] max-w-md mx-auto mb-10 text-lg">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link 
          href="/" 
          className="flex items-center justify-center gap-2 px-8 py-4 bg-[#1c1917] text-white rounded-xl font-bold hover:bg-black transition active:scale-95 shadow-md"
        >
          <Home className="w-5 h-5" /> 
          Back to Homepage
        </Link>
        
        <Link 
          href="/shop/all" 
          className="flex items-center justify-center gap-2 px-8 py-4 bg-white border border-[#e7e5e4] text-[#1c1917] rounded-xl font-bold hover:bg-stone-50 hover:border-stone-300 transition active:scale-95 shadow-sm"
        >
          <Search className="w-5 h-5" /> 
          Browse All Sofas
        </Link>
      </div>

    </div>
  );
}