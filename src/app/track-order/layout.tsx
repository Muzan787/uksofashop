// src/app/track-order/layout.tsx
//
// The page itself is a client component, which cannot export metadata.
// This layout carries it for the route instead.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Track Your Order',
  description:
    'Check where your sofa is. Enter your order reference and delivery postcode to see the current status of your order.',
  alternates: { canonical: '/track-order' },
  // Nothing here is useful in search - the page is empty without an order
  // reference. robots.txt no longer disallows it, so this tag is now reachable
  // and is what actually keeps it out of the index.
  robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
