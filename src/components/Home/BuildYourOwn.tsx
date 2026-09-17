// src/components/Home/BuildYourOwn.tsx

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Package, Palette, PhoneCall, Footprints } from 'lucide-react';
import { Reveal, SplitText } from '@/components/Motion';
import { staggerDelay } from '@/components/Motion/tokens';
import { FEET } from '@/constants/feet';
import { blurDataURL, darkened } from '@/utils/cloudinary';

export interface BuildTeaser {
  /** The sofa on the board: a made-to-order frame, photographed. */
  image: string | null;
  title: string | null;
  /** The cheapest 3 seater we build. Null hides the price chip. */
  threeSeaterFrom: number | null;
  /** Colours in the library. */
  fabricCount: number;
  /** Three swatches for the fabric chip. */
  swatches: { image: string | null; hex: string | null; name: string }[];
}

/** The seven steps, as the builder names them. */
const STEPS = ['Seats', 'Design', 'Fabric', 'Feet', 'Piping', 'Extras', 'Summary'];

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  BUILD YOUR OWN
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The one thing this shop does that a warehouse cannot, given its own section
 * high on the page — third, straight after the first sofas, before the
 * categories. Somebody who has just seen six frames and not found theirs is
 * the person this is for, and it should reach them before they conclude the
 * range is the range.
 *
 * INK, NOT INDIGO. It borrows the hero's stage - the same gradient, the same
 * aurora, the same ember on the primary action - because it is the hero's
 * argument continued: the sofa you want, made. Indigo is spent on "how this
 * works" further down and is not touched here.
 *
 * THE BOARD, not another cut-out. The hero already floats a sofa over a pool
 * of light, and two of those on one page is a template. This is a
 * specification card instead: the photograph of a real made-to-order frame,
 * with three chips pinned to it that are each a true figure - the fabric
 * count, the feet count, the cheapest three seater - and a miniature of the
 * builder's own step rail under it, so the card reads as a preview of the
 * page it links to rather than as an advert for it.
 *
 * ON A PHONE the heading comes first, then the board, then the steps and the
 * button - so the picture is the second thing seen and the button is never
 * more than a thumb-flick below it. The grid re-places the same three blocks
 * into two columns from lg; nothing is duplicated.
 */
export default function BuildYourOwn({ teaser }: { teaser: BuildTeaser }) {
  const feetCount = FEET.length;
  // The rose-gold fluted shell, the most photogenic foot in the range, on the
  // feet chip. A constant rather than a query: the feet are a constant.
  const footImage =
    FEET.find(f => f.code === 'SF015G')?.finishes.find(x => x.key === 'rose-gold')?.image ??
    FEET[0]?.finishes[0]?.image ??
    null;

  const facts = [
    { icon: Palette, text: `${teaser.fabricCount} fabrics, every one the same price` },
    { icon: Footprints, text: `${feetCount} styles of feet, or keep the ones in the photograph` },
    { icon: PhoneCall, text: 'We ring you to confirm every detail before it is made' },
  ];

  return (
    <section
      data-ground="dark"
      aria-labelledby="build-your-own-heading"
      className="grad-ink grain section-y relative isolate overflow-hidden bg-ink-900 text-calico-50"
    >
      <div aria-hidden="true" className="aurora">
        <span className="aurora__warm" />
        <span className="aurora__cool" />
        <span className="aurora__deep" />
      </div>

      <div className="relative mx-auto max-w-shell px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:grid-rows-[auto_auto] lg:items-center lg:gap-x-14 lg:gap-y-0">
          {/* ── The heading ─────────────────────────────────────────────── */}
          <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
            <Reveal distance={14} amount={0.3}>
              <p className="eyebrow m-0 flex items-center gap-3 text-ember-300">
                <span aria-hidden="true" className="block h-px w-8 bg-ember-500" />
                Made to order
              </p>
            </Reveal>

            <SplitText
              as="h2"
              by="word"
              text="Build your own sofa."
              emphasise="own"
              emphasisClassName="text-shimmer font-light italic"
              amount={0.3}
              className="m-0 mt-2.5 max-w-[12ch] font-display text-h1 font-semibold text-calico-50"
            />
            {/* aria-labelledby wants an id, and SplitText owns its own element. */}
            <span id="build-your-own-heading" className="sr-only">Build your own sofa</span>

            <Reveal delay={0.15} distance={12} amount={0.2}>
              <p className="m-0 mt-4 max-w-[46ch] text-body leading-relaxed text-calico-300 lg:text-lead">
                Choose the seats, the design, the fabric, the feet and the piping. Seven quick
                steps, a guide price at the end, and nothing to pay until it&apos;s in your room.
              </p>
            </Reveal>
          </div>

          {/* ── The board ───────────────────────────────────────────────── */}
          <Reveal
            distance={28}
            amount={0.2}
            className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1"
          >
            {/* The pool of light the card sits in. */}
            <span
              aria-hidden="true"
              className="spotlight left-1/2 top-[58%] h-[130%] w-[140%] -translate-x-1/2 -translate-y-1/2"
            />

            <div className="hover-card relative overflow-hidden rounded-lg bg-ink-900 shadow-float ring-1 ring-calico-50/12">
              <div data-card-media className="relative aspect-[4/3] w-full overflow-hidden bg-ink-900">
                {teaser.image ? (
                  <Image
                    src={darkened(teaser.image, -6, 8)}
                    alt={teaser.title ? `${teaser.title}, one of the designs you can build` : 'A made-to-order sofa'}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    placeholder="blur"
                    blurDataURL={blurDataURL(teaser.image)}
                    className="object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 bg-calico-300/10" />
                )}

                {/* Darkens the foot of the photograph so the chips read, and
                    the top edge a little so the card has a lid. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-transparent to-ink-900/20"
                />

                {/* ── Fabric ──────────────────────────────────────────── */}
                <Reveal delay={staggerDelay(1)} distance={10} amount={0.4} className="absolute left-3 top-3 sm:left-4 sm:top-4">
                  <span className="glass-dark-panel flex items-center gap-2.5 rounded-pill py-1.5 pl-1.5 pr-3.5">
                    <span className="flex -space-x-2" aria-hidden="true">
                      {teaser.swatches.map((s, i) => (
                        <span
                          key={`${s.name}-${i}`}
                          className="relative block h-7 w-7 overflow-hidden rounded-pill bg-calico-200 ring-2 ring-ink-900"
                          style={s.hex ? { background: s.hex } : undefined}
                        >
                          {s.image && (
                            <Image src={s.image} alt="" fill sizes="28px" className="object-cover" />
                          )}
                        </span>
                      ))}
                    </span>
                    <span className="text-caption font-semibold leading-tight text-calico-50">
                      {teaser.fabricCount} fabrics
                      <span className="block font-normal text-calico-300">one price</span>
                    </span>
                  </span>
                </Reveal>

                {/* ── Feet ────────────────────────────────────────────── */}
                <Reveal delay={staggerDelay(2)} distance={10} amount={0.4} className="absolute right-3 top-3 sm:right-4 sm:top-4">
                  <span className="glass-dark-panel flex items-center gap-2.5 rounded-pill py-1.5 pl-1.5 pr-3.5">
                    <span aria-hidden="true" className="relative block h-7 w-7 overflow-hidden rounded-pill bg-white ring-2 ring-ink-900">
                      {footImage && (
                        <Image src={footImage} alt="" fill sizes="28px" className="object-contain p-0.5" />
                      )}
                    </span>
                    <span className="text-caption font-semibold leading-tight text-calico-50">
                      {feetCount} feet
                      <span className="block font-normal text-calico-300">your choice</span>
                    </span>
                  </span>
                </Reveal>

                {/* ── Price ───────────────────────────────────────────── */}
                {teaser.threeSeaterFrom !== null && (
                  <Reveal delay={staggerDelay(3)} distance={10} amount={0.4} className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
                    <span className="ring-gradient glass-dark-panel flex items-baseline gap-2 rounded-pill px-4 py-2">
                      <span className="font-data text-caption uppercase tracking-widest text-calico-300">
                        3 seaters from
                      </span>
                      <span className="tnum font-display text-h3 font-semibold leading-none text-ember-300">
                        £{teaser.threeSeaterFrom.toLocaleString('en-GB')}
                      </span>
                    </span>
                  </Reveal>
                )}

                {teaser.title && (
                  <span className="absolute bottom-4 right-3 hidden font-data text-caption uppercase tracking-widest text-calico-300/80 sm:right-4 sm:block">
                    {teaser.title}
                  </span>
                )}
              </div>

              {/* The builder's own rail, in miniature. The first segment is lit
                  because that is where the link lands: on step one. */}
              <div className="border-t border-calico-50/12 px-4 py-3.5 sm:px-5">
                <ol className="m-0 flex list-none gap-1.5 p-0" aria-label="The seven steps">
                  {STEPS.map((step, i) => (
                    <li key={step} className="min-w-0 flex-1">
                      <span
                        className={`block h-1 rounded-pill ${i === 0 ? 'btn-ember bg-ember-500' : 'bg-calico-50/18'}`}
                      />
                      <span
                        className={`mt-1.5 hidden truncate font-data text-caption uppercase tracking-widest sm:block ${
                          i === 0 ? 'text-calico-50' : 'text-calico-300/60'
                        }`}
                      >
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="m-0 mt-2 font-data text-caption uppercase tracking-widest text-calico-300 sm:hidden">
                  Step 1 of {STEPS.length} — {STEPS[0]}
                </p>
              </div>
            </div>

            {/* The contact shadow under the card. */}
            <span
              aria-hidden="true"
              className="contact-shadow -bottom-[4%] left-1/2 h-[10%] w-[80%] -translate-x-1/2"
            />
          </Reveal>

          {/* ── The steps, the button, the facts ────────────────────────── */}
          <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
            {/* Real list items with a Reveal inside each, rather than Stagger:
                Stagger wraps children in its own element, which under reduced
                motion leaves bare spans inside an <ol>. */}
            {/* One row that scrolls sideways on a phone - seven chips wrap to three
                rows at 375px and push the button most of a screen down. */}
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
              <ol className="m-0 flex w-max list-none gap-2 p-0 sm:w-auto sm:flex-wrap" aria-label="What the builder asks">
              {STEPS.map((step, i) => (
                <li key={step}>
                  <Reveal delay={staggerDelay(i, 0.05)} distance={10} amount={0.2}>
                    <span className="glass-dark-panel inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-pill px-3 text-caption font-semibold text-calico-50">
                      <span className="font-data text-ember-300">{String(i + 1).padStart(2, '0')}</span>
                      {step}
                    </span>
                  </Reveal>
                </li>
              ))}
              </ol>
            </div>

            <Reveal delay={0.1} distance={14} amount={0.2}>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center lg:mt-7">
                <Link
                  href="/build"
                  className="hover-btn btn-ember sheen shadow-ember flex h-14 items-center justify-center gap-2.5 rounded-pill bg-ember-500 px-7 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900 no-underline"
                >
                  Start building
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link
                  href="/swatches"
                  className="hover-btn hover-btn-dark glass-dark-panel flex h-14 items-center justify-center gap-2.5 rounded-pill px-6 text-body-sm font-semibold text-calico-50 no-underline"
                >
                  <Package aria-hidden="true" className="h-4 w-4 text-ember-300" />
                  Free fabric samples first
                </Link>
              </div>
            </Reveal>

            <ul className="m-0 mt-7 flex list-none flex-col gap-2.5 p-0 lg:mt-8">
              {facts.map(({ icon: Icon, text }, i) => (
                <li key={text}>
                  <Reveal delay={0.2 + staggerDelay(i)} distance={10} amount={0.2}>
                    <span className="flex items-start gap-3 text-body-sm leading-relaxed text-calico-300">
                      <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-pill bg-ember-500/20">
                        <Icon className="h-3.5 w-3.5 text-ember-300" strokeWidth={2.25} />
                      </span>
                      {text}
                    </span>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
