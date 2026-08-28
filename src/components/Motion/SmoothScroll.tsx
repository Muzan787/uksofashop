'use client'
// src/components/Motion/SmoothScroll.tsx

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { useAnimationFrame } from 'framer-motion'
import { useReducedMotionSafe } from './useReducedMotionSafe'


/**
 * Weighted scrolling for the storefront.
 *
 * Three decisions worth knowing about.
 *
 * ONE FRAME LOOP. Lenis is driven from Framer's animation frame rather than
 * its own (`autoRaf: false`), so scroll position is written and read inside the
 * same frame. Two independent rAF loops would leave `useScroll` — and anything
 * built on it, so Parallax and the progress rail — reading a value Lenis had
 * already moved past, which shows up as a drift that always lags by a frame.
 *
 * REAL SCROLLING. Lenis moves the actual document scroll position rather than
 * transforming a wrapper, which is what lets the scroll-driven CSS reveals in
 * globals.css keep working: `animation-timeline: view()` is tied to the
 * browser's own scroll timeline and cannot see a transformed container.
 *
 * OFF, NOT DAMPENED, UNDER REDUCED MOTION. Lenis's own `respectReducedMotion`
 * only forces lerp to 1 and keeps running on the main thread. Here it is never
 * constructed at all, and it tears itself down if the preference changes while
 * the visitor is on the page.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotionSafe()
  const lenis = useRef<Lenis | null>(null)

  useEffect(() => {
    if (reduced) return

    const instance = new Lenis({
      lerp: 0.085,
      duration: 1.2,
      infinite: false,
      autoRaf: false,
      // Lenis takes over in-page anchor clicks, so `<a href="#care">` glides
      // instead of the browser jumping and Lenis snapping it back.
      anchors: true,
      // Anything with its own scrollbar keeps native behaviour: drawer bodies,
      // modal panels, the horizontal product carousels.
      prevent: (node) => node.hasAttribute?.('data-lenis-prevent') ?? false,
    })

    lenis.current = instance
    return () => {
      instance.destroy()
      lenis.current = null
    }
  }, [reduced])

  // Shared with every other Framer-driven animation on the page.
  useAnimationFrame((time) => {
    lenis.current?.raf(time)
  })

  /**
   * The scroll-lock bridge.
   *
   * Several components lock the page by setting `document.body.style.overflow`
   * — the mobile menu, the filter drawer, the modals. That stops native
   * scrolling but means nothing to Lenis, which would happily keep scrolling
   * the page behind an open drawer.
   *
   * Watching the attribute rather than exposing a `useLock()` hook is
   * deliberate: it means every existing lock works untouched, and any lock
   * added later works without having to know Lenis exists.
   */
  useEffect(() => {
    if (reduced) return

    const sync = () => {
      const locked = document.body.style.overflow === 'hidden'
      if (locked) lenis.current?.stop()
      else lenis.current?.start()
    }

    const observer = new MutationObserver(sync)
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    sync()

    return () => observer.disconnect()
  }, [reduced])

  return <>{children}</>
}
