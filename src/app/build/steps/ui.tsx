'use client'
// src/app/build/steps/ui.tsx
//
// The few pieces every step shares: the heading block, and the seat diagram
// the size tiles are drawn with.

import type { SizeShape } from '../catalogue'

export function StepHeading({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <header className="mb-6 sm:mb-8">
      <p className="eyebrow m-0 text-ember-700">{eyebrow}</p>
      <h2 className="m-0 mt-2 font-display text-h2 font-semibold text-ink-900">{title}</h2>
      <p className="m-0 mt-2 max-w-read text-body leading-relaxed text-ink-700">{lead}</p>
    </header>
  )
}

/** Whole pounds read as whole pounds; anything else gets its pence. */
export function pounds(amount: number): string {
  return Number.isInteger(amount)
    ? `£${amount.toLocaleString('en-GB')}`
    : `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Seat diagrams ───────────────────────────────────────────────────────────
//
// Plan views. Each seat is a rounded square, arms are thin bars, and a corner
// is the same square turned. They are deliberately schematic - a customer
// reads "three squares" as three seats faster than any photograph, and at
// 72px a photograph of a grey sofa is a grey rectangle anyway.

type Rect = [x: number, y: number, w: number, h: number]

const SEAT = 12
const GAP = 2

function row(count: number, x: number, y: number): Rect[] {
  return Array.from({ length: count }, (_, i) => [x + i * (SEAT + GAP), y, SEAT, SEAT])
}
function column(count: number, x: number, y: number): Rect[] {
  return Array.from({ length: count }, (_, i) => [x, y + i * (SEAT + GAP), SEAT, SEAT])
}

/** Seats and arms for each shape, in a 72×48 box, roughly centred. */
function shapes(shape: SizeShape): { seats: Rect[]; arms: Rect[] } {
  switch (shape) {
    case 'chair':
      return { seats: row(1, 30, 18), arms: [[25, 18, 3, SEAT], [44, 18, 3, SEAT]] }
    case 'two':
      return { seats: row(2, 23, 18), arms: [[18, 18, 3, SEAT], [51, 18, 3, SEAT]] }
    case 'three':
      return { seats: row(3, 16, 18), arms: [[11, 18, 3, SEAT], [58, 18, 3, SEAT]] }
    case 'pair':
      return {
        seats: [...row(3, 16, 8), ...row(2, 23, 28)],
        arms: [[11, 8, 3, SEAT], [58, 8, 3, SEAT], [18, 28, 3, SEAT], [51, 28, 3, SEAT]],
      }
    case 'corner-small':
      // Two along the top, the corner, one down.
      return {
        seats: [...row(3, 16, 10), ...column(1, 44, 24)],
        arms: [[11, 10, 3, SEAT], [44, 39, SEAT, 3]],
      }
    case 'corner':
      return {
        seats: [...row(3, 16, 6), ...column(2, 44, 20)],
        arms: [[11, 6, 3, SEAT], [44, 35, SEAT, 3]],
      }
    case 'l':
      return {
        seats: [...row(3, 16, 18), [44, 4, SEAT, SEAT]],
        arms: [[11, 18, 3, SEAT], [58, 18, 3, SEAT]],
      }
    case 'u':
      return {
        seats: [...row(3, 16, 30), ...column(2, 16, 2), ...column(2, 44, 2)],
        arms: [],
      }
    case 'u-armed':
      return {
        seats: [...row(3, 16, 30), ...column(2, 16, 2), ...column(2, 44, 2)],
        arms: [[11, 2, 3, SEAT], [58, 2, 3, SEAT]],
      }
  }
}

export function SeatDiagram({ shape, className }: { shape: SizeShape; className?: string }) {
  const { seats, arms } = shapes(shape)
  return (
    <svg viewBox="0 0 72 48" aria-hidden="true" className={className}>
      {seats.map(([x, y, w, h], i) => (
        <rect key={`s${i}`} x={x} y={y} width={w} height={h} rx="2.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.25" />
      ))}
      {arms.map(([x, y, w, h], i) => (
        <rect key={`a${i}`} x={x} y={y} width={w} height={h} rx="1.5" fill="currentColor" />
      ))}
    </svg>
  )
}
