// src/components/Home/CollectionShowcase.tsx

import CollectionCard from '@/components/Product/CollectionCard';
import { Reveal } from '@/components/Motion';
import { staggerDelay } from '@/components/Motion/tokens';
import SectionHeading from '@/components/UI/SectionHeading';

export interface HomeCollection {
  id: string;
  name: string;
  slug: string;
  minPrice: number;
  maxPrice: number;
  images: string[];
  pieceCount?: number;
}

/**
 * Matching sets, as a rail on a phone and a grid on desktop.
 *
 * This lived inline in HomeClient with its own hand-rolled heading — a
 * differently sized h2, a differently placed link and no eyebrow rule — which
 * is one of the four heading treatments SectionHeading exists to collapse.
 *
 * It sits on the lighter calico ground directly after the ink figures band. The
 * page alternates dark and light the whole way down, and three consecutive
 * light sections in the middle is what made that stretch read as one
 * undifferentiated block on the build this replaces.
 *
 * The rail runs to the viewport edge on the right and is faded there rather
 * than cut, so the row says it continues instead of appearing to have been
 * cropped by the container. From `sm` it becomes a two-up grid and there is no
 * overflow left to fade, which is why the fade carries `sm:hidden`.
 */
export default function CollectionShowcase({ collections }: { collections: HomeCollection[] }) {
  if (collections.length === 0) return null;

  return (
    <section
      className="grain-light section-y relative bg-calico-50"
      style={{ ['--fade-from' as string]: 'var(--color-calico-50)' }}
    >
      <div className="relative mx-auto max-w-shell px-4 sm:px-6">
        <SectionHeading
          eyebrow="Complete sets"
          heading="Buy the whole room at once."
          emphasise="room"
          standfirst="Sofa, loveseat and armchair in the same fabric and the same frame — priced as a set and delivered in one visit."
          href="/collection"
          linkLabel="All collections"
        />
      </div>

      <div className="relative">
        <div className="mx-auto max-w-shell pl-4 sm:px-6">
          <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-4 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pr-0 lg:gap-6">
            {collections.map((col, i) => (
              <Reveal
                key={col.id}
                delay={staggerDelay(i)}
                distance={22}
                amount={0.12}
                className="w-[84vw] shrink-0 snap-start sm:w-auto"
              >
                <CollectionCard {...col} />
              </Reveal>
            ))}
          </div>
        </div>

        <span aria-hidden="true" className="rail-fade rail-fade-end sm:hidden" />
      </div>
    </section>
  );
}
