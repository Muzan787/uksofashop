// src/components/Collection/RangeGrid.tsx
//
// "Sold as a set / The ranges." - the range collage section of a main
// collection, lifted out of MainCollectionView unchanged so the Made-To-Order
// collection, /black-friday and /christmas draw the SAME cards from the same
// data (Run 7, owner request). Each card is the real CollectionCard: a 5:4
// three-photo collage, the range name, its live price range and piece count,
// linking to /collection/<range>.
import CollectionCard from '@/components/Product/CollectionCard'
import SectionHeading from '@/components/UI/SectionHeading'
import { Reveal } from '@/components/Motion'
import { staggerDelay } from '@/components/Motion/tokens'
import type { CollectionSummary } from '@/utils/collections'

export default function RangeGrid({ sets, label, id }: { sets: CollectionSummary[]; label: string; id?: string }) {
  if (sets.length === 0) return null
  return (
    <section id={id} aria-label={label} className="scroll-mt-28">
      <SectionHeading
        eyebrow="Sold as a set"
        heading="The ranges."
        emphasise="ranges."
        level="section"
        className="mb-6 lg:mb-8"
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {sets.map((set, i) => (
          <Reveal key={set.id} delay={staggerDelay(i)} distance={20} amount={0.12}>
            <CollectionCard {...set} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}
