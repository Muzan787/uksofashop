'use client'
// src/components/Motion/Cursor.tsx
//
// The loader for the custom cursor. The ring itself is in CursorRing.tsx.
//
// WHY THE SPLIT. This component sits in the root layout, and the ring is
// built on framer-motion's useMotionValue/useSpring — so it put the whole
// framer runtime in the first-load bundle of every page. It also renders
// nothing at all on a touch device or under reduced motion, which means
// every phone visitor was downloading a custom-cursor implementation that
// could never run. Phones are most of this site's traffic.
//
// Now the import itself is behind the same condition the render was behind:
// no fine pointer, no fetch.

import dynamic from 'next/dynamic'
import { usePointerFine } from './usePointerFine'
import { useReducedMotionSafe } from './useReducedMotionSafe'

const CursorRing = dynamic(() => import('./CursorRing'), { ssr: false })

export default function Cursor() {
  const reduced = useReducedMotionSafe()
  const fine = usePointerFine()

  // usePointerFine reads false on the server and on the first client render,
  // so nothing is requested until the browser has confirmed a hovering
  // pointer — which is exactly when the ring is wanted.
  if (reduced || !fine) return null

  return <CursorRing />
}
