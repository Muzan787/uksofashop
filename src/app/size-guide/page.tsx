// src/app/size-guide/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialSchema from '@/components/Editorial/EditorialSchema'
import EditorialLayout, { Note, PullQuote } from '@/components/Editorial/EditorialLayout'
import DoorwayCalculator, { type CalculatorProduct } from './DoorwayCalculator'
import FitCheckForm from './FitCheckForm'
import { canonicalProductPath } from '@/utils/productUrl'

/**
 * Said once, used twice: as the meta description, and as the description on
 * the page's own schema node. Two hand-written sentences describing the same
 * page is the sort of drift nobody notices and nothing benefits from.
 */
const DESCRIPTION =
  'Work out whether a sofa will fit through your door before you order. A doorway calculator, how to measure, and a free fit check from our delivery team.'

export const metadata: Metadata = {
  alternates: { canonical: '/size-guide' },
  title: 'Sofa Size & Measurement Guide',
  description: DESCRIPTION,
}

const TOC = [
  { id: 'calculator', label: 'Doorway calculator' },
  { id: 'measuring', label: 'How to measure' },
  { id: 'doors', label: 'Doors and entrances' },
  { id: 'hallways', label: 'Hallways and corners' },
  { id: 'room', label: 'The room itself' },
  { id: 'fit-check', label: 'Ask for a fit check' },
]

export default async function SizeGuidePage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select(`
      title,
      slug,
      size_label,
      specifications,
      categories!products_category_id_fkey ( slug ),
      product_categories ( categories ( slug ) )
    `)
    .eq('is_active', true)
    .order('title')

  const products: CalculatorProduct[] = (data ?? []).map(p => {
    const specs = (p.specifications ?? {}) as Record<string, unknown>
    return {
      title: p.title,
      // The join table is selected alongside the primary category so this can
      // fall back the way canonicalProductPath expects. On the primary column
      // alone, a product with no category_id set fell through to 'all' — a
      // segment no product belongs to, so the link answered with a 308.
      href: canonicalProductPath(p),
      sizeLabel: p.size_label ?? null,
      dimensions: typeof specs.dimensions === 'string' ? specs.dimensions : '',
    }
  })

  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialSchema
        type="Article"
        headline="Sofa Size & Measurement Guide"
        current="Will it fit?"
        path="/size-guide"
        updated="2026-08-28"
        description={DESCRIPTION}
      />
      <EditorialHero
        eyebrow="Before you order"
        title="Will it fit?"
        lede="There is nothing worse than a sofa stuck in the hallway. Measure once, here, and we will tell you what goes in."
        breadcrumb={[{ label: 'Home', href: '/' }]}
      />

      <EditorialLayout toc={TOC}>
        <p>
          Almost every delivery that goes wrong goes wrong at the front door, and almost all of
          those were preventable with a tape measure and two minutes. This page is those two
          minutes.
        </p>

        <h2 id="calculator">Start with the doorway</h2>
        <p>
          A sofa does not go through a door the way it sits in a room. It goes through on its
          side, so the measurement that decides everything is not the length — it is the
          cross-section, the smaller of the depth and the height.
        </p>

        <DoorwayCalculator products={products} />

        <h2 id="measuring">How to measure</h2>
        <p>
          Three measurements, in the order the sofa meets them. Write them down as you go; you
          will want them again when you talk to us.
        </p>

        <h3 id="doors">1. Doors and entrances</h3>
        <p>
          Open the door as wide as it goes and measure the <strong>narrowest point</strong> — from
          the inside of the frame to the face of the open door, not the frame’s outer width. That
          door leaf takes 40 to 50mm off the opening and it is the single most common reason a
          measurement turns out to be optimistic. Measure the height of the frame too.
        </p>
        <p>
          If the door lifts off its hinges, say so when you talk to us. It changes the answer more
          than anything else on this page.
        </p>

        <h3 id="hallways">2. Hallways and corners</h3>
        <p>
          Measure the width of the hallway, noting anything that sticks out: radiators, skirting,
          a meter cupboard, a light fitting at head height. Then find the turns. A straight run is
          rarely the problem — the pivot at the bottom of the stairs usually is.
        </p>
        <p>
          For a corner, what matters is the diagonal clearance: the space a long box needs to
          swing through ninety degrees. If the hallway narrows at that exact point, that is where
          it will stop.
        </p>

        <h3 id="room">3. The room itself</h3>
        <p>
          Mark the sofa’s footprint on the floor with masking tape or newspaper before you order.
          It is a five-minute job and it settles the argument. Check you can still walk around it,
          open the doors fully, reach the sockets, and draw the curtains.
        </p>

        <PullQuote>
          Measure the narrowest point of the open doorway, not the frame. The door itself takes
          two inches, and two inches is usually the whole argument.
        </PullQuote>

        <Note title="The legs come off">
          <p>
            Our sofas arrive in pieces and the feet unscrew, which takes around 10cm off the
            height and makes a great many of them fit through a standard UK doorway that they
            would not clear assembled. If the calculator says a sofa is tight, this is usually why
            it still goes in.
          </p>
        </Note>

        <h2 id="fit-check">Ask us to check it for you</h2>
        <p>
          Send us your measurements and we will work through them with you — including the bits
          that are hard to judge from a tape measure, like whether a turn is genuinely tight or
          just looks it. It costs nothing and we would far rather do it now than on delivery day.
        </p>

        <div className="my-8 rounded-md border border-calico-300 bg-calico-100 p-5 sm:p-7">
          <FitCheckForm />
        </div>

        <p className="fine">
          Prefer to talk? Call <a href="tel:+447476616022">07476 616022</a>, Mon–Fri 9am–6pm and
          Sat 10am–4pm, or <Link href="/contact">send us a message</Link>.
        </p>
      </EditorialLayout>
    </div>
  )
}
