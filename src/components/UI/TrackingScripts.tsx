'use client';

// src/components/UI/TrackingScripts.tsx
//
// Two different consent models, because the two vendors behave differently.
//
// GOOGLE - Consent Mode v2. gtag.js loads on every page with the consent state
// defaulted to DENIED, before any tag runs. In that state it sets no cookies
// and stores no identifiers; it sends only anonymous, cookieless pings that
// Google uses to model conversions it cannot observe directly. When the banner
// is answered we send a consent 'update', and from that point normal
// measurement applies. Blocking the script entirely - which is what this file
// used to do - means a visitor who declines contributes nothing at all, and
// UK advertisers typically see materially fewer attributed conversions as a
// result.
//
// META - no equivalent. The Pixel has no cookieless mode: it either measures a
// person or it does not, so loading it before consent would be transmitting
// personal data on a legitimate-interest basis we do not have. It therefore
// stays fully gated and mounts only once consent is granted.

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { applyGoogleConsent, GA_ID, META_PIXEL_ID } from '@/utils/consentMode';
import {
  CONSENT_KEY,
  CONSENT_CHANGED_EVENT,
  CONSENT_GRANTED_EVENT,
  type ConsentValue,
} from '@/utils/consent';

export default function TrackingScripts() {
  const [consent, setConsent] = useState<ConsentValue | null>(null);

  useEffect(() => {
    // grantConsent() dispatches both event names, and both are listened to so
    // the banner keeps working whichever it uses. Remembering the last value
    // applied stops that turning into two identical consent updates.
    let applied: ConsentValue | null = null;

    const read = () => {
      const stored = window.localStorage.getItem(CONSENT_KEY);
      const value: ConsentValue | null =
        stored === 'granted' || stored === 'denied' ? stored : null;
      setConsent(value);
      // No answer yet means the default (denied) still stands - nothing to send.
      if (value && value !== applied) {
        applied = value;
        applyGoogleConsent(value);
      }
    };

    read();

    window.addEventListener(CONSENT_CHANGED_EVENT, read);
    // The older event name is still dispatched by grantConsent(); listening to
    // both means an existing banner keeps working either way.
    window.addEventListener(CONSENT_GRANTED_EVENT, read);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, read);
      window.removeEventListener(CONSENT_GRANTED_EVENT, read);
    };
  }, []);

  return (
    <>

      {/* 2. Google tag, always loaded. Behaviour is governed by the consent
             state above, not by whether the script is present.

             Loaded with a plain <Script> rather than <GoogleAnalytics> so the
             inline config runs after our defaults; the helper component
             injects its own gtag bootstrap and would race the snippet. */}
      <Script
        id="ga-lib"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="ga-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `gtag('js', new Date()); gtag('config', '${GA_ID}');`,
        }}
      />

      {/* 3. Meta Pixel - only once consent is granted. See the note at the top
             of this file for why this one is not merely defaulted-denied. */}
      {consent === 'granted' && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');

              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}
    </>
  );
}
