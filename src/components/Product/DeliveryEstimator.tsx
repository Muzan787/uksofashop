'use client';
// src/components/Product/DeliveryEstimator.tsx

import { useState } from 'react';
import { Check, Loader2, Truck } from 'lucide-react';
import { PROMISES } from '@/constants/promises';
import {
  classifyDeliveryPostcode,
  lookupAddresses,
  normalisePostcode,
} from '@/utils/postcode';

type Result =
  | { kind: 'free'; postcode: string }
  | { kind: 'offMainland'; postcode: string }
  | { kind: 'error'; message: string };

/**
 * "When will it get here, and does it cost anything?"
 *
 * Phase D uses the same canonical delivery classification as checkout. Most
 * postcodes are deterministic from the postcode itself; the genuinely mixed
 * IV40 and PA34 districts are resolved from trusted postcode-lookup address
 * evidence rather than a crude district-wide block.
 */
export default function DeliveryEstimator() {
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const postcode = normalisePostcode(value);
    const initial = classifyDeliveryPostcode(postcode);

    if (initial.kind === 'invalid') {
      setResult({ kind: 'error', message: 'That does not look like a UK postcode. Try again?' });
      return;
    }

    if (initial.kind === 'classified' && initial.zone === 'CUSTOM_QUOTE') {
      setResult({ kind: 'offMainland', postcode });
      return;
    }

    setPending(true);
    setResult(null);

    try {
      const addresses = await lookupAddresses(postcode);
      const resolved = classifyDeliveryPostcode(postcode, addresses);
      if (resolved.kind === 'classified' && resolved.zone === 'CUSTOM_QUOTE') {
        setResult({ kind: 'offMainland', postcode });
      } else {
        setResult({ kind: 'free', postcode });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/not found|no addresses found/i.test(message)) {
        setResult({ kind: 'error', message: 'We could not find that postcode. Could you check it?' });
      } else if (initial.kind === 'ambiguous') {
        // Mixed mainland/island districts must fail toward a quote when the
        // trusted lookup cannot resolve them.
        setResult({ kind: 'offMainland', postcode });
      } else {
        // For an otherwise deterministic mainland postcode, an outage in the
        // address helper is our problem, not a reason to withdraw the existing
        // mainland delivery promise.
        setResult({ kind: 'free', postcode });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section
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
              Free UK Mainland delivery to {result.postcode}
            </p>
            <p className="m-0 mt-2 text-body font-semibold text-ink-900">
              {PROMISES.delivery.timingLong}
            </p>
            <p className="m-0 mt-2 text-caption leading-relaxed text-ink-500">
              {PROMISES.delivery.sub}. {PROMISES.payment.long}
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
