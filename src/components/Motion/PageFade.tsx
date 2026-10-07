'use client'
// src/components/Motion/PageFade.tsx

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { useReducedMotionSafe } from './useReducedMotionSafe'

/**
 * The fallback for browsers without View Transitions — Firefox and older
 * Safari, today. Where View Transitions ARE supported it stands down
 * entirely, so the two never run over each other.
 *
 * WHY THE FADE IS A SEPARATE MODULE. This wraps every page from the root
 * layout, so importing framer-motion here put the whole runtime in the
 * first-load bundle of every route — in order to run an animation that
 * Chrome, Edge and current Safari never execute. The capability is checked
 * first and the fade is fetched only by the browsers that actually use it.
 *
 * The children are returned directly in the common case, so nothing waits on
 * a chunk that is never requested.
 */

/** Capability check, not a subscription: the answer never changes. */
const neverChanges = () => () => {}

const PageFadeMotion = dynamic(() => import('./PageFadeMotion'), { ssr: false })

export default function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduced = useReducedMotionSafe()
  // Read through useSyncExternalStore so the first client render already knows
  // the answer. As a useState + useEffect pair this re-rendered every page in
  // the app a second time purely to record a capability that cannot change.
  const needsFallback = useSyncExternalStore(
    neverChanges,
    () => !('startViewTransition' in document),
    () => false,
  )

  if (reduced || !needsFallback) return <>{children}</>

  return <PageFadeMotion pathKey={pathname ?? ''}>{children}</PageFadeMotion>
}
