'use client';
// src/components/Home/ProductRail.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProductCard, { type ProductCardData } from '@/components/Product/ProductCard';
import { Reveal } from '@/components/Motion';
import { staggerDelay } from '@/components/Motion/tokens';
import SectionHeading from '@/components/UI/SectionHeading';

interface Props {
  eyebrow: string;
  heading: string;
  /** One word in the heading that carries the panned ember gradient. */
  emphasise?: string;
  standfirst?: string;
  items: ProductCardData[];
  /** Where the closing panel goes. */
  viewAllHref: string;
  viewAllLabel?: string;
}

/**
 * The horizontal product rail.
 *
 * Sits directly under the ember band, because the homepage used to put four
 * screens of categories, collections and editorial between a visitor and the
 * first sofa they could actually buy.
 *
 * Three things tell you the row scrolls, and it needs all three because they
 * each speak to a different visitor:
 *
 *   · the rail runs to the viewport edge on the right and is FADED there rather
 *     than cut, so the last card dissolves instead of being chopped — a cut
 *     edge reads as a rendering fault, a fade reads as an invitation;
 *   · dots underneath on a phone, which are also the control;
 *   · a swipe hint that nudges twice and is gone for good the moment the rail
 *     is actually scrolled. A hint that stays after it has been acted on is
 *     just clutter.
 *
 * The closing panel is the same proportion as a card so the row stays even, and
 * it carries the ember gradient and the sheen — it is the only element in the
 * section allowed to be the brand colour, which is what makes it read as the
 * end of the row rather than as a seventh product.
 */
export default function ProductRail({
  eyebrow, heading, emphasise, standfirst, items, viewAllHref, viewAllLabel = 'View all',
}: Props) {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);

  const onScroll = useCallback(() => {
    const node = rail.current;
    if (!node) return;
    if (node.scrollLeft > 8) setTouched(true);

    // Nearest snapped child rather than a division by card width — the last
    // panel is a different size, so arithmetic would drift at the end.
    const cards = Array.from(node.children) as HTMLElement[];
    let nearest = 0;
    let best = Infinity;
    cards.forEach((card, i) => {
      const d = Math.abs(card.offsetLeft - node.scrollLeft - node.offsetLeft);
      if (d < best) { best = d; nearest = i; }
    });
    setActive(nearest);
  }, []);

  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const goTo = (i: number) => {
    const node = rail.current;
    const card = node?.children[i] as HTMLElement | undefined;
    if (!node || !card) return;
    node.scrollTo({ left: card.offsetLeft - node.offsetLeft, behavior: 'smooth' });
  };

  // One dot per card plus the closing panel.
  const stops = items.length + 1;

  return (
    <section
      className="grad-calico grain-light section-y relative bg-calico-50"
      style={{ ['--fade-from' as string]: 'var(--color-calico-50)' }}
    >
      <div className="relative mx-auto max-w-shell px-4 sm:px-6">
        <SectionHeading
          eyebrow={eyebrow}
          heading={heading}
          emphasise={emphasise}
          standfirst={standfirst}
          href={viewAllHref}
          linkLabel={viewAllLabel}
        />
      </div>

      {/*
        The rail is inset to the container on the left but runs to the viewport
        edge on the right, so the fourth card is cut by the container edge
        rather than stopping short of it — that clipped card, plus the fade over
        it, is the whole affordance on desktop.
      */}
      <div className="relative">
        <div className="mx-auto max-w-shell pl-4 sm:pl-6">
          <div
            ref={rail}
            data-lenis-prevent
            className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-4 sm:pr-6 lg:gap-6"
          >
            {items.map((item, i) => (
              <Reveal
                key={item.id}
                delay={staggerDelay(i)}
                distance={20}
                amount={0.1}
                className="w-[82vw] shrink-0 snap-start sm:w-[46vw] lg:w-[calc((100%-72px)/3.5)]"
              >
                <ProductCard {...item} />
              </Reveal>
            ))}

            {/* The closing panel. */}
            <Reveal
              delay={staggerDelay(items.length)}
              distance={20}
              amount={0.1}
              className="w-[82vw] shrink-0 snap-start sm:w-[46vw] lg:w-[calc((100%-72px)/3.5)]"
            >
              <Link
                href={viewAllHref}
                className="hover-btn sheen btn-ember shadow-ember group flex aspect-square w-full flex-col items-start justify-end gap-3 rounded-md bg-ember-500 p-6 no-underline"
              >
                <span
                  aria-hidden="true"
                  className="grid h-12 w-12 place-items-center rounded-pill bg-ink-900/10"
                >
                  <ArrowRight className="h-6 w-6 text-ink-900 transition-transform duration-swift ease-out-expo group-hover:translate-x-1" />
                </span>
                <span className="font-display text-h3 font-semibold text-ink-900">
                  {viewAllLabel}
                </span>
                <span className="font-data text-caption uppercase tracking-widest text-ink-900/60">
                  The whole range
                </span>
              </Link>
            </Reveal>
          </div>
        </div>

        <span aria-hidden="true" className="rail-fade rail-fade-end" />
      </div>

      {/* Dots and the swipe hint — mobile only. On desktop the clipped, faded
          card already says the row continues. */}
      <div className="mx-auto mt-5 flex max-w-shell items-center justify-between gap-4 px-4 sm:px-6 lg:hidden">
        <div className="flex items-center gap-1" role="tablist" aria-label="Carousel position">
          {Array.from({ length: stops }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`Go to item ${i + 1} of ${stops}`}
              onClick={() => goTo(i)}
              className="grid h-11 w-6 place-items-center"
            >
              <span
                className={`block h-1.5 rounded-pill transition-all duration-base ease-out-expo ${
                  active === i ? 'w-6 bg-ember-500' : 'w-1.5 bg-calico-300'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Shown until the visitor scrolls the rail once, then gone for good. */}
        <span
          aria-hidden="true"
          className={`flex shrink-0 items-center gap-2 font-data text-caption uppercase tracking-widest text-ink-500 transition-opacity duration-base ease-out-expo ${
            touched ? 'opacity-0' : 'opacity-100'
          }`}
        >
          Swipe
          <ArrowRight className="drag-hint h-4 w-4 text-ember-700" />
        </span>
      </div>
    </section>
  );
}
