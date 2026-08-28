'use client'
// src/app/size-guide/DoorwayCalculator.tsx

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, DoorOpen, HelpCircle } from 'lucide-react'
import { parseDimensions } from '@/components/Product/dimensions'

export interface CalculatorProduct {
  title: string
  href: string
  sizeLabel: string | null
  /** The raw admin string. Empty where nobody has recorded one. */
  dimensions: string
}

/**
 * Clearance between the sofa and the door frame.
 *
 * Not a safety margin so much as an acknowledgement that a sofa is carried by
 * two people who need somewhere to put their hands, and that door frames are
 * rarely as square as the tape measure suggests.
 */
const CLEARANCE = 5

/** How much comes off the height once the feet are unscrewed. */
const LEG_HEIGHT = 10

/** The common UK door widths, so nobody has to go and find a tape measure. */
const PRESETS = [
  { width: 686, label: '686mm', note: 'Narrow internal (2ft 3in)' },
  { width: 762, label: '762mm', note: 'Standard internal (2ft 6in)' },
  { width: 838, label: '838mm', note: 'Wide internal or front door (2ft 9in)' },
  { width: 926, label: '926mm', note: 'Double or patio door' },
]

/**
 * Will it go through the door.
 *
 * A sofa goes through a doorway on its side, so the measurement that decides
 * it is not the length — it is the cross-section, which is the smaller of the
 * depth and the height. On these sofas the feet unscrew, so the height being
 * compared is the height less the legs.
 *
 * The honest part of this is the third column. Only one product in the
 * catalogue currently has its dimensions recorded, so rather than inventing a
 * depth for the other twenty-five or quietly leaving them out of the results,
 * they are listed as unknown with a route to a real answer. A calculator that
 * silently omits most of the shop is worse than one that says what it does not
 * know.
 */
export default function DoorwayCalculator({ products }: { products: CalculatorProduct[] }) {
  const [mm, setMm] = useState('')

  const doorWidth = Number(mm)
  const valid = Number.isFinite(doorWidth) && doorWidth >= 400 && doorWidth <= 2000

  /** The biggest sofa cross-section that will go through, in centimetres. */
  const maxDepth = valid ? Math.floor(doorWidth / 10) - CLEARANCE : null

  const { fits, tight, wont, unknown } = useMemo(() => {
    const fits: CalculatorProduct[] = []
    const tight: CalculatorProduct[] = []
    const wont: CalculatorProduct[] = []
    const unknown: CalculatorProduct[] = []

    for (const p of products) {
      const d = parseDimensions(p.dimensions)
      // The narrowest way it can be turned: depth, or height once the legs are
      // off, whichever is less.
      const candidates = [
        d.depth,
        d.height === undefined ? undefined : d.height - LEG_HEIGHT,
      ].filter((n): n is number => typeof n === 'number' && n > 0)

      if (candidates.length === 0 || maxDepth === null) {
        unknown.push(p)
        continue
      }

      const section = Math.min(...candidates)
      if (section <= maxDepth) fits.push(p)
      else if (section <= maxDepth + CLEARANCE) tight.push(p)
      else wont.push(p)
    }

    return { fits, tight, wont, unknown }
  }, [products, maxDepth])

  return (
    <section
      aria-labelledby="calc-heading"
      className="my-12 overflow-hidden rounded-md border border-calico-300 bg-calico-50"
    >
      <div className="flex items-start gap-4 border-b border-calico-300 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-ember-500/12">
          <DoorOpen aria-hidden="true" className="h-5 w-5 text-ember-700" />
        </span>
        <div className="min-w-0">
          <h2 id="calc-heading" className="m-0 font-display text-h3 font-semibold text-ink-900">
            Will it fit through your door?
          </h2>
          <p className="m-0 mt-1 text-body-sm leading-relaxed text-ink-500">
            Measure the narrowest point of the open doorway — frame edge to the face of the open
            door, not the frame’s outer width.
          </p>
        </div>
      </div>

      <div className="p-5">
        <label htmlFor="door-width" className="block font-data text-eyebrow uppercase tracking-[0.14em] text-ink-500">
          Your door width
        </label>

        <div className="mt-3 flex items-baseline gap-3">
          <input
            id="door-width"
            type="number"
            inputMode="numeric"
            min={400}
            max={2000}
            value={mm}
            onChange={e => setMm(e.target.value)}
            placeholder="762"
            className="w-full max-w-[220px] border-0 border-b border-calico-300 bg-transparent pb-2 font-display text-h1 font-semibold tabular-nums text-ink-900 focus-ring-inset rounded-sm transition-colors duration-swift ease-out-expo placeholder:text-ink-400 focus:border-ember-700 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="font-data text-lead font-bold text-ink-500">mm</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.width}
              type="button"
              onClick={() => setMm(String(p.width))}
              aria-pressed={doorWidth === p.width}
              className={`flex min-h-11 flex-col items-start justify-center rounded-sm border px-3 py-1.5 text-left transition-colors duration-swift ease-out-expo ${
                doorWidth === p.width
                  ? 'border-ember-500 bg-ember-500/12'
                  : 'border-calico-300 bg-calico-100 hover:border-ink-400'
              }`}
            >
              <span className="font-data text-caption font-bold tabular-nums text-ink-900">{p.label}</span>
              <span className="text-caption text-ink-500">{p.note}</span>
            </button>
          ))}
        </div>

        {/* ── The answer ────────────────────────────────────────────────── */}
        {valid && maxDepth !== null && (
          <div
            aria-live="polite"
            className="mt-8 motion-safe:animate-[fadeUp_var(--dur-base)_var(--ease-out-expo)]"
          >
            <div className="rounded-md bg-ink-900 p-5">
              <p className="m-0 font-data text-eyebrow uppercase tracking-[0.16em] text-calico-300">
                Through a {doorWidth}mm door
              </p>
              <p className="m-0 mt-2 font-display text-h2 font-semibold leading-tight text-calico-50">
                Any sofa up to{' '}
                <span className="font-data tabular-nums text-ember-300">{maxDepth}cm</span> deep
              </p>
              <p className="m-0 mt-3 text-body-sm leading-relaxed text-calico-300">
                That is your door width less {CLEARANCE}cm of hand room. Our sofas have removable
                feet, which takes about {LEG_HEIGHT}cm off the height — so a sofa slightly too deep
                may still go through turned on its back.
              </p>
            </div>

            <Bucket
              tone="fits"
              icon={Check}
              heading={`${fits.length} ${fits.length === 1 ? 'sofa fits' : 'sofas fit'} comfortably`}
              items={fits}
              empty="None of the sofas we have measured clear this width comfortably."
            />
            <Bucket
              tone="tight"
              icon={AlertTriangle}
              heading={`${tight.length} would be tight`}
              items={tight}
              note="Within 5cm either way. Possible, but talk to us before you order."
              hideWhenEmpty
            />
            <Bucket
              tone="wont"
              icon={AlertTriangle}
              heading={`${wont.length} will not go through`}
              items={wont}
              hideWhenEmpty
            />
            <Bucket
              tone="unknown"
              icon={HelpCircle}
              heading={`${unknown.length} we have not measured yet`}
              items={unknown}
              note="We have not recorded a depth for these. Send us your door width and the sofa you are after and we will measure it and tell you honestly."
              hideWhenEmpty
            />
          </div>
        )}

        {mm && !valid && (
          <p className="m-0 mt-6 text-body-sm text-rust-700" role="alert">
            That does not look like a door width. UK doorways are usually between 600 and 1000mm.
          </p>
        )}
      </div>
    </section>
  )
}

const TONE = {
  fits: { border: 'border-sage-700', icon: 'text-sage-700', chip: 'bg-sage-50' },
  tight: { border: 'border-ember-500', icon: 'text-ember-700', chip: 'bg-ember-500/10' },
  wont: { border: 'border-rust-700', icon: 'text-rust-700', chip: 'bg-rust-50' },
  unknown: { border: 'border-calico-300', icon: 'text-ink-500', chip: 'bg-calico-100' },
} as const

function Bucket({
  tone, icon: Icon, heading, items, note, empty, hideWhenEmpty,
}: {
  tone: keyof typeof TONE
  icon: React.ElementType
  heading: string
  items: CalculatorProduct[]
  note?: string
  empty?: string
  hideWhenEmpty?: boolean
}) {
  if (items.length === 0 && hideWhenEmpty) return null

  const t = TONE[tone]

  return (
    <div className={`mt-4 rounded-md border-l-2 ${t.border} ${t.chip} p-4`}>
      <p className="m-0 flex items-center gap-2 text-body-sm font-semibold text-ink-900">
        <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${t.icon}`} />
        {heading}
      </p>

      {note && <p className="m-0 mt-2 text-caption leading-relaxed text-ink-500">{note}</p>}

      {items.length > 0 ? (
        <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
          {items.map(p => (
            <li key={p.href}>
              <Link
                href={p.href}
                className="inline-flex min-h-9 items-center rounded-pill border border-calico-300 bg-calico-50 px-3 text-caption font-semibold text-ink-900 no-underline transition-colors duration-swift ease-out-expo hover:border-ink-400"
              >
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        empty && <p className="m-0 mt-2 text-caption text-ink-500">{empty}</p>
      )}
    </div>
  )
}
