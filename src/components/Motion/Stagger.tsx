'use client'
// src/components/Motion/Stagger.tsx

import { Children, forwardRef, isValidElement } from 'react'
import { motion } from 'framer-motion'
import { DUR, EASE, STAGGER_STEP, staggerDelay } from './tokens'
import { useReducedMotionSafe } from './useReducedMotionSafe'


export interface StaggerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Seconds between children. Defaults to the 70ms token. */
  step?: number
  /** Seconds before the first child starts. */
  delay?: number
  /** How far each child travels, in px. */
  distance?: number
  once?: boolean
  amount?: number
  /** Render as something other than a div — 'ul' for a real list, say. */
  as?: 'div' | 'ul' | 'ol' | 'section'
  /** The element each child is wrapped in. Use 'li' inside a ul. */
  childAs?: 'div' | 'li'
  className?: string
  children: React.ReactNode
}

/**
 * Reveals direct children one after another.
 *
 * The delay stops growing after the sixth child (see STAGGER_CAP): a stagger
 * that keeps accumulating turns a twelve-item grid into a five-second wait for
 * the last row, and the visitor has already scrolled past it.
 *
 * Children are wrapped rather than cloned, so they can be any node — including
 * server components and plain strings.
 */
export const Stagger = forwardRef<HTMLDivElement, StaggerProps>(function Stagger(
  {
    step = STAGGER_STEP,
    delay = 0,
    distance = 20,
    once = true,
    amount = 0.1,
    as = 'div',
    childAs = 'div',
    className,
    children,
    ...rest
  },
  ref,
) {
  const reduced = useReducedMotionSafe()
  const Wrapper = as as React.ElementType
  // Children.toArray already drops null, undefined and booleans, so a
  // conditionally rendered child never leaves a gap in the stagger sequence.
  const items = Children.toArray(children)

  if (reduced) {
    return (
      <Wrapper ref={ref} className={className} {...rest}>
        {children}
      </Wrapper>
    )
  }

  const Item = childAs === 'li' ? motion.li : motion.div

  return (
    <Wrapper ref={ref} className={className} {...rest}>
      {items.map((child, i) => (
        <Item
          key={isValidElement(child) && child.key != null ? child.key : i}
          data-motion="stagger-item"
          initial={{ opacity: 0, y: distance }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once, amount }}
          transition={{ duration: DUR.settle, ease: EASE.out, delay: delay + staggerDelay(i, step) }}
        >
          {child}
        </Item>
      ))}
    </Wrapper>
  )
})
