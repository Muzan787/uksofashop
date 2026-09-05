// src/app/fabrics/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Package } from 'lucide-react'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialSchema from '@/components/Editorial/EditorialSchema'
import EditorialLayout, { Note, PullQuote } from '@/components/Editorial/EditorialLayout'
import { getFabricLibrary } from '@/utils/fabrics'
import { MAX_SAMPLES } from '@/constants/swatches'
import { SamplesProvider, CollectionSwatches, SampleBar } from '@/components/Product/FabricSamples'

/**
 * Said once, used twice: as the meta description, and as the description on
 * the page's own schema node. Two hand-written sentences describing the same
 * page is the sort of drift nobody notices and nothing benefits from.
 */
const DESCRIPTION =
  'All 69 fabrics we build made-to-order sofas in, and how to choose between them: what chenille, plush velvet, crushed velvet, naple, marble and PVC leather each do in a real room. Three free samples posted.'

export const metadata: Metadata = {
  alternates: { canonical: '/fabrics' },
  // 42 characters, so the brand suffix still fits inside ~57. The old title
  // listed all six fabrics, ran to 80 with the suffix, and was cut off mid-word
  // in results - the six names are in the description and the H2s instead.
  title: 'Sofa Fabric Guide: 69 Colours, 6 Fabrics',
  description: DESCRIPTION,
}

/**
 * The fabric range, out from behind the dialog.
 *
 * Until this page there was nowhere on the site a person could look at the
 * sixty-nine fabrics without first finding a made-to-order sofa and opening a
 * panel on it. That is the wrong way round for the question people actually
 * arrive with, which is not "which colour Verona" but "what is chenille and
 * will it survive a dog". It also meant the single largest piece of content we
 * own — sixty-nine photographed weaves — was invisible to a search engine,
 * because a dialog's contents are not a page.
 *
 * So this is both: a guide that answers the question in the order somebody
 * asks it, and the only crawlable index of the range.
 *
 * WHAT THIS PAGE IS ALLOWED TO CLAIM. Everything below describes how a surface
 * behaves — what a broken weave does with a crumb, what a flat one does with
 * dust, which way a pile shades. All of it is either visible in the swatch
 * photographs or true of the material type in general. There are no rub-test
 * figures, no fibre percentages, no cleaning codes and no pet or child claims,
 * because we do not hold that data from the supplier and inventing it is how a
 * spec sheet becomes a complaint. If any of it turns out to be wrong about the
 * cloth actually being cut, this file is the place to fix it.
 */

const TOC = [
  { id: 'choosing', label: 'Start here' },
  { id: 'chenille', label: 'Chenille' },
  { id: 'plush-soft-velvet', label: 'Plush Soft Velvet' },
  { id: 'crushed-velvet', label: 'Crushed Velvet' },
  { id: 'naple', label: 'Naple' },
  { id: 'marble', label: 'Marble' },
  { id: 'pvc-leather', label: 'PVC Leather' },
  { id: 'samples', label: 'Three, free' },
  { id: 'screens', label: 'Why screens lie' },
]

export default async function FabricsPage() {
  const collections = await getFabricLibrary()
  const total = collections.reduce((n, c) => n + c.fabrics.length, 0)
  const count = (slug: string) =>
    collections.find(c => c.slug === slug)?.fabrics.length ?? 0

  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialSchema
        type="Article"
        headline="Sofa Fabric Guide"
        current="Choosing your fabric"
        path="/fabrics"
        updated="2026-09-03"
        description={DESCRIPTION}
      />
      <EditorialHero
        eyebrow="Made to order"
        title="Choosing your fabric"
        lede={`${total} fabrics across ${collections.length} collections, and every one of them the same price. So this is a decision about light, wear and what you want the room to feel like — not about budget.`}
        breadcrumb={[{ label: 'Home', href: '/' }]}
      />

      <SamplesProvider collections={collections}>
        <EditorialLayout toc={TOC}>
          <p>
            Every sofa we make to order can be built in any fabric on this page. There are no
            grades and no upgrade prices — a crushed velvet costs exactly what a chenille costs,
            which is unusual enough to be worth saying twice. It also means the only thing left to
            decide is which one you actually want to live with.
          </p>
          <p>
            Tap any swatch to have it posted to you. {MAX_SAMPLES} samples, free, anywhere on the
            UK mainland.
          </p>

          <h2 id="choosing">Start here</h2>
          <p>
            Most people arrive at this page trying to choose a colour and leave having chosen a
            texture, because texture is what decides how a sofa looks at four in the afternoon in
            a real room. Three questions get you most of the way.
          </p>

          <h3>How much light does the room get?</h3>
          <p>
            A pile fabric — the velvets, and Marble — does something to light that a flat weave
            does not: it reflects differently depending on which way the pile lies, so the same
            cushion reads as two shades from two ends of the room. In a bright room that is the
            whole appeal. In a dark north-facing room it mostly disappears, and you have paid in
            upkeep for an effect nobody can see. Dark rooms are where the flat weaves earn their
            place.
          </p>

          <h3>What is going to happen to it?</h3>
          <p>
            A broken surface hides things and a flat one shows them. That is the single most
            useful rule on this page. Chenille and Marble have irregular surfaces and swallow
            crumbs, dust and light wear; Naple is flat and even and shows every one of them. It is
            not about durability — it is about what you will be looking at on a Tuesday.
          </p>

          <h3>Should the sofa be the quiet thing or the loud thing?</h3>
          <p>
            In a room that already has pattern — a rug, wallpaper, a lot of art — a plain matte
            weave lets everything else be seen. In a plain room, a crushed velvet or a Marble is
            the thing that stops it reading as unfinished. Two good fabrics can both be wrong in
            the same room.
          </p>

          <PullQuote>
            Every fabric here costs the same. Nobody is steering you towards the expensive one,
            because there isn&apos;t one.
          </PullQuote>

          <h2 id="chenille">Chenille</h2>
          <p>
            <strong>{count('chenille')} colours.</strong> Chenille is woven from a yarn that has
            short fibres bound into its core, which leaves the surface soft and slightly broken
            rather than smooth. Look closely at any of the swatches below and you can see it: a
            fine, nubbly texture flecked with lighter and darker threads of the same colour.
          </p>
          <p>
            That flecking is the practical argument for it. A surface that is already visually
            busy does not show the small stuff — crumbs, dust, the faint sheen a sofa arm picks up
            over a year. It is the most forgiving fabric here for a room that gets used properly,
            and it is warm and soft to sit on, which the flat weaves are not.
          </p>
          <p>
            The trade is that the pile flattens where you always sit. It is not damage and it is
            not permanent; a soft brush lifts it back. But it does need the brush.
          </p>
          <CollectionSwatches slug="chenille" />

          <h2 id="plush-soft-velvet">Plush Soft Velvet</h2>
          <p>
            <strong>{count('plush-soft-velvet')} colours — the largest collection we offer.</strong>{' '}
            A short, dense, even pile. Colour on a plush velvet reads deeper and more saturated
            than the same colour on a flat weave, because the pile traps light instead of bouncing
            it straight back. It is the fabric that makes a sofa look like it cost more than it
            did.
          </p>
          <p>
            You need to know two things about pile before you order one. It shades: walk around
            the sofa and the colour shifts, sometimes dramatically, because you are seeing the
            fibres from a different angle. And it marks: sit on it and you leave a lighter patch
            where the pile has been pushed over. Both are characteristics of velvet rather than
            faults, and both brush out in seconds — but if a sofa that always looks identical is
            what you want, this is not the one.
          </p>
          <CollectionSwatches slug="plush-soft-velvet" />

          <h2 id="crushed-velvet">Crushed Velvet</h2>
          <p>
            <strong>{count('crushed-velvet')} colours.</strong> The same pile as a plush velvet,
            deliberately pressed in random directions so the sheen breaks into a rippled,
            high-contrast shimmer. It is the loudest fabric on this page by some distance, and it
            throws a lot of light around a room.
          </p>
          <p>
            There is a genuinely practical reason to choose it over a plush velvet, though, and it
            is not obvious: because the surface is already irregular in every direction, the sit
            marks that show on a plush velvet have nowhere to show. They land in a pattern that is
            already broken and vanish. Of the two velvets, this is the low-maintenance one.
          </p>
          <CollectionSwatches slug="crushed-velvet" />

          <h2 id="naple">Naple</h2>
          <p>
            <strong>{count('naple')} colours.</strong> The plain one. Naple is a fine, flat,
            tightly ribbed weave — very close vertical cords with a low sheen along them and
            almost no shine otherwise. There is no pile to shade, no pattern to read, and no
            texture competing for attention. It is a sofa that is a shape rather than a surface.
          </p>
          <p>
            That flatness cuts both ways. It is the most restrained fabric here and the easiest to
            put in a room that already has a lot going on. It is also the least forgiving: dust,
            pet hair and pale crumbs sit on top of an even surface with nothing to hide in. If you
            have a light-shedding dog, choose almost anything else on this page.
          </p>
          <CollectionSwatches slug="naple" />

          <h2 id="marble">Marble</h2>
          <p>
            <strong>{count('marble')} colours.</strong> A soft short pile carrying an irregular,
            stone-like veining, so the tone shifts across a single cushion and no two areas match.
            The swatches show it clearly — what looks like one grey at a distance is four or five
            close up.
          </p>
          <p>
            It is the most decorative fabric we offer, and the most situational. In a plain room it
            does a lot of work on its own. In a room that already has a patterned rug and busy
            walls it will argue with them. It hides everyday marks as well as chenille does, for
            the same reason — there is no flat, even ground for anything to show against.
          </p>
          <CollectionSwatches slug="marble" />

          <h2 id="pvc-leather">PVC Leather</h2>
          <p>
            <strong>{count('pvc-leather')} colours.</strong> This is not leather, and we would
            rather say so on the page than have you find out from the swatch. It is a coated
            fabric with a leather-look grained surface, and it behaves like a coating rather than
            like a hide.
          </p>
          <p>
            What that gets you is the reason most people choose it: nothing soaks in. A spill sits
            on the surface and comes off with a damp cloth, which no fabric on this page can
            offer. It needs no conditioner, unlike real leather, which will crack if you never
            feed it.
          </p>
          <p>
            What it costs you is everything hide does over time. It will not soften, it will not
            develop a patina, and it will look much the same in year five as it does on delivery
            day — depending on your view, that is either the entire point or the whole objection.
            It also does not breathe the way leather does, so it can feel cold to sit down on in
            January and warm in July.
          </p>
          <CollectionSwatches slug="pvc-leather" />

          <h2 id="samples">Three, free, through your letterbox</h2>
          <p>
            Tap any of the {total} swatches above and we will post you up to {MAX_SAMPLES} of
            them, anywhere on the UK mainland. There is nothing to pay, nothing to send back, and
            no account to make.
          </p>
          <p>
            We ring you before anything goes in the post. That is not a sales call — it is because
            people quite often pick three shades of the same grey when what they actually wanted
            was to see a grey next to a mink next to a charcoal, and two minutes on the phone
            saves a week.
          </p>
          <p>
            If you already know roughly what you are after and would rather not read the rest of
            this, the <Link href="/swatches">free samples page</Link> is the same {total} swatches
            with a filter over them and none of the explaining.
          </p>

          <Note title="Ordering without samples">
            <p>
              You can. Made-to-order sofas are built to your specification, which means they fall
              outside the 14-day change-of-mind right that applies to everything else we sell — so
              the fabric you choose is the fabric you keep. If there is any doubt at all, wait for
              the samples. They take a few days and they cost nothing.
            </p>
          </Note>

          <h2 id="screens">Why your screen is lying to you</h2>
          <p>
            Every swatch on this page was photographed under one set of lights and is being shown
            to you on a screen we have never seen, in a room we know nothing about. Phone
            displays boost saturation. Monitors are calibrated differently or, more often, not at
            all. A north-facing living room at 4pm in November is a completely different light
            source from a photography studio.
          </p>
          <p>
            The small colour dot behind each swatch while the photograph loads is an approximation
            we store to avoid a grey box — it is a placeholder, never a claim about the cloth. The
            photograph is closer, and a sample in your own hand, held against your own wall, at
            the time of day you actually use the room, is the only one of the three that settles
            it.
          </p>

          <div className="my-8 flex flex-wrap items-center gap-5 rounded-md border border-ink-700 bg-ink-900 p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-ember-500/20">
              <Package aria-hidden="true" className="h-5 w-5 text-ember-300" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 font-display text-h3 font-semibold text-calico-50">
                Ready to see one in the flesh?
              </p>
              <p className="m-0 mt-2 text-body-sm leading-relaxed text-calico-300">
                Pick your samples above, or come and sit on the frames at the Blackburn showroom
                before you decide on either.
              </p>
            </div>
            <Link
              href="/showroom"
              className="hover-btn flex h-12 shrink-0 items-center rounded-sm bg-ember-500 px-5 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900 no-underline"
            >
              Visit the showroom
            </Link>
          </div>

          <p className="fine">
            Once you have chosen, every made-to-order frame in the{' '}
            <Link href="/shop/all">shop</Link> offers the whole library at the same price. Looking
            after it afterwards is the <Link href="/care-guide">care guide</Link>; making sure it
            gets through the door is the <Link href="/size-guide">size guide</Link>.
          </p>
        </EditorialLayout>

        <SampleBar />
      </SamplesProvider>
    </div>
  )
}
