'use client'
// src/components/Motion/ScrollProgress.tsx
//
// Decides whether the reading rail belongs on this route, and loads it only
// if it does. The rail itself is ScrollProgressRail.
//
// WHY THE SPLIT. framer-motion's useScroll is the only reason this file
// existed in the root layout's import graph, and the root layout's imports
// are in the first-load bundle of every page. A decorative 2px rail is not
// worth 41 kB in front of the first paint, and on checkout — where it is
// hidden anyway — it was being downloaded for nothing.

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

const ScrollProgressRail = dynamic(() => import('./ScrollProgressRail'), { ssr: false })

/**
 * Where the rail has nothing useful to say.
 *
 * Hidden through the checkout flow on purpose. There the meaningful progress
 * is "cart → delivery → confirmed", which the stepper already shows, and a
 * second progress indicator measuring something entirely different — how far
 * down the form you have scrolled — reads as a contradiction at exactly the
 * moment a customer is deciding whether to trust the page.
 */
const HIDDEN_ON = ['/checkout', '/confirm-order', '/admin']

export default function ScrollProgress() {
  const pathname = usePathname()

  if (HIDDEN_ON.some((p) => pathname?.startsWith(p))) return null

  return <ScrollProgressRail />
}
