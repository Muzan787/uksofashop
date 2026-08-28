'use client'
// src/components/Motion/Parallax.tsx

import { forwardRef, useCallback, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotionSafe } from './useReducedMotionSafe'


export interface ParallaxProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * How far the child drifts relative to the scroll, as a fraction of the
   * container height. 0.15 is a whisper, 0.3 is obvious, and above 0.4 the
   * drift starts exposing the edge of the frame.
   */
  speed?: number
  /** 'y' (default) or 'x'. */
  axis?: 'y' | 'x'
  className?: string
  children: React.ReactNode
}

/**
 * Drifts a child against the scroll.
 *
 * Wrap an image in this inside an overflow-hidden parent, and oversize the
 * image — scale it 1.2 or inset it negatively — or the drift will show the
 * frame edge at either end of the range.
 *
 * The scroll range is measured on the OUTER element, which is the one that
 * stays put; the inner element is the one that moves. Measuring the moving
 * element against itself is the usual way this goes wrong, and it produces a
 * drift that accelerates.
 *
 * Under reduced motion nothing is measured and nothing is transformed.
 */
export const Parallax = forwardRef<HTMLDivElement, ParallaxProps>(function Parallax(
  { speed = 0.2, axis = 'y', className, children, ...rest },
  ref,
) {
  const reduced = useReducedMotionSafe()
  const frame = useRef<HTMLDivElement>(null)

  // The caller's ref and our measurement ref both need the outer node.
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      frame.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [ref],
  )

  const { scrollYProgress } = useScroll({
    target: frame,
    // From the container's top meeting the bottom of the viewport, until its
    // bottom leaves the top — so the whole pass is covered.
    offset: ['start end', 'end start'],
  })

  const shift = useTransform(scrollYProgress, [0, 1], [`${speed * 50}%`, `${speed * -50}%`])

  if (reduced) {
    return (
      <div ref={setRefs} className={className} {...rest}>
        {children}
      </div>
    )
  }

  return (
    <div ref={setRefs} className={className} {...rest}>
      <motion.div
        data-motion="parallax"
        style={{
          ...(axis === 'y' ? { y: shift } : { x: shift }),
          willChange: 'transform',
          height: '100%',
          width: '100%',
        }}
      >
        {children}
      </motion.div>
    </div>
  )
})
