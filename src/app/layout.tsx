// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import MainLayoutWrapper from "@/components/Layout/MainLayoutWrapper";
import { Toaster } from "react-hot-toast";
import CookieConsent from '@/components/UI/CookieConsent';
import TrackingScripts from '@/components/UI/TrackingScripts';
import { META_DESCRIPTION } from '@/constants/promises';
import { localBusinessSchema, jsonLd } from '@/utils/schema';
import { METADATA_BASE } from '@/constants/site';
import { ogImage } from '@/utils/socialImage';
import { CONSENT_DEFAULT_SNIPPET } from '@/utils/consentMode';
import { PALETTE } from '@/constants/palette';


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Fraunces replaces Playfair Display. Loaded as a variable font so the whole
// 300-700 range is one file, with the optical size axis exposed - which is the
// point of choosing it: at display sizes the letterforms tighten and sharpen,
// and at 20px they stay open enough to read. Playfair had no such axis, which
// is why it fell apart at the 13px it was being set at on cards.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

/**
 * The no-JavaScript guard for src/components/Motion.
 *
 * Framer writes each primitive's hidden `initial` state into the server HTML,
 * so a visitor whose JavaScript never arrives would otherwise be looking at a
 * page of invisible content. This forces every animated element back to its
 * finished state. It can only live in a <noscript> block: a rule that must
 * apply exactly when scripting is off cannot be written in a stylesheet that
 * always loads.
 */
const MOTION_NOSCRIPT_GUARD = `
[data-motion] {
  opacity: 1 !important;
  transform: none !important;
  filter: none !important;
  animation: none !important;
  clip-path: none !important;
}
[data-motion="curtain"], [data-motion="image-reveal"] { display: none !important; }
[data-accordion-panel] { grid-template-rows: 1fr !important; }
[data-accordion-panel] > * { visibility: visible !important; }
`

/**
 * Decides whether the brand entrance plays, BEFORE the first paint.
 *
 * It has to run here, as a blocking inline script in <head>, rather than in a
 * component. A React effect fires after paint, which means the hero would be
 * visible for a frame and then be covered — a flash, and a worse one than no
 * entrance at all. Adding the class before the body paints means the curtain
 * is simply there from the first frame.
 *
 * Four conditions, all of which must hold, and every one of them fails safe:
 * homepage only, not seen this session, motion allowed, storage reachable. If
 * any check throws — Safari private mode makes sessionStorage throw rather
 * than return null — the catch swallows it and the entrance does not play.
 */
const ENTRANCE_GATE = `
try {
  if (
    location.pathname === '/' &&
    !sessionStorage.getItem('uks-entrance') &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    document.documentElement.classList.add('entrance');
    sessionStorage.setItem('uks-entrance', '1');
    setTimeout(function () {
      document.documentElement.classList.remove('entrance');
    }, 1000);
  }
} catch (e) {}
`

export const metadata: Metadata = {
  metadataBase: new URL(METADATA_BASE),
  title: {
    // Pages set a bare title and this appends the brand, so no page has to
    // repeat the suffix and none can silently inherit the homepage title.
    template: '%s | UK Sofa Shop',
    default: 'UK Sofa Shop | Sofas with Cash on Delivery',
  },
  description: META_DESCRIPTION,
  // Next serves the manifest.ts route at /manifest.webmanifest; '/manifest.json'
  // was a 404, so no browser ever read it.
  manifest: '/manifest.webmanifest',
  keywords: "sofa UK, corner sofa, fabric sofa, recliner sofa, cash on delivery sofas, custom fabric sofa",
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: 'UK Sofa Shop',
    url: '/',
    title: "UK Sofa Shop | Sofas with Cash on Delivery",
    description: "Sofas delivered free across UK Mainland, and you pay only when they arrive.",
    // Dimensions and type declared so a scraper can size the card before it
    // has fetched the file - that is what gets a large preview in WhatsApp
    // rather than a thumbnail, or nothing at all.
    images: [ogImage('/og-image.jpg', 'UK Sofa Shop')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UK Sofa Shop | Sofas with Cash on Delivery',
    description: 'Sofas delivered free across UK Mainland, and you pay only when they arrive.',
    images: ['/og-image.jpg'],
  },
  appleWebApp: {
    capable: true,
    title: 'UK Sofa Shop',
    statusBarStyle: 'black-translucent', // Makes the iOS status bar blend in
  },
};

export const viewport: Viewport = {
  themeColor: PALETTE.ember500,
  width: 'device-width',
  initialScale: 1,
  // No maximumScale or userScalable: false. Blocking pinch-zoom fails
  // WCAG 1.4.4 and is flagged by Lighthouse. It was there to stop iOS zooming
  // when an input is focused, but globals.css already prevents that the
  // correct way, with font-size: 16px on form fields - so the accessibility
  // cost was being paid for a problem that was already solved.
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The three next/font variables go on <html>, not <body>.
    //
    // tokens.css builds --font-display / --font-body / --font-data on :root,
    // and each one references a next/font variable. A custom property whose
    // value contains an unresolvable var() is invalid at computed-value time —
    // so with the font classes on <body>, --font-fraunces did not exist where
    // --font-display was declared, --font-display resolved to nothing, and
    // every heading on the site silently fell back to inherited Geist. The
    // fonts were downloading; nothing was using them.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <head>
        {/* Google Consent Mode v2 defaults. MUST be the first script in the
            document: a consent default that arrives after gtag.js has loaded
            is too late, and the visitor is measured under whatever state
            Google assumed in the meantime. Plain inline <script> rather than
            next/script so the position is guaranteed rather than scheduled. */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_SNIPPET }} />
        <script dangerouslySetInnerHTML={{ __html: ENTRANCE_GATE }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(localBusinessSchema()) }}
        />
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: MOTION_NOSCRIPT_GUARD }} />
        </noscript>
      </head>
      <body className="antialiased bg-calico-50 flex flex-col min-h-screen">
        <CartProvider>
          {/* ── Toasts ─────────────────────────────────────────────────────
              On the tokens: Ink 900 with Calico 50 copy and an ember rule down
              the leading edge, sage where something succeeded and rust where
              it did not. Bottom centre rather than bottom right, and lifted
              clear of the bottom navigation — a toast that lands on top of the
              cart button is a toast that gets tapped through. */}
          <Toaster
            position="bottom-center"
            containerStyle={{ bottom: 'calc(var(--bottom-nav) + env(safe-area-inset-bottom) + 16px)' }}
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--color-ink-900)',
                color: 'var(--color-calico-50)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--color-ember-500)',
                boxShadow: 'var(--shadow-e3)',
                fontSize: 'var(--text-body-sm)',
                maxWidth: 420,
                padding: '12px 16px',
              },
              success: {
                style: { borderLeftColor: 'var(--color-sage-300)' },
                iconTheme: { primary: 'var(--color-sage-300)', secondary: 'var(--color-ink-900)' },
              },
              error: {
                style: { borderLeftColor: 'var(--color-rust-300)' },
                iconTheme: { primary: 'var(--color-rust-300)', secondary: 'var(--color-ink-900)' },
              },
            }}
          />
          
          {/* Use the wrapper here instead of hardcoding Header/Footer */}
          <MainLayoutWrapper>
            {children}
          </MainLayoutWrapper>


          <TrackingScripts />

          <CookieConsent />
          
        </CartProvider>
      </body>
    </html>
  );
}