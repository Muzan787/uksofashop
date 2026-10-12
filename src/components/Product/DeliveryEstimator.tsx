'use client';
// src/components/Product/DeliveryEstimator.tsx

import { useState } from 'react';
import { Check, Loader2, Truck } from 'lucide-react';
import { PROMISES } from '@/constants/promises';
import { trackOperationalAction } from '@/utils/tracking';
import { checkDeliveryPostcode } from '@/app/actions/checkout';
import { classifyDeliveryPostcode, normalisePostcode } from '@/utils/postcode';

type Result =
  | { kind: 'free'; postcode: string }
  | { kind: 'charge'; postcode: string; fee: number; region: string | null }
  | { kind: 'offMainland'; postcode: string }
  | { kind: 'error'; message: string };

/**
 * "When will it get here, and does it cost anything?"
 *
 * Asks the checkout's own server action, so the answer here - free, a
 * distance charge (£40-£100 for Devon, Cornwall and the far north of
 * Scotland), or a custom quote - is the same one the checkout gives and the
 * same figure place_order charges. The mixed IV40 and PA34 districts are
 * resolved there from trusted postcode-lookup evidence, as before.
 *
 * A postcode that is plainly not one, or plainly an island, is answered here
 * without a round trip.
 */
export default function DeliveryEstimator() {
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // The outcome of a check, recorded for the page's telemetry. The postcode
  // itself never leaves this component.
  function settle(next: Result) {
    setResult(next);
    trackOperationalAction('pdp_postcode_checked', {
      metadata: {
        value: next.kind === 'free' ? 'free'
          : next.kind === 'charge' ? `charge_${next.fee}`
          : next.kind === 'offMainland' ? 'quote'
          : 'not_found',
      },
    });
  }

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const postcode = normalisePostcode(value);
    const initial = classifyDeliveryPostcode(postcode);

    if (initial.kind === 'invalid') {
      settle({ kind: 'error', message: 'That does not look like a UK postcode. Try again?' });
      return;
    }

    if (initial.kind === 'classified' && initial.zone === 'CUSTOM_QUOTE') {
      settle({ kind: 'offMainland', postcode });
      return;
    }

    setPending(true);
    setResult(null);

    try {
      const answer = await checkDeliveryPostcode(postcode);
      if (answer.status === 'mainland') {
        settle(answer.fee > 0
          ? { kind: 'charge', postcode: answer.postcode, fee: answer.fee, region: answer.region }
          : { kind: 'free', postcode: answer.postcode });
      } else if (answer.status === 'custom_quote') {
        settle({ kind: 'offMainland', postcode: answer.postcode });
      } else {
        settle({ kind: 'error', message: answer.message });
      }
    } catch {
      settle({ kind: 'error', message: 'We could not check that postcode just now. Please try again.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      data-journey-section="delivery"
      aria-labelledby="estimator-heading"
      className="rounded-md border border-calico-300 bg-calico-100 p-4 sm:p-5"
    >
      <p className="mb-1 flex items-center gap-2">
        <Truck aria-hidden="true" className="h-4 w-4 text-[var(--pdp-accent-text)]" />
        <span className="eyebrow text-ink-500">Check your postcode</span>
      </p>
      <h2 id="estimator-heading" className="m-0 text-body font-semibold text-ink-900">
        When would this arrive?
      </h2>

      <form onSubmit={check} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="estimator-postcode" className="sr-only">Your postcode</label>
        <input
          id="estimator-postcode"
          name="postcode"
          type="text"
          inputMode="text"
          autoComplete="postal-code"
          placeholder="e.g. BB6 7LS"
          value={value}
          onChange={e => setValue(e.target.value.toUpperCase())}
          className="h-12 min-w-0 sm:flex-1 rounded-sm border border-calico-300 bg-calico-50 px-4 font-data text-body uppercase tracking-[0.06em] text-ink-900 focus-ring-inset transition-colors duration-swift ease-out-expo placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-400 focus:border-[var(--pdp-accent)]"
        />
        <button
          type="submit"
          disabled={pending || value.trim().length < 5}
          className="hover-btn flex h-12 shrink-0 items-center justify-center gap-2 rounded-sm bg-ink-900 px-5 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-calico-50 disabled:opacity-50"
        >
          {pending && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
          Check
        </button>
      </form>

      <div aria-live="polite" className="empty:hidden">
        {result?.kind === 'free' && (
          <div className="mt-4 rounded-sm border border-sage-300 bg-sage-50 p-4">
            <p className="m-0 flex items-center gap-2 text-body-sm font-semibold text-sage-700">
              <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
              Free delivery to {result.postcode}
            </p>
            <p className="m-0 mt-2 text-body font-semibold text-ink-900">
              {PROMISES.delivery.timingLong}
            </p>
            <p className="m-0 mt-2 text-caption leading-relaxed text-ink-500">
              Ground floor, or a ground-floor room of your choice. {PROMISES.payment.long}
            </p>
          </div>
        )}

        {result?.kind === 'charge' && (
          <div className="mt-4 rounded-sm border border-calico-300 bg-calico-50 p-4">
            <p className="m-0 flex items-start gap-2 text-body-sm font-semibold text-ink-900">
              <Truck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ember-700" />
              <span>
                Delivery to {result.postcode}{result.region ? ` (${result.region})` : ''}:{' '}
                <span className="font-data tabular-nums">£{result.fee.toFixed(0)}</span>
              </span>
            </p>
            <p className="m-0 mt-2 text-body font-semibold text-ink-900">
              {PROMISES.delivery.timingLong}
            </p>
            <p className="m-0 mt-2 text-caption leading-relaxed text-ink-500">
              Delivery is free to most of the UK; the far ends of the mainland pay by distance from our
              Blackburn showroom. It is added to your total at checkout and paid on delivery with the sofa.
            </p>
          </div>
        )}

        {result?.kind === 'offMainland' && (
          <div className="mt-4 rounded-sm border border-calico-300 bg-calico-50 p-4">
            <p className="m-0 flex items-start gap-2 text-body-sm text-ink-700">
              <Truck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ember-700" />
              <span>
                <strong className="text-ink-900">{result.postcode} needs a custom delivery quote.</strong>{' '}
                We may still be able to deliver there. Standard online checkout covers UK Mainland,
                so message us and we&apos;ll confirm availability and the delivery charge before you order.
              </span>
            </p>
          </div>
        )}

        {result?.kind === 'error' && (
          <p role="alert" className="m-0 mt-3 text-body-sm text-rust-700">{result.message}</p>
        )}
      </div>
    </section>
  );
}
