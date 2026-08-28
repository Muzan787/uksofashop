'use client';
// src/components/Category/PriceRange.tsx

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface Props {
  /** The cheapest and dearest product in this category, in pounds. */
  floor: number;
  ceiling: number;
  /** Where the handles currently sit, from the URL. */
  from: number;
  to: number;
}

/** How long a handle has to be still before the URL changes. */
const DEBOUNCE = 300;

const MONEY = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

/**
 * A two-handle price range.
 *
 * Two real <input type="range"> elements stacked on one track, rather than a
 * div with pointer handlers. That is the whole accessibility story for free:
 * each handle is focusable, arrow keys nudge it, Home and End jump to the
 * ends, and a screen reader reads a slider with a value — none of which a
 * hand-rolled one gets without reimplementing all of it, usually badly.
 *
 * The two inputs overlap, so only the one being touched may receive pointer
 * events; `pointer-events: none` on the track with it re-enabled on the thumbs
 * is what lets you grab either handle wherever it sits.
 *
 * Dragging updates the numbers immediately and the URL 300ms after you stop.
 * Without that gap every pixel of a drag would be a navigation.
 */
export default function PriceRange({ floor, ceiling, from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [lo, setLo] = useState(from);
  const [hi, setHi] = useState(to);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The URL is the source of truth: a chip removing the filter, or the browser
  // going back, has to move the handles. Adjusted during render rather than in
  // an effect, which would paint the stale positions first.
  const [applied, setApplied] = useState({ from, to });
  if (applied.from !== from || applied.to !== to) {
    setApplied({ from, to });
    setLo(from);
    setHi(to);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function commit(nextLo: number, nextHi: number) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());

      // A bound at the edge of the category's own range is not a filter, so it
      // is spelled by absence — otherwise "everything" would have its own URL.
      if (nextLo > floor) params.set('min', String(nextLo));
      else params.delete('min');

      if (nextHi < ceiling) params.set('max', String(nextHi));
      else params.delete('max');

      params.delete('page');

      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, DEBOUNCE);
  }

  /** Handles may meet but never cross. */
  function onLo(value: number) {
    const next = Math.min(value, hi);
    setLo(next);
    commit(next, hi);
  }
  function onHi(value: number) {
    const next = Math.max(value, lo);
    setHi(next);
    commit(lo, next);
  }

  const span = Math.max(1, ceiling - floor);
  const leftPct = ((lo - floor) / span) * 100;
  const rightPct = ((hi - floor) / span) * 100;

  const thumb =
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 ' +
    '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-grab ' +
    '[&::-webkit-slider-thumb]:rounded-pill [&::-webkit-slider-thumb]:border-2 ' +
    '[&::-webkit-slider-thumb]:border-ember-500 [&::-webkit-slider-thumb]:bg-calico-50 ' +
    '[&::-webkit-slider-thumb]:shadow-e1 ' +
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 ' +
    '[&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-pill ' +
    '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ember-500 [&::-moz-range-thumb]:bg-calico-50';

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="font-data text-body-sm font-semibold tabular-nums text-ink-900">
          {MONEY.format(lo)}
        </span>
        <span aria-hidden="true" className="font-data text-caption text-ink-400">to</span>
        <span className="font-data text-body-sm font-semibold tabular-nums text-ink-900">
          {MONEY.format(hi)}
        </span>
      </div>

      <div className="relative h-6">
        {/* The track, and the selected span drawn over it. */}
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-pill bg-calico-300" />
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-pill bg-ember-500"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />

        <input
          type="range"
          aria-label="Minimum price"
          min={floor}
          max={ceiling}
          step={1}
          value={lo}
          onChange={e => onLo(Number(e.target.value))}
          className={`pointer-events-none absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent ${thumb}`}
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={floor}
          max={ceiling}
          step={1}
          value={hi}
          onChange={e => onHi(Number(e.target.value))}
          className={`pointer-events-none absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent ${thumb}`}
        />
      </div>

      <p className="m-0 mt-2 font-data text-caption tabular-nums text-ink-500">
        {MONEY.format(floor)} – {MONEY.format(ceiling)} in this category
      </p>
    </div>
  );
}
