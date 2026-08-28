'use client';
// src/components/Product/Details.tsx

import { useId, useState } from 'react';
import { ChevronDown, RotateCcw, Ruler, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { PROMISES } from '@/constants/promises';
import DeliveryEstimator from './DeliveryEstimator';
import DimensionsDialog from './DimensionsDialog';

interface Props {
  description: string;
  specs: Record<string, string>;
  /** Free text from the specifications blob. Empty means no panel is offered. */
  dimensions: string;
}

/**
 * The long copy, and the estimator above it.
 *
 * What this replaced: three tabs, which showed one third of the content and
 * hid the rest behind a control most people never press, and a description
 * clamped to 80px of 12px type — so the first sentence a buyer read was cut
 * off mid-thought. Everything is an accordion now, the description is open and
 * unclamped, and the type is body size.
 *
 * The panels are real buttons with aria-expanded and aria-controls rather than
 * <details>/<summary>, because a summary carries no hook for a height
 * animation. The trade is that opening one needs JavaScript — so a collapsed
 * panel is a zero-height grid row rather than display:none, which keeps its
 * content in the HTML for a crawler, and layout.tsx carries a <noscript> rule
 * that forces every panel open when scripting never arrives. Nothing here is
 * ever permanently unreachable.
 */
export default function Details({ description, specs, dimensions }: Props) {
  const [showDims, setShowDims] = useState(false);
  const specEntries = Object.entries(specs);

  return (
    <div className="flex flex-col gap-4">
      <DeliveryEstimator />

      <div className="flex flex-col gap-3">
        <Accordion title="Description" defaultOpen>
          <p className="m-0 whitespace-pre-line text-body leading-relaxed text-ink-700">
            {description || 'No description has been written for this product yet.'}
          </p>
        </Accordion>

        {specEntries.length > 0 && (
          <Accordion title="Specifications">
            {/* Two columns: what it is on the left in Ink 500, what it measures
                on the right in mono. A spec sheet is a table of values, and
                values line up when they are set in a monospaced face. */}
            <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-6">
              {specEntries.map(([key, value], i) => (
                <div key={key} className="contents">
                  <dt
                    className={`py-2.5 text-body-sm capitalize text-ink-500 ${
                      i < specEntries.length - 1 ? 'border-b border-calico-100' : ''
                    }`}
                  >
                    {key}
                  </dt>
                  <dd
                    className={`m-0 py-2.5 text-right font-data text-body-sm tabular-nums text-ink-900 ${
                      i < specEntries.length - 1 ? 'border-b border-calico-100' : ''
                    }`}
                  >
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>

            {dimensions && (
              <button
                type="button"
                onClick={() => setShowDims(true)}
                className="hover-btn mt-4 inline-flex h-11 items-center gap-2 rounded-sm border border-calico-300 bg-calico-100 px-4 text-body-sm font-semibold text-ink-900"
              >
                <Ruler aria-hidden="true" className="h-4 w-4 text-[var(--pdp-accent-text)]" />
                See it drawn
              </button>
            )}
          </Accordion>
        )}

        {/* Every line below comes from PROMISES, which is the single place the
            shop's promises are written. Returns was added there for this
            panel; it had been stated only on /delivery-returns. */}
        <Accordion title="Delivery, returns and guarantee">
          <ul className="m-0 flex list-none flex-col gap-5 p-0">
            {[
              { Icon: Truck, p: PROMISES.delivery },
              { Icon: Wallet, p: PROMISES.payment },
              { Icon: RotateCcw, p: PROMISES.returns },
              { Icon: ShieldCheck, p: PROMISES.guarantee },
            ].map(({ Icon, p }) => (
              <li key={p.label} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[var(--pdp-accent-tint)]">
                  <Icon aria-hidden="true" className="h-4 w-4 text-[var(--pdp-accent-text)]" />
                </span>
                <span>
                  <span className="block text-body-sm font-semibold text-ink-900">{p.label}</span>
                  <span className="mt-1 block text-body-sm leading-relaxed text-ink-500">{p.long}</span>
                </span>
              </li>
            ))}
          </ul>
        </Accordion>
      </div>

      {showDims && <DimensionsDialog dimensions={dimensions} onClose={() => setShowDims(false)} />}
    </div>
  );
}

/**
 * One disclosure.
 *
 * The height animates by transitioning a grid row from 0fr to 1fr, which is
 * the one way to get from nothing to "as tall as the content" in CSS alone —
 * `height: 0` to `height: auto` is not interpolable. Doing it this way rather
 * than measuring the panel in JavaScript matters here: a measured animation
 * that never gets a frame leaves the content stuck at zero height, and this
 * panel holds the description.
 *
 * The inner wrapper also toggles visibility. Overflow alone hides a collapsed
 * panel from the eye but not from a screen reader or the tab order, so without
 * it a keyboard would walk into a closed accordion.
 */
function Accordion({ title, defaultOpen = false, children }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `${id}-panel`;
  const buttonId = `${id}-button`;

  return (
    <div className="overflow-hidden rounded-md border border-calico-300 bg-calico-50">
      <h3 className="m-0">
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(o => !o)}
          className="hover-link flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-body font-semibold text-ink-900"
        >
          {title}
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-ink-500 transition-transform duration-base ease-out-expo ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        // See the <noscript> rule in layout.tsx: this attribute is what forces
        // the panel open when scripting never arrives.
        data-accordion-panel=""
        className={`grid transition-[grid-template-rows] duration-base ease-out-expo ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className={`overflow-hidden ${open ? 'visible' : 'invisible'}`}>
          <div className="border-t border-calico-100 px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
