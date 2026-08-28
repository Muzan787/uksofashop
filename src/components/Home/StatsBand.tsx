'use client';
// src/components/Home/StatsBand.tsx

import Image from 'next/image';
import { CountUp, Reveal, Stagger } from '@/components/Motion';
import { HOME_ART, hasArt } from '@/constants/homeArt';
import { blurDataURL, darkened } from '@/utils/cloudinary';

interface Props {
  /** Active products. */
  sofaCount: number;
  /** Categories on the shop. */
  categoryCount: number;
  /** Matching sets. */
  collectionCount: number;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE FIGURES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every number here is counted, at request time, from the database.
 *
 * That constraint is the whole design. The band this occupies is exactly where
 * a furniture site puts "15,000 Happy Families / 28 Years of Heritage / 4.9
 * Stars", and this site had all three of those until they were removed for
 * being invented. So the rule is that a figure appears here only if something
 * in Postgres can be counted to produce it: how many sofas are live, how many
 * categories they fall into, how many matching sets there are, and the two
 * fixed terms of the offer — nothing paid up front, two to four working days.
 *
 * Four columns, in Geist Mono, tabular. A price or a count that changes width
 * while it animates drags the layout along with it, which is the entire reason
 * that typeface is in the system.
 *
 * CountUp starts AT the final number and only counts once it is both mounted
 * and in view — so the server sends the right figure, a visitor with no
 * JavaScript reads the right figure, and a crawler indexes the right figure.
 */
export default function StatsBand({ sofaCount, categoryCount, collectionCount }: Props) {
  const texture = hasArt(HOME_ART.statsTexture) ? HOME_ART.statsTexture : null;

  /**
   * The last two are not counted because they are not counts — they are the
   * two terms of the offer, and they are fixed. Rendering them in the same
   * treatment is the point: the promise is presented as a specification.
   */
  const figures: { value: number | null; display?: string; label: string; sub: string }[] = [
    { value: sofaCount, label: 'Sofas', sub: 'Live on the site right now' },
    { value: categoryCount, label: 'Styles', sub: 'Corner, fabric, recliner and more' },
    { value: collectionCount, label: 'Sets', sub: 'Matching pieces, sold together' },
    { value: null, display: '£0', label: 'Up front', sub: 'You pay on the doorstep' },
  ];

  return (
    <section
      data-ground="dark"
      aria-label="The shop, in figures"
      className="grad-ink grain section-y relative isolate overflow-hidden bg-ink-900"
    >
      {/* The weave, if it has been generated. Low enough that it is texture
          rather than a photograph — you should read it with your fingers, not
          your eyes. */}
      {texture && (
        <Image
          src={darkened(texture, -40, 10)}
          alt=""
          fill
          sizes="100vw"
          placeholder="blur"
          blurDataURL={blurDataURL(texture)}
          className="object-cover opacity-25"
        />
      )}

      <div aria-hidden="true" className="aurora">
        <span className="aurora__warm" />
        <span className="aurora__deep" />
      </div>

      <div className="relative mx-auto max-w-shell px-4 sm:px-6">
        <Reveal distance={14} amount={0.3}>
          <p className="eyebrow m-0 flex items-center gap-3 text-ember-300">
            <span aria-hidden="true" className="block h-px w-8 bg-ember-500" />
            Where the shop is today
          </p>
        </Reveal>

        {/* Two up on a phone, four across from md.

            Each cell carries its own rule rather than the row carrying
            dividers between cells. A vertical divider only works when every
            cell is the same height, and these are not — the captions run to
            one line or two depending on the copy. The rule leads with an ember
            segment so the row reads as four measurements on a spec sheet. */}
        <Stagger
          distance={18}
          amount={0.2}
          className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 md:mt-10 md:grid-cols-4 md:gap-x-8 md:gap-y-10"
        >
          {figures.map((f) => (
            <div key={f.label}>
              <span aria-hidden="true" className="mb-4 flex w-full lg:mb-5">
                <span className="block h-px w-8 bg-ember-500" />
                <span className="block h-px flex-1 bg-calico-50/12" />
              </span>

              <p className="m-0 font-data text-h1 font-semibold leading-none tabular-nums text-calico-50">
                {f.value === null ? f.display : <CountUp value={f.value} />}
              </p>
              <p className="m-0 mt-3 font-display text-h3 font-semibold text-ember-300">{f.label}</p>
              <p className="m-0 mt-1.5 max-w-[22ch] text-body-sm leading-snug text-calico-300">
                {f.sub}
              </p>
            </div>
          ))}
        </Stagger>

        {/* The delivery term, on its own line under the figures rather than as a
            fifth column — it is a duration, not a count, and putting it in the
            row would have implied it was one. */}
        <Reveal delay={0.3} distance={14} amount={0.2}>
          <p className="ring-gradient glass-dark-panel m-0 mt-9 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-5 py-3 sm:rounded-pill lg:mt-12">
            <span className="font-data text-data font-semibold tabular-nums text-ember-300">
              2–4 working days
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-calico-50/25" />
            <span className="text-body-sm text-calico-300">
              Free delivery to UK mainland, brought to the ground floor
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
