// src/app/journal/articles/made-to-order-explained.tsx

import Link from 'next/link'
import { Note, PullQuote } from '@/components/Editorial/EditorialLayout'

export default function MadeToOrderExplained() {
  return (
    <>
      <p>
        &ldquo;Made to order&rdquo; is one of those phrases that sounds like a marketing line and
        is actually a legal and practical distinction. It changes what you can ask for, and it
        changes what happens if you decide you do not want the sofa after all. Both halves are
        below, and the second half is the one most shops leave out.
      </p>

      <h2 id="what">What it actually means</h2>
      <p>
        Our fabric sofas do not exist when you order them. They are built afterwards, to the
        specification you chose, and then delivered. Our leather sofas are the opposite — they are
        stocked in fixed sizes and colours, and ordering one takes a sofa that already exists off a
        shelf.
      </p>
      <p>
        That single difference is where everything else on this page comes from. You get decisions
        a stocked sofa cannot offer you, and you give up a protection a stocked sofa comes with.
      </p>

      <h2 id="size">Changing the size</h2>
      <p>
        This is the part people do not realise is available, and it is the best reason to buy this
        way. If the alcove is 214cm and every sofa you have found is 220cm, that is a solvable
        problem rather than a reason to give up on the alcove.
      </p>
      <p>
        Tell us the measurement you need and we will tell you whether it can be built. Not every
        dimension on every frame can move — a seat depth has structural limits, and there is a
        point past which a shape stops being the shape you liked — so this is a conversation rather
        than a form field. It is also free: a sofa made 6cm narrower is not a surcharge.
      </p>
      <Note title="Measure the route, not just the room">
        <p>
          A sofa built to fit your alcove perfectly still has to get through the front door and
          round the turn at the bottom of the stairs. Run both through the calculator on the{' '}
          <Link href="/size-guide">size guide</Link> before you settle on a size — it is the same
          two minutes whether you do it now or after the sofa is in the hallway.
        </p>
      </Note>

      <h2 id="fabric">The 69 colours</h2>
      <p>
        Every made-to-order sofa can be built in any fabric in the library: 69 colours across six
        materials — chenille, plush velvet, crushed velvet, naple, marble and PVC leather.
      </p>
      <p>
        <strong>They are all the same price.</strong> There is no premium tier and no upgrade
        charge, which means the decision is purely about how the cloth behaves and what you want
        the room to feel like. Chenille wears hardest, plush velvet looks the most expensive,
        crushed velvet catches light and hides very little, naple and marble carry pattern in the
        weave, and PVC leather wipes clean in seconds. The{' '}
        <Link href="/fabrics">fabric guide</Link> goes through all six properly and shows every
        colour.
      </p>

      <h2 id="samples">Order the samples first</h2>
      <p>
        We will post you <strong>three fabric samples, free</strong>, anywhere in the UK. Three at
        a time is the limit, and there is no catch attached to it — you do not have to order a sofa
        afterwards and we do not chase you.
      </p>
      <p>
        Do this. A photograph of a fabric is a photograph taken under somebody else&rsquo;s
        lighting, and the two things a screen cannot tell you are exactly the two things you will
        live with: what the colour does in your room at four in the afternoon, and what the surface
        feels like under your hand. Both take about a second to settle in person and cannot be
        settled at all on a screen.
      </p>
      <PullQuote>
        A sofa is a ten-year decision and the samples are free and take two days. There is no
        version of this where ordering them is the wrong move.
      </PullQuote>

      <h2 id="catch">The catch, plainly</h2>
      <p>
        A made-to-order sofa is <strong>exempt from the 14-day right to change your mind</strong>.
      </p>
      <p>
        That is not a policy we invented to make life easier. Under the Consumer Contracts
        Regulations, goods made to a customer&rsquo;s own specification are one of the standard
        exceptions to the cancellation right, for the fairly obvious reason that we cannot put a
        sofa cut to your alcove in your fabric back on the shelf and sell it to somebody else. A
        stocked leather sofa carries the full 14 days; a made-to-measure fabric one does not.
      </p>
      <p>
        So the honest summary is this: the size and the colour are yours to choose, and in exchange
        the decision is firmer than it would be on a standard sofa. That is the trade. It is why we
        would rather you spent two days with the samples than two minutes with the photographs.
      </p>

      <h2 id="faults">Faults are a completely separate matter</h2>
      <p>
        None of the above touches what happens if the sofa is <em>wrong</em> rather than unwanted.
        Your rights against a faulty item are untouched by the made-to-order exemption, and so is
        our guarantee.
      </p>
      <ul>
        <li>
          <strong>Damaged in transit</strong> — because you pay on the doorstep, you inspect it
          before any money changes hands. If something turns up later, email us within 24 hours
          with photographs.
        </li>
        <li>
          <strong>Beyond repair</strong> — we collect it and refund you in full. There is no
          collection charge on a faulty sofa.
        </li>
        <li>
          <strong>Structural faults</strong> — a 1-year guarantee covers the frame and the springs.
        </li>
      </ul>
      <p>
        The full detail is on <Link href="/delivery-returns">delivery and returns</Link>, and how
        the doorstep payment works is in{' '}
        <Link href="/journal/cash-on-delivery-explained">its own article</Link>.
      </p>

      <h2 id="worth">When it is worth it, and when it is not</h2>
      <p>
        Made to order earns its keep when the room has a constraint — an alcove, a bay, a wall that
        is 20cm short of every standard three seater — or when the colour genuinely matters to you
        and nothing off the shelf is right.
      </p>
      <p>
        It is the wrong choice if you are not sure yet. If you are still deciding between a corner
        and a 3+2, or you have not measured the hallway, or you think you might want to send it
        back after a fortnight of living with it, buy a{' '}
        <Link href="/shop/leather-sofa">stocked sofa</Link> and keep your 14 days. We would rather
        say that here than have the conversation afterwards.
      </p>
      <p>
        If you want to talk a size through before committing to any of it,{' '}
        <Link href="/contact">tell us the measurement</Link> and we will tell you straight whether
        it can be built.
      </p>
    </>
  )
}
