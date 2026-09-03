// src/app/care-guide/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Phone } from 'lucide-react'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialSchema from '@/components/Editorial/EditorialSchema'
import EditorialLayout, { Note, PullQuote } from '@/components/Editorial/EditorialLayout'
import { PHONE_DISPLAY, PHONE_HREF } from '@/constants/contact'

/**
 * Said once, used twice: as the meta description, and as the description on
 * the page's own schema node. Two hand-written sentences describing the same
 * page is the sort of drift nobody notices and nothing benefits from.
 */
const DESCRIPTION =
  'How to keep a fabric or leather sofa looking right: weekly upkeep, what to do about a spill in the first thirty seconds, and the products that will ruin it.'

export const metadata: Metadata = {
  alternates: { canonical: '/care-guide' },
  title: 'Sofa Care & Cleaning Guide',
  description: DESCRIPTION,
}

const TOC = [
  { id: 'basics', label: 'The three basics' },
  { id: 'fabric', label: 'Fabric sofas' },
  { id: 'leather', label: 'Leather sofas' },
  { id: 'spills', label: 'Spills, in order' },
  { id: 'never', label: 'What never to use' },
  { id: 'help', label: 'Ask us first' },
]

export default function CareGuidePage() {
  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialSchema
        type="Article"
        headline="Sofa Care & Cleaning Guide"
        current="Looking after it"
        path="/care-guide"
        updated="2026-09-03"
        description={DESCRIPTION}
      />
      <EditorialHero
        eyebrow="Maintenance & protection"
        title="Looking after it"
        lede="A sofa is a ten-year purchase looked after and a three-year one otherwise. Most of the difference is a soft brush and thirty seconds after a spill."
        breadcrumb={[{ label: 'Home', href: '/' }]}
      />

      <EditorialLayout toc={TOC}>
        <p>
          None of this is difficult, and almost none of it costs anything. The parts that matter
          are the ones people skip: vacuuming a fabric that looks clean, and blotting rather than
          rubbing when something goes over.
        </p>

        <h2 id="basics">The three basics</h2>
        <p>These apply to every sofa we sell, in every material.</p>

        <h3>Plump the cushions</h3>
        <p>
          Fibre and feather-filled cushions need plumping daily — a shake and a firm pat down after
          an evening on them. It is not fussiness: the filling migrates to the edges under weight,
          and a cushion left flat stays flat. Ten seconds a night is the whole job.
        </p>

        <h3>Keep it out of direct sun</h3>
        <p>
          Prolonged UV fades both fabric and leather, and it fades unevenly — the arm nearest the
          window goes first, which is far more noticeable than an overall change. If the only place
          for the sofa is by a window, rotate the cushions every few months so it fades evenly.
        </p>

        <h3>Keep it away from the radiator</h3>
        <p>
          At least 30cm. Localised dry heat cracks leather and can warp a wooden frame over a
          winter or two. This is the single most common avoidable damage we see.
        </p>

        <h2 id="fabric">Fabric sofas</h2>
        <p>
          <strong>Vacuum weekly</strong> with the soft brush attachment. This is the one that feels
          unnecessary and is not: grit works its way into the weave and then abrades the fibres from
          the inside every time somebody sits down. A fabric sofa that is vacuumed does not wear
          out where you sit; one that is not, does.
        </p>
        <p>
          <strong>Do not machine wash the covers</strong> unless the label explicitly says you can.
          Most upholstery fabric shrinks, and a cover that has shrunk 3% will never go back on.
        </p>
        <p>
          <strong>Get it professionally cleaned</strong> once a year, or after anything major. An
          upholstery cleaner has extraction equipment that lifts what a cloth pushes further in.
        </p>
        <p className="fine">
          Pile fabrics — the velvets and Marble — also need brushing rather than just vacuuming, to
          lift the flattening where people sit. Which fabric behaves how is set out in the{' '}
          <Link href="/fabrics">fabric guide</Link>.
        </p>

        <h2 id="leather">Leather sofas</h2>
        <p>
          <strong>Dust it weekly</strong> with a soft microfibre cloth, lightly dampened with plain
          water. Nothing else on the cloth.
        </p>
        <p>
          <strong>Condition it every six to twelve months</strong> with a proper leather
          conditioner. Leather is a skin and it dries out; conditioning is what stops the creases
          across the seat turning into cracks. This is the difference between leather that looks
          better at year five and leather that looks worse.
        </p>

        <PullQuote>
          Blot, never rub. Rubbing pushes a spill through the surface and into the filling, and
          turns a mark you could have lifted into one you cannot.
        </PullQuote>

        <h2 id="spills">Spills, in order</h2>
        <ol>
          <li>
            <strong>Get to it now.</strong> The first thirty seconds decide almost everything. A
            fresh spill sits on the surface; a five-minute-old one has wicked into the padding.
          </li>
          <li>
            <strong>Blot with a clean, dry, uncoloured cloth.</strong> White or cream — a coloured
            cloth can transfer its own dye into damp fabric. Press down and lift. Do not scrub.
          </li>
          <li>
            <strong>Work from the outside in.</strong> Starting at the edge of the mark and moving
            inward stops you spreading it into a bigger, fainter ring.
          </li>
          <li>
            <strong>Let it dry on its own,</strong> away from direct heat. A hairdryer sets some
            stains permanently.
          </li>
          <li>
            <strong>If it is still there, stop and ask</strong> before reaching for anything
            stronger. That is what the next section is about.
          </li>
        </ol>

        <h2 id="never">What never to use</h2>
        <p>
          On leather especially, this list is short and absolute. Every one of these strips the
          protective topcoat, and once that has gone the dye goes with it — permanently, and
          usually in a patch exactly the shape of the cloth.
        </p>
        <ul>
          <li>Baby wipes — the most common cause of ruined leather we hear about</li>
          <li>Multi-purpose or kitchen sprays</li>
          <li>Bleach, or anything containing it</li>
          <li>Solvents, white spirit, nail varnish remover</li>
          <li>Washing-up liquid, on leather</li>
        </ul>

        <Note title="Test it somewhere hidden">
          <p>
            Whatever you use, try it first on the underside of the sofa or the back of a cushion —
            somewhere that never shows. Give it an hour and look again. If the colour has moved at
            all, it will do the same on the seat.
          </p>
        </Note>

        <h2 id="help">Ask us first</h2>
        <p>
          If you have a stain you are unsure about, send us a photograph before you try anything.
          We would much rather spend two minutes telling you what is safe than deal with the damage
          from the wrong product — which, unlike the original stain, is not something we can put
          right.
        </p>

        <div className="my-8 flex flex-wrap items-center gap-5 rounded-md border border-ink-700 bg-ink-900 p-6">
          <div className="min-w-0 flex-1">
            <p className="m-0 font-display text-h3 font-semibold text-calico-50">
              Dealing with a stubborn stain?
            </p>
            <p className="m-0 mt-2 text-body-sm leading-relaxed text-calico-300">
              Send us a photograph and tell us what went on it. We will tell you what is safe to
              try, and what to leave to a professional.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <a
              href={PHONE_HREF}
              className="hover-btn hover-btn-dark flex h-12 items-center gap-2 rounded-sm border border-calico-50/25 px-5 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-calico-50 no-underline"
            >
              <Phone aria-hidden="true" className="h-4 w-4" />
              {PHONE_DISPLAY}
            </a>
            <Link
              href="/contact"
              className="hover-btn flex h-12 items-center rounded-sm bg-ember-500 px-5 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900 no-underline"
            >
              Send a photo
            </Link>
          </div>
        </div>

        <p className="fine">
          Structural problems — a frame or a spring — are covered by the 1-year guarantee and are a
          different conversation. See <Link href="/delivery-returns">delivery and returns</Link>.
        </p>
      </EditorialLayout>
    </div>
  )
}
