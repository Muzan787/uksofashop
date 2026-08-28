'use client'
// src/components/Motion/Marquee.tsx

import { forwardRef } from 'react'
import { useReducedMotionSafe } from './useReducedMotionSafe'


export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Seconds for one full pass. Longer is calmer. */
  duration?: number
  /** 'left' (default) or 'right'. */
  direction?: 'left' | 'right'
  /** Gap between repeats, any CSS length. */
  gap?: string
  className?: string
  children: React.ReactNode
}

/**
 * A ticker that behaves itself.
 *
 * Four things the homepage marquee this replaces got wrong:
 *   - it could not be paused, so it moved forever in the corner of the eye;
 *   - it was not aria-hidden, so a screen reader read the whole loop twice;
 *   - it was the only copy of its content, so hiding it would lose the content;
 *   - and at 9px uppercase on the move, nobody could read it anyway.
 *
 * Here the moving track is aria-hidden and duplicated for a seamless loop,
 * while a single visually-hidden copy carries the real content for assistive
 * technology and for search engines. It pauses on hover and on keyboard focus
 * anywhere inside it. Under reduced motion the track does not animate at all
 * and can be scrolled by hand.
 *
 * The animation itself lives in globals.css (.marquee-track), because pausing
 * on :hover and :focus-within is not something an inline style can express.
 */
export const Marquee = forwardRef<HTMLDivElement, MarqueeProps>(function Marquee(
  { duration = 40, direction = 'left', gap = '3rem', className, children, ...rest },
  ref,
) {
  const reduced = useReducedMotionSafe()

  return (
    <div ref={ref} className={className} {...rest}>
      {/* The real content, read once. */}
      <div className="sr-only">{children}</div>

      <div
        aria-hidden="true"
        data-motion="marquee"
        className="marquee no-scrollbar"
        style={
          {
            '--marquee-duration': `${duration}s`,
            '--marquee-direction': direction === 'right' ? 'reverse' : 'normal',
            '--marquee-gap': gap,
          } as React.CSSProperties
        }
      >
        {[0, 1].map((copy) => (
          <div key={copy} className={reduced ? 'marquee-copy' : 'marquee-copy marquee-track'}>
            {children}
          </div>
        ))}
      </div>
    </div>
  )
})
