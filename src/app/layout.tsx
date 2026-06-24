// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import MainLayoutWrapper from "@/components/Layout/MainLayoutWrapper";
import { Toaster } from "react-hot-toast";
import { Analytics } from "@vercel/analytics/next"
import PWAPromptManager from '@/components/Admin/PWAPromptManager';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : 'https://www.uksofashop.co.uk' // Replace with your actual production domain!
  ),
  title: "UK Sofa Shop | Luxury Furniture & Sofas",
  description: "Discover luxury British sofas with 1-year guarantee. Free UK delivery over £500, cash on delivery available. Shop corner sofas, fabric sofas, and more.",
  manifest: '/manifest.json',
  keywords: "sofa UK, corner sofa, fabric sofa, luxury furniture, British sofas, cash on delivery sofas",
  openGraph: {
    title: "UK Sofa Shop | Premium British Furniture",
    description: "Luxury sofas crafted for comfort, built to last. Free UK delivery over £500.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    title: 'UK Sofa Shop Admin',
    statusBarStyle: 'black-translucent', // Makes the iOS status bar blend in
  },
};

export const viewport: Viewport = {
  themeColor: '#F97316', // Matches the manifest theme color
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevents zooming on mobile inputs for a native feel
  userScalable: false,
}

// Enhanced schema with more detailed information
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "FurnitureStore",
  "name": "UK Sofa Shop",
  "alternateName": "UK Sofashop LTD",
  "url": "https://uksofashop.co.uk",
  "logo": "https://uksofashop.co.uk/logo.png",
  "image": "https://uksofashop.co.uk/store-front.jpg",
  "telephone": "0747 661 6022",
  "priceRange": "££-£££",
  "description": "Premium British furniture store specializing in luxury sofas with cash on delivery available.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "7 Blacker St",
    "addressLocality": "Burnley",
    "postalCode": "BB10 2AF",
    "addressCountry": "GB"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "51.5074",
    "longitude": "-0.1278"
  },
  "areaServed": {
    "@type": "Country",
    "name": "United Kingdom"
  },
  "paymentAccepted": "Cash, Bank Transfer, Credit Card",
  "openingHours": "Mo-Fr 09:00-18:00, Sa 10:00-16:00",
  "sameAs": [
    "https://facebook.com/uksofashop",
    "https://instagram.com/uksofashop",
    "https://twitter.com/uksofashop"
  ],
  "makesOffer": {
    "@type": "Offer",
    "itemOffered": {
      "@type": "Service",
      "name": "Cash on Delivery",
      "description": "Pay when your furniture arrives - no upfront payment needed"
    }
  }
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-white flex flex-col min-h-screen`}>
        <PWAPromptManager /> {/* <-- Add this here! */}
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

        </CartProvider>
      </body>
    </html>
  );
}