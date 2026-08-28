'use client';
// src/components/Category/CategoryHero.tsx

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Parallax, SplitText } from '@/components/Motion';
import { blurDataURL } from '@/utils/cloudinary';

export interface CategoryChip {
  slug: string;
  name: string;
}

interface Props {
  title: string;
  slug: string;
  image: string | null;
  /** How many live products sit in this category. */
  count: number;
  /** Cheapest and dearest, in pounds. Null where the category is empty. */
  priceFrom: number | null;
  priceTo: number | null;
  /** Categories alongside this one, for the row along the bottom edge. */
  siblings: CategoryChip[];
}

const MONEY = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

/**
 * The category hero.
 *
 * What it replaces: a box that grew to whatever the text needed, with the
 * photograph flattened under a flat 30% black — dense enough to kill the
 * picture, nowhere near dense enough to guarantee the type on top of it.
 *
 * Two gradients now do that job. A vertical one gives the frame depth and
 * leaves the photograph readable at the top; a horizontal one runs dark from
 * the left, under the column where every piece of text sits. Layered, the left
 * edge is at 94% or better everywhere text lands — so the copy is legible over
 * ANY photograph, including a pale one — while the top right stays at 40% and
 * the picture is still a picture.
 *
 * The Ember 300 in the breadcrumb is not a preference. The old hero set that
 * segment in Ember 700, which is the ember for LIGHT grounds; on Ink 900 it is
 * 2.4:1 and was effectively unreadable. Ember 300 is the dark-ground ember.
 */
export default function CategoryHero({
  title, slug, image, count, priceFrom, priceTo, siblings,
}: Props) {
  return (
    <section
      data-ground="dark"
      className="grain relative isolate h-[38vh] min-h-[280px] overflow-hidden bg-ink-900 lg:h-[44vh] lg:min-h-[320px]"
    >
      {image && (
        // Oversized by 12% on every edge: the drift is ±10% of the frame's own
        // height, and without the overflow it would show the frame's edge at
        // either end of the scroll.
        <Parallax speed={0.2} className="absolute inset-[-12%] -z-10">
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            placeholder="blur"
            blurDataURL={blurDataURL(image)}
            className="object-cover"
          />
        </Parallax>
      )}

      <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-900 via-ink-900/70 to-ink-900/40" />
      <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-900 via-ink-900/60 to-transparent" />

      {/* The same lighting as the homepage hero and the product stage. Warm and
          low only: the indigo wash belongs to the one cool section on the
          homepage, and a category header is not it. */}
      <div aria-hidden="true" className="aurora -z-10">
        <span className="aurora__warm" />
        <span className="aurora__deep" />
      </div>

      <div className="flex h-full flex-col">
        <div className="mx-auto flex w-full max-w-shell flex-1 flex-col justify-center px-4 sm:px-6">
          {/* One line that scrolls, not a wrapping trail. A long category name
              at the end of it took two rows on a phone, above a header that is
              already competing for the first screen. */}
          <nav aria-label="Breadcrumb" className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ol className="m-0 flex list-none flex-nowrap items-center gap-2 whitespace-nowrap p-0">
              {[
                { href: '/', label: 'Home' },
                { href: '/shop/all', label: 'Shop' },
              ].map(({ href, label }, i) => (
                <li key={href} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-calico-50/40" />}
                  <Link href={href} className="hover-link font-data text-caption tracking-[0.06em] text-calico-50/70 no-underline">
                    {label}
                  </Link>
                </li>
              ))}
              <li className="flex items-center gap-2 pr-4">
                <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-calico-50/40" />
                <span aria-current="page" className="font-data text-caption font-semibold tracking-[0.06em] text-ember-300">
                  {title}
                </span>
              </li>
            </ol>
          </nav>

          <SplitText
            as="h1"
            text={title}
            amount={0.4}
            className="m-0 mt-4 font-display text-display-l font-semibold text-calico-50"
          />

          {/* The category, as a specification: an ember-led rule over a mono
              figure. It is the mark the homepage figures band, the section
              headings and the footer columns all carry, and it is what ties a
              listing header to the rest of the site. */}
          <span aria-hidden="true" className="mt-5 flex w-full max-w-[22rem]">
            <span className="block h-px w-8 bg-ember-500" />
            <span className="block h-px flex-1 bg-calico-50/20" />
          </span>

          <p className="m-0 mt-3 font-data text-data tabular-nums text-calico-300">
            {summarise(count, priceFrom, priceTo)}
          </p>
        </div>

        {/* Sideways, along the bottom edge. Somebody looking at corner sofas is
            often one chip away from what they actually want, and making them
            go back up to the menu to find out is the reason they leave. */}
        {siblings.length > 1 && (
          <nav aria-label="Other categories" className="relative pb-5">
            <ul className="no-scrollbar m-0 flex list-none gap-2 overflow-x-auto px-4 py-1 sm:px-6">
              {siblings.map(sib => {
                const active = sib.slug === slug;
                return (
                  <li key={sib.slug} className="shrink-0">
                    <Link
                      href={`/shop/${encodeURIComponent(sib.slug)}`}
                      aria-current={active ? 'page' : undefined}
                      className={`hover-btn inline-flex min-h-11 items-center rounded-pill px-4 py-2 text-body-sm font-semibold no-underline transition-colors duration-swift ease-out-expo ${
                        active
                          ? 'btn-ember shadow-ember border border-ember-500 bg-ember-500 text-ink-900'
                          : 'hover-btn-dark glass-dark-panel text-calico-50'
                      }`}
                    >
                      {sib.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}

/** "9 sofas · £369 – £1,299", and the honest shorter versions of it. */
function summarise(count: number, from: number | null, to: number | null): string {
  if (count === 0) return 'Nothing in this category yet';

  const items = `${count} ${count === 1 ? 'sofa' : 'sofas'}`;
  if (from === null || to === null) return items;
  if (from === to) return `${items} · ${MONEY.format(from)}`;
  return `${items} · ${MONEY.format(from)} – ${MONEY.format(to)}`;
}
