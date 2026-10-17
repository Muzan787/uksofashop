// src/components/Editorial/CoverageMap.tsx

import { DELIVERY_DAYS, PROMISES } from '@/constants/promises'

/**
 * Where we deliver, and how long it takes to get there.
 *
 * A schematic of Great Britain rather than an accurate coastline: the question
 * this answers is "which band am I in", and a band is a region, not a shape.
 * Drawing a real outline at this size would add a megabyte of path data to
 * make the Solway Firth correct, which nobody is checking.
 *
 * Every band is also written out in the key beneath, because a map alone is
 * unreadable to a screen reader and unhelpful to anybody who is not sure which
 * blob their town is in.
 */

interface Band {
  id: string
  label: string
  window: string
  places: string
  /** Tailwind fill for the region and the key's swatch. */
  fill: string
  swatch: string
}

// Muaz, 2026-10-17: the postcodes that pay a distance charge take 5-7 days,
// everywhere else on the mainland 2-4, and no van goes out on a Monday. The
// charged band is exactly delivery_distance_fees, so a customer's postcode
// check on the product page always agrees with the band they find here.
const BANDS: Band[] = [
  {
    id: 'core',
    label: 'Most of the UK',
    window: `${DELIVERY_DAYS.usual} · free`,
    places: 'England, Wales and Scotland as far as Perth, Dundee and Fort William: London, the Midlands, the North, Somerset and Dorset included',
    fill: 'fill-ember-500',
    swatch: 'bg-ember-500',
  },
  {
    id: 'far',
    label: 'Devon, Cornwall & the north of Scotland',
    window: `${DELIVERY_DAYS.far} · £40–£100`,
    places: 'Devon and the Aberdeen area £40; Cornwall, the Highlands, Moray and North East Scotland £80; Caithness and Sutherland £100',
    fill: 'fill-ember-500/30',
    swatch: 'bg-ember-500/30',
  },
  {
    id: 'ask',
    label: 'Islands & Northern Ireland',
    window: 'Contact us first',
    places: 'Website orders are for UK Mainland only. For Northern Ireland, the Isle of Man, the Channel Islands, the Scottish islands, the Isle of Wight and the Isles of Scilly, message us for the details',
    fill: 'fill-calico-200',
    swatch: 'bg-calico-200 border border-calico-300',
  },
]

export default function CoverageMap() {
  return (
    <section
      aria-labelledby="coverage-heading"
      className="my-12 overflow-hidden rounded-md border border-calico-300 bg-calico-50"
    >
      <div className="border-b border-calico-300 px-5 py-4">
        <h2 id="coverage-heading" className="m-0 font-display text-h3 font-semibold text-ink-900">
          Where we deliver
        </h2>
        <p className="m-0 mt-1 text-body-sm leading-relaxed text-ink-500">
          Free to most of the UK, with no minimum order; Devon, Cornwall and the north of Scotland pay £40 to £100. How long it takes depends on
          how far the van has to go.
        </p>
      </div>

      <div className="grid gap-6 p-5 sm:grid-cols-[200px_1fr] sm:items-start sm:gap-8">
        <svg
          viewBox="0 0 200 280"
          role="img"
          aria-label="A schematic map of Great Britain: most of it shaded as the free 2 to 4 day band, with Devon, Cornwall and the north of Scotland paler as the 5 to 7 day band."
          className="mx-auto w-full max-w-[200px]"
        >
          {/* The north of Scotland - the charged band: the Highlands, Moray,
              Aberdeen and the far north. */}
          <path
            className={BANDS[1].fill}
            d="M92 8 L112 4 L126 16 L124 34 L134 44 L132 52 L81 52 L82 48 L74 34 L80 16 Z"
          />
          {/* The rest of Scotland - free, the usual band. */}
          <path
            className={BANDS[0].fill}
            d="M81 52 L132 52 L130 60 L118 70 L120 84 L104 92 L88 84 L78 68 Z"
          />
          {/* Wales - the usual band. */}
          <path
            className={BANDS[0].fill}
            d="M62 168 L80 164 L88 176 L84 196 L72 210 L58 206 L52 190 L54 176 Z"
          />
          {/* The North and the Midlands - where we are. */}
          <path
            className={BANDS[0].fill}
            d="M88 92 L110 96 L124 106 L128 124 L134 142 L126 160 L112 172 L90 176 L74 168 L64 150 L70 128 L78 108 Z"
          />
          {/* The South and East. */}
          <path
            className={BANDS[0].fill}
            d="M90 176 L112 172 L134 180 L152 194 L156 212 L142 226 L112 236 L82 232 L60 220 L52 204 L58 206 L72 210 L84 196 Z"
          />
          {/* Devon and Cornwall - the charged band. */}
          <path
            className={BANDS[1].fill}
            d="M82 232 L60 220 L40 232 L24 244 L28 252 L48 248 L70 242 Z"
          />

          {/* Blackburn. Where every van leaves from, which is why the far
              ends of the mainland are the slow, charged band. */}
          <g>
            <circle cx="96" cy="132" r="11" className="fill-ink-900/10" />
            <circle cx="96" cy="132" r="4.5" className="fill-ink-900" />
            <text
              x="96"
              y="156"
              textAnchor="middle"
              className="fill-ink-900 font-data text-[9px] font-bold uppercase tracking-wider"
            >
              Blackburn
            </text>
          </g>
        </svg>

        <dl className="m-0 flex flex-col">
          {/* A <div> inside a <dl> is only legal when it wraps the dt/dd pair
              DIRECTLY. This had the pair nested one div deeper, beside the
              swatch, which left eight dt/dd elements with no description-list
              parent as far as a screen reader was concerned. The swatch is
              now positioned out of the dt rather than sitting in a column of
              its own, so the markup is a real list and the layout is
              unchanged. */}
          {BANDS.map(band => (
            <div
              key={band.id}
              className="border-b border-calico-100 py-3 pl-6 first:pt-0 last:border-b-0 last:pb-0"
            >
              <dt className="relative flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  aria-hidden="true"
                  className={`absolute -left-6 top-1 h-3 w-3 shrink-0 rounded-sm ${band.swatch}`}
                />
                <span className="text-body-sm font-semibold text-ink-900">{band.label}</span>
                <span className="font-data text-caption font-semibold uppercase tracking-wider text-ember-700">
                  {band.window}
                </span>
              </dt>
              <dd className="m-0 mt-1 text-caption leading-relaxed text-ink-500">
                {band.places}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="m-0 border-t border-calico-300 bg-calico-100 px-5 py-4 text-caption leading-relaxed text-ink-500">
        Enter your postcode on any sofa page to see the charge and the dates for your address,
        before you order. {PROMISES.delivery.deliveryDays}
      </p>
    </section>
  )
}
