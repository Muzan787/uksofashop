// src/app/showroom/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { Store, ArrowLeft, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Our Showroom | Vantage Group LTD',
  description: 'Information about the upcoming Vantage Group LTD physical showroom in the United Kingdom.',
};

export default function ShowroomPage() {
  return (
    <div className="min-h-[75vh] bg-[#f8f6f2] flex flex-col items-center justify-center px-4 py-20 text-center animate-in fade-in duration-700">
      
      {/* Icon Badge */}
      <div className="w-20 h-20 bg-white rounded-full shadow-sm border border-[#e7e5e4] flex items-center justify-center mb-6 text-[#d4871a]">
        <Store className="w-10 h-10" />
      </div>
      
      <h1 className="text-4xl md:text-6xl font-playfair font-bold text-[#1c1917] mb-4">
        Showroom Coming Soon
      </h1>
      
      <div className="flex items-center justify-center gap-2 text-[#d4871a] font-bold text-sm tracking-widest uppercase mb-6">
        <MapPin className="w-4 h-4" /> United Kingdom
      </div>

      <p className="text-lg text-[#57534e] max-w-2xl mx-auto mb-10 leading-relaxed">
        We are currently preparing an exclusive physical space where you can experience the supreme comfort and premium craftsmanship of our made-to-order sofas in person. 
        <br /><br />
        We are still working on this—please visit us in the near future for updates on our grand opening. Until then, our entire catalog is available to explore and purchase online!
      </p>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
        <Link 
          href="/shop/all" 
          className="flex items-center justify-center gap-2 bg-[#1c1917] text-white px-8 py-4 rounded-xl font-bold hover:bg-black transition active:scale-95 shadow-md"
        >
          Explore Online Catalog
        </Link>

        <Link 
          href="/" 
          className="flex items-center justify-center gap-2 bg-white border border-[#e7e5e4] text-[#1c1917] px-8 py-4 rounded-xl font-bold hover:bg-stone-50 transition active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" /> Return Home
        </Link>
      </div>

    </div>
  );
}