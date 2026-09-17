'use client'
// src/app/build/steps/PipingStep.tsx

import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Minus, Scissors } from 'lucide-react'
import { DUR, EASE } from '@/components/Motion'
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe'
import { blurDataURL } from '@/utils/cloudinary'
import type { Fabric, FabricCollection } from '@/components/Product/types'
import FabricPicker from '../FabricPicker'
import { StepHeading } from './ui'

interface Props {
  collections: FabricCollection[]
  /** The cover fabric, shown beside the piping so the pair can be judged together. */
  cover: Fabric | null
  piping: { fabricId: string | null } | 'none' | null
  pipingFabric: Fabric | null
  onNone: () => void
  onWant: () => void
  onSelect: (fabric: Fabric) => void
}

/**
 * Step five: a contrast line along the seams, or not.
 *
 * Piping is the same fabric library again - a second colour rather than a
 * second material - so the picker is the one from step three with a different
 * id. The cover swatch sits beside the piping swatch at the top while a colour
 * is being chosen, because the whole question is how the two look together
 * and a customer should not have to hold the first one in their head.
 */
export default function PipingStep({ collections, cover, piping, pipingFabric, onNone, onWant, onSelect }: Props) {
  const reduced = useReducedMotionSafe()
  const transition = { duration: reduced ? 0 : DUR.base, ease: EASE.out }

  const none = piping === 'none'
  const want = piping !== null && piping !== 'none'

  return (
    <div>
      <StepHeading
        eyebrow="Step 5 of 7"
        title="Contrast piping?"
        lead="Piping is the cord that runs along the seams of the cushions and arms. Left plain it disappears into the fabric; in a second colour it draws the outline of the sofa."
      />

      <div role="group" aria-label="Piping" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onNone}
          aria-pressed={none}
          className={`hover-btn flex cursor-pointer items-center gap-4 rounded-md border p-4 text-left transition-[border-color,box-shadow,background-color] duration-swift ease-out-expo ${
            none
              ? 'border-ember-500 bg-ember-50 shadow-[0_0_0_1px_var(--color-ember-500)]'
              : 'border-calico-300 bg-calico-50 shadow-e1'
          }`}
        >
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-sm ${none ? 'bg-ember-500/20 text-ember-700' : 'bg-calico-200 text-ink-500'}`}>
            <Minus aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-semibold text-ink-900">No — keep it plain</span>
            <span className="mt-0.5 block text-caption leading-snug text-ink-500">
              Seams piped in the same fabric as the sofa.
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-ember-500 text-ink-900 transition-[opacity,transform] duration-swift ease-out-expo ${
              none ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
            }`}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        </button>

        <button
          type="button"
          onClick={onWant}
          aria-pressed={want}
          className={`hover-btn flex cursor-pointer items-center gap-4 rounded-md border p-4 text-left transition-[border-color,box-shadow,background-color] duration-swift ease-out-expo ${
            want
              ? 'border-ember-500 bg-ember-50 shadow-[0_0_0_1px_var(--color-ember-500)]'
              : 'border-calico-300 bg-calico-50 shadow-e1'
          }`}
        >
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-sm ${want ? 'bg-ember-500/20 text-ember-700' : 'bg-calico-200 text-ink-500'}`}>
            <Scissors aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-semibold text-ink-900">Yes — a different colour</span>
            <span className="mt-0.5 block text-caption leading-snug text-ink-500">
              Pick any fabric from the range for the piping.
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-ember-500 text-ink-900 transition-[opacity,transform] duration-swift ease-out-expo ${
              want ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
            }`}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {want && (
          <motion.div
            key="picker"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            <div className="pt-6">
              {/* The pair, side by side. */}
              {cover && (
                <div className="mb-5 flex items-center gap-3 rounded-md border border-calico-300 bg-calico-100 p-3">
                  <Pair label="Sofa" fabric={cover} />
                  <span aria-hidden="true" className="h-px flex-1 bg-calico-300" />
                  <Pair label="Piping" fabric={pipingFabric} />
                </div>
              )}

              <h3 className="m-0 mb-3 font-body text-h3 font-semibold text-ink-900">Piping colour</h3>
              <FabricPicker
                id="piping"
                label="Piping colour"
                collections={collections}
                selectedId={pipingFabric?.id ?? null}
                onSelect={onSelect}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Pair({ label, fabric }: { label: string; fabric: Fabric | null }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`relative block h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-calico-200 ${
          fabric ? 'shadow-[inset_0_0_0_1px_rgba(25,28,27,0.18)]' : 'border border-dashed border-ink-400'
        }`}
        style={fabric?.hex ? { background: fabric.hex } : undefined}
      >
        {fabric?.image && (
          <Image
            src={fabric.image}
            alt=""
            fill
            sizes="48px"
            placeholder="blur"
            blurDataURL={blurDataURL(fabric.image)}
            className="object-cover"
          />
        )}
      </span>
      <span className="min-w-0">
        <span className="eyebrow block text-ink-500">{label}</span>
        <span className="mt-0.5 block truncate text-caption font-semibold text-ink-900">
          {fabric ? `${fabric.name}` : 'Choose below'}
        </span>
      </span>
    </span>
  )
}
