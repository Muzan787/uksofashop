'use client'
// src/components/Motion/usePointerFine.ts

import { useEffect, useState } from 'react'

/**
 * True only where there is a real pointer that can hover.
 *
 * Starts false so the server and the first client render agree, which means an
 * effect that can never fire on a phone is never even attached there. Anything
 * gated on this must be an enhancement, never the only way to reach something.
 */
export function usePointerFine(): boolean {
  const [fine, setFine] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    setFine(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setFine(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return fine
}
