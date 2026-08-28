'use client';
// src/components/Home/Hero.tsx

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Magnetic, Parallax, Reveal, SplitText } from '@/components/Motion';
import { PROMISES } from '@/constants/promises';
import { HOME_ART, hasArt } from '@/constants/homeArt';
import { blurDataURL, darkened } from '@/utils/cloudinary';

interface Props {
  /** The sofa in the photograph — a real product, not a stock room. */
  image: string | null;
  /** Its name, so the caption can say what you are looking at. */
  productTitle?: string | null;
  /** Where the photograph's product lives. */
  productHref?: string | null;
  /** Its price, for the chip pinned to the stage. */
  fromPrice?: number | null;
  /** How many sofas are live right now. */
  sofaCount: number;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE HERO — a lit stage, not a photograph with words on it.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The hero this replaces was the same thing every furniture site does: a
 * full-bleed room shot, darkened until the copy was legible, with the headline
 * jammed into the bottom-left corner. It had two problems that no amount of
 * type could fix. The photograph was fighting the words for the same pixels,
 * so both lost. And the sofa — the actual product, the thing being sold — was
 * a detail somewhere inside a picture of a room.
 *
 * This is built the other way round. The room is gone. What is left is a dark
 * stage with three drifting washes of light on it, and the sofa standing in
 * the middle of that light with its own shadow on the floor beneath it. The
 * copy sits beside it rather than on top of it, so nothing is competing.
 *
 * ── The five layers, back to front ──────────────────────────────────────────
 *
 *   0. Ink. A flat ink-900 fill, so the section is already the right colour
 *      before a single gradient or image has painted. It also has to match the
 *      announcement bar directly above it exactly — the header floats over
 *      this section transparently with light type, and any step in tone at the
 *      top edge reads as a seam across the whole width of the page.
 *
 *   1. The room, if one has been generated. Darkened at the source by
 *      Cloudinary and run at low opacity: you should feel a space back there
 *      without being able to name anything in it. Optional, and the hero is
 *      designed to look finished without it.
 *
 *   2. The aurora. Three radial washes — an ember key light top left, an
 *      indigo fill top right, an ember bounce off the floor — each drifting on
 *      its own period between 24 and 38 seconds. They never line up twice, so
 *      the lighting is always slightly different from the last time you looked
 *      at it, and it never reads as a loop.
 *
 *   3. Grain, over the gradients rather than under them. A wide dark gradient
 *      bands visibly on an 8-bit phone panel; noise at half strength breaks the
 *      bands up and gives the whole section the tooth of a printed page.
 *
 *   4. The stage and the copy.
 *
 * ── The sofa ────────────────────────────────────────────────────────────────
 *
 * The centrepiece is a cut-out on a transparent ground (see heroSofa in
 * src/constants/homeArt.ts), floating over a pool of ember light with a
 * contact shadow beneath it. The float and the shadow run on the same nine
 * second period and the shadow tightens as the sofa rises — the inversion is
 * what makes it read as an object at a distance from a floor rather than a
 * sticker with a blur behind it.
 *
 * Until that image exists the same slot renders the newest product's own
 * photograph in a framed panel, with the identical pool of light and contact
 * shadow under it. Both are finished designs. The hero never waits on artwork.
 */

const money = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;

export default function Hero({ image, productTitle, productHref, fromPrice, sofaCount }: Props) {
  const cutout = hasArt(HOME_ART.heroSofa) ? HOME_ART.heroSofa : null;
  const room = hasArt(HOME_ART.heroRoom) ? HOME_ART.heroRoom : null;

  /*
   * WHY THE HEIGHT IS NOT 100svh.
   *
   * The hero does not own the whole screen on a phone. Two fixed bars eat into
   * it: the announcement strip above (2.5rem) pushes the section down, and the
   * bottom navigation below (57px plus its border and safe area) covers the
   * last ~68px of the viewport. At a full 100svh the bottom of this section —
   * the caption rail, the sofa's contact shadow, the point where the ember band
   * begins — sat underneath that navigation and could not be seen at all.
   *
   * 7rem is those two together plus a little over, so the section stops just
   * short of the navigation and a sliver of the ember band shows in the gap.
   * That sliver is deliberate: it is the one honest signal on a phone that
   * there is more page below.
   *
   * Desktop has no bottom navigation, so it only subtracts the announcement.
   */
  return (
    <section
      data-ground="dark"
      className="grain relative isolate flex min-h-[calc(100svh-7rem)] flex-col overflow-hidden bg-ink-900 lg:min-h-[calc(100svh-2.5rem)]"
    >
      {/* ── 1. The room ──────────────────────────────────────────────────── */}
      {room && (
        <Image
          src={darkened(room, -30, 6)}
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          blurDataURL={blurDataURL(room)}
          className="object-cover opacity-30"
        />
      )}

      {/* ── 2. The aurora ────────────────────────────────────────────────── */}
      <div aria-hidden="true" className="aurora">
        <span className="aurora__warm" />
        <span className="aurora__cool" />
        <span className="aurora__deep" />
      </div>

      {/* Deepened at the foot so the section hands over to the ember band
          below it out of shadow rather than out of a bright patch of aurora. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-900 via-ink-900/55 to-transparent"
      />

      {/* ── 4. The stage ─────────────────────────────────────────────────── */}
      <div className="relative mx-auto flex w-full max-w-shell flex-1 flex-col gap-5 px-4 pb-3 pt-20 sm:px-6 lg:grid lg:grid-cols-[1.04fr_1fr] lg:items-center lg:gap-12 lg:pb-10 lg:pt-28">
        {/* ── Copy ──────────────────────────────────────────────────────── */}
        <div className="shrink-0">
          {/* The live badge. A real count of real products, not a claim. */}
          <Reveal distance={12} amount={0.1} className="inline-block">
            <span className="ring-gradient glass-dark-panel inline-flex items-center gap-2.5 rounded-pill py-2 pl-3 pr-4">
              <span aria-hidden="true" className="relative grid h-2 w-2 place-items-center">
                <span className="absolute h-2 w-2 rounded-pill bg-ember-500" />
                <span className="absolute h-2 w-2 rounded-pill bg-ember-500 opacity-60 pulse-dot" />
              </span>
              <span className="eyebrow text-calico-50">{PROMISES.payment.label}</span>
              {sofaCount > 0 && (
                <>
                  <span aria-hidden="true" className="h-3 w-px bg-calico-50/25" />
                  <span className="font-data text-caption tabular-nums text-ember-300">
                    {sofaCount} in stock
                  </span>
                </>
              )}
            </span>
          </Reveal>

          <SplitText
            as="h1"
            by="word"
            text="Sink into something beautiful."
            emphasise="beautiful."
            emphasisClassName="text-shimmer font-light italic"
            amount={0.1}
            className="mt-5 max-w-[11ch] font-display text-display-xl font-semibold text-calico-50 lg:text-display-l"
          />

          {/* Two lines on a phone, and it has to stay two.
              The hero is budgeted to fit one screen — badge, headline, this,
              two buttons, the sofa and the bottom rail — and every line this
              paragraph gains comes straight off the height of the sofa. That is
              also why it steps down to text-body below sm: at text-lead the
              same sentence runs to three lines on a 375px phone, and the sofa
              loses 27px it cannot spare. */}
          <Reveal delay={0.25} distance={16} amount={0.1}>
            <p className="mt-4 max-w-[44ch] text-body text-calico-300 sm:text-lead">
              Made to your size. Delivered free. Paid for on the doorstep.
            </p>
          </Reveal>

          {/* ── The actions ─────────────────────────────────────────────── */}
          <Reveal delay={0.35} distance={16} amount={0.1}>
            <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Magnetic className="w-full sm:w-auto">
                <Link
                  href="/shop/all"
                  className="hover-btn sheen btn-ember group flex h-14 w-full items-center justify-center gap-3 rounded-pill bg-ember-500 px-8 text-body font-semibold text-ink-900 no-underline shadow-ember sm:w-auto"
                >
                  Shop all sofas
                  <ArrowRight
                    aria-hidden="true"
                    className="h-5 w-5 transition-transform duration-swift ease-out-expo group-hover:translate-x-1"
                  />
                </Link>
              </Magnetic>

              <Link
                href="/collection"
                className="hover-btn hover-btn-dark glass-dark-panel flex h-14 items-center justify-center gap-2 rounded-pill px-7 text-body font-medium text-calico-50 no-underline"
              >
                Shop by collection
              </Link>
            </div>
          </Reveal>

          {/* No promise chips here, deliberately.
              An earlier pass on this hero carried Free Delivery / Cash on
              Delivery / Made to Order as a row of icons under the buttons. They
              wrapped to two lines on a phone, cost 80px of the height the sofa
              needed, and repeated the badge above them and the ember band
              immediately below — which scrolls all four promises at a size you
              can actually read. Three statements of the same three facts inside
              one screen is not emphasis, it is noise. */}
        </div>

        {/* ── The sofa ────────────────────────────────────────────────────
            Two elements, and the outer one is load-bearing.

            Parallax renders an inner wrapper at `height: 100%`, and a
            percentage height only resolves against a parent whose own height
            is DEFINITE. A flex item sized by `flex-1` has a computed height but
            its `height` property is still `auto`, so the percentage fell back
            to auto — the wrapper collapsed to zero, and with it the photograph,
            the pool of light and the contact shadow, leaving the price chip to
            land on top of the buttons. It only held together on desktop, where
            `aspect-[5/4]` happened to give the same box a definite height.

            So the outer div takes the flex sizing and Parallax is absolutely
            positioned inside it, which is definite at every breakpoint.

            The negative margin is the other half of the mobile fix. Inside the
            container's 16px gutters the cut-out renders about 315px wide on a
            375px phone and reads as a thumbnail of a sofa rather than a sofa.
            Bleeding it to both edges gains 32px and, more importantly, makes it
            the full width of the screen — which is what a hero product shot has
            to be. The section clips, so nothing overflows the page. */}
        <div className="relative -mx-4 min-h-[170px] flex-1 sm:mx-0 lg:min-h-0 lg:aspect-[5/4]">
          <Parallax speed={0.1} className="absolute inset-0">
            {/* The pool of light it stands in. Wider than the sofa and centred
                low, so the brightest part of it is under the seat rather than
                behind the backrest. */}
            <span
              aria-hidden="true"
              className="spotlight left-1/2 top-[54%] h-[125%] w-[142%] -translate-x-1/2 -translate-y-1/2"
            />

            {cutout ? (
              <div className="float-slow absolute inset-0">
                <Image
                  src={cutout}
                  alt={productTitle ? `${productTitle} sofa` : 'Sofa'}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  className="object-contain object-bottom"
                />
              </div>
            ) : (
              /* No cut-out yet: the newest product, framed. Same light, same
                 shadow, same float — a different composition, not a fallback
                 that looks like one. */
              <div className="float-slow shadow-float absolute inset-0 overflow-hidden rounded-lg ring-1 ring-calico-50/12">
                {image ? (
                  <Image
                    src={darkened(image, -8, 10)}
                    alt={productTitle ? `${productTitle} sofa` : 'Sofa'}
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
              </div>
            )}

            {/* The contact shadow, inside the pool. */}
            <span
              aria-hidden="true"
              className="contact-shadow bottom-[3%] left-1/2 h-[9%] w-[74%] -translate-x-1/2"
            />

            {/* What it costs, pinned to the object rather than buried in a
                caption. The one figure in the hero, and it is a real one.

                Top right on a phone, bottom right from lg. Two reasons, and
                both are about what else is on a phone screen: the WhatsApp
                button floats at the bottom right and the chip landed underneath
                it, and the sofa is bottom-aligned in its box so the top of the
                stage is the empty half. On desktop neither is true.

                It carries the product name in its label because the caption
                rail that used to name the sofa is desktop-only now. */}
            {typeof fromPrice === 'number' && productHref && (
              <Link
                href={productHref}
                aria-label={
                  productTitle
                    ? `${productTitle}, from ${money(fromPrice)}`
                    : `From ${money(fromPrice)}`
                }
                className="glass-dark-panel hover-btn hover-btn-dark absolute right-4 top-0 flex items-center gap-2.5 rounded-pill py-2.5 pl-4 pr-3 no-underline sm:right-0 lg:bottom-[10%] lg:top-auto"
              >
                <span className="eyebrow text-calico-300">From</span>
                <span className="font-data text-body font-semibold tabular-nums text-calico-50">
                  {money(fromPrice)}
                </span>
                <ArrowRight aria-hidden="true" className="h-4 w-4 text-ember-300" />
              </Link>
            )}
          </Parallax>
        </div>
      </div>

      {/* ── The bottom edge ──────────────────────────────────────────────────
          Desktop only, and not as a cosmetic choice. On a phone this row sat
          entirely underneath the fixed bottom navigation — 53px of caption and
          a scroll cue that nobody could see, taken off the height of the sofa
          to render something the navigation was covering. The caption's job
          (naming the sofa, linking to it) is done on mobile by the price chip
          above, and the scroll cue's job is done by the sliver of ember band
          showing beneath this section. */}
      <div className="relative mx-auto hidden w-full max-w-shell items-center justify-between gap-4 border-t border-calico-50/10 px-4 py-3 sm:px-6 lg:flex">
        <p className="m-0 font-data text-caption tabular-nums text-calico-300">
          {productTitle ? (
            productHref ? (
              <Link href={productHref} className="hover-link text-calico-300 no-underline">
                Shown: <span className="text-calico-50">{productTitle}</span>
              </Link>
            ) : (
              <>Shown: {productTitle}</>
            )
          ) : (
            <>New ranges arriving</>
          )}
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
