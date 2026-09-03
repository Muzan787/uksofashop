// src/app/journal/articles/whats-inside-a-sofa.tsx
//
// SCOPE NOTE, because this is the one article where it matters.
//
// Sections 1-6 are general upholstery knowledge and are written about sofas in
// general, in the second person, as things to look for and ask about. They make
// NO claim about how our own sofas are built.
//
// The only construction facts asserted about UK Sofa Shop are the ones the site
// already publishes elsewhere and stands behind:
//
//   wooden frames and springs   src/app/faq/faqData.ts - the guarantee answer
//   1-year structural guarantee src/constants/promises.ts
//   all cushions included       product descriptions
//   some pieces UK made         products.origin === 'uk' -> countryOfOrigin GB
//
// Timber species, kiln-drying, joint construction, spring type and foam density
// are NOT recorded anywhere in this repository or in the product specifications,
// which carry only Style, Material and Dimensions. Do not add them here from
// memory or from what "most sofas" do. If those figures are ever confirmed, the
// place for them is the product spec table first and this article second.

import Link from 'next/link'
import { Note, PullQuote } from '@/components/Editorial/EditorialLayout'

export default function WhatsInsideASofa() {
  return (
    <>
      <p>
        You can only judge about a fifth of a sofa by looking at it. The fabric, the shape and the
        stitching are on the outside; the frame, the suspension and the foam are the parts that
        decide whether it still looks like this in eight years, and all three are hidden under the
        upholstery by the time you meet it.
      </p>
      <p>
        This is what is under there, what the differences actually do, and how to form a decent
        opinion in a showroom in about two minutes. It applies to any sofa from anyone — buy on it
        here or somewhere else.
      </p>

      <h2 id="frame">The frame</h2>
      <p>
        The frame is the skeleton, and it is the component whose failure ends a sofa. Foam can be
        replaced and covers can be re-upholstered. A frame that has cracked or worked loose at the
        joints is usually the end, because the labour to fix it exceeds what the sofa is worth.
      </p>
      <p>Broadly, three tiers, and the differences are real:</p>
      <ul>
        <li>
          <strong>Solid hardwood, kiln-dried</strong> — beech, birch, ash. Kiln-drying is the part
          that matters as much as the species: timber that still holds moisture shrinks in a heated
          house, and joints that were tight in the factory work loose over a winter or two. This is
          the top tier and it is priced like it.
        </li>
        <li>
          <strong>Plywood and engineered timber</strong> — genuinely good, and unfairly dismissed.
          Decent multi-ply is dimensionally stable, resists splitting along a grain because it has
          no single grain, and is what a great many perfectly sound sofas are built from.
        </li>
        <li>
          <strong>Particle board and chipboard</strong> — the bottom. It holds a screw once. It
          does not hold one again after the joint has flexed a few thousand times, and it fails
          badly rather than gradually when it gets damp.
        </li>
      </ul>
      <p>
        How the frame is <em>joined</em> matters at least as much as what it is made of. You want
        joints that are glued and dowelled or screwed, with corner blocks bracing the angles.
        Staples alone, holding structural joints rather than just the fabric, are the single
        clearest sign that a frame was built to a price.
      </p>
      <Note title="What we publish">
        <p>
          Our frames are wooden, and our 1-year guarantee covers structural faults in the frame and
          the springs specifically — that is the promise on the{' '}
          <Link href="/faq">FAQ</Link> and we stand behind it. For anything more precise than that
          on a particular sofa, ask us about that piece rather than assuming from the range.
        </p>
      </Note>

      <h2 id="suspension">What actually holds you up</h2>
      <p>
        Between the frame and the cushion is the suspension, and it is doing more work than
        anything else in the sofa. Three common systems:
      </p>
      <ul>
        <li>
          <strong>Elasticated webbing</strong> — woven straps stretched across the seat frame.
          Light, cheap and comfortable when new. It relaxes over time, and a seat that has begun to
          sag in the middle is very often webbing rather than foam, however much the foam gets
          blamed.
        </li>
        <li>
          <strong>Serpentine springs</strong> — also called sinuous or zig-zag: lengths of shaped
          steel running front to back. The workhorse of the industry, and the right answer for most
          sofas at most prices. Firmer than webbing and far more durable.
        </li>
        <li>
          <strong>Pocket springs</strong> — individual coils in fabric sleeves, the same idea as a
          good mattress. Each responds independently, so the seat supports you unevenly in the way
          a body actually is uneven. The most comfortable and the most expensive.
        </li>
      </ul>
      <p>
        None of these is wrong. A serpentine-sprung seat at £600 is a sensible piece of
        engineering, not a compromise; pocket springs at that price would mean the money came out
        of the frame or the foam instead.
      </p>
      <PullQuote>
        Almost every sofa described as &ldquo;gone saggy&rdquo; has failed at the suspension, not
        the cushion. The foam gets replaced, the sag comes back, and nobody works out why.
      </PullQuote>

      <h2 id="foam">Seat foam, and the only number worth knowing</h2>
      <p>
        Foam is sold on two different measurements and people routinely confuse them.
      </p>
      <p>
        <strong>Density</strong> — kilograms per cubic metre — is how much material is in the foam.
        It is the durability number. Roughly: around 20&ndash;25 kg/m³ is budget and will soften
        noticeably inside a couple of years; 30&ndash;35 is a solid domestic seat; above about 35
        is high quality and will hold its shape for many years.
      </p>
      <p>
        <strong>Firmness</strong> is a separate measurement entirely, and a dense foam can be soft
        while a cheap one can feel hard. This is the trap: a budget sofa often feels firm and
        supportive in a showroom precisely because low-density foam has not been sat on yet. Six
        months of daily use is what tells the two apart, which is exactly when it is too late.
      </p>
      <p>
        Density is the number to ask for. If a retailer cannot tell you, that is itself a data
        point — though not always a damning one, since plenty of honest shops simply have not been
        told by their own supplier.
      </p>

      <h2 id="backs">Backs, and where a cheap sofa shows first</h2>
      <p>
        Back cushions are usually filled with polyester fibre, foam, feather, or a mix. Fibre is
        soft and inexpensive and <em>flattens</em>; foam holds its shape and feels firmer; feather
        is the most luxurious and needs the most plumping.
      </p>
      <p>
        The back is where age shows first, because nothing about a flattened back cushion is
        structural — so it fails quietly rather than obviously, and a sofa can look tired for
        reasons the owner never diagnoses. A fixed{' '}
        <Link href="/journal/sofa-jargon-explained">high-back</Link> holds its shape without any
        help; a scatter-back needs plumping and will look neglected within weeks if it does not get
        it. Neither is better made. One asks more of you.
      </p>
      <Note title="Plumping is not fussiness">
        <p>
          Fibre and feather fillings migrate to the edges under weight, and a cushion left flat
          stays flat. Ten seconds a night is genuinely the whole job — the{' '}
          <Link href="/care-guide">care guide</Link> covers it, along with the rest of the
          maintenance that decides whether a sofa lasts ten years or three.
        </p>
      </Note>

      <h2 id="fabric">The cover, and why it matters less than you think</h2>
      <p>
        Upholstery fabric is rub-tested on the Martindale scale, which counts how many cycles of
        abrasion the cloth survives. As a rough guide, general domestic use is served from around
        15,000&ndash;25,000 rubs and heavy domestic use from about 25,000 upwards; the very high
        figures quoted in marketing exist for offices, bars and hotels.
      </p>
      <p>
        The honest version is that for a sofa in a house, almost any competent upholstery fabric
        will outlast the frame it is stretched over. Fabric choice is far more about how it{' '}
        <em>behaves</em> — whether it wipes clean, whether it shows every mark, how it takes light
        — than about whether it will wear through. That is the subject of the{' '}
        <Link href="/fabrics">fabric guide</Link>, which goes through all six of ours properly.
      </p>

      <h2 id="tells">Judging one in two minutes</h2>
      <p>
        You will not be shown a cutaway. You can still learn a surprising amount by handling it:
      </p>
      <ul>
        <li>
          <strong>Lift one front corner.</strong> A well-built sofa is heavy, and the whole front
          rail should come up as one piece. If the frame twists or you hear a creak, the joints are
          not doing their job.
        </li>
        <li>
          <strong>Sit on the front edge.</strong> Right on the rail, not back in the seat. You
          should feel a solid edge, not a bar digging in and not a void.
        </li>
        <li>
          <strong>Press the arm firmly from the side.</strong> Arms take an enormous amount of
          abuse — people sit on them — and a soft or shifting arm means it is padding over
          something thin.
        </li>
        <li>
          <strong>Look underneath.</strong> Lift the dust cover if you can. You are looking for
          proper joints and corner blocks rather than a grid of staples.
        </li>
        <li>
          <strong>Sit in it for longer than feels normal.</strong> Five minutes, not thirty
          seconds. Comfort in the first ten seconds is upholstery; comfort at five minutes is
          suspension and foam.
        </li>
      </ul>

      <h2 id="ask">What to ask, including us</h2>
      <p>
        Four questions get you most of the way with any retailer:
      </p>
      <ol>
        <li>What is the frame made of, and is the timber kiln-dried?</li>
        <li>What is the seat suspension — webbing, serpentine or pocket springs?</li>
        <li>What is the seat foam density in kg/m³?</li>
        <li>What exactly does the guarantee cover, and for how long?</li>
      </ol>
      <p>
        We can answer the fourth precisely and in public: one year, covering structural faults in
        the wooden frame and the springs, on every sofa we sell. Not wear and tear, not fading, not
        accidental damage — the structure. Some of our pieces are also made in the UK, and those
        carry a Made in the UK badge on their product page rather than a general claim across the
        range.
      </p>
      <p>
        For the first three on a specific sofa,{' '}
        <Link href="/contact">ask us about that piece</Link>. We would rather check with the maker
        and tell you the real answer than publish a number across the whole range that turns out
        not to be true of the sofa you bought. If you want to press on the arms and sit on the
        front rail yourself, the <Link href="/showroom">Blackburn showroom</Link> is open by
        appointment.
      </p>

      <h2 id="worth">A last word on price</h2>
      <p>
        None of the above means the most expensive construction is the right purchase. A
        kiln-dried hardwood frame with pocket springs and 35 kg/m³ foam is a genuinely better
        object, and it is also the correct choice for perhaps a minority of buyers — the ones
        keeping a sofa for fifteen years in a busy family room.
      </p>
      <p>
        For a spare room, a first flat, or a room whose layout you expect to change, a sound frame
        with serpentine springs and mid-density foam is not a compromise. It is the right amount of
        sofa. The mistake is not buying cheap; it is buying cheap while believing you bought
        something else.
      </p>
    </>
  )
}
