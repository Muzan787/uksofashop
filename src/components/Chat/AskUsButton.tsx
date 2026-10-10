'use client';
// src/components/Chat/AskUsButton.tsx
//
// "Ask us", as a row on the product page instead of a floating pill.
//
// On a product page a phone had three floating buttons at the foot of the
// screen - Add to cart, Ask us and WhatsApp - over the price on arrival. The
// assistant's pill stands down on product pages (ChatWidget) and is reached
// from here, beside the WhatsApp agent row, where someone deciding between
// "ask a person" and "get a quick answer" sees both.
//
// It only exists when the assistant does. The widget is mounted by the
// layout, after this page's content, and announces itself on <html> and with
// an event; until it has, this renders nothing.

import { useEffect, useState } from 'react';
import { MessageCircleQuestionMark } from 'lucide-react';
import { ASSISTANT_OPEN_EVENT, ASSISTANT_READY_EVENT, assistantReady } from './assistantEvents';

export default function AskUsButton() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = () => setReady(assistantReady());
    check();
    window.addEventListener(ASSISTANT_READY_EVENT, check);
    return () => window.removeEventListener(ASSISTANT_READY_EVENT, check);
  }, []);

  if (!ready) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(ASSISTANT_OPEN_EVENT, { detail: { from: 'product' } }))}
      aria-haspopup="dialog"
      className="hover-btn flex w-full items-center gap-3 rounded-md border border-calico-300 bg-calico-50 p-3 text-left"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-ink-900 text-calico-50">
        <MessageCircleQuestionMark aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="eyebrow text-ink-900">Quick question? Ask us</span>
        <span className="mt-0.5 text-caption leading-snug text-ink-500">
          Instant answers on delivery, payment and whether it will fit.
        </span>
      </span>
    </button>
  );
}
