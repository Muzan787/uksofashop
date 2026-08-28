// src/components/Product/ProductRow.tsx

import { STAGGER_CAP, STAGGER_STEP } from '@/components/Motion';
import SectionHeading from '@/components/UI/SectionHeading';
import ProductCard from './ProductCard';

export interface RowItem {
  id: string;
  title: string;
  href: string;
  image: string | null;
  price: number;
}

interface Props {
  /** The heading. Split by word and wiped up from behind a mask. */
  title: string;
  /** The mono label above it. */
  eyebrow: string;
  /** One word in the title that carries the panned ember gradient. */
  emphasise?: string;
  items: RowItem[];
  /**
   * Off where the same product can appear in two rows on one page — a
   * view-transition-name has to be unique in the document or the browser
   * drops the transition entirely.
   */
  transition?: boolean;
}

/**
 * A band of product cards, used by both rows at the foot of the page.
 *
 * Calico 100 rather than a rule: the product detail above is on Calico 50, and
 * a change of ground separates the two more quietly than a border does — the
 * eye reads "different kind of thing" without anything being drawn.
 *
 * On a phone it is a snapped carousel with the next card peeking, which is the
 * only honest way to say "there is more to the right". At md it becomes four
 * across and the flex and snap properties go inert on their own.
 *
 * Renders NOTHING when there is nothing to show — not an empty heading over a
 * blank strip, which is what a row backed by browser storage would otherwise
 * do on a first visit.
 */
export default function ProductRow({ title, eyebrow, emphasise, items, transition = true }: Props) {
  if (!items.length) return null;

  return (
    <section
      aria-labelledby={headingId(title)}
      className="grain-light section-y relative bg-calico-100"
      style={{ ['--fade-from' as string]: 'var(--color-calico-100)' }}
    >
      <div className="relative mx-auto max-w-shell px-4 sm:px-6">
        {/* The site's one section heading — eyebrow over an ember rule, the
            title wiped up word by word, and a hairline that fades out toward
            the right margin. These two rows carried a bare h2 and were the
            last thing on a product page still drawn the old way. */}
        <SectionHeading
          eyebrow={eyebrow}
          heading={title}
          emphasise={emphasise}
          level="section"
          className="mb-6 lg:mb-8"
        />

        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="w-[72vw] shrink-0 snap-start sm:w-[44vw] md:w-auto"
            >
              <ProductCard
                id={item.id}
                title={item.title}
                // The card declares slug but does not render it; the href is
                // what it actually links with.
                slug={item.href.split('/').pop() ?? item.id}
                price={item.price}
                href={item.href}
                image={item.image}
                transition={transition}
                // 70ms apart, capped so the last card in a row of eight is not
                // held back half a second before it appears.
                delayMs={Math.min(i, STAGGER_CAP) * STAGGER_STEP * 1000}
              />
            </div>
          ))}
        </div>

        <span aria-hidden="true" className="rail-fade rail-fade-end md:hidden" />
      </div>
    </section>
  );
}

function headingId(title: string): string {
  return `row-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}
