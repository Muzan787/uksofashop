'use client'
// src/app/build/steps/DesignStep.tsx

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { DUR, EASE } from '@/components/Motion'
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe'
import { blurDataURL } from '@/utils/cloudinary'
import type { BuildDesign } from '../catalogue'
import type { BackPreference, DesignCard } from '../state'
import { StepHeading, pounds } from './ui'

interface Props {
  cards: DesignCard[]
  /** Families the back preference is hiding. */
  hidden: number
  /** "3 Seater", or null for a custom size. */
  sizeLabel: string | null
  back: BackPreference
  productId: string | null
  onChoose: (design: BuildDesign) => void
  onShowAll: () => void
}

/**
 * Step two: which sofa.
 *
 * ONE CARD PER DESIGN, swiped sideways. A grid would fit more on screen, and
 * that is the argument against it: a customer choosing between five sofas
 * wants to look at one at a time, at the largest size a phone allows, and
 * decide. The next card shows a sliver at the right edge so the gesture is
 * obvious without an arrow telling them, and scroll-snap lands each card
 * square in the frame rather than wherever the thumb let go.
 *
 * THE BACK TOGGLE LIVES ON THE CARD. Where a family comes in both backs at
 * this size, the card carries a two-way switch and the photograph, the
 * dimensions and the price follow it. Two cards for "Verona high" and "Verona
 * scatter" would double the swipe for a decision that is really one sofa with
 * one question about it.
 *
 * Choosing is a button, and the card's photograph is the same button. Either
 * marks the card and the bar below says what has been chosen; nothing goes
 * into the basket until the summary, so there is no "are you sure".
 */
export default function DesignStep({ cards, hidden, sizeLabel, back, productId, onChoose, onShowAll }: Props) {
  const reduced = useReducedMotionSafe()
  const rail = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  // Which option each card is showing. Keyed by family so the toggle survives
  // the card list re-rendering; defaults to whatever the state chose.
  const [shown, setShown] = useState<Record<string, string>>({})

  const onScroll = useCallback(() => {
    const node = rail.current
    if (!node) return
    const items = Array.from(node.children) as HTMLElement[]
    let nearest = 0
    let best = Infinity
    items.forEach((item, i) => {
      const d = Math.abs(item.offsetLeft - node.scrollLeft - node.offsetLeft)
      if (d < best) { best = d; nearest = i }
    })
    setActive(nearest)
  }, [])

  useEffect(() => {
    const node = rail.current
    if (!node) return
    node.addEventListener('scroll', onScroll, { passive: true })
    return () => node.removeEventListener('scroll', onScroll)
  }, [onScroll])

  // Open on the chosen card, when there is one, rather than the first.
  useEffect(() => {
    const node = rail.current
    if (!node || !productId) return
    const i = cards.findIndex(c => c.options.some(o => o.productId === productId))
    if (i <= 0) return
    const item = node.children[i] as HTMLElement | undefined
    if (item) node.scrollTo({ left: item.offsetLeft - node.offsetLeft, behavior: 'auto' })
    // Only on arrival. Scrolling every time the choice changes would fight the thumb.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goTo = (i: number) => {
    const node = rail.current
    const item = node?.children[i] as HTMLElement | undefined
    if (!node || !item) return
    node.scrollTo({ left: item.offsetLeft - node.offsetLeft, behavior: reduced ? 'auto' : 'smooth' })
  }

  const currentOf = (card: DesignCard): BuildDesign =>
    card.options.find(o => o.productId === shown[card.familySlug]) ?? card.current

  const custom = sizeLabel === null
  const count = cards.length

  return (
    <div>
      <StepHeading
        eyebrow="Step 2 of 7"
        title="Choose a design"
        lead={
          custom
            ? `Swipe through the ${count} ${count === 1 ? 'design' : 'designs'} we build to order. Pick the one you like the look of and we'll make it to your size.`
            : `${count} ${count === 1 ? 'design comes' : 'designs come'} as a ${sizeLabel}${back !== 'either' ? ` with a ${back.toLowerCase()}` : ''}. Swipe through them — every one is the same price in any fabric.`
        }
      />

      {hidden > 0 && (
        <p className="m-0 mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-ink-700">
          <span>
            {hidden} more {hidden === 1 ? 'design comes' : 'designs come'} with a different back.
          </span>
          <button
            type="button"
            onClick={onShowAll}
            className="hover-link cursor-pointer border-0 bg-transparent p-0 font-semibold text-ember-700"
          >
            Show {hidden === 1 ? 'it' : 'them'} too
          </button>
        </p>
      )}

      {/* ── The rail ──────────────────────────────────────────────────────── */}
      <div className="relative" style={{ ['--fade-from' as string]: 'var(--color-calico-50)' }}>
        <ul
          ref={rail}
          role="list"
          aria-label="Designs"
          data-lenis-prevent-horizontal
          className="no-scrollbar -mx-4 m-0 flex snap-x snap-mandatory list-none gap-3 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-1 sm:mx-0 sm:px-0 sm:scroll-px-0 lg:gap-5"
          style={{ scrollPaddingInline: '1rem' }}
        >
          {cards.map((card, i) => {
            const current = currentOf(card)
            const chosen = current.productId === productId
            const chosenElsewhere = !chosen && card.options.some(o => o.productId === productId)

            return (
              <li
                key={card.familySlug}
                className="w-[84%] shrink-0 snap-start sm:w-[400px] lg:w-[420px]"
              >
                <article
                  className={`flex h-full flex-col overflow-hidden rounded-md border bg-calico-50 transition-[border-color,box-shadow] duration-base ease-out-expo ${
                    chosen
                      ? 'border-ember-500 shadow-[0_0_0_1px_var(--color-ember-500),var(--shadow-e2)]'
                      : 'border-calico-300 shadow-e1'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onChoose(current)}
                    aria-label={`Choose the ${current.title}`}
                    className="group relative block aspect-[4/3] w-full cursor-pointer overflow-hidden border-0 bg-calico-200 p-0 text-left"
                  >
                    {current.image && (
                      <Image
                        key={current.productId}
                        src={current.image}
                        alt={current.title}
                        fill
                        sizes="(max-width: 640px) 84vw, 420px"
                        priority={i === 0}
                        placeholder="blur"
                        blurDataURL={blurDataURL(current.image)}
                        className="object-cover transition-transform duration-settle ease-out-expo group-hover:scale-[1.03]"
                      />
                    )}

                    <span
                      aria-hidden="true"
                      className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-pill bg-ember-500 px-3 py-1.5 font-data text-caption font-bold uppercase tracking-widest text-ink-900 shadow-ember transition-[opacity,transform] duration-base ease-out-expo ${
                        chosen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      Chosen
                    </span>

                    <span className="absolute bottom-3 right-3 rounded-pill bg-ink-900/80 px-3 py-1.5 font-data text-caption tabular-nums text-calico-50 backdrop-blur-sm">
                      {i + 1} / {count}
                    </span>
                  </button>

                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <p className="eyebrow m-0 text-ember-700">{card.family}</p>
                    <h3 className="m-0 mt-1.5 font-display text-h3 font-semibold leading-tight text-ink-900 sm:text-[1.375rem]">
                      {custom ? `${card.family} — made to your size` : current.title}
                    </h3>

                    {custom ? (
                      <p className="m-0 mt-2 font-data text-caption leading-relaxed text-ink-500">
                        Pictured as the {current.sizeLabel.toLowerCase()} · yours will be built to the
                        measurements you gave
                      </p>
                    ) : current.dimensions ? (
                      <p className="m-0 mt-2 whitespace-pre-line font-data text-caption leading-relaxed tabular-nums text-ink-500">
                        {current.dimensions}
                      </p>
                    ) : null}

                    <p className="m-0 mt-3 text-body-sm leading-relaxed text-ink-700">{current.tagline}</p>

                    {card.options.length > 1 && (
                      <div role="group" aria-label="Back style" className="mt-4 flex gap-2">
                        {card.options.map(option => {
                          const on = option.productId === current.productId
                          return (
                            <button
                              key={option.productId}
                              type="button"
                              aria-pressed={on}
                              onClick={() => {
                                setShown(s => ({ ...s, [card.familySlug]: option.productId }))
                                // If this card is the chosen one, the choice follows the switch.
                                if (chosen || chosenElsewhere) onChoose(option)
                              }}
                              className={`hover-btn relative inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-pill border px-3 text-body-sm font-semibold transition-colors duration-swift ease-out-expo ${
                                on ? 'border-ember-500 text-ink-900' : 'border-calico-300 text-ink-700'
                              }`}
                            >
                              {on && (
                                <motion.span
                                  aria-hidden="true"
                                  layoutId={`back-${card.familySlug}`}
                                  transition={{ duration: reduced ? 0 : DUR.base, ease: EASE.out }}
                                  className="absolute -inset-px rounded-pill bg-ember-500"
                                />
                              )}
                              <span className="relative">
                                {option.back === 'High Back' ? 'High back' : option.back === 'Scattered Back' ? 'Scatter back' : 'Fixed back'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                      <span className="min-w-0">
                        <span className="block font-data text-caption uppercase tracking-widest text-ink-500">
                          {custom ? 'From' : 'Guide price'}
                        </span>
                        <span className="tnum block font-display text-[1.75rem] font-semibold leading-none text-ink-900">
                          {pounds(current.price)}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => onChoose(current)}
                        className={`flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-pill border-0 px-5 text-body-sm font-semibold transition-[background-color,color] duration-base ease-out-expo ${
                          chosen
                            ? 'bg-sage-700 text-calico-50'
                            : 'hover-btn btn-ember sheen bg-ember-500 text-ink-900'
                        }`}
                      >
                        {chosen ? (
                          <>
                            <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} />
                            Chosen
                          </>
                        ) : (
                          'Choose this'
                        )}
                      </button>
                    </div>

                    <Link
                      href={current.href}
                      className="hover-link mt-3 inline-flex min-h-11 items-center gap-1 self-start text-caption font-semibold text-ink-500 no-underline"
                    >
                      More photos and details
                      <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>

        <span aria-hidden="true" className="rail-fade rail-fade-end hidden sm:block" />
      </div>

      {/* ── Dots and arrows ───────────────────────────────────────────────── */}
      {count > 1 && (
        <div className="mt-3 flex items-center justify-between gap-4">
          <div role="tablist" aria-label="Design position" className="flex items-center gap-1.5">
            {cards.map((card, i) => (
              <button
                key={card.familySlug}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`${card.family}, ${i + 1} of ${count}`}
                onClick={() => goTo(i)}
                className="grid h-11 w-6 cursor-pointer place-items-center border-0 bg-transparent p-0"
              >
                <span
                  className={`block h-1.5 rounded-pill transition-[width,background-color] duration-base ease-out-expo ${
                    i === active ? 'w-6 bg-ember-500' : 'w-1.5 bg-calico-300'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => goTo(Math.max(0, active - 1))}
              disabled={active === 0}
              aria-label="Previous design"
              className="hover-icon grid h-11 w-11 cursor-pointer place-items-center rounded-pill border border-calico-300 bg-calico-50 text-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => goTo(Math.min(count - 1, active + 1))}
              disabled={active >= count - 1}
              aria-label="Next design"
              className="hover-icon grid h-11 w-11 cursor-pointer place-items-center rounded-pill border border-calico-300 bg-calico-50 text-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
