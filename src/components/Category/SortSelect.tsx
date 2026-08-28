'use client';
// src/components/Category/SortSelect.tsx

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { SORTS, SORT_LABELS, type SortKey } from '@/app/shop/[category]/productQuery';

/**
 * How the listing is ordered.
 *
 * A native <select> rather than a custom menu, and not for want of effort: it
 * gets keyboard support, type-ahead, the platform's own picker on a phone and
 * correct behaviour under a screen reader, none of which a div-and-listbox
 * reimplementation gets for free. The chevron is ours; everything else is the
 * browser's.
 *
 * The value lives in the URL, so a sorted listing is a link somebody can send.
 * `page` is dropped on change — page four of a price-ascending listing is not
 * page four of the featured one, and keeping the number would land the visitor
 * somewhere arbitrary or on a 404.
 */
export default function SortSelect({ value }: { value: SortKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function change(next: string) {
    const params = new URLSearchParams(sp.toString());
    // Featured is the default, so it is spelled by ABSENCE. Writing it in would
    // give the same rows two URLs.
    if (next === 'featured') params.delete('sort');
    else params.set('sort', next);
    params.delete('page');

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="relative">
      <label htmlFor="sort" className="sr-only">Sort products by</label>
      <select
        id="sort"
        value={value}
        onChange={e => change(e.target.value)}
        className="h-11 w-full appearance-none rounded-sm border border-calico-300 bg-calico-50 py-0 pl-3 pr-9 text-body-sm font-semibold text-ink-900 focus-ring-inset transition-colors duration-swift ease-out-expo focus:border-ember-700 sm:w-auto"
      >
        {SORTS.map(key => (
          <option key={key} value={key}>{SORT_LABELS[key]}</option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
      />
    </div>
  );
}
