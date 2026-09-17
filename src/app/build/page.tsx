// src/app/build/page.tsx
import type { Metadata } from 'next'
import EditorialSchema from '@/components/Editorial/EditorialSchema'
import { getFabricLibrary } from '@/utils/fabrics'
import { ogImage } from '@/utils/socialImage'
import { getBuildCatalogue } from './catalogue'
import BuildClient from './BuildClient'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  BUILD YOUR OWN SOFA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The made-to-order flow, started from the other end.
 *
 * A product page starts from a photograph: here is the Verona 3 seater, now
 * choose what it is made in. That suits somebody who has already seen the
 * sofa they want. It does not suit somebody who arrived knowing only that
 * they need a corner unit for a small room, in a green, with no chrome - and
 * that customer is the one who ends up on WhatsApp describing it in
 * paragraphs.
 *
 * This page asks those questions in the order a person thinks about them:
 * how big, which design, what fabric, what feet, any piping, anything else -
 * then shows the whole thing on one screen with the price we can put a number
 * to and a plain statement that a call comes next. It ends in the same
 * checkout as everything else, with the build attached to the order line, or
 * in a WhatsApp message carrying the same summary.
 *
 * NOTHING HERE IS A SECOND CATALOGUE. The designs are the custom_made
 * products, the fabrics are the fabric library, and the price is the
 * product's price. The only data this page owns is the list of feet
 * (src/constants/feet.ts), which no other page offers.
 *
 * Every choice is held in localStorage until the summary, which is what makes
 * the fabric step's "order free samples" a detour rather than an exit: the
 * samples page pins "Back to your build" and this page reopens on the fabric
 * step with the sofa exactly as it was left.
 */

const TITLE = 'Build Your Own Sofa'
const DESCRIPTION =
  'Choose the seats, the design, the fabric, the feet and the piping, and see a guide price. ' +
  'Every sofa is made to order in the UK and we ring you to confirm every detail before it is built. ' +
  'Nothing to pay until delivery.'

export const metadata: Metadata = {
  alternates: { canonical: '/build' },
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    url: '/build',
    title: `${TITLE} | UK Sofa Shop`,
    description: DESCRIPTION,
    images: [ogImage('/og-image.jpg', 'UK Sofa Shop')],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | UK Sofa Shop`,
    description: DESCRIPTION,
    images: ['/og-image.jpg'],
  },
}

export default async function BuildPage() {
  const [{ designs, sizes }, collections] = await Promise.all([
    getBuildCatalogue(),
    getFabricLibrary(),
  ])

  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialSchema
        type="WebPage"
        headline={TITLE}
        current="Build your own sofa"
        path="/build"
        updated="2026-09-18"
        description={DESCRIPTION}
      />
      <BuildClient designs={designs} sizes={sizes} collections={collections} />
    </div>
  )
}
