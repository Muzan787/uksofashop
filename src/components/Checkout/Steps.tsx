'use client';
// src/components/Checkout/Steps.tsx

import { Check } from 'lucide-react';

export type Step = 'cart' | 'details' | 'success';

const STEPS: { id: Step; label: string }[] = [
  { id: 'cart', label: 'Cart' },
  { id: 'details', label: 'Delivery' },
  { id: 'success', label: 'Confirmed' },
];

/**
 * Where you are in the checkout.
 *
 * Two shapes, because the three-circle version does not survive a phone: the
 * connectors between the circles were 24px there, which is not enough line to
 * read as a journey — it reads as three buttons that have been squashed. On a
 * phone this is a full-width bar with the current step named beneath it, which
 * is the same information in the space available.
 *
 * The desktop version keeps the circles, and the fill between them animates
 * rather than switching: the bar underneath grows across the gap, so moving
 * from Cart to Delivery is something you watch happen.
 */
export default function Steps({ current }: { current: Step }) {
  const index = STEPS.findIndex(s => s.id === current);
  const progress = (index / (STEPS.length - 1)) * 100;

  return (
    <div className="mb-6">
      {/* ── Phone ─────────────────────────────────────────────────────── */}
      <div className="sm:hidden">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-body-sm font-semibold text-ink-900">
            {STEPS[index]?.label}
          </span>
          <span className="font-data text-caption tabular-nums text-ink-500">
            Step {index + 1} of {STEPS.length}
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={index + 1}
          aria-valuetext={`Step ${index + 1} of ${STEPS.length}: ${STEPS[index]?.label}`}
          className="h-1.5 w-full overflow-hidden rounded-pill bg-calico-200"
        >
          <span
            className="btn-ember block h-full rounded-pill bg-ember-500 transition-[width] duration-base ease-out-expo"
            // The first step is not zero progress — you have arrived, and a bar
            // reading empty at the top of a checkout is discouraging.
            style={{ width: `${Math.max(progress, 8)}%` }}
          />
        </div>
      </div>

      {/* ── Desktop ───────────────────────────────────────────────────── */}
      <ol className="m-0 hidden list-none items-start justify-center p-0 sm:flex">
        {STEPS.map((step, i) => {
          const done = i < index;
          const active = i === index;

          return (
            <li key={step.id} className="flex items-start">
              <div className="flex w-24 flex-col items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 items-center justify-center rounded-pill border-2 transition-colors duration-base ease-out-expo ${
                    done || active
                      ? 'btn-ember border-ember-500 bg-ember-500 text-ink-900 shadow-ember'
                      : 'border-calico-300 bg-calico-100 text-ink-500'
                  }`}
                >
                  {done
                    ? <Check className="h-4 w-4" strokeWidth={3} />
                    : <span className="font-data text-caption font-bold tabular-nums">{i + 1}</span>}
                </span>
                <span
                  className={`eyebrow transition-colors duration-base ease-out-expo ${
                    done || active ? 'text-ember-700' : 'text-ink-500'
                  }`}
                >
                  {step.label}
                </span>
                {active && <span className="sr-only">— current step</span>}
              </div>

              {i < STEPS.length - 1 && (
                // The connector is a track with a fill that grows across it,
                // rather than a line that changes colour all at once.
                <span aria-hidden="true" className="mt-4 block h-0.5 w-16 overflow-hidden rounded-pill bg-calico-300">
                  <span
                    className="btn-ember block h-full rounded-pill bg-ember-500 transition-[width] duration-settle ease-out-expo"
                    style={{ width: done ? '100%' : '0%' }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
