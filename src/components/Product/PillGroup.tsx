'use client';
// src/components/Product/PillGroup.tsx

import Link from 'next/link';
import { motion } from 'framer-motion';
import { DUR, EASE } from '@/components/Motion';
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe';


export interface Pill {
  /** Stable identity. The slug for a size, the name for a material. */
  key: string;
  label: string;
  /** Set where choosing this option is a different page rather than a state. */
  href?: string;
}

interface Props {
  /**
   * Unique per group. Two groups sharing an id would animate their fills into
   * each other — the size pill would fly across and become the material pill.
   */
  layoutId: string;
  /** Accessible name for the set. */
  label: string;
  items: Pill[];
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  /** Appended after the pills — the dashed "Custom size" button. */
  children?: React.ReactNode;
}

/**
 * A row of choices where the selection is a fill that travels.
 *
 * The fill is one element with a `layoutId`, so framer removes it from the old
 * pill and re-inserts it in the new one and animates the gap between the two
 * rather than cross-fading two separate backgrounds. What the customer sees is
 * the ember block sliding across to the option they picked.
 *
 * It sits at `-inset-px` so it covers the pill's own border; without that the
 * hairline stays visible around the fill and the travelling block appears to
 * shrink by a pixel at each end.
 *
 * Every pill is at least 44px tall. These are the page's primary choices and
 * they were 8px-padded chips, which is under every touch-target guideline
 * there is.
 */
export default function PillGroup({ layoutId, label, items, selectedKey, onSelect, children }: Props) {
  const reduced = useReducedMotionSafe();
  const transition = { duration: reduced ? 0 : DUR.base, ease: EASE.out };

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {items.map(item => {
        const active = item.key === selectedKey;

        const className =
          'hover-btn relative inline-flex min-h-11 items-center rounded-pill border px-5 py-2.5 text-body-sm font-semibold no-underline transition-colors duration-swift ease-out-expo ' +
          (active ? 'border-ember-500 text-ink-900' : 'border-calico-300 text-ink-700 hover:border-ink-400');

        const inner = (
          <>
            {active && (
              <motion.span
                aria-hidden="true"
                layoutId={layoutId}
                transition={transition}
                className="absolute -inset-px rounded-pill bg-ember-500"
              />
            )}
            <span className="relative">{item.label}</span>
          </>
        );

        return item.href ? (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={className}
          >
            {inner}
          </Link>
        ) : (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect?.(item.key)}
            className={className}
          >
            {inner}
          </button>
        );
      })}

      {children}
    </div>
  );
}
