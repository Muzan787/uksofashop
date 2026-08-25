// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Geist, Playfair_Display } from "next/font/google";
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


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

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
  themeColor: '#d4871a',
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
    <html lang="en">
      <head>
        {/* Google Consent Mode v2 defaults. MUST be the first script in the
            document: a consent default that arrives after gtag.js has loaded
            is too late, and the visitor is measured under whatever state
            Google assumed in the meantime. Plain inline <script> rather than
            next/script so the position is guaranteed rather than scheduled. */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_SNIPPET }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(localBusinessSchema()) }}
        />
      </head>
      <body className={`${geistSans.variable} ${playfair.variable} antialiased bg-white flex flex-col min-h-screen`}>
        <CartProvider>
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1c1917',
                color: '#fff',
                borderRadius: '12px',
                border: '1px solid #b45309',
              },
              success: {
                icon: '🛋️',
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