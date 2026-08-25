// src/app/signup/layout.tsx
//
// The page itself is a client component, which cannot export metadata.
// This layout carries it for the route instead.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create an Account',
  description:
    'Create a UK Sofa Shop account to track orders and leave reviews.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
