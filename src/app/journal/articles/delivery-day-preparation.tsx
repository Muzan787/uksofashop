// src/app/journal/articles/delivery-day-preparation.tsx
//
// SCOPE NOTE. Three neighbours, and this piece must not become any of them:
//
//   /delivery-returns                policy. Timings, the charges table, the
//                                    damage procedure, returns, bespoke.
//   cash-on-delivery-explained       paying on the day, and inspecting before
//                                    you pay.
//   /size-guide                      whether it fits through the door, and the
//                                    calculator that answers it.
//
// What is left, and what this owns, is the only thing none of them covers:
// what the CUSTOMER does in the days before the van arrives. Preparation, in
// the order it needs doing. Where it touches the other three it states the fact
// once and links, rather than restating the policy.
//
// Facts taken from elsewhere rather than invented:
//   £50 re-delivery after a confirmed slot,
//   free to move an unconfirmed date            /delivery-returns CHARGES
//   upstairs £20 / +£10, assembly £20,
//   removal £30 indicative                      constants/delivery.ts
//   ground floor or a ground-floor room         /delivery-returns
//   2-4 working days across UK Mainland         /delivery-returns
//   arrives in pieces, feet unscrew ~10cm       /size-guide
//   30cm from a radiator                        /care-guide
//
// The extras are chosen AT CHECKOUT and cannot be added on the doorstep. That
// is the single most useful thing on this page and the reason it exists.

import Link from 'next/link'
import { Note, PullQuote } from '@/components/Editorial/EditorialLayout'

export default function DeliveryDayPreparation() {
  return (
    <>
      <p>
        Most deliveries that go badly were decided days earlier, by something nobody thought to do.
        The sofa fits, the crew turn up, and then twenty minutes go on moving a bookcase, finding
        somebody to take the old sofa, or working out that the thing was supposed to go upstairs.
      </p>
      <p>
        None of that is dramatic and all of it is avoidable. This is what to do, roughly in the
        order it needs doing.
      </p>

      <h2 id="checkout">Decide the extras at checkout, not on the day</h2>
      <p>
        This is the one that actually costs people, so it goes first.{' '}
        <strong>Upstairs delivery, assembly and taking your old sofa away are chosen when you
        order.</strong> They are not services the crew can add at your front door — the visit is
        planned around what was booked, and a two-person team scheduled for a ground-floor drop is
        not carrying a corner sofa to a second floor because you asked nicely on the day.
      </p>
      <ul>
        <li>
          <strong>Upstairs — £20</strong> for the first floor, or for any floor if there is a lift;{' '}
          <strong>£10</strong> for each further floor without one.
        </li>
        <li>
          <strong>Assembly in the room — £20.</strong>
        </li>
        <li>
          <strong>Old sofa taken away — £30</strong>, indicative. A very large item can cost more
          and we confirm that with you once the order reaches us, not on the doorstep.
        </li>
      </ul>
      <p>
        If you have already ordered and realise you need one of these, ring rather than wait —{' '}
        <Link href="/contact">07476 616022</Link> — and we will sort it before the van is loaded.
      </p>

      <h2 id="slot">Confirm the day, and protect it</h2>
      <p>
        Delivery runs to two to four working days anywhere on UK Mainland, so the day comes round
        quickly — which is the reason to have the rest of this list done before it does.
      </p>
      <p>
        Once a slot has actually been <strong>confirmed</strong> with you, treat it as fixed. A
        missed confirmed slot means the whole trip has to be made again, and there is a{' '}
        <strong>£50 re-delivery charge</strong> for that. Before a date is confirmed, moving it
        costs nothing at all and you can change it as often as you need.
      </p>
      <PullQuote>
        Moving the date is free. Missing the day is £50. If the day is looking shaky, the phone call
        you make on Tuesday costs nothing and the one you make on Friday does not exist.
      </PullQuote>
      <Note title="Be honest about the day">
        <p>
          If you are not certain you will be in — a shift that might change, a school run, a
          delivery window you cannot cover — say so before the slot is confirmed rather than hoping.
          Nobody minds moving it. Everybody minds the £50.
        </p>
      </Note>

      <h2 id="route">Clear the route the day before</h2>
      <p>
        Not the room. The <em>route</em>: the path from where the van will stop to where the sofa
        is going, all of it, including the bits you walk past without seeing.
      </p>
      <ul>
        <li>Shoes, bins, bikes and buggies out of the hall.</li>
        <li>Pictures and mirrors off the walls along the route — corners get caught.</li>
        <li>Coats off the hooks, and the hooks themselves if they stick out at shoulder height.</li>
        <li>
          Anything on the stairs, plus the loose runner or the rug at the bottom that slides
          underfoot.
        </li>
        <li>Doors wedged open, and internal doors lifted off their hinges if that is the plan.</li>
      </ul>
      <p>
        Whether the pieces fit through the door is a separate question with its own calculator on
        the <Link href="/size-guide">size guide</Link> — settle that before you order, not the night
        before. Worth knowing either way: a sofa arrives in pieces and the feet unscrew, which takes
        around 10cm off the height and gets a great many of them through a doorway they would not
        clear assembled.
      </p>

      <h2 id="spot">Know exactly where it is going</h2>
      <p>
        Decide the precise position before delivery day, not while two people are holding one end
        of a corner unit in your hallway.
      </p>
      <p>
        Standard delivery brings the sofa to the ground floor, or to a ground-floor room of your
        choice — so choose the room, and clear the spot in it. Move the old furniture out first,
        vacuum the floor while you can still reach it, and check the sofa will not end up{' '}
        <strong>within 30cm of a radiator</strong>, which dries leather and can warp a wooden frame
        over a winter. That one is in the <Link href="/care-guide">care guide</Link> and it is much
        easier to honour before the sofa is in place than after.
      </p>
      <p>
        If it is a corner or a U-shape, tape the footprint out. There is{' '}
        <Link href="/journal/measuring-for-a-corner-sofa">a whole article</Link> on why an L eats
        more floor than people expect.
      </p>

      <h2 id="old">Deal with the old sofa first</h2>
      <p>
        The old one has to be gone, or at least out of the room, <em>before</em> the new one comes
        in. Two sofas do not pass each other in a hallway.
      </p>
      <p>
        If you booked removal at checkout, just have it accessible and stripped of anything you want
        to keep — people lose remote controls, phone chargers and, twice that we know of, a set of
        car keys down the back of a sofa they were watching drive away.
      </p>
      <p>
        If you did not book removal, sort it out this week rather than on the day. Your council will
        collect bulky waste, usually for a small fee and usually with a wait of a week or two, which
        is exactly why this is not a Friday afternoon job. Charities will often take a sofa in good
        condition <em>if</em> it still has its fire-safety label — no label, no collection, and that
        catches people out constantly.
      </p>

      <h2 id="access">Parking, and how the van gets there</h2>
      <p>
        The van has to reach the property and the crew have to unload safely. The usual obstacles
        are narrow lanes, low archways, permit-only bays, a blocked driveway, a skip outside, or a
        gate that is narrower than the gap it appears to be.
      </p>
      <p>
        If any of those apply, <strong>tell us when you order</strong> so it can be planned around
        rather than discovered. If you can keep a space clear outside on the morning, do — a crew
        carrying a three-seater forty metres from a side street is slower and more likely to catch
        something on the way.
      </p>
      <p>
        Flats: check whether the lift is big enough and whether it needs booking, because many
        buildings require notice for a furniture move and some will not allow one at certain hours.
      </p>

      <h2 id="house">Protect the house, and the rest of the household</h2>
      <ul>
        <li>
          <strong>Floors.</strong> Old sheets, cardboard or a runner along the route. Wet weather
          and a heavy load is how hallway carpet gets marked.
        </li>
        <li>
          <strong>Door frames and corners.</strong> The narrow pinch points are where the damage
          happens. A folded towel taped over an exposed corner costs nothing.
        </li>
        <li>
          <strong>Pets.</strong> Shut them in a room that is not on the route, with the door
          closed. Front doors stand open for a long time on a delivery and this is when animals get
          out.
        </li>
        <li>
          <strong>Small children.</strong> Same, for the same reason plus the obvious one about
          heavy objects moving through a hallway.
        </li>
      </ul>

      <h2 id="day">On the day itself</h2>
      <p>
        Somebody over 18 needs to be there who can look at the sofa and pay for it. If that will not
        be you, make sure whoever it is knows the total and is comfortable deciding whether the
        condition is acceptable — because that decision is the whole point of paying on the
        doorstep.
      </p>
      <p>
        Have the payment ready: cash, or a bank transfer from your phone while the driver is there.
        No cards. Get the wrapping off and look at the piece properly before any money changes
        hands. That side of the day is set out in{' '}
        <Link href="/journal/cash-on-delivery-explained">cash on delivery, explained</Link>, and it
        only works if you actually look.
      </p>

      <h2 id="after">After the van leaves</h2>
      <p>
        You will be left with a surprising volume of plastic wrap, cardboard and foam. Most of the
        film is not kerbside recyclable in most councils, so check yours before it all goes in the
        blue bin.
      </p>
      <p>
        Keep the feet and fixings somewhere sensible even if the sofa is assembled — they are what
        you will want if it ever moves house. And leave the cushions to settle for a few days before
        deciding the sofa is firmer than you expected; new foam and new fibre both give a little
        over the first week or two of being sat on.
      </p>
      <p>
        If something is not right, you have 24 hours to email us with photographs, and the{' '}
        <Link href="/delivery-returns">delivery and returns page</Link> sets out exactly what
        happens next.
      </p>
    </>
  )
}
