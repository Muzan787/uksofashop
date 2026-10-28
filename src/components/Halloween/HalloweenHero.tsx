// src/components/Halloween/HalloweenHero.tsx

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Magnetic, Parallax, Reveal, SplitText } from '@/components/Motion';
import { PROMISES } from '@/constants/promises';
import { MIDNIGHT_HREF } from '@/constants/halloween';
import { blurDataURL, darkened } from '@/utils/cloudinary';
import { Bat, Pumpkin, Web } from './Icons';
import styles from './Halloween.module.css';

interface Props {
  /** The black colourway's photograph - a sofa in a dark room. */
  image: string | null;
  title: string;
  /** Straight to the black colourway. */
  href: string;
  price: number;
  wasPrice: number | null;
}

/**
 * The homepage hero for Halloween 2026.
 *
 * It is Home/Hero.tsx's stage with the lights turned down, not a new design:
 * the same section, height budget, aurora, grain, pool of light and contact
 * shadow, so the header floats over it exactly as it does over the usual
 * hero and the announcement bar still meets its top edge without a seam.
 * Read that file for why each of those is the way it is.
 *
 * What changes: a moon and three bats where the indigo fill shines, a black
 * sofa photographed in a dark room in the framed panel (the composition
 * Hero.tsx uses when it has no cut-out), a web across the frame's corner,
 * and the copy. The headline keeps the usual one's shape and length -
 * "Sink into something beautiful." becomes "...spooky." - so it wraps
 * exactly as the height budget expects.
 */

const money = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;

export default function HalloweenHero({ image, title, href, price, wasPrice }: Props) {
  const reduced = typeof wasPrice === 'number' && wasPrice > price;

  return (
    <section
      data-ground="dark"
      className="grain relative isolate flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-ink-900 lg:min-h-[calc(100svh-2.5rem)]"
    >
      <div aria-hidden="true" className="aurora">
        <span className="aurora__warm" />
        <span className="aurora__cool" />
        <span className="aurora__deep" />
      </div>

      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-900 via-ink-900/55 to-transparent"
      />

      {/* The night sky. Behind the stage, so the photograph can overlap the
          moon on a wide screen rather than the other way round. */}
      <span aria-hidden="true" className={styles.moon} />
      <Bat className={`${styles.bat} ${styles.bat1}`} />
      <Bat className={`${styles.bat} ${styles.bat2}`} />
      <Bat className={`${styles.bat} ${styles.bat3}`} />

      <div className="relative mx-auto flex w-full max-w-shell flex-1 flex-col gap-2 px-4 pb-1 pt-[4.25rem] sm:px-6 lg:grid lg:grid-cols-[1.04fr_1fr] lg:items-center lg:gap-12 lg:pb-10 lg:pt-28">
        <div className="shrink-0">
          <Reveal distance={12} amount={0.1} className="inline-block">
            <span className="ring-gradient glass-dark-panel inline-flex items-center gap-2.5 rounded-pill py-2 pl-3 pr-4">
              <Pumpkin className="h-4 w-4 shrink-0 text-ember-500" />
              <span className="eyebrow text-calico-50">Halloween picks</span>
              <span aria-hidden="true" className="h-3 w-px bg-calico-50/25" />
              <span className="font-data text-caption text-ember-300">{PROMISES.payment.label}</span>
            </span>
          </Reveal>

          <SplitText
            as="h1"
            by="word"
            text="Sink into something spooky."
            emphasise="spooky."
            emphasisClassName="text-shimmer font-light italic"
            amount={0.1}
            className="mt-4 max-w-[11ch] font-display text-display-xl font-semibold text-calico-50 lg:text-display-l"
          />

          {/* Two lines on a phone, the same length as the usual hero's line,
              for the same reason - see Hero.tsx. */}
          <Reveal delay={0.25} distance={16} amount={0.1}>
            <p className="mt-3 max-w-[44ch] text-body text-calico-300 sm:text-lead">
              Midnight sofas for movie night. Delivered free. Pay on arrival.
            </p>
          </Reveal>

          <Reveal delay={0.35} distance={16} amount={0.1}>
            <div className="mt-5 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
              <Magnetic className="w-full sm:w-auto">
                <Link
                  href={MIDNIGHT_HREF}
                  className="hover-btn sheen btn-ember group flex h-14 w-full items-center justify-center gap-3 rounded-pill bg-ember-500 px-8 text-body font-semibold text-ink-900 no-underline shadow-ember sm:w-auto"
                >
                  Shop midnight sofas
                  <ArrowRight
                    aria-hidden="true"
                    className="h-5 w-5 transition-transform duration-swift ease-out-expo group-hover:translate-x-1"
                  />
                </Link>
              </Magnetic>

              <Link
                href="/shop/all"
                className="hover-btn hover-btn-dark glass-dark-panel flex h-14 items-center justify-center gap-2 rounded-pill px-7 text-body font-medium text-calico-50 no-underline"
              >
                Shop all sofas
              </Link>
            </div>
          </Reveal>
        </div>

        {/* The sofa. The box is the usual hero's, bled to both edges on a
            phone; the photograph is square and centred, so the crop keeps the
            sofa and loses ceiling and floor. */}
        <div className="relative -mx-4 aspect-[1254/714] sm:-mx-6 lg:mx-0 lg:aspect-[5/4]">
          <Parallax speed={0.1} className="absolute inset-0">
            <span
              aria-hidden="true"
              className="spotlight left-1/2 top-[54%] h-[125%] w-[142%] -translate-x-1/2 -translate-y-1/2"
            />

            <div className="float-slow shadow-float absolute inset-0 overflow-hidden rounded-lg ring-1 ring-calico-50/12">
              {image ? (
                <Image
                  src={darkened(image, -8, 10)}
                  alt={`${title} sofa in black`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  placeholder="blur"
                  blurDataURL={blurDataURL(image)}
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-calico-300/10" />
              )}
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-ink-900/50 via-transparent to-transparent"
              />
              <Web className={styles.web} />
            </div>

            <span
              aria-hidden="true"
              className="contact-shadow contact-breathe bottom-[3%] left-1/2 h-[9%] w-[74%] -translate-x-1/2"
            />

            <Link
              href={href}
              aria-label={[title, reduced ? `now ${money(price)}, was ${money(wasPrice!)}` : `from ${money(price)}`].join(', ')}
              className="glass-dark-panel hover-btn hover-btn-dark absolute bottom-[26%] left-4 z-raised flex items-center gap-2.5 rounded-pill py-2.5 pl-4 pr-3 no-underline sm:left-6 lg:bottom-[22%] lg:left-0"
            >
              <span className="eyebrow text-calico-300">{reduced ? 'Now' : 'From'}</span>
              <span className="font-data text-body font-semibold tabular-nums text-calico-50">
                {money(price)}
              </span>
              {reduced && (
                <s className="font-data text-caption tabular-nums text-calico-300">
                  {money(wasPrice!)}
                </s>
              )}
              <ArrowRight aria-hidden="true" className="h-4 w-4 text-ember-300" />
            </Link>
          </Parallax>
        </div>
      </div>

      <div className="relative mx-auto hidden w-full max-w-shell items-center justify-between gap-4 border-t border-calico-50/10 px-4 py-3 sm:px-6 lg:flex">
        <p className="m-0 font-data text-caption tabular-nums text-calico-300">
          <Link href={href} className="hover-link text-calico-300 no-underline">
            Shown: <span className="text-calico-50">{title}</span>, in black
          </Link>
        </p>

        <span
          aria-hidden="true"
          className="flex shrink-0 items-center gap-3 font-data text-caption uppercase tracking-widest text-calico-300"
        >
          Scroll
          <span className="cue-rail h-7" />
        </span>
      </div>
    </section>
  );
}
