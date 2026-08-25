// src/app/contact/layout.tsx
//
// The page itself is a client component, which cannot export metadata.
// This layout carries it for the route instead.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Call 07476 616022 or email us about a sofa, a delivery, or whether something will fit. Mon–Fri 9am–6pm, Sat 10am–4pm, based in Blackburn.',
  alternates: { canonical: '/contact' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
