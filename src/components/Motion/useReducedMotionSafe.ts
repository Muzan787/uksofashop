'use client'
// src/components/Motion/useReducedMotionSafe.ts

import { useEffect, useState } from 'react'

/**
 * Whether this visitor has asked for reduced motion — without breaking
 * hydration to find out.
 *
 * ── The bug this replaces ───────────────────────────────────────────────────
 *
 * Framer's own `useReducedMotion` reads matchMedia SYNCHRONOUSLY on the first
 * render:
 *
 *     !hasReducedMotionListener.current && initPrefersReducedMotion()
 *     const [shouldReduceMotion] = useState(prefersReducedMotion.current)
 *
 * There is no matchMedia on the server, so the server always resolves it to
 * false and renders the animated branch. On a device with Reduced Motion
 * enabled the client's FIRST render resolves it to true and renders a
 * different branch — and for most of the primitives that is not a different
 * attribute, it is a different tree:
 *
 *   SplitText  animated: eleven nested masking spans per heading.
 *              reduced:  one text node.
 *   Stagger    animated: every child wrapped in a motion div.
 *              reduced:  children rendered bare.
 *   Parallax   animated: an outer div wrapping an inner motion div.
 *              reduced:  a single div.
 *
 * React cannot reconcile that against the server HTML, so hydration fails and
 * it throws the whole tree away and re-renders on the client. Which is exactly
 * what it looks like: a hydration error, and a page that renders wrong on a
 * phone — because Reduced Motion is far more common on phones than on
 * desktops, and on iOS a Low Power Mode handset can report it.
 *
 * It has always been latent. It only became loud when the homepage, the
 * product page, the footer and the mobile menu were rebuilt on these
 * primitives — SplitText alone went from one instance to nine.
 *
 * ── The fix ─────────────────────────────────────────────────────────────────
 *
 * Start false, which is what the server renders, then update after mount. The
 * first client render therefore always agrees with the server HTML, and the
 * preference is applied one frame later.
 *
 * That one frame costs nothing, because the global
 * `@media (prefers-reduced-motion: reduce)` block in globals.css has already
 * capped every animation and transition on the page to 0.01ms. A visitor who
 * asked for stillness gets stillness from the first paint regardless of what
 * this hook has resolved to yet; all this decides is which markup the
 * primitives settle on.
 *
 * This is deliberately the same shape as usePointerFine, for the same reason,
 * and the two should stay that way.
 */
export function useReducedMotionSafe(): boolean {
  const [reduced, setReduced] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect --
   * Subscribing to an external system for its initial value, which is the case
   * the rule itself calls out as legitimate. The media query cannot be read
   * during render without breaking hydration — that is the entire bug this
   * hook exists to fix.
   */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)

    // The preference is a system setting and can be changed while the page is
    // open, so it is watched rather than sampled once.
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  return reduced
}
