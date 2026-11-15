'use client'
// src/components/Season/LogoHat.tsx
//
// A small Santa hat resting on the "U" of the UK Sofa Shop wordmark, 14 Nov to
// 25 Dec (Run 7). Original SVG in the shop's ember and calico with a soft fold
// and a fur trim, tilted to sit on the letter's left shoulder. Decoration only:
// aria-hidden, no pointer events, absolutely positioned so the wordmark does
// not move by a pixel.
import { useSeasonPhase } from './useSeasonPhase'

export default function LogoHat() {
  if (useSeasonPhase() === 'off') return null
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 32 26"
      data-logo-hat
      className="pointer-events-none absolute -left-[0.36em] -top-[0.66em] h-[0.9em] w-[1.1em] -rotate-[16deg] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
    >
      {/* the hat, flopping over to the right */}
      <path d="M4 19 C5 10 11 3 19 3 C24 3 27.5 6 28.5 10.5 C26.4 9 24.2 8.8 22.6 9.6 C24.2 12.6 25 16 25.2 19 Z" fill="#d23b2e" />
      <path d="M22.6 9.6 C24.2 12.6 25 16 25.2 19 L19 19 C20 15 21 12 22.6 9.6 Z" fill="#a8281d" />
      <path d="M19 3 C24 3 27.5 6 28.5 10.5 C26.4 9 24.2 8.8 22.6 9.6" fill="none" stroke="#5e1711" strokeOpacity=".5" strokeWidth=".8" />
      {/* fur trim */}
      <rect x="1.5" y="17.6" width="26" height="6.4" rx="3.2" fill="#FBFAF7" />
      <rect x="1.5" y="21.6" width="26" height="2.4" rx="1.2" fill="#E8E2D6" />
      {/* bobble */}
      <circle cx="28.3" cy="11.6" r="3.2" fill="#FBFAF7" />
    </svg>
  )
}
