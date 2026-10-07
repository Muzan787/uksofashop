'use client'
// src/components/Motion/usePointerFine.ts

import { useSyncExternalStore } from 'react'

const QUERY = '(hover: hover) and (pointer: fine)'

let mq: MediaQueryList | null = null
function query(): MediaQueryList {
  if (!mq) mq = window.matchMedia(QUERY)
  return mq
}

function subscribe(onChange: () => void) {
  const m = query()
  m.addEventListener('change', onChange)
  return () => m.removeEventListener('change', onChange)
}

/**
 * True only where there is a real pointer that can hover.
 *
 * Reads false on the server, which means the server and the first client
 * render agree and an effect that can never fire on a phone is never even
 * attached there. Anything gated on this must be an enhancement, never the
 * only way to reach something.
 *
 * useSyncExternalStore rather than useState + useEffect: the effect version
 * rendered once with the wrong answer and then again with the right one, on
 * every mount of every component that uses this.
 */
export function usePointerFine(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => query().matches,
    () => false,
  )
}
