// src/app/journal/articles/cash-on-delivery-explained.tsx

import Link from 'next/link'
import { Note, PullQuote } from '@/components/Editorial/EditorialLayout'

export default function CashOnDeliveryExplained() {
  return (
    <>
      <p>
        Buying a sofa online normally means paying several hundred pounds to a company you have
        never dealt with, for an object you have never touched, and then waiting weeks to find out
        whether that was a good idea. We do it the other way round. Nothing leaves your account
        until the sofa is in your house and you have looked at it.
      </p>

      <h2 id="how">Nothing upfront</h2>
      <p>
        There is <strong>no deposit</strong>. You place the order, we confirm it, we deliver it,
        and you pay the driver on the doorstep. If you never open the door, you have lost nothing
        but our time.
      </p>
      <p>
        Delivery to a UK Mainland address is free with no minimum order, and the sofa is brought to
        the ground floor, or to a ground-floor room of your choice — not left on the drive.
      </p>
      <p>
        Most orders arrive within two to four working days. Wales, Scotland and a handful of
        specific postcodes take five to seven, and we cannot always tell which band a postcode
        falls into at the moment you order — so if yours is one of the longer ones we tell you as
        soon as the order reaches us rather than leaving you to find out on the day.
      </p>

      <h2 id="methods">Cash or bank transfer</h2>
      <p>
        Two ways to pay, both on the day: <strong>cash</strong>, or a{' '}
        <strong>bank transfer</strong> made while the driver is there. A transfer from your phone
        on the doorstep is completely normal and most people do that rather than keep several
        hundred pounds in the house.
      </p>
      <p>
        <strong>We do not take cards, and we do not offer finance.</strong> That is a real
        limitation and worth knowing before delivery day rather than on it. If spreading the cost
        is what you need, we are not the right shop, and we would rather say so now.
      </p>
      <Note title="Have the exact amount ready">
        <p>
          Drivers do not carry a float. If you are paying in cash, have the full amount including
          any optional extras you chose at checkout — the total is on your order confirmation, and
          you can check it any time on <Link href="/track-order">track order</Link>.
        </p>
      </Note>

      <h2 id="inspect">Look at it before you pay</h2>
      <p>
        This is the actual point of the whole arrangement, and the part people forget to use.
      </p>
      <p>
        Have a proper look while the driver is still with you. Not a glance at the box — get the
        wrapping off and look at the piece. Check the fabric across the arms and the seat, check
        the frame sits square on the floor, check the colour is the colour you ordered. Only pay
        once you are happy with the condition it has arrived in.
      </p>
      <PullQuote>
        Every other way of buying a sofa asks you to pay first and inspect later. This one is the
        right way round, and it only works if you actually look.
      </PullQuote>
      <p>
        If something is wrong at that moment, nothing has been paid and there is nothing to claw
        back. That is a far better position than being right and out of pocket.
      </p>

      <h2 id="extras">The optional extras, and what they cost</h2>
      <p>
        Standard delivery covers a UK Mainland ground floor and costs nothing. Anything beyond that
        is chosen at checkout and added to what you pay on the day, so there are no surprises at
        the door:
      </p>
      <ul>
        <li>
          <strong>Upstairs delivery — £20</strong> for the first floor, or for any floor where
          there is a lift.
        </li>
        <li>
          <strong>Each additional floor without a lift — £10</strong> on top of that.
        </li>
        <li>
          <strong>Assembly in the room — £20.</strong>
        </li>
        <li>
          <strong>Taking your old sofa away — £30</strong>, indicative. A very large item can cost
          more, and the team confirms with you before delivery rather than on the doorstep.
        </li>
      </ul>
      <p>
        All three are booked when you order and cannot be added at the door, because the visit is
        planned around what was booked — that, and the rest of the preparation worth doing before
        the van arrives, is in{' '}
        <Link href="/journal/delivery-day-preparation">getting ready for the van</Link>.
      </p>
      <p>
        Full detail, including the areas outside the standard mainland service, is on{' '}
        <Link href="/delivery-returns">delivery and returns</Link>.
      </p>

      <h2 id="later">If you find damage afterwards</h2>
      <p>
        Sometimes something only shows up once the sofa is in place and the light is different.
        Email us <strong>within 24 hours</strong> with photographs. The photographs are what let us
        settle it quickly instead of going back and forth about what happened, and there are three
        outcomes:
      </p>
      <ul>
        <li>
          <strong>Minor, and the sofa is usable.</strong> We log an incident report with your
          photographs and recommend you carry on using it. That record stays on your order in case
          anything develops later.
        </li>
        <li>
          <strong>Considerable.</strong> We offer you a replacement.
        </li>
        <li>
          <strong>Beyond repair.</strong> We collect it and issue a full refund, with no collection
          charge.
        </li>
      </ul>
      <p>
        Separately from all of that, a 1-year guarantee covers structural faults in the frame and
        the springs.
      </p>

      <h2 id="mind">Changing your mind is a different thing</h2>
      <p>
        If nothing is wrong and you simply do not want it, you have 14 days from delivery to cancel
        under the Consumer Contracts Regulations. It applies whatever your reason and you do not
        have to explain yourself.
      </p>
      <p>
        The part people are genuinely surprised by:{' '}
        <strong>on a change-of-mind return you arrange and pay for the carriage yourself.</strong>{' '}
        Sofas are large and awkward and that is not a cheap courier job, so get a quote before you
        commit to it. A faulty sofa is the opposite — we collect that ourselves, free. And note
        that a made-to-order sofa built to your own size and fabric is exempt from the 14-day right
        altogether, which is covered in{' '}
        <Link href="/journal/made-to-order-explained">made to order, explained</Link>.
      </p>

      <h2 id="why">Why we sell this way</h2>
      <p>
        Partly because it is the arrangement we would want as customers. Mostly because it removes
        the single thing that stops people buying furniture online, which is not price — it is the
        gap between paying and finding out.
      </p>
      <p>
        It also disciplines us. A shop that only gets paid if the customer is happy with what came
        off the van has a very direct incentive to make sure what comes off the van is right. There
        is no deposit to keep and no card payment to argue about afterwards.
      </p>
      <p>
        If you would rather see one in person before any of this, the{' '}
        <Link href="/showroom">Blackburn showroom</Link> is open by appointment, and{' '}
        <Link href="/contact">we are easy to get hold of</Link>.
      </p>
    </>
  )
}
