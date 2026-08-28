'use client'
// src/components/Motion/PageFade.tsx

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DUR, EASE } from './tokens'
import { useReducedMotionSafe } from './useReducedMotionSafe'


/**
 * The fallback for browsers without View Transitions — Firefox and older
 * Safari, today.
 *
 * It fades the incoming page in and does nothing else. Deliberately not an
 * AnimatePresence exit animation: holding the outgoing tree on screen in the
 * App Router means keeping a stale server-rendered subtree alive, and the
 * failure mode when that goes wrong is a blank frame. A fade-in cannot produce
 * one — the content is in the DOM from the first paint, and only its opacity
 * is animated.
 *
 * It also stands down entirely where View Transitions ARE supported, so the
 * two never run over each other.
 */
export default function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduced = useReducedMotionSafe()
  const [needsFallback, setNeedsFallback] = useState(false)

  useEffect(() => {
    setNeedsFallback(!('startViewTransition' in document))
  }, [])

  if (reduced || !needsFallback) return <>{children}</>

  return (
    <motion.div
      key={pathname}
      data-motion="page-fade"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DUR.settle, ease: EASE.out }}
    >
      {children}
    </motion.div>
  )
}
