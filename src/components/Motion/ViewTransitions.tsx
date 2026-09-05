'use client'
// src/components/Motion/ViewTransitions.tsx

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useReducedMotionSafe } from './useReducedMotionSafe'


/**
 * Longest we will hold a transition snapshot waiting for the new route.
 *
 * This is not a safety valve that rarely trips. A snapshot is a still image of
 * the page: while it is held, nothing on screen moves, no hover answers, no
 * scroll happens. The product page is a dynamic server render, so on a cold
 * navigation this timeout IS the wait — and at 1200ms it was long enough to
 * read as the site having hung rather than as a link having been followed.
 * Then it expired, the live page came back, and the new route arrived some
 * time after that with no animation at all. The worst of both.
 *
 * A frozen frame stops feeling like a response at somewhere around a third of
 * a second, so the budget is set below that. A navigation that resolves inside
 * it — anything already in the router cache, back and forward, a lighter route
 * — still morphs, which is every case the transition was written for. One that
 * does not simply behaves like an ordinary link: the page stays alive and the
 * new one replaces it when it is ready.
 *
 * The real fix for a slow route is the route. This only makes sure a slow one
 * cannot take the whole window down with it.
 */
const SETTLE_TIMEOUT = 300

/**
 * Drives view transitions for client-side navigation.
 *
 * Next's `experimental.viewTransition` flag is on, but it has nothing to hand
 * us yet — see the note in next.config.ts. This works directly against
 * `document.startViewTransition`, which is where the control we actually need
 * lives: the decision about WHETHER a navigation should animate.
 *
 * That decision is the whole reason this is a click interceptor rather than a
 * wrapper around the router. A filter tap and a product tap are both
 * `router.push` calls; the only thing that separates them is that one changes
 * the pathname and the other only changes the query string. Anything that
 * animates every push would flash the entire listing every time somebody
 * ticked a colour.
 *
 * Everything this does not handle falls through to Next's own <Link>, so a
 * navigation is never lost — the worst case is that it simply does not animate.
 */
export default function ViewTransitions() {
  const router = useRouter()
  const pathname = usePathname()
  const reduced = useReducedMotionSafe()

  // Held open across a navigation: the transition snapshot stays on screen
  // until the new route has actually rendered.
  const settle = useRef<(() => void) | null>(null)

  useEffect(() => {
    settle.current?.()
    settle.current = null
  }, [pathname])

  useEffect(() => {
    if (reduced) return
    if (typeof document === 'undefined' || !('startViewTransition' in document)) return

    const onClick = (e: MouseEvent) => {
      // Anything the browser should handle its own way.
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const anchor = (e.target as Element | null)?.closest?.('a')
      if (!anchor) return
      if (anchor.hasAttribute('download')) return
      if (anchor.target && anchor.target !== '_self') return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return

      let url: URL
      try {
        url = new URL(anchor.href, location.href)
      } catch {
        return
      }

      if (url.origin !== location.origin) return
      // The admin panel is not part of this.
      if (url.pathname.startsWith('/admin')) return

      // THE EXCLUSION. Same pathname, different query string, is a filter, a
      // sort or a page number — a change WITHIN a listing, not a navigation to
      // somewhere else. Those must not animate.
      if (url.pathname === location.pathname) return

      e.preventDefault()
      e.stopPropagation()

      document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            // Never leave a snapshot frozen over the page. If the route does
            // not arrive — a redirect, an error, a cancelled fetch — release
            // the transition and let the real page through.
            const bail = setTimeout(resolve, SETTLE_TIMEOUT)
            settle.current = () => {
              clearTimeout(bail)
              resolve()
            }
            router.push(url.pathname + url.search + url.hash)
          }),
      )
    }

    // Capture phase, so this runs before Link's own handler and can decide
    // whether to take the navigation over.
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [router, reduced])

  return null
}

