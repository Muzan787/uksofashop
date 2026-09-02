// src/app/collection/page.tsx
import { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server'
import { summariseCollections } from '@/utils/collections';
import CollectionCard from '@/components/Product/CollectionCard';
import CollectionHero from '@/components/Collection/CollectionHero';
import CollectionEmpty from '@/components/Collection/CollectionEmpty';
import { Reveal } from '@/components/Motion';
import { staggerDelay } from '@/components/Motion/tokens';

export const metadata: Metadata = {
  title: 'All Collections',
  description: 'Browse our complete range of sofa collections and sets, with free UK Mainland delivery.',
  alternates: { canonical: '/collection' },
};

/** "6 collections · from £529", and the honest shorter versions of it. */
function summarise(count: number, from: number | null): string {
  if (count === 0) return 'No collections yet';
  const sets = `${count} ${count === 1 ? 'collection' : 'collections'}`;
  if (from === null) return sets;
  return `${sets} · from £${Math.round(from).toLocaleString('en-GB')}`;
}

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

  // Counted from what is actually on the page rather than asserted, so the
  // header cannot drift from the grid underneath it.
  const cheapest = collectionsData.length
    ? Math.min(...collectionsData.map(c => c.minPrice).filter(n => Number.isFinite(n) && n > 0))
    : null;

  return (
    <div className="grad-calico grain-light relative min-h-screen bg-calico-50">
      <CollectionHero
        eyebrow="Curated sets"
        title="Buy the whole room at once."
        standfirst="Sofa, loveseat and armchair in the same fabric and the same frame — priced as a set and delivered in one visit."
        summary={summarise(collectionsData.length, Number.isFinite(cheapest as number) ? cheapest : null)}
        trail={[
          { href: '/', label: 'Home' },
          { href: '/shop/all', label: 'Shop' },
          { label: 'Collections' },
        ]}
      />

      <div className="relative mx-auto max-w-shell px-4 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-10">
        {collectionsData.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {collectionsData.map((collection, i) => (
              // The shared reveal, not an inline `opacity: 0` plus a locally
              // redeclared keyframe. That pattern renders the whole grid
              // invisible and waits for an animation to bring it back, which is
              // the one thing the motion vocabulary says a primitive may never
              // do — and the keyframe it declared was already in globals.css.
              <Reveal key={collection.id} delay={staggerDelay(i)} distance={20} amount={0.12}>
                <CollectionCard {...collection} />
              </Reveal>
            ))}
          </div>
        ) : (
          <CollectionEmpty
            title="No collections available"
            body="We are currently putting new sets together. In the meantime, every sofa is available on its own."
            ctaLabel="Shop individual sofas"
          />
        )}
      </div>
    </div>
  );
}
