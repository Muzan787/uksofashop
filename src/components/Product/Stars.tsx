// src/components/Product/Stars.tsx

import { Star } from 'lucide-react'

const SIZES = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-5 w-5',
} as const

/**
 * A read-only rating.
 *
 * Filled stars are Fern, the review green, wherever they appear — not the
 * variant accent, which made a rating a different colour on every fabric.
 * Empty ones take Calico 300.
 */
export default function Stars({ rating, size = 'md', count }: {
  rating: number
  size?: keyof typeof SIZES
  /** Number of reviews behind the average, where the caller knows it. */
  count?: number
}) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          aria-hidden="true"
          className={`${SIZES[size]} ${
            i <= rating
              ? 'fill-fern-500 text-fern-500'
              : 'fill-transparent text-calico-300'
          }`}
        />
      ))}
      {/* The whole rating as one sentence. Five aria-hidden icons and a
          bare number tell a screen reader nothing about what is being rated
          or how much weight the average carries. */}
      <span className="sr-only">
        Rated {rating} out of 5{count === undefined ? '' : ` from ${count} review${count === 1 ? '' : 's'}`}
      </span>
    </span>
  )
}
