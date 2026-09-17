'use client'
// src/app/build/steps/FabricStep.tsx

import FabricPicker from '../FabricPicker'
import type { Fabric, FabricCollection } from '@/components/Product/types'
import type { BuildDesign } from '../catalogue'
import { StepHeading } from './ui'

interface Props {
  collections: FabricCollection[]
  design: BuildDesign | null
  fabricId: string | null
  onSelect: (fabric: Fabric) => void
}

/**
 * Step three: what it is made in.
 *
 * The samples link carries the chosen design and the fabric in view, exactly
 * as the product page's picker does, plus `from=build` - which is what makes
 * /swatches pin "Back to your build" at the foot of the screen instead of
 * "Back to the sofa". The draft is already in localStorage by the time the
 * link is tapped, so coming back lands on this step with everything intact.
 */
export default function FabricStep({ collections, design, fabricId, onSelect }: Props) {
  const total = collections.reduce((n, c) => n + c.fabrics.length, 0)

  const samplesHref = (fabric: Fabric | null) => {
    const params = new URLSearchParams({ from: 'build' })
    if (design) params.set('sofa', design.slug)
    if (fabric?.swatchable) params.set('pick', fabric.code)
    return `/swatches?${params.toString()}`
  }

  return (
    <div>
      <StepHeading
        eyebrow="Step 3 of 7"
        title="Choose the fabric"
        lead={`All ${total} colours we build in, and every one of them the same price${design ? ` on the ${design.family}` : ''}. Tap a swatch to choose it, or order free samples if you'd rather hold it first.`}
      />

      <FabricPicker
        id="cover"
        label="Fabric"
        collections={collections}
        selectedId={fabricId}
        onSelect={onSelect}
        samplesHref={samplesHref}
      />
    </div>
  )
}
