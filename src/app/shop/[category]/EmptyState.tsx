// src/app/shop/[category]/EmptyState.tsx

import Link from 'next/link';
import { SearchX, X } from 'lucide-react';
import Shell from '@/components/UI/EmptyState';

export interface ActiveFilter {
  key: 'style' | 'material' | 'color';
  /** What the sidebar calls this facet. */
  label: string;
  value: string;
}

interface Props {
  /** The listing's own path, without any query. */
  basePath: string;
  filters: ActiveFilter[];
}

/**
 * Nothing matched.
 *
 * The old version said "No products found. Try removing some filters" and then
 * offered no way to remove one — the only button went to /shop/all, which
 * throws away the category as well as the facets. So somebody who had narrowed
 * to green velvet corner sofas and found nothing was sent back to the start.
 *
 * Every active facet is a chip that removes itself, the whole set clears in one
 * tap, and the category is kept in both cases.
 */
export default function EmptyState({ basePath, filters }: Props) {
  /** The same URL with one facet dropped. */
  const without = (key: string) => {
    const params = new URLSearchParams(
      filters.filter(f => f.key !== key).map(f => [f.key, f.value]),
    );
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <Shell
      icon={SearchX}
      illustration={<EmptyRoom />}
      heading="Nothing matches that combination"
      line={
        filters.length
          ? 'Try letting go of one of these and see what comes back.'
          : 'There is nothing in this part of the shop just yet.'
      }
      action={
        filters.length
          ? { label: 'Clear all filters', href: basePath }
          : { label: 'Browse every sofa', href: '/shop/all' }
      }
    >
      {filters.length > 0 && (
        <ul className="m-0 mt-6 flex list-none flex-wrap justify-center gap-2 p-0">
          {filters.map(f => (
            <li key={f.key}>
              <Link
                href={without(f.key)}
                className="hover-btn inline-flex min-h-11 items-center gap-2 rounded-pill border border-calico-300 bg-calico-100 px-4 text-body-sm font-semibold text-ink-900 no-underline"
              >
                <span className="font-normal text-ink-500">{f.label}</span>
                {f.value}
                <X aria-hidden="true" className="h-3.5 w-3.5 text-ink-500" />
                <span className="sr-only">— remove this filter</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

/**
 * An empty room with one sofa in it.
 *
 * Drawn rather than photographed, and drawn in the palette: an icon at this
 * size reads as a missing asset, and a photograph of a room would be a
 * photograph of a room we do not have.
 */
function EmptyRoom() {
  return (
    <svg
      viewBox="0 0 240 140"
      role="img"
      aria-label="An empty room with a single sofa against the wall"
      className="mx-auto w-full max-w-[240px]"
    >
      {/* Wall and floor */}
      <rect x="0" y="0" width="240" height="104" className="fill-calico-100" />
      <rect x="0" y="104" width="240" height="36" className="fill-calico-200" />

      {/* A window, for the light */}
      <rect x="26" y="20" width="46" height="46" rx="2" className="fill-calico-50 stroke-calico-300" strokeWidth="2" />
      <line x1="49" y1="20" x2="49" y2="66" className="stroke-calico-300" strokeWidth="2" />
      <line x1="26" y1="43" x2="72" y2="43" className="stroke-calico-300" strokeWidth="2" />

      {/* The sofa */}
      <g className="fill-calico-200 stroke-ink-400" strokeWidth="2" strokeLinejoin="round">
        <rect x="120" y="56" width="96" height="30" rx="6" />
        <rect x="112" y="70" width="16" height="36" rx="5" />
        <rect x="208" y="70" width="16" height="36" rx="5" />
        <rect x="128" y="82" width="80" height="16" rx="4" />
      </g>
      <g className="fill-ink-400">
        <rect x="118" y="106" width="5" height="6" rx="1" />
        <rect x="213" y="106" width="5" height="6" rx="1" />
      </g>

      {/* One cushion, in ember, so the drawing has a note of the brand in it */}
      <rect x="140" y="62" width="20" height="20" rx="4" className="fill-ember-500" opacity="0.55" />

      <line x1="0" y1="104" x2="240" y2="104" className="stroke-calico-300" strokeWidth="2" />
    </svg>
  );
}
