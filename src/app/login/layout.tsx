// src/app/login/layout.tsx
//
// The page itself is a client component, which cannot export metadata.
// This layout carries it for the route instead.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to your UK Sofa Shop account.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
