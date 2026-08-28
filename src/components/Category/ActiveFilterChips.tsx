// src/components/Category/ActiveFilterChips.tsx

import Link from 'next/link';
import { X } from 'lucide-react';

export interface Chip {
  /** URL keys this chip owns. Price owns two — min and max together are one
   *  idea to a customer, and removing half of a range is not a thing. */
  keys: string[];
  /** The query pairs this chip contributes, so the others can be rebuilt. */
  params: [string, string][];
  label: string;
}

interface Props {
  basePath: string;
  chips: Chip[];
  /** Carried through every href so removing a filter does not reset the order. */
  sort?: string;
}

/**
 * What is currently narrowing the listing, above the grid.
 *
 * Until now the only sign that a filter was on was a dot on the mobile button
 * and a tinted row inside a drawer nobody had open — so arriving at a filtered
 * link, or coming back to one, meant looking at a short listing with no visible
 * reason for it.
 *
 * Plain links, rendered on the server: each one is the current URL minus its
 * own keys. No JavaScript, no state, and each chip is a real address that works
 * in a new tab.
 */
export default function ActiveFilterChips({ basePath, chips, sort }: Props) {
  if (!chips.length) return null;

  const hrefWithout = (drop: string[]) => {
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort);
    for (const chip of chips) {
      if (chip.keys.some(k => drop.includes(k))) continue;
      for (const [k, v] of chip.params) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const clearHref = sort ? `${basePath}?sort=${encodeURIComponent(sort)}` : basePath;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="eyebrow mr-1 flex items-center gap-2 text-ember-700">
        <span aria-hidden="true" className="block h-px w-4 bg-ember-500" />
        Filtered by
      </span>

      {chips.map(chip => (
        <Link
          key={chip.keys.join('-')}
          href={hrefWithout(chip.keys)}
          className="hover-btn inline-flex min-h-9 items-center gap-2 rounded-pill border border-ember-500/35 bg-ember-50 py-1 pl-3.5 pr-2.5 text-body-sm font-semibold text-ember-700 no-underline shadow-e1"
        >
          {chip.label}
          <X aria-hidden="true" className="h-3.5 w-3.5 text-ember-700/70" />
          <span className="sr-only">— remove this filter</span>
        </Link>
      ))}

      {chips.length > 1 && (
        <Link
          href={clearHref}
          className="hover-link ml-1 text-caption text-ink-500 no-underline"
        >
          Clear all
        </Link>
      )}
    </div>
  );
}
