'use client';
// src/components/Product/DeliveryEstimator.tsx

import { useState } from 'react';
import { AlertTriangle, Check, Loader2, Truck } from 'lucide-react';
import { PROMISES } from '@/constants/promises';
import { deliveryWindow, type DeliveryWindow } from '@/utils/delivery';
import { isMainland, isValidUkPostcode, lookupAddresses, normalisePostcode } from '@/utils/postcode';

type Result =
  | { kind: 'free'; postcode: string; window: DeliveryWindow }
  | { kind: 'offMainland'; postcode: string }
  | { kind: 'error'; message: string };

/**
 * "When will it get here, and does it cost anything?"
 *
 * The page already states 2–4 working days and free UK Mainland delivery. That
 * is a policy, not an answer: a customer paying cash on the doorstep is
 * deciding whether they will be in the house on a particular day, and whether
 * the number they have been quoted is the number they will hand over. This
 * turns both into facts about their address.
 *
 * The postcode does most of the work locally: the pattern check and the
 * mainland ranges are the two things the answer actually depends on. The
 * Homedata lookup — the same one the checkout uses — is asked one question on
 * top of that, which is whether the postcode exists at all. A "not found" is
 * worth telling someone about. Any other failure (the key, the network, the
 * service) is swallowed, because none of them are a reason to withhold a date
 * the shop can already promise.
 */
export default function DeliveryEstimator() {
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const postcode = normalisePostcode(value);

    if (!isValidUkPostcode(postcode)) {
      setResult({ kind: 'error', message: 'That does not look like a UK postcode. Try again?' });
      return;
    }

    if (!isMainland(postcode)) {
      setResult({ kind: 'offMainland', postcode });
      return;
    }

    setPending(true);
    setResult(null);

    // The date is computed first and is never contingent on the network.
    const window = deliveryWindow();

    try {
      await lookupAddresses(postcode);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/not found/i.test(message)) {
        setResult({ kind: 'error', message: 'We could not find that postcode. Could you check it?' });
        setPending(false);
        return;
      }
      // Anything else is our problem, not the customer's. See the doc above.
    }

    setResult({ kind: 'free', postcode, window });
    setPending(false);
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
        {/* sm:flex-1, not flex-1. Below sm the form is a COLUMN, and flex-1
            there sets a vertical flex-basis of 0 — which beat h-12 and
            collapsed the field to the height of its own text. */}
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

      {/* Announced, because the answer replaces nothing on screen — a sighted
          customer sees it appear, and this is the equivalent. */}
      <div aria-live="polite" className="empty:hidden">
        {result?.kind === 'free' && (
          <div className="mt-4 rounded-sm border border-sage-300 bg-sage-50 p-4">
            <p className="m-0 flex items-center gap-2 text-body-sm font-semibold text-sage-700">
              <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
              Free delivery to {result.postcode}
            </p>
            <p className="m-0 mt-2 font-data text-body font-semibold tabular-nums text-ink-900">
              Delivered{' '}
              <time dateTime={result.window.fromISO}>{result.window.label.split(' – ')[0]}</time>
              {' – '}
              <time dateTime={result.window.toISO}>{result.window.label.split(' – ')[1]}</time>
            </p>
            <p className="m-0 mt-2 text-caption leading-relaxed text-ink-500">
              {PROMISES.delivery.sub}. {PROMISES.payment.long}
            </p>
          </div>
        )}

        {result?.kind === 'offMainland' && (
          <div className="mt-4 rounded-sm border border-calico-300 bg-calico-50 p-4">
            <p className="m-0 flex items-start gap-2 text-body-sm text-ink-700">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ember-700" />
              <span>
                <strong className="text-ink-900">{result.postcode} is outside UK Mainland.</strong>{' '}
                We can usually still deliver, but not on the free mainland service — message us and
                we will price it for you before you order.
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
