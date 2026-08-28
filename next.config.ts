// next.config.ts
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Keep disabled in dev mode
});

const isProduction = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  reactCompiler: true,

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
   * Vercel can also do this in Project -> Settings -> Domains by marking www
   * as primary, which redirects at the edge before the app is invoked and is
   * therefore cheaper. This rule is kept as a backstop so the behaviour is
   * guaranteed by the repository rather than by dashboard state, and so it
   * survives a move to different hosting.
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
   *   connect.facebook.net / facebook.com                     - Meta Pixel
   *   res.cloudinary.com                                      - product images
   *   images.pexels.com                                       - one About photo
   *   *.supabase.co                                           - database + auth
   *   fonts.googleapis.com / fonts.gstatic.com                - webfonts
   *   vitals.vercel-insights.com                              - Vercel Analytics
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net https://*.vercel-insights.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://res.cloudinary.com https://images.pexels.com https://www.googletagmanager.com https://www.google-analytics.com https://www.facebook.com",
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
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://connect.facebook.net https://graph.facebook.com https://vitals.vercel-insights.com https://api.homedata.co.uk https://api.cloudinary.com https://res.cloudinary.com https://images.pexels.com",
      // openstreetmap.org is the showroom locator map. An <iframe> is the
      // only way to embed a real, pannable map without shipping a mapping
      // library and a tile key - and OSM needs no key and sets no cookies,
      // which a Google Maps embed does before the visitor has agreed to any.
      "frame-src 'self' https://www.facebook.com https://www.openstreetmap.org",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
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
      // One stock photo on the About page.
      { protocol: 'https', hostname: 'images.pexels.com' },
      // ae01.alicdn.com was removed: no image anywhere referenced it.
    ],
  },
};

export default withPWA(nextConfig);