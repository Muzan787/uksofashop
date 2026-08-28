// src/app/collection/page.tsx
import { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server'
import { summariseCollections } from '@/utils/collections';
import Link from 'next/link';
import { ChevronRight, PackageSearch } from 'lucide-react';
import CollectionCard from '@/components/Product/CollectionCard';

export const metadata: Metadata = {
  title: 'All Collections',
  description: 'Browse our complete range of sofa collections and sets, with free UK Mainland delivery.',
  alternates: { canonical: '/collection' },
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

  const collectionsData = summariseCollections(groupsData);

  return (
    <div className="min-h-screen bg-calico-50">
      
      {/* ── HEADER SECTION ── */}
      <div className="relative bg-ink-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-600 via-stone-900 to-black" />
        
        <div className="relative max-w-shell mx-auto px-4 pt-8 pb-8 sm:py-16">
          <nav className="flex items-center gap-2 mb-4 flex-wrap">
            {[['/', 'Home'], ['/shop/all', 'Shop']].map(([href, label]) => (
              <span key={href} className="flex items-center gap-2">
                <Link href={href} className="text-caption text-calico-300 no-underline hover:text-calico-50 transition-colors">
                  {label}
                </Link>
                <span className="text-calico-300/50 text-caption">›</span>
              </span>
            ))}
            <span className="text-caption text-ember-300 font-semibold">Collections</span>
          </nav>
          
          <div className="eyebrow text-ember-300 tracking-[0.22em] font-bold mb-2">
            Curated Sets
          </div>
          <h1 className="font-display text-h1 font-bold text-white leading-tight">
            All Collections
          </h1>
          <p className="text-white/50 text-caption sm:text-body-sm mt-3 max-w-md leading-relaxed">
            Discover our curated sets. Designed to completely transform your living space.
          </p>
        </div>
        <div className="h-[2px] bg-ember-500" />
      </div>

      {/* ── COLLECTIONS GRID ── */}
      <div className="max-w-shell mx-auto px-4 py-8 pb-24">
        {collectionsData && collectionsData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {collectionsData.map((collection, i) => (
              <div 
                key={collection.id}
                style={{ opacity: 0, animation: `fadeUp var(--dur-base) var(--ease-out-expo) ${i * 50}ms forwards` }}
              >
                <CollectionCard {...collection} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-sm border border-calico-300">
            <PackageSearch className="w-9 h-9 text-stone-300 mb-4" />
            <h2 className="text-body font-bold text-ink-900 mb-2">No collections available</h2>
            <p className="text-caption text-stone-500 max-w-[300px] mb-4 leading-relaxed">
              We are currently designing new sets. Please check back soon.
            </p>
            <Link href="/shop/all" className="inline-flex items-center gap-2 bg-ember-500 text-ink-900 px-4 py-3 rounded-sm eyebrow font-bold no-underline tracking-widest hover:bg-ember-700 hover:text-calico-50 transition-colors">
              Shop Individual Sofas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}