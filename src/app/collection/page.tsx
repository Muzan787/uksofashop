// src/app/collections/page.tsx
import { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { ChevronRight, PackageSearch } from 'lucide-react';
import CollectionCard from '@/components/Product/CollectionCard';

export const metadata: Metadata = {
  title: 'All Collections | UK Sofa Shop',
  description: 'Browse our complete range of handcrafted British sofa collections and sets.',
  alternates: { canonical: '/collections' },
};

export default async function CollectionsIndexPage() {
  const supabase = await createClient();

  const { data: groupsData } = await supabase
    .from('variant_groups')
    .select(`
      id,
      name,
      slug,
      products (
        id,
        base_price,
        is_active,
        gallery_images,
        product_variants ( image_url, priority )
      )
    `)
    .order('name', { ascending: true })
    // Add this to sort the nested variants!
    .order('priority', { referencedTable: 'products.product_variants', ascending: true });

  const collectionsData = (groupsData || [])
    .map((group: any) => {
      const activeProducts = group.products?.filter((p: any) => p.is_active) || [];
      if (activeProducts.length === 0) return null;

      const prices = activeProducts.map((p: any) => p.base_price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // --- SMART IMAGE SELECTION ALGORITHM ---
      const selectedImages: string[] = [];
      const usedImages = new Set<string>();

      // Pass 1: Try to get 1 primary image from EACH distinct product
      activeProducts.forEach((p: any) => {
        let imgToUse = null;
        if (p.product_variants?.[0]?.image_url) {
          imgToUse = p.product_variants[0].image_url;
        } else if (p.gallery_images?.[0]) {
          imgToUse = p.gallery_images[0];
        }

        if (imgToUse && !usedImages.has(imgToUse)) {
          selectedImages.push(imgToUse);
          usedImages.add(imgToUse);
        }
      });

      // Pass 2: If we still don't have 3 images, backfill with extra variants or gallery images
      if (selectedImages.length < 3) {
        for (const p of activeProducts) {
          if (Array.isArray(p.product_variants)) {
            for (const v of p.product_variants) {
              if (v.image_url && !usedImages.has(v.image_url) && selectedImages.length < 3) {
                selectedImages.push(v.image_url);
                usedImages.add(v.image_url);
              }
            }
          }
          if (Array.isArray(p.gallery_images)) {
            for (const img of p.gallery_images) {
              if (!usedImages.has(img) && selectedImages.length < 3) {
                selectedImages.push(img);
                usedImages.add(img);
              }
            }
          }
          if (selectedImages.length >= 3) break;
        }
      }

      return {
        id: group.id,
        name: group.name,
        slug: group.slug,
        minPrice,
        maxPrice,
        images: selectedImages.slice(0, 3) 
      };
    })
    .filter(Boolean) as any[];

  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      
      {/* ── HEADER SECTION ── */}
      <div className="relative bg-[#0c0c0b] overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-600 via-stone-900 to-black" />
        
        <div className="relative max-w-[1100px] mx-auto px-4 pt-10 pb-10 sm:py-16">
          <nav className="flex items-center gap-1.5 mb-4 flex-wrap">
            {[['/', 'Home'], ['/shop/all', 'Shop']].map(([href, label]) => (
              <span key={href} className="flex items-center gap-1.5">
                <Link href={href} className="text-[11px] text-white/40 no-underline hover:text-white transition-colors">
                  {label}
                </Link>
                <span className="text-white/20 text-[10px]">›</span>
              </span>
            ))}
            <span className="text-[11px] text-[#d4871a] font-semibold">Collections</span>
          </nav>
          
          <div className="text-[9px] text-[#d4871a] uppercase tracking-[0.22em] font-bold mb-2">
            Curated Sets
          </div>
          <h1 className="font-playfair text-[clamp(28px,6vw,48px)] font-bold text-white leading-tight">
            All Collections
          </h1>
          <p className="text-white/50 text-xs sm:text-sm mt-3 max-w-md leading-relaxed">
            Discover our curated sets of handcrafted British sofas. Designed to completely transform your living space.
          </p>
        </div>
        <div className="h-[2px] bg-[#d4871a]" />
      </div>

      {/* ── COLLECTIONS GRID ── */}
      <div className="max-w-[1100px] mx-auto px-4 py-10 pb-24">
        {collectionsData && collectionsData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {collectionsData.map((collection, i) => (
              <div 
                key={collection.id}
                style={{ opacity: 0, animation: `fadeUp 0.4s ease ${i * 50}ms forwards` }}
              >
                <CollectionCard {...collection} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-5 text-center bg-white rounded-xl border border-[#f0ede8]">
            <PackageSearch className="w-9 h-9 text-stone-300 mb-3.5" />
            <h3 className="text-[17px] font-bold text-stone-900 mb-2">No collections available</h3>
            <p className="text-xs text-stone-500 max-w-[300px] mb-5 leading-relaxed">
              We are currently designing new sets. Please check back soon.
            </p>
            <Link href="/shop/all" className="inline-flex items-center gap-1.5 bg-[#d4871a] text-white px-5 py-2.5 rounded-lg text-[11px] font-bold no-underline tracking-widest uppercase hover:bg-[#b67316] transition-colors">
              Shop Individual Sofas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}