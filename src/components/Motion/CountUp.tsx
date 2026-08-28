'use client'
// src/components/Motion/CountUp.tsx

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'
import { DUR, EASE } from './tokens'
import { useReducedMotionSafe } from './useReducedMotionSafe'


export interface CountUpProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The number to land on. */
  value: number
  /** Decimal places. Prices want 2, counts want 0. */
  decimals?: number
  /** Rendered before the number — '£' — and outside the animation. */
  prefix?: string
  /** Rendered after the number. */
  suffix?: string
  /** Seconds. Defaults to the cinematic step; a figure deserves the time. */
  duration?: number
  /** Where to start from. */
  from?: number
  once?: boolean
  className?: string
}

/**
 * Counts a figure up when it scrolls into view.
 *
 * The rendered value starts AT the final number rather than at zero, so the
 * server sends the right figure, a visitor with no JavaScript sees the right
 * figure, and a search engine indexes the right figure. The count-down-then-up
 * only happens once the element is both mounted and in view.
 *
 * Always tabular, because a figure that changes width thirty times a second
 * drags the layout along with it.
 */
export const CountUp = forwardRef<HTMLSpanElement, CountUpProps>(function CountUp(
  { value, decimals = 0, prefix = '', suffix = '', duration = DUR.cinematic, from = 0, once = true, className, ...rest },
  ref,
) {
  const reduced = useReducedMotionSafe()
  const box = useRef<HTMLSpanElement>(null)
  const inView = useInView(box, { once, amount: 0.6 })
  const [display, setDisplay] = useState(value)

  const setRefs = useCallback(
    (node: HTMLSpanElement | null) => {
      box.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLSpanElement | null>).current = node
    },
    [ref],
  )

  useEffect(() => {
    if (reduced || !inView) {
      setDisplay(value)
      return
    }
    const controls = animate(from, value, {
      duration,
      ease: EASE.out,
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [inView, value, from, duration, reduced])

  return (
    <span
      ref={setRefs}
      data-motion="countup"
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      {...rest}
    >
      {prefix}
      {display.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
})
