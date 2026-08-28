// src/components/UI/Timeline.tsx

import { Check } from 'lucide-react';

/**
 * The four stages an order passes through, in the words a customer would use.
 *
 * Not the database's words. `pending_cod`, `processing` and `shipped` are what
 * the admin panel needs; "Being prepared" and "Out for delivery" are what the
 * person waiting at home needs.
 */
export const STAGES = ['Confirmed', 'Being prepared', 'Out for delivery', 'Delivered'] as const;

interface Props {
  /** Index of the stage reached. -1 shows the whole line as ahead. */
  current: number;
  /** A ring leaving the current dot. Off on the confirmation page, where the
   *  order is seconds old and nothing is in motion yet. */
  pulse?: boolean;
  stages?: readonly string[];
  className?: string;
}

/**
 * Where the order has got to.
 *
 * Written once for the confirmation page and now shared with order tracking,
 * which had its own — four steps drawn with a rail pulled back up over the
 * markers with a negative 42px margin, so a customer arriving from the
 * confirmation email saw a different diagram of the same four stages.
 *
 * Everything ahead of the current stage is Calico 300. The point is not to
 * imply progress that has not happened, but to show that there IS a sequence
 * and where in it somebody is standing.
 */
export default function Timeline({ current, pulse = false, stages = STAGES, className }: Props) {
  return (
    <ol className={`m-0 flex list-none items-start p-0 ${className ?? ''}`} aria-label="Order progress">
      {stages.map((stage, i) => {
        const done = i <= current;
        const here = i === current;

        return (
          <li key={stage} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {/* The rail either side of the marker, so the line is continuous
                  across the row without being drawn underneath the dots. */}
              <span className={`h-0.5 flex-1 rounded-pill ${i === 0 ? 'bg-transparent' : done ? 'bg-sage-700' : 'bg-calico-300'}`} />

              <span className="relative mx-1 flex h-4 w-4 shrink-0 items-center justify-center">
                {pulse && here && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-pill bg-sage-700 motion-safe:animate-[pulse-ring_var(--dur-cinematic)_var(--ease-out-expo)_infinite]"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`relative flex h-4 w-4 items-center justify-center rounded-pill ${
                    done ? 'bg-sage-700' : 'border-2 border-calico-300 bg-calico-50'
                  }`}
                >
                  {done && !here && <Check className="h-2.5 w-2.5 text-calico-50" strokeWidth={4} />}
                  {here && <span className="h-1.5 w-1.5 rounded-pill bg-calico-50" />}
                </span>
              </span>

              <span className={`h-0.5 flex-1 rounded-pill ${i === stages.length - 1 ? 'bg-transparent' : i < current ? 'bg-sage-700' : 'bg-calico-300'}`} />
            </div>

            <span
              className={`mt-2 px-1 text-center text-caption leading-tight ${
                done ? 'font-semibold text-ink-900' : 'text-ink-500'
              }`}
            >
              {stage}
              {here && <span className="sr-only"> — current stage</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
