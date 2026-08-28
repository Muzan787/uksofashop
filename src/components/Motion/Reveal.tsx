'use client'
// src/components/Motion/Reveal.tsx

import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { DUR, EASE } from './tokens'
import { useReducedMotionSafe } from './useReducedMotionSafe'


export interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'whileInView' | 'transition'> {
  /** Seconds to hold before starting. Use staggerDelay() rather than hand-numbering. */
  delay?: number
  /** How far it travels, in px. Negative lifts from above. */
  distance?: number
  /** Animate once (default) or every time it re-enters the viewport. */
  once?: boolean
  /** Also lift a blur. Reads well on imagery, muddy on small text. */
  blur?: boolean
  /** How much has to be in view before it fires, 0-1. */
  amount?: number
  className?: string
  children: React.ReactNode
}

/**
 * Fades and lifts children in as they enter the viewport.
 *
 * The `data-motion` attribute matters: globals.css carries a <noscript> rule
 * that forces every element with it back to its final state. Without that, the
 * hidden `initial` style is what a visitor with no JavaScript would be left
 * looking at — which is the bug this codebase already fixed once by moving the
 * old reveals to CSS. Content is never permanently invisible.
 */
export const Reveal = forwardRef<HTMLDivElement, RevealProps>(function Reveal(
  { delay = 0, distance = 24, once = true, blur = false, amount = 0.15, className, children, ...rest },
  ref,
) {
  const reduced = useReducedMotionSafe()

  if (reduced) {
    return (
      <div ref={ref} className={className} {...(rest as React.HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      data-motion="reveal"
      className={className}
      initial={{ opacity: 0, y: distance, filter: blur ? 'blur(10px)' : 'blur(0px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, amount }}
      transition={{ duration: DUR.settle, ease: EASE.out, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  )
})
