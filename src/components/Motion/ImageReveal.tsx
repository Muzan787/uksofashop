'use client'
// src/components/Motion/ImageReveal.tsx

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { DUR, EASE } from './tokens'
import { useReducedMotionSafe } from './useReducedMotionSafe'


export interface ImageRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which way the wipe travels. */
  direction?: 'left' | 'right' | 'up' | 'down'
  /** Seconds to hold before it starts. */
  delay?: number
  /** Seconds for the wipe. */
  duration?: number
  /** The wipe colour. Ember by default — this is the brand's one flourish. */
  color?: string
  once?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * An image that arrives from behind an ember wipe.
 *
 * A bar of Ember 500 sweeps across the frame; the image is uncovered in its
 * wake. It reads as something being unveiled rather than something loading,
 * which is the difference between this and a fade.
 *
 * Reserved for imagery that earns it — a hero, a collection header, the first
 * frame of a gallery. Used on a grid of twelve product cards it stops being a
 * flourish and becomes a strobe.
 *
 * The image itself is never hidden. Only the bar moves, so a failed hydration
 * leaves a perfectly ordinary picture.
 */
export const ImageReveal = forwardRef<HTMLDivElement, ImageRevealProps>(function ImageReveal(
  {
    direction = 'left',
    delay = 0,
    duration = DUR.settle,
    color = 'var(--color-ember-500)',
    once = true,
    className,
    children,
    ...rest
  },
  ref,
) {
  const reduced = useReducedMotionSafe()

  if (reduced) {
    return (
      <div ref={ref} className={className} {...rest}>
        {children}
      </div>
    )
  }

  // The bar starts covering the frame and leaves the way it came.
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y'
  const away = direction === 'left' ? '-101%' : direction === 'right' ? '101%' : direction === 'up' ? '-101%' : '101%'

  return (
    <div ref={ref} className={className} style={{ position: 'relative', overflow: 'hidden' }} {...rest}>
      {children}
      <motion.span
        data-motion="image-reveal"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: color, pointerEvents: 'none', display: 'block' }}
        initial={{ [axis]: '0%' }}
        whileInView={{ [axis]: away }}
        viewport={{ once, amount: 0.3 }}
        transition={{ duration, ease: EASE.inOut, delay }}
      />
    </div>
  )
})
