'use client'
// src/components/Motion/ScrollProgressRail.tsx

import { motion, useScroll } from 'framer-motion'

/**
 * A 2px ember rail across the very top of the viewport, filling as the page
 * scrolls.
 *
 * ScrollProgress decides whether this renders at all — see the note there
 * about the checkout flow.
 *
 * No spring on the fill. The rail reports a position rather than animating to
 * one, and a lagging progress bar is a lying progress bar.
 */
export default function ScrollProgressRail() {
  const { scrollYProgress } = useScroll()

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 h-[2px] origin-left bg-ember-500 z-scroll-rail"
      style={{ scaleX: scrollYProgress }}
    />
  )
}
