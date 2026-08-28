'use client';
// src/components/Home/ClosingCta.tsx

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';
import { Magnetic, Reveal, SplitText } from '@/components/Motion';
import { PROMISES } from '@/constants/promises';
import { HOME_ART, hasArt } from '@/constants/homeArt';
import { blurDataURL, darkened } from '@/utils/cloudinary';

/**
 * The last panel before the footer.
 *
 * It deliberately answers the hero. Same ink ground, same aurora, same ember
 * gradient on the primary action and the same sheen crossing it — so the page
 * closes on the shape it opened with, and the whole scroll reads as one
 * document rather than a run of sections that happen to be stacked.
 *
 * The difference is the composition. The hero is asymmetric, with the copy
 * beside the product; this is centred and has no product in it at all. There is
 * nothing left to look at by this point — the decision is the only thing on the
 * screen.
 *
 * Two actions, and the second one is a phone number rather than another link
 * into the catalogue. Somebody who has scrolled the entire homepage without
 * buying usually has a question, not a browsing problem.
 */
export default function ClosingCta({ fallbackImage }: { fallbackImage?: string | null }) {
  const room = hasArt(HOME_ART.closingRoom) ? HOME_ART.closingRoom : (fallbackImage ?? null);

  return (
    <section
      data-ground="dark"
      className="grad-ink grain section-y relative isolate overflow-hidden bg-ink-900"
    >
      {room && (
        <Image
          src={darkened(room, -38, 8)}
          alt=""
          fill
          sizes="100vw"
          placeholder="blur"
          blurDataURL={blurDataURL(room)}
          className="object-cover opacity-30"
        />
      )}

      <div aria-hidden="true" className="aurora">
        <span className="aurora__warm" />
        <span className="aurora__cool" />
        <span className="aurora__deep" />
      </div>

      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-ink-900/70 via-transparent to-ink-900/80"
      />

      <div className="relative mx-auto max-w-read px-4 text-center sm:px-6">
        <Reveal distance={12} amount={0.3}>
          <p className="eyebrow m-0 flex items-center justify-center gap-3 text-ember-300">
            <span aria-hidden="true" className="block h-px w-10 bg-ember-500" />
            Ready when you are
            <span aria-hidden="true" className="block h-px w-10 bg-ember-500" />
          </p>
        </Reveal>

        <SplitText
          as="h2"
          by="line"
          text={'Your perfect sofa\nis waiting.'}
          emphasise="sofa"
          emphasisClassName="text-shimmer font-light italic"
          amount={0.5}
          className="m-0 mt-6 font-display text-display-l font-semibold leading-none text-calico-50"
        />

        <Reveal delay={0.2} distance={14} amount={0.3}>
          <p className="m-0 mt-6 font-data text-data tabular-nums text-calico-300">
            {PROMISES.payment.short} · {PROMISES.delivery.short} · {PROMISES.guarantee.short}
          </p>
        </Reveal>

        <Reveal delay={0.3} distance={16} amount={0.3}>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:mt-10">
            <Magnetic className="w-full sm:w-auto">
              <Link
                href="/shop/all"
                className="hover-btn sheen btn-ember group flex h-14 w-full items-center justify-center gap-3 rounded-pill bg-ember-500 px-8 text-body font-semibold text-ink-900 no-underline shadow-ember sm:w-auto"
              >
                Shop the collection
                <ArrowRight
                  aria-hidden="true"
                  className="h-5 w-5 transition-transform duration-swift ease-out-expo group-hover:translate-x-1"
                />
              </Link>
            </Magnetic>

            <Link
              href="/contact"
              className="hover-btn hover-btn-dark glass-dark-panel flex h-14 items-center justify-center gap-3 rounded-pill px-8 text-body font-medium text-calico-50 no-underline"
            >
              <Phone aria-hidden="true" className="h-5 w-5 text-ember-300" />
              Speak to someone
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
