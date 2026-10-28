// src/components/Halloween/Icons.tsx
//
// Three drawings for Halloween 2026 - a pumpkin, a bat and a corner of web.
// Lucide has none of them. All three are decoration: aria-hidden, and they
// take their colour from the text colour around them.

interface IconProps {
  className?: string
}

export function Pumpkin({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M12 7.1c-1.2-1-3.3-1.4-5.2-.7C3.9 7.5 2.5 10.4 2.5 13.5c0 3.6 2.4 6.5 5.6 6.5 1.5 0 2.7-.5 3.9-1.3 1.2.8 2.4 1.3 3.9 1.3 3.2 0 5.6-2.9 5.6-6.5 0-3.1-1.4-6-4.3-7.1-1.9-.7-4-.3-5.2.7Z"
      />
      {/* The ribs, darker than the skin, so it reads as round. */}
      <path
        fill="none"
        stroke="rgb(0 0 0 / 0.3)"
        strokeWidth="1.2"
        strokeLinecap="round"
        d="M9 7.6c-1.4 3-1.4 8.9 0 12M15 7.6c1.4 3 1.4 8.9 0 12"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M12 7.2V4.7c0-.9.6-1.8 1.7-2.2"
      />
    </svg>
  )
}

export function Bat({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 64 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M32 6c-1.2 0-2 1-2.4 2.2l-1.1-1.6-.6 2.4C24.6 7.4 20 4.6 14 4c2 1.6 3 3.6 3 5.6-3-.8-6.8-.6-10 1 2.4.8 4 2.4 4.6 4.2-2.8-.2-6.6.2-9.6 1.8 6 .2 10.6 2 14.4 4.6 1.4-1.8 3.6-2.6 6-2.2.8-1.8 2.4-3 4.6-3.2L32 22l5-6.2c2.2.2 3.8 1.4 4.6 3.2 2.4-.4 4.6.4 6 2.2 3.8-2.6 8.4-4.4 14.4-4.6-3-1.6-6.8-2-9.6-1.8.6-1.8 2.2-3.4 4.6-4.2-3.2-1.6-7-1.8-10-1 0-2 1-4 3-5.6-6 .6-10.6 3.4-13.9 5l-.6-2.4-1.1 1.6C34 7 33.2 6 32 6Z"
      />
    </svg>
  )
}

/** A web strung across a top-right corner: radials from the corner, sagging threads between them. */
export function Web({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round">
      <path d="M100 0 0 0M100 0 18 42M100 0 52 58M100 0 82 96M100 0 100 100" />
      <path d="M88 0q2 4 6 3.5 1.5 3 6 5.5" />
      <path d="M72 0q4 9 11 8.5 2 7 6.5 9.5 3 4 10.5 7" />
      <path d="M54 0q6 14 17 15 3 10 9 15 4 6 20 12" />
      <path d="M34 0q8 20 26 22 4 13 12 20 6 9 28 18" />
      <path d="M14 0q11 27 36 30 5 16 17 26 7 12 33 23" />
    </svg>
  )
}
