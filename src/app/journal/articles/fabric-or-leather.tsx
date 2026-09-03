// src/app/journal/articles/fabric-or-leather.tsx
//
// SCOPE NOTE. /fabrics owns the six fabrics and the 69 colours in depth, and
// the care guide owns cleaning both surfaces. This piece owns the CHOICE, and
// it is deliberately organised by household - children, pets, allergies,
// temperature - rather than by material, so it does not become a second and
// worse version of the fabric guide.
//
// MATERIAL ACCURACY, which is the whole reason this file has a scope note.
// Checked against the live catalogue, September 2026:
//
//   Nova range (4 products)   "Elephant Grey tech leather, a breathable,
//                             scratch-resistant material that wipes clean"
//   Roma range (5 products)   "a blend of durable leather and soft fabric"
//
// Nothing in the range is described as full hide. So this article must NOT
// attribute hide behaviour to it - no patina, no "leather is a skin", no
// darkening and softening where you sit. An earlier version of the leather
// category copy did exactly that and has been corrected.
//
// The Roma's leather component is not stated as genuine or synthetic anywhere,
// so this says what each range says and sends anyone who specifically needs
// hide to ask. Do not resolve that ambiguity by guessing.
//
// Other facts from elsewhere:
//   69 colours / 6 fabrics, 3 free samples   /fabrics, actions/swatches.ts
//   fabric made to order, leather stocked
//   with the full 14 days                    products.custom_made, via the
//                                            returnPolicy in utils/schema.ts

import Link from 'next/link'
import { Note, PullQuote } from '@/components/Editorial/EditorialLayout'

export default function FabricOrLeather() {
  return (
    <>
      <p>
        This is the first real decision of a sofa purchase and it is usually made on a photograph,
        which is the one input that tells you nothing useful. Both look good in a picture. They
        behave completely differently in a house with a toddler, a dog, or a radiator under the
        window.
      </p>
      <p>
        So this is organised by household rather than by material. Find the paragraph that sounds
        like yours.
      </p>

      <h2 id="what">First, what we actually sell</h2>
      <p>
        Worth being precise, because the trade often is not.
      </p>
      <p>
        <strong>Our fabric sofas</strong> are made to order in any of 69 colours across six
        materials — chenille, plush velvet, crushed velvet, naple, marble and PVC leather — all at
        the same price. The <Link href="/fabrics">fabric guide</Link> covers what each one does.
      </p>
      <p>
        <strong>Our leather sofas</strong> are two ranges and they are not the same thing. The Nova
        range is upholstered in <strong>tech leather</strong>: a coated, breathable,
        scratch-resistant material that wipes clean. The Roma range is a{' '}
        <strong>blend of leather and soft fabric</strong>. Neither is a full-hide sofa, and neither
        behaves like one — which matters mostly for how they age, covered further down.
      </p>
      <Note title="If you specifically want hide">
        <p>
          Tech leather is not a lesser version of hide so much as a different material with a
          different set of trade-offs, several of which are advantages. But if genuine hide is what
          you are set on, <Link href="/contact">ask us before ordering</Link> rather than working it
          out from a photograph.
        </p>
      </Note>

      <h2 id="children">If you have young children</h2>
      <p>
        <strong>Leather, comfortably.</strong> This is the least close call on the page.
      </p>
      <p>
        The deciding factor is not spills in general, it is <em>time</em>. On a wipe-clean surface a
        spilled drink is a cloth and ten seconds and it is over. On an untreated woven fabric the
        outcome is decided in the first thirty seconds and sometimes it is permanent — which is why
        the <Link href="/care-guide">care guide</Link> opens with what to do in that half minute.
      </p>
      <p>
        The same goes for the things nobody warns you about: felt-tip, sticky hands, the yoghurt
        that goes down the side of the seat cushion and is discovered later. Tech leather in
        particular is scratch-resistant and takes a damp cloth without argument.
      </p>
      <p>
        If you want fabric anyway — and plenty of people do — the honest compromise is{' '}
        <strong>PVC leather from the fabric library</strong>, which is a made-to-order fabric that
        wipes clean, or a darker chenille, which hides a great deal more than a pale velvet.
      </p>

      <h2 id="pets">If you have a dog or a cat</h2>
      <p>
        More nuanced, and it depends which animal.
      </p>
      <p>
        <strong>Dogs: leather.</strong> Hair sits on the surface and comes off with a cloth instead
        of working into a weave. Muddy paws wipe rather than soak. And a wet dog on fabric is a
        smell that lives in the filling, not on the cover, which is the part you cannot wash.
      </p>
      <p>
        <strong>Cats: it is a genuine toss-up.</strong> Claws catch and pull loops in a woven fabric
        — a chenille or a velvet can be ruined by one determined cat in a fortnight. Full hide
        punctures and scars. Tech leather sits between the two: our Nova range is described as
        scratch-resistant, and a smooth coated surface offers a cat much less to hook into than a
        pile does. It is not claw-proof, because nothing is. Give the cat something it prefers.
      </p>
      <PullQuote>
        Hair and mud come off leather. On fabric they go in. That is the whole argument, and for
        most households with an animal it settles it.
      </PullQuote>

      <h2 id="allergies">If somebody in the house has allergies</h2>
      <p>
        <strong>Leather, clearly.</strong> Upholstery fabric is a textile and textiles hold dust,
        dander and mites in the weave; a sealed surface holds almost none, and what settles on it
        is wiped off rather than vacuumed out.
      </p>
      <p>
        If it has to be fabric, vacuum weekly with the soft brush attachment and mean it. Grit and
        dust work into a weave whether you can see them or not.
      </p>

      <h2 id="comfort">How they feel to sit on</h2>
      <p>
        The point in fabric&rsquo;s favour, and it is not a small one.
      </p>
      <p>
        Fabric is warm to the touch straight away and stays a comfortable temperature. A coated
        surface takes the temperature of the room, so in an unheated lounge in January it is cold
        for the first minute, and in a conservatory in July bare legs stick to it. Tech leather is
        better than hide on the second of those because it is made to breathe, but it is not fabric.
      </p>
      <p>
        Fabric also absorbs sound and softens a room. A hard floor, a large window and a coated
        sofa together make a living room that echoes.
      </p>

      <h2 id="look">How they age, honestly</h2>
      <p>
        This is where the tech leather distinction actually matters, and where a lot of sofa copy
        gets written about a material the shop is not selling.
      </p>
      <p>
        <strong>Fabric</strong> fades in sunlight — unevenly, so the arm nearest the window goes
        first — and the pile flattens where people sit. Both are slow, both are gradual, and both
        can be pushed back a long way by rotating the cushions and keeping it out of direct sun.
      </p>
      <p>
        <strong>Tech leather and leather blends</strong> hold their colour and their finish. What
        they do not do is develop the patina people pay for in an expensive hide sofa — they will
        not darken and soften where you sit, and they will not look better in year five than in
        year one. They look consistent for a long time and then, eventually, show wear at the seams
        and the front edge of the seat rather than mellowing. If &ldquo;it will age beautifully&rdquo;
        is why you were leaning towards leather, that is the sentence to read twice.
      </p>

      <h2 id="size">The difference that has nothing to do with the surface</h2>
      <p>
        Two practical consequences that catch people out, and for some households they decide it
        outright:
      </p>
      <ul>
        <li>
          <strong>Fabric is made to order, so the size is yours.</strong> If the alcove is 214cm,
          that is a solvable problem. See{' '}
          <Link href="/journal/made-to-order-explained">made to order, explained</Link>.
        </li>
        <li>
          <strong>Leather is stocked in set sizes, so it comes with the full 14 days.</strong> A
          made-to-measure fabric sofa is the standard exemption from the right to change your mind,
          because it is built to your specification. A stocked leather one is not.
        </li>
        <li>
          <strong>Only fabric can be sampled.</strong> We post three fabric swatches free, anywhere
          in the UK. There is no equivalent for the leather ranges, so if you want to feel those,
          the <Link href="/showroom">Blackburn showroom</Link> is the way.
        </li>
      </ul>
      <p>
        Read together: fabric gives you control over the object and less room to change your mind;
        leather gives you less control and more room. Which of those you want depends less on the
        material than on how certain you are.
      </p>

      <h2 id="verdict">The short version</h2>
      <ul>
        <li>
          <strong>Young children, a dog, or allergies</strong> — leather, or PVC leather from the
          fabric library if you want made-to-order sizing with a wipe-clean surface.
        </li>
        <li>
          <strong>A cat</strong> — tech leather over a pile fabric, but expect no material to be
          claw-proof.
        </li>
        <li>
          <strong>A cold room, a hard floor, or a specific colour in mind</strong> — fabric, and use
          the free samples.
        </li>
        <li>
          <strong>A room with an awkward measurement</strong> — fabric, because it can be built to
          fit.
        </li>
        <li>
          <strong>Not fully decided yet</strong> — leather, because it keeps your 14 days.
        </li>
      </ul>
      <p>
        And if your house is two of these at once, which most are, tell us which two and we will
        give you a straight answer rather than the expensive one.{' '}
        <Link href="/contact">Ask us</Link>.
      </p>
    </>
  )
}
