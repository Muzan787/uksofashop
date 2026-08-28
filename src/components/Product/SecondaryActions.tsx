// src/components/Product/SecondaryActions.tsx

import { AlertTriangle, ChevronDown, Ruler } from 'lucide-react';
import { PROMISES } from '@/constants/promises';
import WhatsAppIcon from './WhatsAppIcon';

interface Props {
  /** Only products flagged custom_made in the admin panel offer this. */
  customMade: boolean;
  customEnquiryHref: string;
  agentHref: string;
}

/**
 * The two ways to reach a person, and the reason they live outside the buy box.
 *
 * Structurally: the buy box is sticky on desktop, and a sticky element pins
 * inside its own grid area — so it needs an area taller than itself, and it
 * must have no siblings after it. Anything rendered below a sticky element in
 * the same column scrolls straight over it from the moment it pins. Moving
 * these two blocks into the gallery's column solves both at once: it makes
 * that column the taller one, which is what gives the pin somewhere to travel,
 * and it leaves the buy box alone in its own.
 *
 * Editorially the same move is right anyway. Neither of these is how the
 * majority of visitors buy a sofa, and together they were adding around 500px
 * between the add-to-cart button and the description.
 */
export default function SecondaryActions({ customMade, customEnquiryHref, agentHref }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {customMade && <MadeToOrder href={customEnquiryHref} />}

      <a
        href={agentHref}
        target="_blank"
        rel="noopener noreferrer"
        className="hover-btn hover-btn-dark flex items-center gap-3 rounded-md bg-ink-900 p-3 no-underline shadow-e1"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-whatsapp text-calico-50">
          <WhatsAppIcon className="h-4 w-4" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="eyebrow text-calico-50">Talk to an agent instead</span>
          <span className="mt-0.5 text-caption leading-snug text-calico-300">
            Want custom seats or a different size? Message us directly.
          </span>
        </span>
      </a>
    </div>
  );
}

/**
 * Made to your specification — closed until asked for.
 *
 * This was an always-open panel roughly 450px tall carrying an offer that most
 * visitors are not taking. It is a disclosure now: the offer itself still
 * reads at a glance when closed, and the detail, the terms and the enquiry
 * button appear when someone wants them.
 *
 * A <details> rather than a dialog, deliberately. The Consumer Contracts
 * Regulations notice below is the one piece of copy on this page that has to
 * be part of the document — findable by find-in-page, reachable by a link,
 * present with JavaScript disabled — and a modal is none of those. It is also
 * the same construction as the specifications accordion further down, so the
 * page has one disclosure pattern rather than two.
 */
function MadeToOrder({ href }: { href: string }) {
  return (
    <section aria-label={PROMISES.custom.label}>
      <details className="group rounded-md border border-[var(--pdp-accent-line)] bg-[var(--pdp-accent-tint)]">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-calico-50">
            <Ruler aria-hidden="true" className="h-4 w-4 text-[var(--pdp-accent-text)]" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="eyebrow block text-[var(--pdp-accent-text)]">{PROMISES.custom.label}</span>
            <span className="mt-1 block text-body-sm font-semibold leading-snug text-ink-900">
              Want this in a different colour, fabric or size?
            </span>
          </span>

          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-ink-500 transition-transform duration-base ease-out-expo group-open:rotate-180"
          />
        </summary>

        <div className="border-t border-[var(--pdp-accent-line)] p-4">
          <p className="m-0 text-body-sm leading-relaxed text-ink-500">
            We make our fabric sofas to order. Tell us what you have in mind and we&apos;ll work it
            through with you — including the price and how long it will take.
          </p>

          <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
            {['Any colour', 'Your choice of fabric', 'Custom size or layout'].map(t => (
              <li key={t} className="rounded-pill border border-calico-300 bg-calico-50 px-3 py-1 text-caption font-semibold text-ink-500">
                {t}
              </li>
            ))}
          </ul>

          <p className="m-0 mt-4 flex gap-2 rounded-sm border border-calico-300 bg-calico-50 p-3 text-caption leading-relaxed text-ink-500">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ember-700" />
            <span>
              <strong className="text-ink-900">Before you order a made-to-measure sofa:</strong>{' '}
              because it&apos;s built to your own specification, the 14-day right to change your mind
              doesn&apos;t apply — that&apos;s the standard exemption under the Consumer Contracts
              Regulations. Faulty or damaged items are still covered exactly as normal.
            </span>
          </p>

          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover-btn mt-4 flex h-12 items-center justify-center gap-2 rounded-sm bg-whatsapp text-body-sm font-semibold text-calico-50 no-underline"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Design yours on WhatsApp
          </a>
          <p className="m-0 mt-2 text-center text-caption text-ink-500">
            Opens WhatsApp with this sofa&apos;s details already filled in.
          </p>
        </div>
      </details>
    </section>
  );
}
