'use client';

import { useState, useEffect } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';

export default function TrackingScripts() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // 1. Check if consent was already granted on previous visits
    const consent = localStorage.getItem('cookie_consent');
    if (consent === 'granted') {
      setHasConsent(true);
    }

    // 2. Listen for the event fired by our CookieConsent banner
    const handleConsentGranted = () => {
      setHasConsent(true);
    };

    window.addEventListener('cookies_accepted', handleConsentGranted);

    // Cleanup listener
    return () => {
      window.removeEventListener('cookies_accepted', handleConsentGranted);
    };
  }, []);

  // If no consent, render nothing (scripts are blocked)
  if (!hasConsent) return null;

  return (
    <>
      {/* --- GOOGLE ADS & ANALYTICS --- */}
      {/* Replace G-XXXXXXXXXX with your actual GA4 / Google Tag ID */}
      <GoogleAnalytics gaId="G-GTBKG6RSNF" />

      {/* --- META PIXEL --- */}
      {/* Replace YOUR_PIXEL_ID with your actual Meta Pixel ID */}
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
            
            fbq('init', '1538990667462103');
            fbq('track', 'PageView');
          `,
        }}
      />
    </>
  );
}