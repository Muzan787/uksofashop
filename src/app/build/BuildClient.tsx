'use client'
// src/app/build/BuildClient.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, ChevronLeft, ChevronRight, RotateCcw, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCart } from '@/context/CartContext'
import { DUR, EASE } from '@/components/Motion'
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe'
import { trackAddToCart, trackOperationalAction } from '@/utils/tracking'
import type { FabricCollection } from '@/components/Product/types'
import type { BuildDesign, BuildSize } from './catalogue'
import {
  CUSTOM_SIZE, STEPS, clearDraft, designCards, emptyDraft, loadDraft, resolveDraft, saveDraft,
  stepComplete, stepIndex, toBuildSpec, type Draft, type StepId,
} from './state'
import SeatsStep from './steps/SeatsStep'
import DesignStep from './steps/DesignStep'
import FabricStep from './steps/FabricStep'
import FeetStep from './steps/FeetStep'
import PipingStep from './steps/PipingStep'
import NotesStep from './steps/NotesStep'
import SummaryStep from './steps/SummaryStep'
import { pounds } from './steps/ui'

interface Props {
  designs: BuildDesign[]
  sizes: BuildSize[]
  collections: FabricCollection[]
}

/** The URL fragment for a step, so the phone's back gesture steps back rather than leaving. */
const hashFor = (step: StepId) => `#step-${step}`
const stepFromHash = (hash: string): StepId | null => {
  const id = hash.replace(/^#step-/, '')
  return STEPS.some(s => s.id === id) ? (id as StepId) : null
}

/**
 * The builder.
 *
 * SEVEN STEPS, ONE SCREEN EACH. A long form that asks everything at once is a
 * long form; a customer on a phone answers one question at a time, and the
 * bar at the bottom is always the same two buttons in the same two places.
 * The step that is showing slides out to the left and the next slides in from
 * the right - or the reverse, going back - so the sequence reads as a
 * direction of travel rather than as content being swapped.
 *
 * THE DRAFT IS SAVED ON EVERY CHANGE, to localStorage, and read back when the
 * page opens. That is what lets the fabric step send somebody to /swatches
 * for samples and bring them straight back to the fabric step with the rest
 * of the sofa intact - the same promise the product page's picker makes -
 * and what lets somebody close the tab on Tuesday and carry on on Thursday.
 * "Start again" in the header is the way out of a draft they no longer want.
 *
 * THE BACK GESTURE GOES BACK A STEP. Each forward step pushes a history entry
 * carrying the step in the URL fragment, and popstate reads it back. Without
 * this, the one gesture every phone user makes to undo something would leave
 * the page entirely - and with the draft saved, they would return to find the
 * step they were trying to leave.
 *
 * THE CART IS ONLY TOUCHED ON THE LAST SCREEN. Until then nothing is
 * committed anywhere but the draft; on the summary, "Continue to checkout"
 * puts one line in the basket - the chosen frame, in the chosen fabric, with
 * the whole build attached - and goes to the checkout, where it is priced,
 * placed and phoned about exactly like any other made-to-order sofa.
 */
export default function BuildClient({ designs, sizes, collections }: Props) {
  const router = useRouter()
  const reduced = useReducedMotionSafe()
  const { addToCart } = useCart()

  // Starts empty on both sides and loads after mount, for the reason
  // CartContext spells out: the server has no localStorage, and a first
  // client render that differs from the server's is a hydration error.
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [loaded, setLoaded] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [added, setAdded] = useState(false)
  const pushed = useRef(0)
  const top = useRef<HTMLDivElement>(null)
  // The latest draft, for the popstate listener, which is bound once.
  const latest = useRef(draft)
  useEffect(() => { latest.current = draft }, [draft])

  /* eslint-disable react-hooks/set-state-in-effect -- reading initial state from localStorage; see CartContext. */
  useEffect(() => {
    const saved = loadDraft()
    const fromHash = stepFromHash(window.location.hash)
    if (saved) {
      // Honour a fragment the visitor arrived with, as far as they had got.
      const step = fromHash && stepIndex(fromHash) <= saved.reached ? fromHash : saved.step
      setDraft({ ...saved, step })
    }
    setLoaded(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (loaded) saveDraft(draft)
  }, [draft, loaded])

  // First-party builder telemetry. It carries only anonymous join keys and
  // public catalogue/choice labels; free-text custom notes never leave /build.
  useEffect(() => {
    if (!loaded || !draft.key) return
    trackOperationalAction(
      'builder_started',
      { metadata: { step: 'seats' } },
      `builder_started:${draft.key}`,
    )
  }, [loaded, draft.key])

  // ── Derived ────────────────────────────────────────────────────────────
  const resolved = useMemo(
    () => resolveDraft(draft, designs, sizes, collections),
    [draft, designs, sizes, collections],
  )
  const spec = useMemo(() => toBuildSpec(draft, resolved), [draft, resolved])
  const { cards, hidden } = useMemo(
    () => designCards(designs, { sizeKey: draft.sizeKey, back: draft.back, productId: draft.productId }),
    [designs, draft.sizeKey, draft.back, draft.productId],
  )

  useEffect(() => {
    if (!loaded || draft.step !== 'summary' || !draft.key) return
    trackOperationalAction(
      'builder_summary_viewed',
      {
        productId: resolved.design?.productId,
        variantId: resolved.design?.variantId,
        metadata: { step: 'summary' },
      },
      `builder_summary_viewed:${draft.key}`,
    )
  }, [loaded, draft.step, draft.key, resolved.design?.productId, resolved.design?.variantId])

  const index = stepIndex(draft.step)
  const meta = STEPS[index]
  const complete = stepComplete(draft.step, draft, resolved)
  const isLast = index === STEPS.length - 1

  const patch = useCallback((p: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => {
    setDraft(d => ({ ...d, ...(typeof p === 'function' ? p(d) : p) }))
  }, [])

  // ── Moving between steps ───────────────────────────────────────────────
  const scrollToTop = useCallback(() => {
    const node = top.current
    if (!node) return
    // Just under the site header, which is 56px and sticky.
    const y = node.getBoundingClientRect().top + window.scrollY - 72
    window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : 'smooth' })
  }, [reduced])

  const show = useCallback((to: StepId, dir: 1 | -1) => {
    setDirection(dir)
    patch(d => ({ step: to, reached: Math.max(d.reached, stepIndex(to)) }))
    requestAnimationFrame(scrollToTop)
  }, [patch, scrollToTop])

  const go = useCallback((to: StepId) => {
    const dir: 1 | -1 = stepIndex(to) > index ? 1 : -1
    show(to, dir)
    try {
      window.history.pushState(window.history.state, '', hashFor(to))
      pushed.current += 1
    } catch {
      // A browser that refuses is a browser whose back button leaves the page. Fine.
    }
  }, [index, show])

  useEffect(() => {
    const onPop = () => {
      const target = stepFromHash(window.location.hash) ?? 'seats'
      pushed.current = Math.max(0, pushed.current - 1)
      const d = latest.current
      if (target === d.step) return
      // Never further than they have actually got.
      const to = stepIndex(target) <= d.reached ? target : d.step
      if (to === d.step) return
      setDirection(stepIndex(to) < stepIndex(d.step) ? -1 : 1)
      setDraft(prev => ({ ...prev, step: to }))
      requestAnimationFrame(scrollToTop)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [scrollToTop])

  const next = useCallback(() => {
    if (!complete || isLast) return
    // Leaving an optional step without answering is still a meaningful choice.
    if (draft.step === 'feet' && draft.feet === null) {
      patch({ feet: 'pictured' })
      trackOperationalAction('builder_feet_selected', { metadata: { step: 'feet', value: 'pictured' } })
    }
    if (draft.step === 'piping' && draft.piping === null) {
      patch({ piping: 'none' })
      trackOperationalAction('builder_piping_selected', { metadata: { step: 'piping', value: 'none' } })
    }
    if (draft.step === 'notes') {
      const selected = Object.values(draft.notes).filter(note => note.on).length
      trackOperationalAction('builder_custom_details_completed', {
        metadata: { step: 'notes', value: selected > 0 ? `${selected}_selected` : 'none' },
      })
    }
    go(STEPS[index + 1].id)
  }, [complete, isLast, draft.step, draft.feet, draft.piping, draft.notes, patch, go, index])

  const back = useCallback(() => {
    if (index === 0) return
    if (pushed.current > 0) {
      window.history.back()
      return
    }
    show(STEPS[index - 1].id, -1)
  }, [index, show])

  const restart = useCallback(() => {
    clearDraft()
    setDirection(-1)
    setDraft(emptyDraft())
    pushed.current = 0
    try { window.history.replaceState(window.history.state, '', window.location.pathname) } catch {}
    requestAnimationFrame(scrollToTop)
  }, [scrollToTop])

  // ── Answers ────────────────────────────────────────────────────────────
  const onSize = (sizeKey: string) => {
    trackOperationalAction('builder_size_selected', {
      metadata: { step: 'seats', value: sizeKey === CUSTOM_SIZE ? 'custom' : sizeKey },
    })
    patch(d => {
      // A design chosen for another size does not carry over, unless it happens
      // to come in this one too.
      const keep = designs.find(x => x.productId === d.productId && (sizeKey === CUSTOM_SIZE || x.sizeKey === sizeKey))
      return { sizeKey, productId: keep ? d.productId : null }
    })
  }

  const onBack = (pref: Draft['back']) => patch(d => {
    const chosen = designs.find(x => x.productId === d.productId)
    const keep = !chosen || pref === 'either' || chosen.back === pref
    return { back: pref, productId: keep ? d.productId : null }
  })

  // ── Checkout ───────────────────────────────────────────────────────────
  const checkout = useCallback(() => {
    const design = resolved.design
    const fabric = resolved.fabric
    if (!design || !fabric || !spec || added) return

    addToCart({
      variant_id: design.variantId,
      quantity: 1,
      price: design.price,
      title: design.title,
      color: `${fabric.collectionName} ${fabric.name}`,
      image_url: design.image || '/placeholder.svg',
      fabric_id: fabric.id,
      fabric_label: `${fabric.collectionName} ${fabric.name}`,
      fabric_code: fabric.code,
      fabric_swatch: fabric.image,
      build: spec,
    })
    trackAddToCart({ productId: design.productId, variantId: design.variantId, title: design.title, price: design.price, quantity: 1 })
    trackOperationalAction('builder_add_to_cart', {
      productId: design.productId,
      variantId: design.variantId,
      metadata: { step: 'summary', value: design.family },
    })
    setAdded(true)
    toast.success('Your sofa is in the cart', { icon: '🛋️', position: 'top-center' })

    // A fresh key for anything they build after this, so a second trip through
    // the summary is a second line rather than a quantity of two.
    patch({ key: emptyDraft().key })
    window.setTimeout(() => router.push('/checkout'), 600)
  }, [resolved.design, resolved.fabric, spec, added, addToCart, patch, router])

  // ── What the bar says about where they have got to ─────────────────────
  // Price first, then the family and the fabric: the three words that matter,
  // in the order they matter, because the column truncates at 375px.
  const runningSummary = [
    resolved.design ? pounds(resolved.design.price) : null,
    resolved.design
      ? (draft.sizeKey === CUSTOM_SIZE ? `${resolved.design.family}, custom size` : resolved.design.family)
      : draft.sizeKey === CUSTOM_SIZE ? 'Custom size' : resolved.size?.label,
    resolved.fabric?.name,
  ].filter(Boolean).join(' · ')

  // Short, because at 375px the bar's middle column is about 140px wide.
  const hint = !complete
    ? draft.step === 'seats' ? (draft.sizeKey === CUSTOM_SIZE ? 'Tell us the size' : 'Choose a size')
      : draft.step === 'design' ? 'Choose a design'
      : draft.step === 'fabric' ? 'Choose a fabric'
      : draft.step === 'piping' ? 'Pick a colour, or plain'
      : ''
    : ''

  const progress = ((index + 1) / STEPS.length) * 100

  const variants = {
    enter: (d: 1 | -1) => ({ x: reduced ? 0 : d * 40, opacity: 0 }),
    centre: { x: 0, opacity: 1 },
    exit: (d: 1 | -1) => ({ x: reduced ? 0 : d * -40, opacity: 0 }),
  }

  return (
    <div className="bg-calico-50">
      {/* ── Head ────────────────────────────────────────────────────────── */}
      <header data-ground="dark" className="grad-ink bg-ink-900 pb-6 pt-8 sm:pb-8 sm:pt-12">
        <div className="mx-auto w-full max-w-shell px-4 sm:px-6 lg:px-8">
          {/* The trail the BreadcrumbList in page.tsx describes. Markup for a
              trail nobody can see is the one kind of structured data Google
              treats as a trick, so it is drawn - see /swatches. */}
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 font-data text-caption uppercase tracking-[0.1em]">
              <li className="flex items-center gap-1">
                <Link href="/" className="hover-link text-calico-300 no-underline">Home</Link>
              </li>
              <li className="flex items-center gap-1" aria-current="page">
                <ChevronRight aria-hidden="true" className="h-3 w-3 text-calico-300/50" />
                <span className="text-ember-300">Build your own sofa</span>
              </li>
            </ol>
          </nav>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="m-0 font-data text-eyebrow uppercase tracking-[0.2em] text-ember-300">
                Made to order
              </p>
              <h1 className="m-0 mt-2 font-display text-h1 font-semibold text-calico-50">
                Build your own sofa
              </h1>
              <p className="m-0 mt-3 max-w-read text-body leading-relaxed text-calico-300">
                Seven quick steps. Your choices are saved as you go, and nothing is charged until
                it&apos;s at your door.
              </p>
            </div>

            {loaded && draft.reached > 0 && (
              <button
                type="button"
                onClick={restart}
                className="hover-btn hover-btn-dark flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-pill border border-calico-50/20 bg-transparent px-4 text-body-sm font-semibold text-calico-50"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">Start again</span>
                <span className="sr-only sm:hidden">Start again</span>
              </button>
            )}
          </div>

          {/* The rail. Done steps can be tapped; the ones ahead cannot. */}
          <ol className="-my-2 mt-1 flex list-none gap-1.5 p-0 sm:mt-3 sm:gap-2" aria-label="Steps">
            {STEPS.map((s, i) => {
              const done = i < index
              const current = i === index
              const reachable = i <= draft.reached
              return (
                <li key={s.id} className="min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={!reachable || current}
                    onClick={() => go(s.id)}
                    aria-current={current ? 'step' : undefined}
                    aria-label={`${i + 1}. ${s.label}${done ? ', done' : current ? ', current' : ''}`}
                    // The bar is 6px tall; the padding makes it a thumb-sized target.
                    className="group block w-full cursor-pointer border-0 bg-transparent px-0 py-[19px] text-left disabled:cursor-default"
                  >
                    <span
                      className={`block h-1.5 rounded-pill transition-colors duration-base ease-out-expo ${
                        done || current ? 'btn-ember bg-ember-500' : reachable ? 'bg-calico-50/40' : 'bg-calico-50/15'
                      }`}
                    />
                    <span
                      className={`mt-2 hidden truncate font-data text-caption uppercase tracking-widest sm:block ${
                        current ? 'text-calico-50' : done ? 'text-ember-300' : 'text-calico-300/60'
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <p className="m-0 font-data text-caption uppercase tracking-widest text-calico-300 sm:hidden" aria-hidden="true">
            Step {index + 1} of {STEPS.length} — {meta.label}
          </p>
        </div>
      </header>

      {/* ── The step ────────────────────────────────────────────────────── */}
      <div ref={top} className="mx-auto w-full max-w-shell px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-10 lg:px-8">
        <div className={loaded ? '' : 'invisible'}>
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={draft.step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="centre"
              exit="exit"
              transition={{ duration: reduced ? 0 : DUR.base, ease: EASE.out }}
            >
              {draft.step === 'seats' && (
                <SeatsStep
                  sizes={sizes}
                  sizeKey={draft.sizeKey}
                  customSeats={draft.customSeats}
                  back={draft.back}
                  onSize={onSize}
                  onCustomSeats={text => patch({ customSeats: text })}
                  onBack={onBack}
                />
              )}

              {draft.step === 'design' && (
                <DesignStep
                  cards={cards}
                  hidden={hidden}
                  sizeLabel={draft.sizeKey === CUSTOM_SIZE ? null : resolved.size?.label ?? null}
                  back={draft.back}
                  productId={draft.productId}
                  onChoose={design => {
                    trackOperationalAction('builder_design_selected', {
                      productId: design.productId,
                      variantId: design.variantId,
                      metadata: { step: 'design', value: design.family },
                    })
                    patch({ productId: design.productId })
                  }}
                  onShowAll={() => patch({ back: 'either' })}
                />
              )}

              {draft.step === 'fabric' && (
                <FabricStep
                  collections={collections}
                  design={resolved.design}
                  fabricId={draft.fabricId}
                  onSelect={fabric => {
                    trackOperationalAction('builder_fabric_selected', {
                      productId: resolved.design?.productId,
                      variantId: resolved.design?.variantId,
                      metadata: { step: 'fabric', value: fabric.code },
                    })
                    patch({ fabricId: fabric.id })
                  }}
                />
              )}

              {draft.step === 'feet' && (
                <FeetStep
                  design={resolved.design}
                  feet={draft.feet}
                  onPictured={() => {
                    trackOperationalAction('builder_feet_selected', {
                      metadata: { step: 'feet', value: 'pictured' },
                    })
                    patch({ feet: 'pictured' })
                  }}
                  onChoose={choice => {
                    trackOperationalAction('builder_feet_selected', {
                      metadata: { step: 'feet', value: choice.code },
                    })
                    patch({ feet: choice })
                  }}
                />
              )}

              {draft.step === 'piping' && (
                <PipingStep
                  collections={collections}
                  cover={resolved.fabric}
                  piping={draft.piping}
                  pipingFabric={resolved.pipingFabric}
                  onNone={() => {
                    trackOperationalAction('builder_piping_selected', {
                      metadata: { step: 'piping', value: 'none' },
                    })
                    patch({ piping: 'none' })
                  }}
                  onWant={() => patch(d => ({ piping: d.piping && d.piping !== 'none' ? d.piping : { fabricId: null } }))}
                  onSelect={fabric => {
                    trackOperationalAction('builder_piping_selected', {
                      metadata: { step: 'piping', value: fabric.code },
                    })
                    patch({ piping: { fabricId: fabric.id } })
                  }}
                />
              )}

              {draft.step === 'notes' && (
                <NotesStep
                  notes={draft.notes}
                  onToggle={(key, on) => patch(d => ({ notes: { ...d.notes, [key]: { ...d.notes[key], on } } }))}
                  onText={(key, text) => patch(d => ({ notes: { ...d.notes, [key]: { ...d.notes[key], text } } }))}
                />
              )}

              {draft.step === 'summary' && (
                resolved.design && resolved.fabric && spec ? (
                  <SummaryStep
                    design={resolved.design}
                    fabric={resolved.fabric}
                    resolved={resolved}
                    spec={spec}
                    onEdit={go}
                    onCheckout={checkout}
                    onWhatsApp={() => trackOperationalAction('builder_whatsapp_click', {
                      productId: resolved.design?.productId,
                      variantId: resolved.design?.variantId,
                      metadata: { step: 'summary' },
                    })}
                    added={added}
                  />
                ) : (
                  <Missing
                    design={Boolean(resolved.design)}
                    fabric={Boolean(resolved.fabric)}
                    onGo={go}
                  />
                )
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── The bar ─────────────────────────────────────────────────────── */}
      <div
        data-bottom-bar=""
        className="sticky bottom-0 z-sticky-bar border-t border-calico-300 bg-calico-50/95 backdrop-blur-sm"
      >
        <div aria-hidden="true" className="h-0.5 w-full bg-calico-200">
          <span
            className="btn-ember block h-full bg-ember-500 transition-[width] duration-settle ease-out-expo"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mx-auto flex w-full max-w-shell items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          <button
            type="button"
            onClick={back}
            disabled={index === 0}
            aria-label="Back a step"
            className="hover-btn flex h-12 shrink-0 cursor-pointer items-center gap-1.5 rounded-pill border border-calico-300 bg-calico-50 px-3.5 text-body-sm font-semibold text-ink-900 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Two lines: where they are, and either what is still needed or
              what they have chosen so far. The hint takes the second line
              because it is the more useful of the two while a step is open. */}
          <div className="min-w-0 flex-1" aria-live="polite">
            <span className="block truncate font-data text-caption uppercase tracking-widest text-ink-500">
              Step {index + 1} of {STEPS.length}
            </span>
            <span className={`block truncate text-body-sm font-semibold ${hint ? 'text-ember-700' : 'text-ink-900'}`}>
              {hint || runningSummary || meta.label}
            </span>
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={checkout}
              disabled={!spec || added}
              className={`flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-pill border-0 px-5 font-data text-eyebrow font-bold uppercase tracking-[0.08em] transition-[background-color,color] duration-base ease-out-expo disabled:cursor-not-allowed ${
                added ? 'bg-sage-700 text-calico-50' : 'hover-btn btn-ember sheen shadow-ember bg-ember-500 text-ink-900 disabled:opacity-50'
              }`}
            >
              {added ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} /> : <ShoppingBag aria-hidden="true" className="h-4 w-4" />}
              {added ? 'Added' : 'Checkout'}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={!complete}
              className={`flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-pill border-0 px-5 font-data text-eyebrow font-bold uppercase tracking-[0.08em] transition-[opacity,background-color] duration-base ease-out-expo disabled:cursor-not-allowed disabled:opacity-50 ${
                meta.optional && !answered(draft)
                  ? 'hover-btn hover-btn-dark bg-ink-900 text-calico-50'
                  : 'hover-btn btn-ember sheen shadow-ember bg-ember-500 text-ink-900'
              }`}
            >
              {meta.optional && !answered(draft) ? 'Skip' : 'Continue'}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Whether the current optional step has been given an answer. */
function answered(draft: Draft): boolean {
  switch (draft.step) {
    case 'feet': return draft.feet !== null
    case 'piping': return draft.piping !== null
    case 'notes': return Object.values(draft.notes).some(n => n.on)
    default: return true
  }
}

function Missing({ design, fabric, onGo }: { design: boolean; fabric: boolean; onGo: (s: StepId) => void }) {
  const missing: StepId = !design ? 'design' : 'fabric'
  return (
    <div className="rounded-md border border-calico-300 bg-calico-100 px-6 py-12 text-center">
      <p className="m-0 font-display text-h3 font-semibold text-ink-900">
        {!design ? 'Choose a design first' : !fabric ? 'Choose a fabric first' : 'Nearly there'}
      </p>
      <p className="m-0 mt-2 text-body-sm leading-relaxed text-ink-500">
        Something you chose earlier is no longer available, or a step got skipped. It takes a
        moment to put right.
      </p>
      <button
        type="button"
        onClick={() => onGo(missing)}
        className="hover-btn btn-ember mt-6 inline-flex h-12 cursor-pointer items-center gap-2 rounded-pill border-0 bg-ember-500 px-6 text-body-sm font-semibold text-ink-900"
      >
        Go to {missing === 'design' ? 'designs' : 'fabrics'}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  )
}
