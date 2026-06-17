// src/components/Product/CollectionCard.tsx
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

interface CollectionCardProps {
  name: string;
  slug: string;
  minPrice: number;
  maxPrice: number;
  images: string[];
}

export default function CollectionCard({ name, slug, minPrice, maxPrice, images }: CollectionCardProps) {
  // Format price range (If a collection only has 1 item, it just shows one price)
  const priceDisplay = minPrice === maxPrice 
    ? `£${minPrice.toFixed(0)}` 
    : `£${minPrice.toFixed(0)} - £${maxPrice.toFixed(0)}`;

  // Ensure we have exactly 3 images for the collage format. 
  // If the collection has fewer than 3 images, it safely repeats the available ones.
  const displayImages = [
    images[0] || '/placeholder.svg',
    images[1] || images[0] || '/placeholder.svg',
    images[2] || images[0] || '/placeholder.svg'
  ];

  return (
    <Link 
      href={`/collection/${slug}`} 
      className="group relative block w-full aspect-square rounded-[14px] overflow-hidden bg-stone-100 shadow-sm active:scale-[0.98] transition-transform duration-200"
    >
      {/* ── COLLAGE GRID ── */}
      <div className="grid grid-cols-3 grid-rows-2 gap-1 h-full w-full bg-white">
        
        {/* Main Large Image (Left 2/3) */}
        <div className="col-span-2 row-span-2 relative h-full w-full overflow-hidden bg-stone-100">
          <Image 
            src={displayImages[0]} 
            alt={`${name} main`} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 66vw, 33vw"
          />
        </div>
        
        {/* Top Right Small Image */}
        <div className="col-span-1 row-span-1 relative h-full w-full overflow-hidden bg-stone-100">
          <Image 
            src={displayImages[1]} 
            alt={`${name} detail 1`} 
            fill 
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            sizes="(max-width: 768px) 33vw, 16vw"
          />
        </div>
        
        {/* Bottom Right Small Image */}
        <div className="col-span-1 row-span-1 relative h-full w-full overflow-hidden bg-stone-100">
          <Image 
            src={displayImages[2]} 
            alt={`${name} detail 2`} 
            fill 
            className="object-cover group-hover:scale-110 transition-transform duration-700 delay-75"
            sizes="(max-width: 768px) 33vw, 16vw"
          />
        </div>

      </div>

      {/* ── GRADIENT OVERLAY ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />

      {/* ── TEXT & CTA ── */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 flex items-end justify-between">
        <div className="pr-4">
          <h3 className="font-playfair text-white text-[19px] sm:text-2xl font-bold leading-tight tracking-wide drop-shadow-md">
            {name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[#d4871a] font-bold text-[13px] sm:text-sm tracking-wide">
              {priceDisplay}
            </span>
          </div>
        </div>
        
        {/* Little interactive arrow button */}
        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 group-hover:bg-[#d4871a] group-hover:text-white transition-all duration-300 group-hover:scale-110">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}