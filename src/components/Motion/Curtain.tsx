'use client'
// src/components/Motion/Curtain.tsx

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { DUR, EASE } from './tokens'
import { useReducedMotionSafe } from './useReducedMotionSafe'


export interface CurtainProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which way the panel leaves. */
  direction?: 'up' | 'down' | 'left' | 'right'
  /** Any CSS colour. Defaults to the page ground. */
  color?: string
  /** Seconds to hold before the wipe starts. */
  delay?: number
  /** Seconds for the wipe. */
  duration?: number
  /** Wipe on mount (default) or when it scrolls into view. */
  trigger?: 'mount' | 'inView'
  /** Rendered above the panel while it wipes — a wordmark, say. */
  overlay?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/**
 * A panel over the content that wipes away to reveal it.
 *
 * The children are rendered underneath the whole time and are never hidden,
 * transformed or delayed. That is the entire point: if the JavaScript never
 * arrives, the panel simply never appears and the visitor sees the content —
 * which is the opposite of the 3.4 second splash screen this replaces, where
 * the curtain was the thing that rendered and the content waited behind it.
 */
export const Curtain = forwardRef<HTMLDivElement, CurtainProps>(function Curtain(
  {
    direction = 'up',
    color = 'var(--color-calico-50)',
    delay = 0,
    duration = DUR.cinematic,
    trigger = 'mount',
    overlay,
    className,
    children,
    ...rest
  },
  ref,
) {
  const reduced = useReducedMotionSafe()

  const exit = {
    up: { y: '-100%' },
    down: { y: '100%' },
    left: { x: '-100%' },
    right: { x: '100%' },
  }[direction]

  if (reduced) {
    return (
      <div ref={ref} className={className} {...rest}>
        {children}
      </div>
    )
  }

  const anim = { ...exit, transitionEnd: { display: 'none' } }

  return (
    // overflow:hidden matters. The panel leaves by translating a full 100%
    // out of the frame, and without clipping it would sit visibly on top of
    // whatever is above this block once the wipe finishes.
    <div ref={ref} className={className} style={{ position: 'relative', overflow: 'hidden' }} {...rest}>
      {children}
      <motion.div
        data-motion="curtain"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 'var(--z-raised)',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
        initial={{ x: 0, y: 0 }}
        {...(trigger === 'mount'
          ? { animate: anim }
          : { whileInView: anim, viewport: { once: true, amount: 0.3 } })}
        transition={{ duration, ease: EASE.inOut, delay }}
      >
        {overlay}
      </motion.div>
    </div>
  )
})
