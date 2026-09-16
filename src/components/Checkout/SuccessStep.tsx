'use client';
// src/components/Checkout/SuccessStep.tsx

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Landmark, Phone, Star, Truck, Wallet } from 'lucide-react';
import { PHONE_DISPLAY, PHONE_HREF, whatsAppHref } from '@/constants/contact';
import { usePhoneClick } from '@/utils/attribution/usePhoneClick';
import WhatsAppIcon from '@/components/Product/WhatsAppIcon';
import Timeline from '@/components/UI/Timeline';

interface Props {
  orderId: string;
  postcode: string;
  /** The database's own figure for the order, not ours. See handleSubmit. */
  amount: number;
}

/** Every block that reveals, 150ms apart. */
const STEP_MS = 150;

const MONEY = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const PENDING_STAGES = ['Request received', 'Confirmed', 'Being prepared', 'Out for delivery', 'Delivered'] as const;

/**
 * The page shown immediately after checkout placement.
 *
 * A website COD submission is a request, not yet the confirmed Purchase event.
 * The team/customer confirmation step happens afterwards, so this screen must
 * not tell somebody that the order is already confirmed when the database is
 * still `pending_cod`.
 */
export default function SuccessStep({ orderId, postcode, amount }: Props) {
  const [copied, setCopied] = useState(false);
  const onPhoneClick = usePhoneClick();

  const reference = `#${orderId.split('-')[0].toUpperCase()}`;

  const trackHref =
    `/track-order?ref=${encodeURIComponent(reference.replace('#', ''))}` +
    `&postcode=${encodeURIComponent(postcode)}`;

  const whatsapp = whatsAppHref(
    `Hi, I've just placed order ${reference} for delivery to ${postcode}.`,
  );

  function copy() {
    navigator.clipboard?.writeText(reference).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div data-existing-order-context className="mx-auto max-w-[560px]">
      <Reveal index={0} className="flex justify-center">
        <DrawnTick />
      </Reveal>

      <Reveal index={1} className="mt-6 text-center">
        <p className="eyebrow text-ember-700">Order request received</p>

        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="font-data text-[24px] font-bold tracking-[0.08em] tabular-nums text-ink-900">
            {reference}
          </span>
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? 'Order number copied' : 'Copy the order number'}
            className="hover-icon flex h-11 w-11 items-center justify-center rounded-sm text-ink-500"
          >
            {copied
              ? <Check aria-hidden="true" className="h-4 w-4 text-sage-700" />
              : <Copy aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
      </Reveal>

      <Reveal index={2} className="mt-2 text-center">
        <p className="m-0 font-display text-h2 font-semibold leading-tight text-ink-900">
          We&apos;ll confirm it with you first
        </p>
        <p className="m-0 mt-2 text-body-sm leading-relaxed text-ink-500">
          Your request is safely recorded. One of our team will contact you to confirm the order
          before delivery is arranged. Nothing is charged now.
        </p>
      </Reveal>

      <Reveal index={3} className="mt-8">
        <Timeline current={0} stages={PENDING_STAGES} />
      </Reveal>

      <Reveal index={4} className="mt-8">
        <section aria-labelledby="on-the-day" className="rounded-md border border-calico-300 bg-calico-100 p-5">
          <h3 id="on-the-day" className="m-0 text-body font-semibold text-ink-900">Once confirmed, on delivery day</h3>

          <div className="mt-4 flex items-baseline justify-between gap-4 border-b border-calico-300 pb-4">
            <span className="text-body-sm text-ink-500">Have ready</span>
            <span className="font-data text-[28px] font-bold leading-none tabular-nums text-ink-900">
              {MONEY.format(amount)}
            </span>
          </div>

          <ul className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
            <li className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-calico-50">
                <Wallet aria-hidden="true" className="h-4 w-4 text-ember-700" />
              </span>
              <span>
                <span className="block text-body-sm font-semibold text-ink-900">Cash or bank transfer</span>
                <span className="mt-0.5 block text-body-sm leading-relaxed text-ink-500">
                  Paid to the delivery team at the door, once the sofa is inside and you have
                  looked at it. We do not take cards.
                </span>
              </span>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-calico-50">
                <Landmark aria-hidden="true" className="h-4 w-4 text-ember-700" />
              </span>
              <span>
                <span className="block text-body-sm font-semibold text-ink-900">If you will not be in</span>
                <span className="mt-0.5 block text-body-sm leading-relaxed text-ink-500">
                  Tell us as early as you can and we will move the day. Once a slot is agreed, a
                  missed delivery means the whole trip has to be made again, so a £50 re-delivery
                  charge applies. <Link href="/delivery-returns" className="hover-link text-ink-900">Full delivery terms</Link>.
                </span>
              </span>
            </li>
          </ul>
        </section>
      </Reveal>

      <Reveal index={5} className="mt-6 flex flex-col gap-3">
        <Link
          href={trackHref}
          className="hover-btn btn-ember sheen shadow-ember flex h-14 items-center justify-center gap-3 rounded-pill bg-ember-500 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900 no-underline shadow-ember"
        >
          <Truck aria-hidden="true" className="h-4 w-4" />
          Track this order
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="hover-btn btn-whatsapp shadow-whatsapp flex h-12 flex-1 items-center justify-center gap-2 rounded-pill bg-whatsapp text-body-sm font-semibold text-ink-900 no-underline"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Message us about {reference}
          </a>
          <a
            href={PHONE_HREF}
            onClick={onPhoneClick}
            className="hover-btn hover-btn-dark grad-ink flex h-12 flex-1 items-center justify-center gap-2 rounded-pill bg-ink-900 text-body-sm font-semibold text-calico-50 no-underline"
          >
            <Phone aria-hidden="true" className="h-4 w-4" />
            {PHONE_DISPLAY}
          </a>
        </div>
      </Reveal>

      <Reveal index={6} className="mt-8">
        <p className="m-0 flex items-start gap-2.5 border-t border-calico-300 pt-6 text-caption leading-relaxed text-ink-500">
          <Star aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ember-500" />
          <span>
            Once it is in the room, we will email you a link to leave a review. No account
            needed — it takes a minute and it is how the next person decides.
          </span>
        </p>
      </Reveal>
    </div>
  );
}

function DrawnTick() {
  return (
    <svg
      viewBox="0 0 80 80"
      role="img"
      aria-label="Your order request has been received"
      className="h-20 w-20"
    >
      <circle
        cx="40" cy="40" r="36"
        pathLength={1}
        className="fill-sage-50 stroke-sage-700"
        strokeWidth="3"
        strokeDasharray="1"
        strokeDashoffset="1"
        style={{ animation: 'draw-stroke 700ms var(--ease-out-expo) forwards' }}
      />
      <path
        d="M25 41.5 36 52 56 30"
        pathLength={1}
        className="fill-none stroke-sage-700"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1"
        strokeDashoffset="1"
        style={{ animation: 'draw-stroke 450ms var(--ease-out-expo) 250ms forwards' }}
      />
    </svg>
  );
}

function Reveal({ index, className, children }: {
  index: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`motion-safe:animate-[fadeUp_var(--dur-settle)_var(--ease-out-expo)_both] ${className ?? ''}`}
      style={{ animationDelay: `${index * STEP_MS}ms` }}
    >
      {children}
    </div>
  );
}
