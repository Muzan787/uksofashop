'use client';
// src/app/shop/[category]/ProductGridClient.tsx

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import ProductCard from '@/components/Product/ProductCard';
import { loadMoreProducts } from '@/app/actions/listing';
import type { GridCard, SortKey } from './productQuery';

interface Props {
  initial: GridCard[];
  /** Everything matching, across all pages. */
  total: number;
  /** The page already on screen. "Load more" asks for the one after it. */
  page: number;
  categorySlug: string;
  style?: string;
  material?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: SortKey;
}

/** Columns at each breakpoint, so the diagonal knows where a card sits. */
const COLUMNS = { base: 2, md: 3, lg: 4 };

/**
 * The grid, and the button that grows it.
 *
 * Numbered pagination is still rendered by the server component around this
 * one — see ProductGrid — because a crawler needs real hrefs to reach page
 * four, and an appended page has no URL. This is the human's route through the
 * same rows; the two coexist rather than one replacing the other.
 */
export default function ProductGridClient({
  initial, total, page, categorySlug, style, material, color, minPrice, maxPrice, sort,
}: Props) {
  const [cards, setCards] = useState(initial);
  const [nextPage, setNextPage] = useState(page + 1);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  // Where the cards on screen already run past the first page — because
  // somebody landed on ?page=3 — `page` is that page, and everything before it
  // was never fetched. The count is what is on screen, not page × perPage.
  const remaining = Math.max(0, total - cards.length);

  function more() {
    setError('');
    startTransition(async () => {
      const result = await loadMoreProducts({
        categorySlug, page: nextPage, style, material, color, minPrice, maxPrice, sort,
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      // Keyed by id: a product that shifted between pages while somebody was
      // reading would otherwise arrive twice and break React's keys.
      setCards(prev => {
        const seen = new Set(prev.map(c => c.id));
        return [...prev, ...result.cards.filter(c => !seen.has(c.id))];
      });
      setNextPage(n => n + 1);
    });
  }

  return (
    <>
      <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {cards.map((card, i) => (
          <div
            key={card.id}
            className="card-in"
            // row + column. The wave crosses the grid corner to corner rather
            // than marching along each row in turn.
            style={{ '--card-step': String(diagonal(i)) } as React.CSSProperties}
          >
            <ProductCard
              id={card.id}
              title={card.title}
              slug={card.slug}
              price={card.price}
              href={card.href}
              image={card.image}
              secondaryImage={card.secondaryImage}
              reviewCount={card.reviewCount}
              averageRating={card.averageRating}
              swatches={card.swatches}
            />
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={more}
            disabled={pending}
            className="hover-btn flex h-14 min-w-[220px] items-center justify-center gap-3 rounded-sm bg-ember-500 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900 shadow-ember disabled:opacity-70"
          >
            {pending && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {pending ? 'Loading' : 'Load more'}
          </button>

          <p aria-live="polite" className="m-0 font-data text-caption tabular-nums text-ink-500">
            Showing {cards.length} of {total}
          </p>

          {error && (
            <p role="alert" className="m-0 text-body-sm text-rust-700">{error}</p>
          )}
        </div>
      )}
    </>
  );
}

/**
 * A card's distance along the diagonal, at the widest layout.
 *
 * One number has to serve all three column counts, because CSS cannot hand the
 * current breakpoint back to JavaScript. The four-column reading is used: at
 * three and two columns the wave is less exactly diagonal but still travels
 * across and down, which is the effect being asked for.
 */
function diagonal(index: number): number {
  const cols = COLUMNS.lg;
  return Math.floor(index / cols) + (index % cols);
}
