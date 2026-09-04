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

import { useState, useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import {
  applyGoogleConsent,
  GA_ID,
  META_PIXEL_ID,
  META_PIXEL_READY_EVENT,
} from '@/utils/consentMode';
import { isSensitiveUrl } from '@/utils/redactUrl';
import {
  CONSENT_KEY,
  CONSENT_CHANGED_EVENT,
  CONSENT_GRANTED_EVENT,
  type ConsentValue,
} from '@/utils/consent';

/** useSyncExternalStore needs a stable subscribe; usePathname does the work. */
const subscribeToNothing = () => () => {};

export default function TrackingScripts() {
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  // Called for its re-render on navigation, which is what makes the
  // useSyncExternalStore snapshot below re-read the address bar.
  usePathname();

  /**
   * Whether the current URL carries an order uuid, a link token or a postcode.
   *
   * The Meta Pixel puts the document URL and the referrer into every request
   * it makes, and offers nothing like gtag's `set` to override them - so on
   * these URLs it cannot be made safe, only kept from running. Google is
   * handled by redaction instead (utils/redactUrl.ts), so those pages are
   * still measured; nothing on them ever fired a Meta event to begin with, so
   * suppressing the Pixel here costs no data.
   *
   * Read from window rather than from usePathname alone because the sensitive
   * part of /track-order is in the query string, which usePathname does not
   * return - and useSearchParams would opt the whole root layout out of static
   * rendering to get it.
   *
   * useSyncExternalStore rather than an effect writing state: the address bar
   * is external mutable state, and this is the API for reading that during
   * render without it being an impure read. It matters more than usual here,
   * because the React Compiler is enabled and would be free to memoise a bare
   * `window.location` read and never look again. usePathname is what
   * re-renders us, so the subscribe function has nothing to do.
   *
   * The server snapshot is `false`, and safely so: the Pixel is additionally
   * gated on `consent`, which is null until an effect has run, so this value
   * cannot affect the server render or the hydration pass.
   */
  const sensitive = useSyncExternalStore(
    subscribeToNothing,
    () => isSensitiveUrl(window.location.pathname + window.location.search),
    () => false,
  );

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

      {/* 3. Meta Pixel - only once consent is granted, and never on a URL that
             carries an order uuid, a link token or a postcode. See the note at
             the top of this file for why this one is not merely
             defaulted-denied, and `sensitive` above for why it is withheld
             entirely rather than redacted the way Google's is. */}
      {consent === 'granted' && !sensitive && (
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

              // fbq is callable from here, so anything utils/tracking.ts had
              // to hold while this script did not exist can now be sent.
              window.dispatchEvent(new Event('${META_PIXEL_READY_EVENT}'));
            `,
          }}
        />
      )}
    </>
  );
}
