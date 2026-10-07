// next.config.ts
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Keep disabled in dev mode
});

const isProduction = process.env.NODE_ENV === 'production'

// Which Google path the build bakes in: the GTM container, the Tag Assistant
// QA container, or plain gtag.
//
// READ THIS BEFORE CHANGING THE BUILD ENVIRONMENT. NEXT_PUBLIC_* values are
// inlined at BUILD time, so this is decided when Hostinger compiles the app,
// not when it serves a request. A variable that exists only in the runtime
// environment has no effect here at all, and the difference is silent:
// both code paths ship either way and the site keeps measuring, just through
// a different container than you expect.
//
// TRACKING_ENV is the explicit name, matching src/utils/trackingEnv.ts.
// VERCEL_ENV stays as a fallback so the server that is running today keeps
// building the same way it does now; see the note in that file about why the
// Vercel name outlived Vercel.
const trackingEnv = process.env.TRACKING_ENV ?? process.env.VERCEL_ENV

// Bounded preview QA. It was pinned to a Vercel preview deployment of one
// branch, which cannot occur now there are no preview deployments — set
// TRACKING_ENV=preview on a staging host to use it.
const googleTrackingPreviewQA = trackingEnv === 'preview'

const googleTrackingProduction = trackingEnv === 'production'

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(googleTrackingPreviewQA ? {
    env: { NEXT_PUBLIC_GOOGLE_TRACKING_MODE: 'gtm-qa' },
  } : googleTrackingProduction ? {
    env: { NEXT_PUBLIC_GOOGLE_TRACKING_MODE: 'gtm-v1' },
  } : {}),

  /**
   * View Transitions.
   *
   * The flag is on because that is where Next is heading, but it does nothing
   * on its own today: it routes the app through the experimental app-page
   * runtime, and neither the installed React 19.2.3 nor the copy Next vendors
   * alongside it exports `unstable_ViewTransition` yet. Verified, not assumed.
   *
   * So the transitions in src/components/Motion/ViewTransitions.tsx are driven
   * straight against the browser's `document.startViewTransition`. That turns
   * out to be the better place for them regardless: it is what lets us decide
   * per navigation whether a transition should happen at all, which a
   * framework-level wrapper would not.
   *
   * When React ships ViewTransition on the stable channel, this flag is what
   * lets us move to it.
   */
  experimental: {
    viewTransition: true,
  },

  /**
   * Apex -> www, permanently (308).
   *
   * www is the canonical host: every canonical tag, the sitemap, robots.txt
   * and the JSON-LD all point there. Without this redirect the bare domain
   * serves a full duplicate of the site on a second hostname, splitting
   * ranking signals between the two.
   *
   * RESOLVED by the move to Hostinger (2026-09-29). On Vercel this rule never
   * got the chance to run: the edge redirected the apex first and did it as a
   * 307, which tells Google the move is provisional, so the apex stayed a
   * ranking candidate instead of consolidating onto www. There is no edge in
   * front of the app now, so the rule below is what answers, and it answers
   * correctly:
   *
   *   curl -sI https://uksofashop.co.uk/  ->  308 Permanent Redirect
   *
   * Verified against production 2026-10-06. Keep this rule: it is the only
   * thing producing that redirect now, not a backstop for dashboard state.
   */
  // Removes the `X-Powered-By: Next.js` response header, which advertises the
  // framework and version to anyone scanning.
  poweredByHeader: false,

  /**
   * Security headers. There were none at all.
   *
   * The CSP is deliberately permissive about scripts: 'unsafe-inline' and
   * 'unsafe-eval' are required by the Meta Pixel and Google's tag, both of
   * which inject inline script, and by the inline Consent Mode defaults in the
   * root layout. A nonce-based policy would be stricter but cannot cover the
   * third-party tags, so this buys what it can - blocking framing, plugins,
   * form hijacking and unexpected connection targets - without breaking
   * measurement.
   *
   * Hosts allowed here and why:
   *   googletagmanager / google-analytics / analytics.google  - GA4
   *   googleadservices.com                                    - Ads conversion
   *   *.g.doubleclick.net / ad.doubleclick.net                - Ads + signals
   *   pagead2.googlesyndication.com                           - Ads ccm/collect
   *   www.google.com / www.google.co.uk                       - 1p conversion
   *                                                             + remarketing
   *   connect.facebook.net / facebook.com                     - Meta Pixel
   *   res.cloudinary.com                                      - product images
   *                                                             + video clips
   *   *.supabase.co                                           - database + auth
   *   fonts.googleapis.com / fonts.gstatic.com                - webfonts
   *   widget.trustpilot.com                                   - Trustpilot
   *                                                             TrustBoxes: the
   *                                                             bootstrap script
   *                                                             and the iframes
   *                                                             it draws
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      // googleadservices.com and *.g.doubleclick.net serve the Google Ads
      // conversion tag, which the Google tag pulls in because Ads is a
      // destination on the container. Without them the tag loads, reports
      // AW-18399071645 as a destination, and then silently cannot measure.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.googleadservices.com https://*.g.doubleclick.net https://connect.facebook.net https://widget.trustpilot.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // pagead2.googlesyndication.com/ccm/collect is the one that was still
      // being blocked after the two commits that set out to fix Google Ads.
      //
      // It is a THIRD host, separate from both googleadservices.com (the
      // conversion itself) and *.g.doubleclick.net, and it is easy to miss
      // because the tag asks for it twice in two different ways and each way is
      // governed by a different directive:
      //
      //   ?...&fmt=8  the Fetch API attempt   -> connect-src
      //   ?...&fmt=3  the <img> beacon it falls back to when fetch is refused
      //                                       -> img-src
      //
      // Allowing it in only one of the two is the same as allowing it in
      // neither: the fetch is refused, the fallback beacon is refused, and the
      // hit is lost. So it is listed HERE and in connect-src below, and both
      // entries have to stay.
      //
      // The ga-audiences pixel fires against the visitor's OWN Google country
      // domain - www.google.co.uk here, www.google.com.pk for someone in
      // Pakistan - and CSP cannot wildcard a TLD, so this can only ever list
      // some of them. .co.uk and .com cover the customers this site sells to;
      // a visitor on another Google domain loses remarketing audience
      // membership, which is a targeting cost and NOT a measurement one. No
      // conversion depends on this line.
      "img-src 'self' data: blob: https://res.cloudinary.com https://www.googletagmanager.com https://www.google-analytics.com https://www.googleadservices.com https://*.g.doubleclick.net https://pagead2.googlesyndication.com https://www.google.com https://www.google.co.uk https://www.facebook.com",
      // <video> is governed by media-src, which otherwise falls back to
      // default-src 'self' and refuses every clip. The videos are on the
      // same Cloudinary account as the photographs.
      "media-src 'self' https://res.cloudinary.com",
      // IMAGE HOSTS MUST APPEAR HERE AS WELL AS IN img-src.
      //
      // An <img src> is governed by img-src - but this site registers a
      // service worker (next-pwa/workbox), and the worker intercepts image
      // requests and re-issues them with the Fetch API. A fetch from a service
      // worker is governed by connect-src, whatever the resource turns out to
      // be. With res.cloudinary.com in img-src only, every product photo was
      // blocked in production with "Refused to connect".
      //
      // This did not show up in local testing because next-pwa sets
      // `disable: NODE_ENV === "development"`, so no service worker runs in
      // dev and the images are fetched normally. Verify CSP against a
      // production build, not the dev server.
      //
      // api.homedata.co.uk is the postcode -> address lookup in checkout, and
      // api.cloudinary.com receives review photo uploads.
      //
      // GOOGLE ADS. The conversion itself goes to
      // googleadservices.com/pagead/conversion/<account>/ - that is the request
      // that must not be blocked, and it is NOT one of the hosts Tag Assistant
      // names in its console, because Tag Assistant reports what the tag tried
      // on page load rather than what a conversion event tries. It was found by
      // firing a real conversion and listening for securitypolicyviolation.
      //
      // Supporting endpoints: *.g.doubleclick.net covers both the conversion
      // tag on googleads.g and Google signals on stats.g; ad.doubleclick.net
      // and www.google.com/ccm/collect carry cross-domain measurement;
      // /rmkt/collect is remarketing.
      //
      // NOTE ON COUNTRY DOMAINS. www.google.com/pagead/1p-conversion REDIRECTS
      // to the visitor's own Google domain, and CSP re-checks the redirect
      // target - so that request is blocked for anyone outside the .com/.co.uk
      // listed here. It degrades enhanced/first-party conversion signal for
      // those visitors; the primary googleadservices.com conversion above is
      // not affected and still records.
      //
      // These are all separate hosts from the GA4 ones already listed. Ads was
      // added as a destination on the Google tag after this policy was written,
      // and a destination brings its own endpoints with it.
      //
      // *.google-analytics.com covers the regional endpoints GA4 rotates
      // through (region1.google-analytics.com and friends), which the two exact
      // hosts here do not.
      //
      // www.facebook.com IS THE META PIXEL'S OWN ENDPOINT, and it is here for
      // exactly the reason pagead2.googlesyndication.com is, above.
      //
      // fbevents.js batches its events and POSTs them to www.facebook.com/tr/
      // with the Fetch API, which connect-src governs - not img-src. The <img>
      // beacon is only the fallback for browsers that have no fetch; a fetch
      // that is REFUSED is not retried as an image. So with www.facebook.com
      // present in img-src, frame-src and form-action but absent here, every
      // browser-side Meta event was accepted by the pixel and then silently
      // discarded: PageView, ViewContent, AddToCart, InitiateCheckout,
      // OrderPlaced. Nothing showed in the console either, because a fetch
      // refused by CSP rejects its promise and fbevents does not report it.
      //
      // connect.facebook.net serves the library and graph.facebook.com is the
      // Conversions API; neither of them ever receives a pixel event. Only
      // this host does.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://www.googletagmanager.com https://www.google.com https://www.google.co.uk https://ad.doubleclick.net https://www.googleadservices.com https://*.g.doubleclick.net https://pagead2.googlesyndication.com https://connect.facebook.net https://graph.facebook.com https://www.facebook.com https://api.homedata.co.uk https://api.cloudinary.com https://res.cloudinary.com",
      // openstreetmap.org is the showroom locator map. An <iframe> is the
      // only way to embed a real, pannable map without shipping a mapping
      // library and a tile key - and OSM needs no key and sets no cookies,
      // which a Google Maps embed does before the visitor has agreed to any.
      // widget.trustpilot.com: every TrustBox is an iframe from there.
      "frame-src 'self' https://www.facebook.com https://www.openstreetmap.org https://widget.trustpilot.com",
      "object-src 'none'",
      "base-uri 'self'",
      // www.facebook.com because the Meta Pixel falls back to submitting a
      // hidden form to /tr/ when it cannot use an image or fetch. That was
      // being blocked - a pre-existing fault, unrelated to Google Ads, found
      // while checking for conversion violations. Nothing else may post
      // off-site: this is not 'self' plus a wildcard.
      "form-action 'self' https://www.facebook.com",
      "frame-ancestors 'none'",
      // PRODUCTION ONLY.
      //
      // This rewrites every http:// request to https://. Browsers exempt
      // localhost, because it counts as a trustworthy origin - but they do NOT
      // exempt a LAN address like 192.168.x.x. So running `next dev` and
      // opening the network link on a phone meant every asset was upgraded to
      // https://192.168.x.x:3000, which has no TLS, and the page rendered
      // broken while localhost looked perfect.
      //
      // Testing on a real phone over the network link is the only way to check
      // the mobile experience honestly, so this directive must not get in the
      // way of it. In production everything is already served over https and
      // the directive costs nothing.
      ...(isProduction ? ['upgrade-insecure-requests'] : []),
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          // Two years, subdomains included, preload-eligible. Production only:
          // it does nothing over plain http, and a cached policy pinned to a
          // dev hostname is unpleasant to undo.
          ...(isProduction ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ]
  },

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'uksofashop.co.uk' }],
        destination: 'https://www.uksofashop.co.uk/:path*',
        permanent: true,
      },
    ]
  },

  images: {
    loader: 'custom', // <-- Tell Next.js to use a custom loader
    loaderFile: './cloudinaryLoader.js', // <-- Path to your custom loader
    // Only hosts we actually load images from. Every entry here is a domain
    // this site will fetch and re-serve images from, so the list stays short.
    remotePatterns: [
      // 63 product, category and review images.
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // images.pexels.com was removed with the About stock photo it served.
      // ae01.alicdn.com was removed: no image anywhere referenced it.
    ],
  },
};

export default withPWA(nextConfig);
