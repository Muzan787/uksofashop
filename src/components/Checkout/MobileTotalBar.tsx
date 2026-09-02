'use client';
// src/components/Checkout/MobileTotalBar.tsx

import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

interface Props {
  total: number;
  itemCount: number;
  /** The summary itself, rendered inside the drawer when it is open. */
  children: React.ReactNode;
}

/** Height of the site's bottom navigation, which this sits above. */

/**
 * The total, pinned, with the summary folded into it.
 *
 * The order summary used to sit in a <details> between the form and the foot
 * of the page — so on a phone the delivery form was pushed down by a block
 * most people never opened, and the number they actually wanted was off
 * screen. This is the number, always visible, with the rest one tap away and
 * rising over it rather than pushing anything.
 */
export default function MobileTotalBar({ total, itemCount, children }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const clearance = 'calc(var(--bottom-nav) + env(safe-area-inset-bottom))';

  return (
    <div className="lg:hidden">
      {open && (
        <button
          type="button"
          aria-label="Close order summary"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-sticky-bar animate-[fadeIn_var(--dur-base)_var(--ease-out-expo)] bg-ink-900/40"
        />
      )}

      <div
        // Tells the floating WhatsApp button to stand down. See
        // bottomBarShowing() in src/components/Layout/WhatsAppFab.tsx.
        data-bottom-bar=""
        className="fixed inset-x-0 z-sticky-bar border-t border-calico-300 bg-calico-50 shadow-e2"
        style={{ bottom: clearance }}
      >
        {/* The drawer. A grid row growing from zero, so it can rise to the
            height of its own content without that height being measured — and
            so a frame that never arrives cannot leave it stuck half open. */}
        <div
          id="mobile-summary"
          className={`grid transition-[grid-template-rows] duration-base ease-out-expo ${
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className={`overflow-hidden ${open ? 'visible' : 'invisible'}`}>
            <div data-lenis-prevent className="max-h-[60vh] overflow-y-auto p-4">
              {children}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls="mobile-summary"
          className="flex h-14 w-full items-center gap-3 border-t border-calico-300 px-4 text-left"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-data text-caption tabular-nums text-ink-500">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} · due on delivery
            </span>
            <span className="font-data text-body font-semibold tabular-nums text-ink-900">
              £{total.toFixed(2)}
            </span>
          </span>

          <span className="flex items-center gap-1.5 text-caption font-semibold text-ember-700">
            {open ? 'Hide' : 'Details'}
            <ChevronUp
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-base ease-out-expo ${open ? 'rotate-180' : ''}`}
            />
          </span>
        </button>
      </div>

      {/* Keeps the last of the form clear of a bar that is fixed. */}
      <div aria-hidden="true" className="h-14" />
    </div>
  );
}
