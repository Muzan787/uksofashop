// src/app/journal/articles/measuring-for-a-corner-sofa.tsx
//
// SCOPE NOTE. /size-guide owns getting a sofa THROUGH the house - doorways,
// hallways, the turn at the bottom of the stairs, and the calculator. This
// piece deliberately does not repeat any of that; it owns the other half,
// which is planning the ROOM around an L-shape, and hands the doorway question
// straight over with a link.
//
// If you find yourself adding a paragraph here about measuring a door frame,
// it belongs on /size-guide instead. Two pages competing to answer the same
// question is how one of them stops ranking.
//
// Facts taken from elsewhere rather than invented:
//   feet unscrew, ~10cm, arrives in pieces   /size-guide
//   30cm clearance from a radiator           /care-guide
//   2c2 / 2c1 / 1c2 / U-shape and their
//   footprints                               live catalogue, Sept 2026
//
// The footprint figures are quoted as a RANGE with a pointer to the product
// pages, not as a spec table, because the range changes and a number hardcoded
// in prose is a number that starts lying.

import Link from 'next/link'
import { Note, PullQuote } from '@/components/Editorial/EditorialLayout'

export default function MeasuringForACornerSofa() {
  return (
    <>
      <p>
        A corner sofa is the shape most likely to be measured wrong, and it is not because people
        are careless. It is because a corner is two sofas joined at a right angle, so almost every
        instinct you have about measuring one sofa gives you the wrong answer twice.
      </p>
      <p>
        This is about planning the room. Getting the thing through your front door is a separate
        job with its own calculator on the <Link href="/size-guide">size guide</Link>, and the last
        section here hands you over to it.
      </p>

      <h2 id="different">Why a corner is a different job</h2>
      <p>
        With a normal sofa you have one length to satisfy and one wall to put it against. With a
        corner you have <strong>two</strong> lengths, and they interact: the two arms of the L share
        the corner unit, so the space one arm occupies is not independent of the other.
      </p>
      <p>
        The other thing that catches people is that a corner sofa consumes floor along{' '}
        <em>both</em> walls to its full depth. A 3+2 leaves you a walkable gap in at least one
        direction. An L does not — it takes a bite out of the room shaped like the room&rsquo;s own
        corner, which is usually the most useful corner in it.
      </p>

      <h2 id="hand">Which way round: 2c2, 2c1 and 1c2</h2>
      <p>
        The code tells you the shape. The <strong>c</strong> is the corner unit and the numbers are
        the seats along each arm — so a <strong>2c2</strong> is two seats, corner, two seats, and it
        is symmetrical. Both arms are the same length, and it does not matter which way round you
        put it. (The <Link href="/journal/sofa-jargon-explained">jargon article</Link> has the rest
        of the vocabulary.)
      </p>
      <p>
        <strong>2c1 and 1c2 are the same sofa in mirror image.</strong> Two seats on one arm, one on
        the other, and the code tells you which side the long arm is on. This is the decision people
        make last and should make first, because it is not adjustable afterwards — you cannot swap
        the hand of a corner sofa once it is built, you can only turn the whole thing round, which
        puts the back of it where the wall used to be.
      </p>
      <Note title="How to decide the hand">
        <p>
          Stand where you will sit — or where the door is, if the room has an obvious entrance — and
          look at the corner the sofa is going into. The long arm should run along the longer clear
          wall, and the short arm should be the one heading towards the door, the walkway or the
          window. Get that the wrong way round and the sofa either blocks the route into the room or
          leaves a stub of wall doing nothing.
        </p>
      </Note>

      <h2 id="walls">Measure the two runs, to the obstruction</h2>
      <p>
        Take both walls, starting from the inside of the room&rsquo;s corner and measuring outwards
        along each one. The number you want is not wall-to-wall. It is{' '}
        <strong>corner to the first thing in the way</strong>, and the things in the way are almost
        always the same list:
      </p>
      <ul>
        <li>
          <strong>A radiator.</strong> The most common one, and it is not just about fit — see
          below.
        </li>
        <li>
          <strong>A door, and the arc it swings through.</strong> Measure to where the open door
          reaches, not to the frame.
        </li>
        <li>
          <strong>A chimney breast or alcove.</strong> Measure the narrowest part of the run, which
          is usually the breast rather than the alcove.
        </li>
        <li>
          <strong>Skirting boards.</strong> They hold the sofa 15&ndash;25mm off the wall, and on a
          measurement that is already tight, that is the difference.
        </li>
        <li>
          <strong>Sockets and switches</strong> you still need to reach with the sofa in place.
        </li>
      </ul>
      <p>
        Write both numbers down before you look at any sofas. Choosing the sofa first and then
        measuring is how people end up talking themselves into 4cm they do not have.
      </p>

      <h2 id="depth">The number everybody forgets</h2>
      <p>
        Depth. A corner sofa is roughly 90 to 95cm deep, and that depth applies to{' '}
        <strong>both</strong> arms — so an L in the corner of a room removes about a metre from
        each of two walls, not one.
      </p>
      <p>
        In a 3.5m wide room, a corner sofa along one wall leaves about 2.5m of usable width, and
        the arm running down the adjacent wall takes another metre out of the length. That is the
        calculation people skip, and it is the one that decides whether the room still works.
      </p>
      <PullQuote>
        People measure the two lengths and forget the depth applies twice. A corner sofa does not
        take up a line along a wall; it takes a square metre out of the corner and then some.
      </PullQuote>
      <p>
        For scale, the corners currently in our range run from about 190 × 240cm up to 240 × 240cm,
        at roughly 90 to 95cm deep. Every{' '}
        <Link href="/shop/corner-sofa">corner sofa product page</Link> carries its own exact
        figures — use those rather than these, which are here to give you a sense of the size before
        you start.
      </p>

      <h2 id="clearance">What has to be left over</h2>
      <p>
        Fitting is not the same as working. Once the footprint is on the floor, check what is left:
      </p>
      <ul>
        <li>
          <strong>A main walkway: 60cm at an absolute minimum, 75cm if it is the route through the
          room.</strong> Below 60cm people start turning sideways, and a route people turn sideways
          for is a route they stop using.
        </li>
        <li>
          <strong>Coffee table to the seat front: 40 to 45cm.</strong> Close enough to reach a mug
          without standing, far enough to get your legs past.
        </li>
        <li>
          <strong>Every door opens fully.</strong> Internal doors and cupboard doors both — a corner
          sofa parked in front of an airing cupboard is a mistake you notice weekly for years.
        </li>
        <li>
          <strong>At least 30cm from a radiator.</strong> This one is not about circulation. Dry
          localised heat cracks leather and can warp a wooden frame over a winter or two, which is
          in the <Link href="/care-guide">care guide</Link> for a reason. It is also the fastest way
          to make a radiator useless.
        </li>
        <li>
          <strong>The curtains still draw</strong> and the window still opens.
        </li>
      </ul>

      <h2 id="ushape">If you are looking at a U-shape</h2>
      <p>
        A U-shape is a corner sofa with a second return, and everything above applies with an extra
        wall added. Ours run around 180 × 300 × 180cm, with an armed version wider on one side.
      </p>
      <p>
        The specific trap is that a U commits three walls of a room at once, so there is exactly one
        way it can sit and no scope to adjust after delivery. Before ordering one, be certain about
        where the door is, where the television goes, and how somebody gets to the far seat without
        climbing over the near one. If the room has a single entrance in the middle of a wall, a U
        is usually the wrong shape.
      </p>

      <h2 id="tape">Tape it out, properly</h2>
      <p>
        This settles every argument and takes five minutes. Masking tape or newspaper on the floor,
        the full L, both arms at their real length and the full depth on both.
      </p>
      <p>
        Then use it. Walk the route you would normally walk. Open the door. Sit on the floor inside
        the shape and see whether the television is where you would want it. Leave the tape down for
        a day, because the thing you notice on day one is the size and the thing you notice on day
        two is the route you now cannot take.
      </p>
      <Note title="Do this before, not after">
        <p>
          A made-to-order fabric corner is built to your specification, which is why it is exempt
          from the 14-day right to change your mind — the tape is what stands in for that.{' '}
          <Link href="/journal/made-to-order-explained">Made to order, explained</Link> sets out
          where that line sits.
        </p>
      </Note>

      <h2 id="door">Then check it gets in</h2>
      <p>
        Two different questions, and a sofa has to pass both. A corner arrives in pieces, and each
        piece is still the length of one arm — so the corner unit and the arms each have to make it
        through the door, down the hall and round the turn at the bottom of the stairs.
      </p>
      <p>
        That is the <Link href="/size-guide">size guide&rsquo;s</Link> job, and it has a calculator
        that takes your doorway width and tells you directly. One thing worth knowing before you
        panic at a tight number: the feet unscrew, which takes around 10cm off the height, and that
        alone gets a great many sofas through a standard UK doorway they would not clear assembled.
      </p>
      <p>
        And if a measurement is genuinely borderline,{' '}
        <Link href="/contact">send us the numbers</Link>. It costs nothing, and we would far rather
        work through it now than on the doorstep.
      </p>
    </>
  )
}
