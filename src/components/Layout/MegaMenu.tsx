'use client';
// src/components/Layout/MegaMenu.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getMegaMenuData } from '@/app/actions/navigation';
import { STAGGER_STEP, STAGGER_CAP } from '@/components/Motion/tokens';
import { blurDataURL } from '@/utils/cloudinary'

export interface MegaCategory {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
}

interface Collection {
  id: string;
  name: string;
  slug: string;
}

/** Cheapest and dearest active product in a category, for the price line. */
type PriceRange = Record<string, { min: number; max: number }>;

interface Props {
  open: boolean;
  categories: MegaCategory[];
  /** Closes the drawer and hands focus back to the trigger. */
  onClose: () => void;
  /** The existing hover-delay handlers, so crossing the gap does not flicker. */
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  /** The button that opens this, so focus can be restored and outside-clicks ignored. */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** True when the drawer was opened from the keyboard rather than by hover. */
  fromKeyboard: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

export default function MegaMenu({
  open, categories, onClose, onPointerEnter, onPointerLeave, triggerRef, fromKeyboard,
}: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [prices, setPrices] = useState<PriceRange>({});
  const loaded = useRef(false);

  /**
   * Fetched the first time the menu opens, not on page load.
   *
   * Collections and price ranges exist only to fill this drawer, and the
   * drawer is desktop-only. Fetching them for every visitor — including every
   * phone, which can never open it — would be two queries nobody asked for.
   * The hover delay plus the 380ms descent covers the round trip.
   */
  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;

    // One server action rather than two browser queries. The aggregation that
    // used to happen here now happens on the server, which is also why this is
    // a single round trip instead of two.
    getMegaMenuData()
      .then(({ collections, prices }) => {
        setCollections(collections);
        setPrices(prices);
      })
      // A failed fetch leaves the drawer without collections and price ranges,
      // which is degraded but still a working category menu. It must not take
      // the header down, and the next open retries.
      .catch(() => { loaded.current = false; });
  }, [open]);

  // Escape closes and hands focus back to whatever opened it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onClose();
      triggerRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, triggerRef]);

  // Outside click. The trigger is excluded or clicking it would close and
  // immediately reopen.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, onClose, triggerRef]);

  /**
   * Focus handling.
   *
   * A hard trap on a HOVER menu would strand a mouse user who happened to tab
   * afterwards, so focus is only pulled into the drawer when it was opened
   * from the keyboard. Once focus is inside, Tab cycles within — that part is
   * a real trap — and Escape always returns to the trigger.
   */
  useEffect(() => {
    if (!open) return;
    if (fromKeyboard) {
      const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const node = panel.current;
      if (!node || !node.contains(document.activeElement)) return;

      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, fromKeyboard]);

  const money = useCallback((n: number) => `£${Math.round(n).toLocaleString('en-GB')}`, []);

  const current = categories[active];
  const range = current ? prices[current.id] : undefined;

  return (
    // The clipper. The panel translates up out of it, so the drawer reads as
    // descending from beneath the header rather than fading in on top of it.
    <div
      className={`absolute inset-x-0 top-full hidden overflow-hidden lg:block ${
        open ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      <div
        ref={panel}
        id="mega-menu"
        role="dialog"
        aria-label="Shop menu"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        data-ground="dark"
        className={`grad-ink grain relative isolate w-full overflow-hidden bg-ink-900 transition-transform duration-base ease-out-expo ${
          open ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        {/* The same lighting as the hero, the footer and the mobile menu. */}
        <div aria-hidden="true" className="aurora">
          <span className="aurora__warm" />
          <span className="aurora__deep" />
        </div>

        <span
          aria-hidden="true"
          className="relative block h-0.5"
          style={{ backgroundImage: 'var(--grad-rule)' }}
        />

        <div className="relative mx-auto grid max-w-shell grid-cols-[1.1fr_0.8fr_1fr] gap-12 px-4 py-12">
          {/* ── Categories ────────────────────────────────────────────── */}
          <div>
            <p className="eyebrow mb-6 flex items-center gap-2.5 text-ember-300">
              <span aria-hidden="true" className="block h-px w-5 bg-ember-500" />
              Categories
            </p>
            <ul className="m-0 list-none p-0">
              {categories.map((cat, i) => (
                <li key={cat.id}>
                  <Link
                    href={`/shop/${cat.slug}`}
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className={`group flex items-baseline gap-3 py-1.5 font-display text-h2 font-semibold leading-tight no-underline transition-[color,opacity,transform] duration-base ease-out-expo ${
                      active === i ? 'text-calico-50' : 'text-calico-50/45'
                    } ${open ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
                    style={{
                      transitionDelay: open
                        ? `${Math.min(i, STAGGER_CAP - 1) * STAGGER_STEP * 1000 + 80}ms`
                        : '0ms',
                    }}
                  >
                    {cat.name}
                    <ArrowUpRight
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 text-ember-500 transition-opacity duration-swift ${
                        active === i ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Collections ───────────────────────────────────────────── */}
          <div>
            <p className="eyebrow mb-6 flex items-center gap-2.5 text-ember-300">
              <span aria-hidden="true" className="block h-px w-5 bg-ember-500" />
              Complete Sets
            </p>
            {collections.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {collections.map((col) => (
                  <li key={col.id}>
                    <Link
                      href={`/collection/${col.slug}`}
                      className="hover-link inline-block py-1 text-body text-calico-300 no-underline"
                    >
                      {col.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-calico-300">Loading…</p>
            )}

            <Link
              href="/shop/all"
              className="hover-btn btn-ember sheen shadow-ember mt-8 inline-flex items-center gap-2 rounded-pill bg-ember-500 px-6 py-3 font-data text-eyebrow font-semibold uppercase tracking-widest text-ink-900 no-underline"
            >
              Shop everything
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* ── The image panel ───────────────────────────────────────── */}
          <div>
            {/* Square, because the category photographs are 1024x1024. In a 4:5 frame
                object-cover was trimming 12.5% off each side of every one of them —
                the same crop the product gallery and the cards were carrying. */}
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-ink-900">
              {/* Every image is mounted and stacked; only opacity changes, so
                  the swap is a genuine cross-fade with nothing to load. */}
              {categories.map((cat, i) =>
                cat.image_url ? (
                  <Image
                    key={cat.id}
                    src={cat.image_url}
                    alt=""
                    fill
                    sizes="380px"
                    className={`object-cover transition-opacity duration-base ease-out-expo ${
                      active === i ? 'opacity-100' : 'opacity-0'
                    }`}
                 
            placeholder="blur"
            blurDataURL={blurDataURL(cat.image_url)}
           />
                ) : null,
              )}
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink-900/80 to-transparent" />
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-4">
              <p className="m-0 font-display text-h3 font-semibold text-calico-50">
                {current?.name ?? ''}
              </p>
              <p className="m-0 font-data text-data tabular-nums text-ember-300">
                {range
                  ? range.min === range.max
                    ? money(range.min)
                    : `${money(range.min)} – ${money(range.max)}`
                  : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
