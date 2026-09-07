'use client';
// src/components/UI/AttributionBoot.tsx
//
// Mounted once, alongside TrackingScripts. Runs the first-party visitor /
// session / arrival capture (utils/attribution/capture.ts) on first mount and
// again on every internal navigation, so a click into a new campaign
// mid-visit is still picked up as a fresh arrival without needing a full page
// reload. Renders nothing.

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureArrival } from '@/utils/attribution/capture';
import { CONSENT_GRANTED_EVENT } from '@/utils/consent';

export default function AttributionBoot() {
  const pathname = usePathname();

  useEffect(() => {
    captureArrival();

    // If the visitor grants consent after landing on a tagged ad URL, capture
    // the marketing touch immediately rather than waiting for another route
    // change. This keeps consent honest without throwing away the click when
    // the query parameters are still present.
    const onConsentGranted = () => captureArrival();
    window.addEventListener(CONSENT_GRANTED_EVENT, onConsentGranted);

    return () => window.removeEventListener(CONSENT_GRANTED_EVENT, onConsentGranted);
    // Re-run on every route change, not just mount: a mid-visit ad click that
    // lands on a different internal path still has to be evaluated.
  }, [pathname]);

  return null;
}
