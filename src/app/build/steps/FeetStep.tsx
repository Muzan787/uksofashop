'use client'
// src/app/build/steps/FeetStep.tsx

import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Sofa } from 'lucide-react'
import { DUR } from '@/components/Motion'
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe'
import { blurDataURL } from '@/utils/cloudinary'
import { FEET, type FeetStyle } from '@/constants/feet'
import type { BuildDesign } from '../catalogue'
import type { FeetChoice } from '../state'
import { StepHeading } from './ui'

interface Props {
  design: BuildDesign | null
  feet: FeetChoice | 'pictured' | null
  onPictured: () => void
  onChoose: (choice: FeetChoice) => void
}

const GROUPS: { key: FeetStyle['group']; label: string }[] = [
  { key: 'metal', label: 'Metal' },
  { key: 'wood', label: 'Wood' },
  { key: 'plain', label: 'Out of sight' },
]

/**
 * Step four: what it stands on.
 *
 * The product pages do not offer feet at all - a stocked sofa comes on the
 * feet it was photographed with - and the made-to-order flow deliberately
 * left them for a later phase. This is that phase, and it lives here only:
 * the feet are a question for somebody building a sofa from scratch, not
 * for somebody who liked the photograph.
 *
 * Every tile is one style. Where the style comes in more than one finish,
 * choosing it opens a row of finish dots inside the tile and the photograph
 * follows the dot - so "the fluted shell in rose gold" is one tap and one
 * more, not a second grid of six near-identical feet.
 *
 * "As pictured" is the first tile and the default, because most people are
 * happy with what they saw in the photograph and should not have to say so.
 */
export default function FeetStep({ design, feet, onPictured, onChoose }: Props) {
  const reduced = useReducedMotionSafe()

  const pictured = feet === 'pictured' || feet === null
  const chosenCode = feet && feet !== 'pictured' ? feet.code : null
  const chosenFinish = feet && feet !== 'pictured' ? feet.finish : null

  return (
    <div>
      <StepHeading
        eyebrow="Step 4 of 7"
        title="Choose the feet"
        lead="The feet are the one part of a sofa you see from across the room. Keep the ones in the photograph, or pick a style — and a finish, where there's a choice."
      />

      {/* ── As pictured ───────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onPictured}
        aria-pressed={pictured}
        className={`hover-btn flex w-full cursor-pointer items-center gap-4 rounded-md border p-3 text-left transition-[border-color,box-shadow,background-color] duration-swift ease-out-expo sm:p-4 ${
          pictured
            ? 'border-ember-500 bg-ember-50 shadow-[0_0_0_1px_var(--color-ember-500)]'
            : 'border-calico-300 bg-calico-50 shadow-e1'
        }`}
      >
        <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-calico-200 sm:h-20 sm:w-20">
          {design?.image ? (
            <Image
              src={design.image}
              alt=""
              fill
              sizes="80px"
              placeholder="blur"
              blurDataURL={blurDataURL(design.image)}
              // The bottom of the photograph, where the feet are.
              className="object-cover object-bottom"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-ink-500">
              <Sofa aria-hidden="true" className="h-6 w-6" strokeWidth={1.5} />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body-sm font-semibold text-ink-900">As pictured</span>
          <span className="mt-0.5 block text-caption leading-snug text-ink-500">
            {design?.feetAsPictured
              ? `The ${design.feetAsPictured.toLowerCase()} feet the ${design.family} is photographed on.`
              : design
                ? `The feet the ${design.family} is photographed on.`
                : 'The feet the design is photographed on.'}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-ember-500 text-ink-900 transition-[opacity,transform] duration-swift ease-out-expo ${
            pictured ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      </button>

      {/* ── The range ─────────────────────────────────────────────────────── */}
      {GROUPS.map(group => {
        const styles = FEET.filter(f => f.group === group.key)
        if (styles.length === 0) return null
        return (
          <section key={group.key} className="mt-8" aria-labelledby={`feet-${group.key}`}>
            <h3 id={`feet-${group.key}`} className="m-0 mb-3 flex items-baseline justify-between border-b border-calico-300 pb-2 font-body text-h3 font-semibold text-ink-900">
              {group.label}
              <span className="font-data text-caption font-normal uppercase tracking-widest text-ink-500">
                {styles.length} {styles.length === 1 ? 'style' : 'styles'}
              </span>
            </h3>

            <ul role="list" className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
              {styles.map(style => {
                const on = style.code === chosenCode
                const finish =
                  (on && style.finishes.find(f => f.key === chosenFinish)) || style.finishes[0]
                const many = style.finishes.length > 1

                return (
                  <li key={style.code}>
                    <div
                      className={`flex h-full flex-col rounded-md border bg-calico-50 transition-[border-color,box-shadow,background-color] duration-swift ease-out-expo ${
                        on
                          ? 'border-ember-500 bg-ember-50 shadow-[0_0_0_1px_var(--color-ember-500)]'
                          : 'border-calico-300 shadow-e1'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onChoose({ code: style.code, finish: finish.key })}
                        aria-pressed={on}
                        aria-label={`${style.name}${many ? `, ${finish.name}` : ''}`}
                        className="hover-btn group relative flex w-full cursor-pointer flex-col border-0 bg-transparent p-2.5 text-left sm:p-3"
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute right-2 top-2 z-raised grid h-6 w-6 place-items-center rounded-pill bg-ember-500 text-ink-900 transition-[opacity,transform] duration-swift ease-out-expo ${
                            on ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>

                        {/* The supplier photographs on white, so the well is white
                            rather than calico: a white square with a hard edge
                            inside a calico well reads as a broken image. */}
                        <span className="relative block aspect-square w-full overflow-hidden rounded-sm bg-white shadow-[inset_0_0_0_1px_rgba(25,28,27,0.10)]">
                          <AnimatePresence initial={false} mode="popLayout">
                            <motion.span
                              key={finish.key}
                              initial={reduced ? false : { opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={reduced ? undefined : { opacity: 0 }}
                              transition={{ duration: reduced ? 0 : DUR.swift }}
                              className="absolute inset-0 block"
                            >
                              <Image
                                src={finish.image}
                                alt=""
                                fill
                                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"
                                placeholder="blur"
                                blurDataURL={blurDataURL(finish.image)}
                                className="object-contain p-2 transition-transform duration-settle ease-out-expo group-hover:scale-[1.04]"
                              />
                            </motion.span>
                          </AnimatePresence>
                        </span>

                        <span className="mt-2.5 block text-body-sm font-semibold leading-tight text-ink-900">
                          {style.name}
                        </span>
                        <span className="mt-0.5 block font-data text-caption tabular-nums text-ink-500">
                          {style.code}
                          {style.size ? ` · ${style.size}` : ''}
                        </span>
                        <span className="mt-1.5 block text-caption leading-snug text-ink-700">{style.blurb}</span>
                      </button>

                      {many && (
                        <div className="mt-auto px-2.5 pb-2.5 sm:px-3 sm:pb-3">
                          <div
                            role="radiogroup"
                            aria-label={`${style.name} finish`}
                            className="flex flex-wrap items-center gap-0.5"
                          >
                            {style.finishes.map(f => {
                              const active = on ? f.key === finish.key : false
                              return (
                                <button
                                  key={f.key}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  aria-label={f.name}
                                  title={f.name}
                                  onClick={() => onChoose({ code: style.code, finish: f.key })}
                                  className="grid h-10 w-10 cursor-pointer place-items-center border-0 bg-transparent p-0"
                                >
                                  <span
                                    className={`block h-5 w-5 rounded-pill transition-[box-shadow,transform] duration-swift ease-out-expo ${
                                      active
                                        ? 'scale-110 shadow-[0_0_0_2px_var(--color-calico-50),0_0_0_4px_var(--color-ink-900)]'
                                        : 'shadow-[inset_0_0_0_1px_rgba(25,28,27,0.25)]'
                                    }`}
                                    style={{ background: f.hex }}
                                  />
                                </button>
                              )
                            })}
                          </div>
                          <p className="m-0 mt-1 min-h-4 text-caption text-ink-500" aria-live="polite">
                            {on ? finish.name : `${style.finishes.length} finishes`}
                          </p>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <p className="m-0 mt-6 max-w-read text-caption leading-relaxed text-ink-500">
        Feet aren&apos;t priced online. If the style you pick costs anything extra, we&apos;ll tell
        you on the phone before anything is made.
      </p>
    </div>
  )
}
