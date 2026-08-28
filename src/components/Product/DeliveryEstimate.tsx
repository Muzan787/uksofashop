// src/components/Product/DeliveryEstimate.tsx

import { Truck, Wallet } from 'lucide-react';
import { PROMISES } from '@/constants/promises';
import type { DeliveryWindow } from '@/utils/delivery';

/**
 * When it arrives, and what happens when it does.
 *
 * This is the single most important block on the product page and it used to
 * be the third tab of a tab strip below the fold — three interactions away
 * from a customer whose entire decision is "will I be in the house, and what
 * do I have to pay on the day". It is now the first thing under the price.
 *
 * The dates are real. `deliveryWindow()` turns "2–4 working days" into two
 * calendar dates on the server, so the page answers the question rather than
 * restating the policy and leaving the customer to count weekends. The <time>
 * elements carry the machine-readable dates for anything parsing the page.
 *
 * Both rows are rendered from PROMISES, so nothing here can drift away from
 * what the footer, checkout and delivery page say.
 */
export default function DeliveryEstimate({ estimate }: { estimate: DeliveryWindow }) {
  return (
    <section
      aria-label="Delivery and payment"
      className="rounded-md border border-[var(--pdp-accent-line)] bg-[var(--pdp-accent-tint)] p-4 transition-colors duration-settle ease-out-expo"
    >
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-calico-50">
          <Truck aria-hidden="true" className="h-4 w-4 text-[var(--pdp-accent-text)]" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow text-ink-500">Free delivery</p>
          <p className="mt-1.5 text-body font-semibold leading-snug text-ink-900">
            Arrives{' '}
            <time dateTime={estimate.fromISO} className="font-data font-semibold tabular-nums">
              {estimate.label.split(' – ')[0]}
            </time>
            {' – '}
            <time dateTime={estimate.toISO} className="font-data font-semibold tabular-nums">
              {estimate.label.split(' – ')[1]}
            </time>
          </p>
          <p className="mt-1 text-body-sm text-ink-500">{PROMISES.delivery.long}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-3 border-t border-[var(--pdp-accent-line)] pt-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-calico-50">
          <Wallet aria-hidden="true" className="h-4 w-4 text-[var(--pdp-accent-text)]" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow text-ink-500">{PROMISES.payment.label}</p>
          <p className="mt-1.5 text-body-sm leading-relaxed text-ink-700">{PROMISES.payment.long}</p>
        </div>
      </div>
    </section>
  );
}
