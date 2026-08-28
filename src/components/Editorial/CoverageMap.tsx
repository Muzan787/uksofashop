// src/components/Editorial/CoverageMap.tsx

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

const BANDS: Band[] = [
  {
    id: 'core',
    label: 'The North & Midlands',
    window: '2–3 working days',
    places: 'Lancashire, Greater Manchester, Yorkshire, Merseyside, Cheshire, the Midlands',
    fill: 'fill-ember-500',
    swatch: 'bg-ember-500',
  },
  {
    id: 'south',
    label: 'The South & East',
    window: '3–4 working days',
    places: 'London, the Home Counties, the South West, East Anglia, the North East',
    fill: 'fill-ember-500/45',
    swatch: 'bg-ember-500/45',
  },
  {
    id: 'far',
    label: 'Wales & Scotland',
    window: '5–7 working days',
    places: 'All of Wales, and Scotland up to the central belt and beyond',
    fill: 'fill-ember-500/20',
    swatch: 'bg-ember-500/20',
  },
  {
    id: 'ask',
    label: 'Islands & Northern Ireland',
    window: 'Ask us first',
    places: 'Northern Ireland, the Scottish Islands, the Isle of Man, the Channel Islands',
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
          Free to every UK Mainland address, with no minimum order. How long it takes depends on
          how far the van has to go.
        </p>
      </div>

      <div className="grid gap-6 p-5 sm:grid-cols-[200px_1fr] sm:items-start sm:gap-8">
        <svg
          viewBox="0 0 200 280"
          role="img"
          aria-label="A schematic map of Great Britain shaded into three delivery bands, darkest across the North and Midlands where delivery is quickest."
          className="mx-auto w-full max-w-[200px]"
        >
          {/* Scotland — the far band, palest. */}
          <path
            className={BANDS[2].fill}
            d="M92 8 L112 4 L126 16 L124 34 L134 44 L130 60 L118 70 L120 84 L104 92 L88 84 L78 68 L82 48 L74 34 L80 16 Z"
          />
          {/* Wales — the same band. */}
          <path
            className={BANDS[2].fill}
            d="M62 168 L80 164 L88 176 L84 196 L72 210 L58 206 L52 190 L54 176 Z"
          />
          {/* The North and the Midlands — the darkest band, and where we are. */}
          <path
            className={BANDS[0].fill}
            d="M88 92 L110 96 L124 106 L128 124 L134 142 L126 160 L112 172 L90 176 L74 168 L64 150 L70 128 L78 108 Z"
          />
          {/* The South and East. */}
          <path
            className={BANDS[1].fill}
            d="M90 176 L112 172 L134 180 L152 194 L156 212 L142 226 L112 236 L82 232 L60 220 L52 204 L58 206 L72 210 L84 196 Z"
          />

          {/* Blackburn. Where every van leaves from, which is the reason the
              band around it is the quick one. */}
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
          {BANDS.map(band => (
            <div
              key={band.id}
              className="flex gap-3 border-b border-calico-100 py-3 first:pt-0 last:border-b-0 last:pb-0"
            >
              <span
                aria-hidden="true"
                className={`mt-1.5 h-3 w-3 shrink-0 rounded-sm ${band.swatch}`}
              />
              <div className="min-w-0">
                <dt className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-body-sm font-semibold text-ink-900">{band.label}</span>
                  <span className="font-data text-caption font-semibold uppercase tracking-wider text-ember-700">
                    {band.window}
                  </span>
                </dt>
                <dd className="m-0 mt-1 text-caption leading-relaxed text-ink-500">
                  {band.places}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      <p className="m-0 border-t border-calico-300 bg-calico-100 px-5 py-4 text-caption leading-relaxed text-ink-500">
        Around 90% of orders arrive inside the window for their band. We cannot always tell which
        band a postcode falls into at the point of ordering — if yours is going to take longer,
        we will tell you as soon as the order reaches us, not on the day.
      </p>
    </section>
  )
}
