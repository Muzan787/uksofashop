'use client';
// src/components/UI/TrustBox.tsx
//
// A Trustpilot TrustBox - the rating badge, or the row of recent reviews.
//
// Trustpilot's widgets are iframes that its bootstrap script draws into a
// marked <div>. The script is loaded once per page (next/script dedupes on
// id) and every TrustBox mounted afterwards calls `loadFromElement` on its
// own div, which is what makes them work through client-side navigation:
// the script's automatic scan only runs on the first page load, and a badge
// that appears on a later route would otherwise stay blank.
//
// Renders nothing unless NEXT_PUBLIC_TRUSTPILOT_WIDGETS is "1" - see
// constants/trustpilot.ts for why the badge is held back until there are
// reviews behind it. The fallback link inside the div is what a visitor sees
// while the script is loading, and what a crawler indexes.

import { useCallback, useEffect, useRef } from 'react';
import Script from 'next/script';
import {
  TRUSTBOX,
  TRUSTPILOT_BUSINESS_UNIT_ID,
  TRUSTPILOT_PROFILE_URL,
  TRUSTPILOT_WIDGETS_ENABLED,
  type TrustBoxKind,
} from '@/constants/trustpilot';

interface TrustpilotWindow extends Window {
  Trustpilot?: { loadFromElement: (el: HTMLElement, force?: boolean) => void };
}

interface Props {
  kind: TrustBoxKind;
  /** 'light' on the calico page ground, 'dark' on ink panels. */
  theme?: 'light' | 'dark';
  className?: string;
}

export default function TrustBox({ kind, theme = 'light', className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { templateId, height } = TRUSTBOX[kind];

  const draw = useCallback(() => {
    const el = ref.current;
    const tp = (window as TrustpilotWindow).Trustpilot;
    if (el && tp) tp.loadFromElement(el, true);
  }, []);

  // The script may already be on the page from an earlier route, in which
  // case onLoad never fires again and this is the call that draws the box.
  useEffect(() => { draw(); }, [draw]);

  if (!TRUSTPILOT_WIDGETS_ENABLED) return null;

  return (
    <>
      <Script
        id="trustpilot-widget"
        src="https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"
        strategy="afterInteractive"
        onLoad={draw}
      />
      <div
        ref={ref}
        className={`trustpilot-widget ${className ?? ''}`}
        data-locale="en-GB"
        data-template-id={templateId}
        data-businessunit-id={TRUSTPILOT_BUSINESS_UNIT_ID}
        data-style-height={height}
        data-style-width="100%"
        data-theme={theme}
        style={{ height, minHeight: height }}
      >
        <a
          href={TRUSTPILOT_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-caption text-ink-500 no-underline"
        >
          See our reviews on Trustpilot
        </a>
      </div>
    </>
  );
}
