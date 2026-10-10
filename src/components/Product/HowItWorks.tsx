// src/components/Product/HowItWorks.tsx

'use client';

import { MessageCircle, ShoppingBag, Truck } from 'lucide-react';
import { useParams } from 'next/navigation';
import { PROMISES } from '@/constants/promises';
import { isRomaProduct, ROMA_DELIVERY_NOTICE } from '@/constants/romaAvailability';
import type { DeliveryWindow } from '@/utils/delivery';

/**
 * What happens after "Add to cart", in three steps, directly under the price.
 *
 * WHY THREE STEPS AND NOT TWO BOXES. This used to be a delivery box and a
 * payment box. Between them and the cash-on-delivery pill and the trust row,
 * the page said "free delivery" and "cash on delivery" three times each - and
 * never said the two things that decide a made-to-order sofa: that someone
 * confirms the order with you, and that a person rings to go through the
 * fabric before anything is made. Those surfaced only at the checkout, where
 * a surprise costs the sale. Here they are part of the plan the customer
 * reads before they commit, framed as what they are - reassurance.
 *
 * The facts are the site's, not new ones: the WhatsApp confirmation link and
 * the call are what happens to every website order today (see the admin's
 * "Ask Customer to Confirm Order" button and the checkout's made-to-order
 * notice), and step three is PROMISES.delivery and PROMISES.payment word for
 * word, so this block cannot drift from the footer, checkout or delivery page.
 *
 * The delivery dates are worked out on the server - `deliveryWindow()` turns
 * the 2–4-working-day mainland window into two calendar dates, qualified by
 * the Wales/Scotland exception because no regional postcode mapping exists.
 * Roma models carry their own longer notice instead.
 */
export default function HowItWorks({ estimate, madeToOrder }: {
  estimate: DeliveryWindow;
  madeToOrder: boolean;
}) {
  const params = useParams<{ slug?: string }>();
  const isRoma = isRomaProduct((params.slug ?? '').replace(/-/g, ' '));
  const [from, to] = estimate.label.split(' – ');

  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="rounded-md border border-[var(--pdp-accent-line)] bg-[var(--pdp-accent-tint)] p-4 transition-colors duration-settle ease-out-expo"
    >
      <h2 id="how-it-works-heading" className="eyebrow m-0 text-ink-500">How ordering works</h2>

      <ol className="m-0 mt-3 flex list-none flex-col gap-3.5 p-0">
        <Step n={1} Icon={ShoppingBag} title="Order online — nothing to pay now">
          Takes about two minutes.
        </Step>

        <Step n={2} Icon={MessageCircle} title="We confirm it with you">
          {madeToOrder
            ? 'A WhatsApp message to confirm your order, and a call to go through your fabric before anything is made.'
            : 'A WhatsApp message to confirm your order, and a call to agree your delivery day.'}
        </Step>

        <Step n={3} Icon={Truck} title="Delivered free — pay when it arrives">
          {isRoma ? (
            <span className="block text-ink-900">{ROMA_DELIVERY_NOTICE}</span>
          ) : (
            <span className="block font-semibold text-ink-900">
              Most UK Mainland: arrives{' '}
              <time dateTime={estimate.fromISO} className="font-data tabular-nums">{from}</time>
              {' – '}
              <time dateTime={estimate.toISO} className="font-data tabular-nums">{to}</time>
            </span>
          )}
          <span className="mt-1 block">{PROMISES.delivery.long} {PROMISES.payment.long}</span>
          {!isRoma && (
            <span className="mt-1 block text-caption">{PROMISES.delivery.timingException}</span>
          )}
        </Step>
      </ol>
    </section>
  );
}

function Step({ n, Icon, title, children }: {
  n: number;
  Icon: typeof Truck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-calico-50">
        <Icon aria-hidden="true" className="h-4 w-4 text-[var(--pdp-accent-text)]" />
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-pill bg-ink-900 font-data text-[10px] font-bold leading-none text-calico-50"
        >
          {n}
        </span>
      </span>
      <div className="min-w-0">
        <p className="m-0 text-body-sm font-semibold leading-snug text-ink-900">{title}</p>
        <p className="m-0 mt-1 text-body-sm leading-relaxed text-ink-500">{children}</p>
      </div>
    </li>
  );
}
