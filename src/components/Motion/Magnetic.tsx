'use client'
// src/components/Motion/Magnetic.tsx

import { forwardRef, useCallback, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { usePointerFine } from './usePointerFine'
import { useReducedMotionSafe } from './useReducedMotionSafe'


export interface MagneticProps extends React.HTMLAttributes<HTMLDivElement> {
  /** How far outside the element the pull starts, in px. */
  radius?: number
  /** How far the element travels toward the cursor, 0-1 of the offset. */
  strength?: number
  className?: string
  children: React.ReactNode
}

/**
 * Pulls its child toward the cursor while the cursor is nearby.
 *
 * Desktop pointers only. On a phone there is no cursor to pull toward, so the
 * listeners are never attached and the child renders as an ordinary wrapper —
 * this must always be an enhancement over something already usable.
 *
 * The spring is damped past critical on purpose. The motion grammar bans
 * overshoot, so the element settles onto the cursor rather than snapping past
 * it and coming back.
 */
export const Magnetic = forwardRef<HTMLDivElement, MagneticProps>(function Magnetic(
  { radius = 90, strength = 0.35, className, children, ...rest },
  ref,
) {
  const reduced = useReducedMotionSafe()
  const fine = usePointerFine()
  const box = useRef<HTMLDivElement>(null)

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const x = useSpring(rawX, { stiffness: 220, damping: 32, mass: 0.6 })
  const y = useSpring(rawY, { stiffness: 220, damping: 32, mass: 0.6 })

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      box.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [ref],
  )

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = box.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      // Outside the radius the pull releases rather than clamping, so the
      // element does not sit permanently offset when the cursor leaves fast.
      if (Math.hypot(dx, dy) > radius + Math.max(r.width, r.height) / 2) {
        rawX.set(0)
        rawY.set(0)
        return
      }
      rawX.set(dx * strength)
      rawY.set(dy * strength)
    },
    [radius, strength, rawX, rawY],
  )

  const release = useCallback(() => {
    rawX.set(0)
    rawY.set(0)
  }, [rawX, rawY])

  if (reduced || !fine) {
    return (
      <div ref={setRefs} className={className} {...rest}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={setRefs}
      data-motion="magnetic"
      className={className}
      style={{ x, y, display: 'inline-block', willChange: 'transform' }}
      onPointerMove={onMove}
      onPointerLeave={release}
      onBlur={release}
      {...(rest as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  )
})
