'use client'
// src/components/Motion/ScrollProgress.tsx

import { usePathname } from 'next/navigation'
import { motion, useScroll } from 'framer-motion'

/** Where the rail has nothing useful to say. */
const HIDDEN_ON = ['/checkout', '/confirm-order', '/admin']

/**
 * A 2px ember rail across the very top of the viewport, filling as the page
 * scrolls.
 *
 * Hidden through the checkout flow on purpose. There the meaningful progress
 * is "cart → delivery → confirmed", which the stepper already shows, and a
 * second progress indicator measuring something entirely different — how far
 * down the form you have scrolled — reads as a contradiction at exactly the
 * moment a customer is deciding whether to trust the page.
 *
 * No spring on the fill. The rail reports a position rather than animating to
 * one, and a lagging progress bar is a lying progress bar.
 */
export default function ScrollProgress() {
  const pathname = usePathname()
  const { scrollYProgress } = useScroll()

  if (HIDDEN_ON.some((p) => pathname?.startsWith(p))) return null

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 h-[2px] origin-left bg-ember-500 z-scroll-rail"
      style={{ scaleX: scrollYProgress }}
    />
  )
}
