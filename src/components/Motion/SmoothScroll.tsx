'use client'
// src/components/Motion/SmoothScroll.tsx
//
// The wrapper around every page. It renders its children and nothing else;
// the lenis instance lives in SmoothScrollEngine and is loaded separately.
//
// WHY THE SPLIT. This component sits in the root layout, so whatever it
// imports is in the first-load bundle of every route. Importing lenis and
// framer-motion here put 59 kB gzip of animation runtime in front of /terms,
// /privacy, /cookies and every other page with nothing moving on it.
//
// next/dynamic with `ssr: false` keeps the engine out of the server render
// and out of the initial chunk: it is fetched once the page is interactive.
// Smooth scrolling is an enhancement to a page that already scrolls, so
// arriving a moment late costs nothing. The children are NOT inside the
// dynamic boundary, so the markup is server-rendered exactly as before.

import dynamic from 'next/dynamic'
import { useReducedMotionSafe } from './useReducedMotionSafe'

const SmoothScrollEngine = dynamic(() => import('./SmoothScrollEngine'), { ssr: false })

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotionSafe()

  return (
    <>
      {/* Under reduced motion the engine is never even fetched, which is a
          stronger guarantee than the old code's early return: that still
          downloaded lenis, it just declined to construct it. */}
      {!reduced && <SmoothScrollEngine />}
      {children}
    </>
  )
}
