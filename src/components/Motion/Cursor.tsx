'use client'
// src/components/Motion/Cursor.tsx

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { usePointerFine } from './usePointerFine'
import { DUR, EASE } from './tokens'
import { useReducedMotionSafe } from './useReducedMotionSafe'


/** What an element can ask the cursor to say. Set with `data-cursor="view"`. */
type CursorMode = 'view' | 'drag' | 'zoom' | null

const LABELS: Record<Exclude<CursorMode, null>, string> = {
  view: 'View',
  drag: 'Drag',
  zoom: 'Zoom',
}

/**
 * The desktop cursor: a 10px ember dot that grows into a 64px ring with a word
 * in it over imagery.
 *
 * Three things it must not do, in order of how badly each one would hurt:
 *
 *   Never render on a phone. It is gated on `(hover: hover) and (pointer: fine)`
 *   through usePointerFine, which starts false — so the server and the first
 *   client render agree and a touch device never even mounts it.
 *
 *   Never hide the native cursor over anything you type into. Losing the I-beam
 *   in a form field costs a customer their place in an address; that is a real
 *   failure, not a stylistic one. Inputs, textareas, selects and contenteditable
 *   all keep the system cursor, as does anything marked data-cursor-native.
 *
 *   Never render under prefers-reduced-motion. A dot chasing the pointer is
 *   exactly the kind of continuous movement that preference exists to stop.
 *
 * Elements opt in with `data-cursor="view" | "drag" | "zoom"`. Everything else
 * gets the plain dot.
 */
export default function Cursor() {
  const reduced = useReducedMotionSafe()
  const fine = usePointerFine()
  const [mode, setMode] = useState<CursorMode>(null)
  const [visible, setVisible] = useState(false)
  const [pressed, setPressed] = useState(false)

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  // Damped past critical: the ring follows the pointer, it does not chase and
  // overshoot it. The motion grammar bans bounce, and a cursor is the last
  // place you want any.
  const sx = useSpring(x, { stiffness: 900, damping: 60, mass: 0.35 })
  const sy = useSpring(y, { stiffness: 900, damping: 60, mass: 0.35 })

  const active = !reduced && fine
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return

    // Hiding the system cursor is a document-level change, so it is applied
    // here rather than in the stylesheet — that way it can never be left on
    // for a visitor this component decided not to render for.
    document.documentElement.classList.add('has-custom-cursor')

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      if (!visible) setVisible(true)

      const el = (e.target as Element | null)?.closest?.('[data-cursor]')
      const next = (el?.getAttribute('data-cursor') as CursorMode) ?? null
      setMode((prev) => (prev === next ? prev : next))
    }

    const onDown = () => setPressed(true)
    const onUp = () => setPressed(false)
    const onLeave = () => setVisible(false)
    const onEnter = () => setVisible(true)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('pointerenter', onEnter)

    return () => {
      document.documentElement.classList.remove('has-custom-cursor')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('pointerenter', onEnter)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [active, x, y, visible])

  if (!active) return null

  const expanded = mode !== null
  const size = expanded ? 64 : 10

  return (
    <motion.div
      aria-hidden="true"
      className="fixed left-0 top-0 z-cursor pointer-events-none select-none"
      style={{ x: sx, y: sy }}
    >
      <motion.div
        className="flex items-center justify-center rounded-pill"
        style={{ translateX: '-50%', translateY: '-50%' }}
        animate={{
          width: size,
          height: size,
          opacity: visible ? 1 : 0,
          scale: pressed ? 0.9 : 1,
          backgroundColor: expanded ? 'rgba(212,135,26,0.14)' : 'rgb(212,135,26)',
          borderWidth: expanded ? 1.5 : 0,
        }}
        transition={{ duration: DUR.swift, ease: EASE.out }}
      >
        {expanded && (
          <motion.span
            className="eyebrow text-ember-300"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.swift, ease: EASE.out }}
          >
            {LABELS[mode]}
          </motion.span>
        )}
      </motion.div>
    </motion.div>
  )
}
