// src/components/Home/CategoryBento.tsx

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '@/components/Motion';
import { STAGGER_STEP, STAGGER_CAP } from '@/components/Motion/tokens';
import SectionHeading from '@/components/UI/SectionHeading';
import { blurDataURL } from '@/utils/cloudinary';

export interface CategoryTile {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  /** Cheapest active product in the category. */
  fromPrice?: number | null;
  /** How many active products it holds. */
  productCount?: number;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE CATEGORY BENTO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Six identical 4:5 tiles in a 3-up grid is a contact sheet, not a composition.
 * Every category was given the same weight, so none of them had any, and the
 * whole block read as a list of thumbnails.
 *
 * Desktop is a bento: a six-column grid where the first category takes half the
 * width and two rows of height, the next two take half the width and one row
 * each, and the last three share a row underneath. Something is finally bigger
 * than something else, which is what gives the eye a route through the section.
 *
 * MOBILE IS DELIBERATELY NOT A BENTO. The grid this replaces originally led
 * with a double-height hero tile and it was removed for a good reason: on a
 * phone a feature tile is most of a screen, and it pushed everything below it
 * down by a full swipe. So the bento spans are all `lg:` — a phone gets a plain
 * two-up grid of 4:5 tiles where every one is reachable with a thumb, and the
 * composition only appears where there is width to spend on it.
 *
 * The caption is permanent. It sits over its own scrim, and the only thing
 * hover changes is that the ember rule under the name draws itself out — and
 * where there is no pointer that rule is simply already drawn. Nothing a
 * visitor needs is behind a state their device cannot enter.
 */

/** Columns at the widest breakpoint — what the reveal diagonal is measured against. */
const COLUMNS = 3;

/**
 * Reveal order along the diagonal rather than straight down the page.
 *
 * A row-by-row stagger reads as a list being filled in; adding the column index
 * makes the tiles arrive on a diagonal wavefront, which reads as one movement
 * across the grid.
 */
function diagonalDelay(index: number): number {
  const row = Math.floor(index / COLUMNS);
  const col = index % COLUMNS;
  return Math.min(row + col, STAGGER_CAP - 1) * STAGGER_STEP;
}

/**
 * The bento span for a tile, by position. Mobile is untouched — every one of
 * these is a `lg:` class, so a phone gets a uniform two-up grid.
 */
function span(index: number): string {
  if (index === 0) return 'lg:col-span-3 lg:row-span-2';
  if (index <= 2) return 'lg:col-span-3';
  return 'lg:col-span-2';
}

export default function CategoryBento({ categories }: { categories: CategoryTile[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="grain-light section-y relative bg-calico-100">
      <div className="relative mx-auto max-w-shell px-4 sm:px-6">
        <SectionHeading
          eyebrow="Categories"
          heading="Find the shape of your room."
          emphasise="shape"
          href="/shop/all"
          linkLabel="All sofas"
        />

        <div className="grid grid-cols-2 gap-3 lg:auto-rows-[13rem] lg:grid-cols-6 lg:gap-4">
          {categories.map((cat, i) => (
            <Reveal
              key={cat.id}
              delay={diagonalDelay(i)}
              distance={22}
              amount={0.15}
              className={span(i)}
            >
              <Link
                href={`/shop/${cat.slug}`}
                data-cursor="view"
                className="bento group relative block aspect-square w-full overflow-hidden rounded-md bg-calico-200 no-underline shadow-e1 lg:aspect-auto lg:h-full"
              >
                {cat.image_url ? (
                  <Image
                    src={cat.image_url}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 50vw"
                    placeholder="blur"
                    blurDataURL={blurDataURL(cat.image_url)}
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-calico-300" />
                )}

                {/* The scrim. Two stops rather than three: a via-stop at 70%
                    puts a visible band across the middle of the photograph on
                    the tall feature tile, where the gradient has 27rem to
                    travel instead of 15. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-900 via-ink-900/55 to-transparent"
                />

                {/* The corner mark. Glass rather than a solid chip, so it reads
                    as sitting on the photograph rather than punched into it. */}
                <span
                  aria-hidden="true"
                  className="glass-dark-panel absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-pill"
                >
                  <ArrowUpRight className="h-4 w-4 text-calico-50" />
                </span>

                <div className="absolute inset-x-0 bottom-0 p-4 lg:p-5">
                  {/* The rule draws out from under the name on hover, and is
                      already drawn where there is no pointer. */}
                  <span
                    aria-hidden="true"
                    data-bento-rule
                    className="mb-3 block h-0.5 w-10 bg-ember-500"
                  />

                  <h3 className="m-0 font-display text-h3 font-semibold leading-tight text-calico-50 lg:text-[26px]">
                    {cat.name}
                  </h3>

                  <p className="m-0 mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-data text-data tabular-nums">
                    {typeof cat.fromPrice === 'number' && (
                      <span className="text-ember-300">
                        from £{Math.round(cat.fromPrice).toLocaleString('en-GB')}
                      </span>
                    )}
                    {(cat.productCount ?? 0) > 0 && (
                      <span className="text-calico-300">
                        {cat.productCount} {cat.productCount === 1 ? 'sofa' : 'sofas'}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
