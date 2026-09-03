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
//   Nova range (4 products)   tech leather. A coated synthetic - breathable,
//                             scratch-resistant, wipes clean. NOT a hide, so it
//                             never patinas and must never be described as if
//                             it does, and it must not be conditioned.
//   Roma range (5 products)   real leather, blended with fabric panels. It is a
//                             hide, it does patina, and it wants conditioning
//                             every six to twelve months.
//
// Both confirmed by the owner, 4 Sept 2026. The catalogue copy does not make
// the Roma's status explicit - it says only "a blend of durable leather and
// soft fabric" - so do not re-derive this from the product descriptions and
// conclude the opposite, which is what happened the first time this was written.
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
        <strong>Our leather sofas</strong> are two ranges and they are genuinely different
        materials, which almost nobody tells you. The <strong>Roma</strong> range is{' '}
        <strong>real leather</strong>, blended with fabric panels — a hide, with everything that
        follows from that. The <strong>Nova</strong> range is <strong>tech leather</strong>: a
        coated synthetic that is breathable, scratch-resistant and wipes clean.
      </p>
      <p>
        They look similar in a photograph and they behave differently in a house, so it is worth
        knowing which one you are looking at. It changes how the sofa ages, and it changes how you
        are meant to look after it.
      </p>
      <Note title="Which is which">
        <p>
          If you want genuine hide, that is the <strong>Roma</strong>. If you want the lowest
          maintenance and the best resistance to claws and sticky hands, that is the{' '}
          <strong>Nova</strong>. Tech leather is not a lesser hide so much as a different material
          with a different set of trade-offs, and several of them are advantages —{' '}
          <Link href="/shop/leather-sofa">both ranges are here</Link>.
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
        <strong>Cats: the Nova, if anything.</strong> Claws catch and pull loops in a woven fabric
        — a chenille or a velvet can be ruined by one determined cat in a fortnight. Real hide, so
        the Roma, punctures and scars and does not recover. Tech leather sits between the two: the
        Nova is scratch-resistant, and a smooth coated surface offers a cat far less to hook into
        than a pile does. It is not claw-proof, because nothing is. Give the cat something it
        prefers regardless.
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
        <strong>Real leather — the Roma</strong> — ages the way people hope leather will. It takes
        marks where you actually sit and gets darker and softer there, so it does not wear evenly;
        it develops character in the places you use. Whether that is the point or the problem is
        personal, and it is the one thing tech leather cannot give you. It asks for conditioning
        every six to twelve months in return, which is what stops the seat creases turning into
        cracks.
      </p>
      <p>
        <strong>Tech leather — the Nova</strong> — holds its colour and its finish instead. It will
        not darken, will not soften where you sit, and will not look better at year five than at
        year one; it looks consistent for a long time and then eventually shows wear at the seams
        and the front edge of the seat. In exchange it needs nothing but a damp cloth, ever. If
        &ldquo;it will age beautifully&rdquo; is why you were leaning towards leather, the Roma is
        the one you mean.
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
        <li>
          <strong>Between the two leathers</strong> — Roma if you want a hide that ages into
          something and you will condition it twice a year; Nova if you want to wipe it and forget
          it. The <Link href="/care-guide">care guide</Link> has the routine for each.
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
