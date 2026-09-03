// src/app/contact/layout.tsx
//
// The page itself is a client component, which cannot export metadata.
// This layout carries it for the route instead - and, for the same reason, the
// structured data. A client component can render a <script> tag, but the schema
// belongs with the metadata rather than in the middle of a form's state.
import type { Metadata } from 'next'
import EditorialSchema from '@/components/Editorial/EditorialSchema'

/**
 * Said once, used twice: as the meta description, and as the description on the
 * page's own schema node.
 */
const DESCRIPTION =
  'Call 07476 616022 or email us about a sofa, a delivery, or whether something will fit. Mon–Fri 9am–6pm, Sat 10am–4pm, based in Blackburn.'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: DESCRIPTION,
  alternates: { canonical: '/contact' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ContactPage, and no author: nobody wrote a phone number. The address
          and opening hours are not restated here either - they are already on
          the FurnitureStore node the root layout emits site-wide, and a second
          copy under a different type reads as a second business. */}
      <EditorialSchema
        type="ContactPage"
        headline="Contact Us"
        current="We'd Love to Hear From You"
        path="/contact"
        updated="2026-08-28"
        description={DESCRIPTION}
      />
      {children}
    </>
  )
}
