// src/app/collection/page.tsx
import { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server'
import { summariseMainCollections } from '@/utils/mainCollections';
import MainCollectionCard from '@/components/Collection/MainCollectionCard';
import CollectionHero from '@/components/Collection/CollectionHero';
import CollectionEmpty from '@/components/Collection/CollectionEmpty';
import { Reveal } from '@/components/Motion';
import { staggerDelay } from '@/components/Motion/tokens';

export const metadata: Metadata = {
  title: 'Collections',
  description:
    'Imported recliners, made-to-order sofas, and what is coming next. Browse every part of the UK Sofa Shop range, with free UK Mainland delivery.',
  alternates: { canonical: '/collection' },
};

/** "2 open now · 3 on the way", and the honest shorter versions of it. */
function summarise(live: number, soon: number): string {
  if (live === 0 && soon === 0) return 'Nothing listed yet';
  const parts: string[] = [];
  if (live > 0) parts.push(`${live} open now`);
  if (soon > 0) parts.push(`${soon} on the way`);
  return parts.join(' · ');
}

export default async function CollectionsIndexPage() {
  const supabase = await createClient();

  // One round trip. The counts, the price anchor and the collage all come off
  // the same embedded products, so the card cannot claim thirteen designs and
  // then price twelve of them.
  const { data: rows } = await supabase
    .from('main_collections')
    .select(`
      id,
      slug,
      name,
      standfirst,
      status,
      position,
      products (
        id,
        title,
        base_price,
        is_active,
        gallery_images,
        variant_group_id,
        variant_groups ( name ),
        product_variants ( image_url, priority )
      )
    `)
    .order('position', { ascending: true })
    .order('priority', { referencedTable: 'products.product_variants', ascending: true });

  const collections = summariseMainCollections(rows);
  const live = collections.filter(c => c.status === 'live').length;
  const soon = collections.length - live;

  return (
    <div className="grad-calico grain-light relative min-h-screen bg-calico-50">
      <CollectionHero
        eyebrow="The range"
        title="Start with the part of the shop you need."
        standfirst="Imported recliners held in stock, sofas we build to your room, and the rooms we are opening next. Each one opens onto its ranges and every design inside them."
        summary={summarise(live, soon)}
        trail={[
          { href: '/', label: 'Home' },
          { href: '/shop/all', label: 'Shop' },
          { label: 'Collections' },
        ]}
      />

      <div className="relative mx-auto max-w-shell px-4 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-10">
        {collections.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {collections.map((collection, i) => (
              // h-full so the card can fill the grid row rather than sitting
              // at its own content height — see the note on FRAME.
              <Reveal key={collection.id} delay={staggerDelay(i)} distance={20} amount={0.12} className="h-full">
                <MainCollectionCard collection={collection} />
              </Reveal>
            ))}
          </div>
        ) : (
          <CollectionEmpty
            title="No collections available"
            body="We are currently putting the range together. In the meantime, every sofa is available on its own."
            ctaLabel="Shop individual sofas"
          />
        )}
      </div>
    </div>
  );
}
