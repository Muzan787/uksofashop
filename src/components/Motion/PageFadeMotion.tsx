'use client'
// src/components/Motion/PageFadeMotion.tsx

import { motion } from 'framer-motion'
import { DUR, EASE } from './tokens'

/**
 * The fade itself. Loaded only by browsers that need it — see PageFade.
 *
 * Deliberately not an AnimatePresence exit animation: holding the outgoing
 * tree on screen in the App Router means keeping a stale server-rendered
 * subtree alive, and the failure mode when that goes wrong is a blank frame.
 * A fade-in cannot produce one — the content is in the DOM from the first
 * paint, and only its opacity is animated.
 */
export default function PageFadeMotion({
  pathKey,
  children,
}: {
  pathKey: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      key={pathKey}
      data-motion="page-fade"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DUR.settle, ease: EASE.out }}
    >
      {children}
    </motion.div>
  )
}
