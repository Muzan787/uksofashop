'use client'
// src/app/build/steps/SeatsStep.tsx

import { AnimatePresence, motion } from 'framer-motion'
import { Check, PencilLine } from 'lucide-react'
import Field from '@/components/UI/Field'
import { DUR, EASE } from '@/components/Motion'
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe'
import type { BuildSize } from '../catalogue'
import { CUSTOM_SIZE, type BackPreference } from '../state'
import { SeatDiagram, StepHeading, pounds } from './ui'

interface Props {
  sizes: BuildSize[]
  sizeKey: string | null
  customSeats: string
  back: BackPreference
  onSize: (key: string) => void
  onCustomSeats: (text: string) => void
  onBack: (pref: BackPreference) => void
}

const BACKS: { key: BackPreference; label: string; detail: string }[] = [
  { key: 'High Back', label: 'High back', detail: 'Tall fixed cushions that support your head and neck.' },
  { key: 'Scattered Back', label: 'Scatter back', detail: 'Loose cushions you can plump, swap and rearrange.' },
  { key: 'either', label: 'Show me both', detail: 'Decide on the design step, where you can see the two side by side.' },
]

/**
 * Step one: how big, and what kind of back.
 *
 * The sizes are the sizes we make and nothing else - each tile is a size at
 * least one made-to-order frame comes in, with the number of designs and the
 * cheapest of them, so a customer knows before tapping that a U-shape is a
 * narrower field than a 3 seater. "Something else" is the only free field,
 * because a request we cannot draw a diagram of is a conversation, and the
 * summary screen says so.
 */
export default function SeatsStep({ sizes, sizeKey, customSeats, back, onSize, onCustomSeats, onBack }: Props) {
  const reduced = useReducedMotionSafe()
  const transition = { duration: reduced ? 0 : DUR.base, ease: EASE.out }
  const custom = sizeKey === CUSTOM_SIZE

  return (
    <div>
      <StepHeading
        eyebrow="Step 1 of 7"
        title="How many seats?"
        lead="Every size below is one we build to order. Tap the one that fits your room — or tell us if you need something we haven't listed."
      />

      <ul role="list" aria-label="Size" className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
        {sizes.map(size => {
          const on = size.key === sizeKey
          return (
            <li key={size.key}>
              <button
                type="button"
                onClick={() => onSize(size.key)}
                aria-pressed={on}
                className={`hover-btn relative flex h-full w-full cursor-pointer flex-col rounded-md border bg-calico-50 p-3.5 text-left transition-[border-color,box-shadow,background-color] duration-swift ease-out-expo sm:p-4 ${
                  on
                    ? 'border-ember-500 bg-ember-50 shadow-[0_0_0_1px_var(--color-ember-500)]'
                    : 'border-calico-300 shadow-e1'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-pill bg-ember-500 text-ink-900 transition-[opacity,transform] duration-swift ease-out-expo ${
                    on ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>

                <SeatDiagram
                  shape={size.shape}
                  className={`h-12 w-[72px] transition-colors duration-swift ease-out-expo ${on ? 'text-ember-700' : 'text-ink-500'}`}
                />

                <span className="mt-3 block text-body-sm font-semibold leading-tight text-ink-900">
                  {size.label}
                </span>
                <span className="mt-0.5 block text-caption leading-snug text-ink-500">{size.detail}</span>
                <span className="mt-2 block font-data text-caption tabular-nums text-ink-700">
                  {size.designs} {size.designs === 1 ? 'design' : 'designs'} · from {pounds(size.from)}
                </span>
              </button>
            </li>
          )
        })}

        <li>
          <button
            type="button"
            onClick={() => onSize(CUSTOM_SIZE)}
            aria-pressed={custom}
            className={`hover-btn relative flex h-full w-full cursor-pointer flex-col rounded-md border border-dashed p-3.5 text-left transition-[border-color,box-shadow,background-color] duration-swift ease-out-expo sm:p-4 ${
              custom
                ? 'border-ember-500 bg-ember-50 shadow-[0_0_0_1px_var(--color-ember-500)]'
                : 'border-ink-400 bg-calico-100'
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-pill bg-ember-500 text-ink-900 transition-[opacity,transform] duration-swift ease-out-expo ${
                custom ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
              }`}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <span className={`grid h-12 w-12 place-items-center rounded-sm ${custom ? 'bg-ember-500/20 text-ember-700' : 'bg-calico-200 text-ink-500'}`}>
              <PencilLine aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="mt-3 block text-body-sm font-semibold leading-tight text-ink-900">
              Something else
            </span>
            <span className="mt-0.5 block text-caption leading-snug text-ink-500">
              A size we haven&apos;t listed
            </span>
            <span className="mt-2 block font-data text-caption text-ink-700">Quoted on the phone</span>
          </button>
        </li>
      </ul>

      <AnimatePresence initial={false}>
        {custom && (
          <motion.div
            key="custom"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <Field
                label="What size do you have in mind?"
                name="customSeats"
                type="textarea"
                rows={3}
                value={customSeats}
                onChange={onCustomSeats}
                maxLength={300}
                hint="A seat count, a width, or the shape of the room — e.g. “a 2.5 seater about 210 cm wide”, “a six-seat corner for an alcove”."
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Back style ────────────────────────────────────────────────────── */}
      <div className="mt-8 sm:mt-10">
        <h3 className="m-0 font-body text-h3 font-semibold text-ink-900">High back or scatter back?</h3>
        <p className="m-0 mt-1.5 max-w-read text-body-sm leading-relaxed text-ink-700">
          Most of our designs come both ways. If you already know, we&apos;ll show you only that
          one — you can still switch on the next step.
        </p>

        <div role="group" aria-label="Back style" className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {BACKS.map(b => {
            const on = b.key === back
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => onBack(b.key)}
                aria-pressed={on}
                className={`hover-btn relative flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3.5 text-left transition-[border-color,background-color] duration-swift ease-out-expo ${
                  on ? 'border-ember-500 bg-ember-50' : 'border-calico-300 bg-calico-50'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-pill border transition-colors duration-swift ease-out-expo ${
                    on ? 'border-ember-500 bg-ember-500' : 'border-ink-400 bg-calico-50'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-pill bg-ink-900 transition-transform duration-swift ease-out-expo ${on ? 'scale-100' : 'scale-0'}`} />
                </span>
                <span className="min-w-0">
                  <span className="block text-body-sm font-semibold text-ink-900">{b.label}</span>
                  <span className="mt-0.5 block text-caption leading-snug text-ink-500">{b.detail}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
