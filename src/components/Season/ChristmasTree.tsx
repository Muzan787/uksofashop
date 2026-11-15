'use client'
// src/components/Season/ChristmasTree.tsx
//
// A small Christmas tree for the homepage hero (15 Nov 2026). Original
// artwork drawn here in SVG, so it costs one inline element and no image
// request: four scalloped pine tiers, a string of warm lights, a few
// ornaments in the shop's own ember, mulberry and calico, and a star.
//
// Placement rules (Hero.tsx mounts it BEFORE the sofa, so it is behind it):
//   - hidden under 640px: the phone hero is budgeted to one screen and the
//     headline, the two buttons, the sofa and the price chip own it;
//   - from 640px it stands at the far right edge of the stage, behind the
//     sofa, never on top of its outline, the price chip or the buttons;
//   - decoration only: aria-hidden, pointer-events none, no layout effect;
//   - the lights twinkle softly (opacity only); with reduced motion they are
//     simply lit and still (rules under .tree-light in globals.css);
//   - drawn between 14 Nov and 25 Dec only (useSeasonPhase), never on the
//     basket, checkout or admin.
import { useSeasonPhase } from './useSeasonPhase'

/** One scalloped tier: apex at (cx, top), base at `bottom`, half-width `hw`. */
function tier(cx: number, top: number, bottom: number, hw: number, scallops: number): string {
  const left = cx - hw
  const right = cx + hw
  let d = `M${cx} ${top} C${cx - hw * 0.28} ${top + (bottom - top) * 0.34} ${left + hw * 0.1} ${bottom - (bottom - top) * 0.3} ${left} ${bottom}`
  const step = (right - left) / scallops
  for (let i = 0; i < scallops; i++) {
    const x0 = left + step * i
    const x1 = x0 + step
    d += ` Q${(x0 + x1) / 2} ${bottom + 9} ${x1} ${bottom}`
  }
  d += ` C${right - hw * 0.1} ${bottom - (bottom - top) * 0.3} ${cx + hw * 0.28} ${top + (bottom - top) * 0.34} ${cx} ${top} Z`
  return d
}

// Four tiers, widest at the foot.
const TIERS = [
  { top: 34, bottom: 98, hw: 38, n: 4, fill: '#1B4A3F' },
  { top: 72, bottom: 144, hw: 54, n: 5, fill: '#215548' },
  { top: 112, bottom: 196, hw: 70, n: 6, fill: '#276153' },
  { top: 158, bottom: 252, hw: 86, n: 7, fill: '#2D6C5D' },
]

// Lights follow a loose garland down the tree: [x, y, delay in seconds].
const LIGHTS: [number, number, number][] = [
  [82, 70, 0], [106, 84, 0.6], [92, 112, 1.1], [124, 124, 0.3], [70, 134, 1.7],
  [112, 150, 0.9], [150, 160, 1.4], [86, 178, 0.2], [128, 188, 1.0], [58, 196, 1.9],
  [162, 208, 0.5], [102, 220, 1.5], [140, 236, 0.1], [74, 240, 0.8], [176, 246, 1.2],
]

// Ornaments: [x, y, colour].
const ORNAMENTS: [number, number, string][] = [
  [96, 96, '#84485A'], [118, 138, '#FBFAF7'], [78, 156, '#D4871A'], [138, 174, '#84485A'],
  [98, 204, '#FBFAF7'], [154, 226, '#D4871A'], [66, 226, '#FBFAF7'],
]

export default function ChristmasTree({ className = '' }: { className?: string }) {
  const phase = useSeasonPhase()
  if (phase === 'off') return null
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 220 300"
      className={`pointer-events-none absolute hidden sm:block ${className}`}
    >
      <defs>
        <radialGradient id="tree-glow" cx="50%" cy="58%" r="55%">
          <stop offset="0%" stopColor="#D4871A" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#D4871A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tree-bulb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE2A8" />
          <stop offset="55%" stopColor="#F4B24A" />
          <stop offset="100%" stopColor="#D4871A" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* The warm pool of light the tree stands in. */}
      <ellipse cx="110" cy="170" rx="120" ry="130" fill="url(#tree-glow)" />
      {/* Trunk and pot */}
      <rect x="102" y="250" width="16" height="22" rx="2" fill="#4A3426" />
      <path d="M84 270 H136 L130 292 H90 Z" fill="#84485A" />
      <rect x="82" y="266" width="56" height="7" rx="3" fill="#9A5A6D" />
      {TIERS.map((t, i) => (
        <g key={i}>
          <path d={tier(110, t.top, t.bottom, t.hw, t.n)} fill={t.fill} />
          {/* Snow resting on the front edge of each tier. */}
          <path
            d={`M${110 - t.hw * 0.62} ${t.bottom - 20} Q${110 - t.hw * 0.3} ${t.bottom - 28} ${110} ${t.bottom - 22} Q${110 + t.hw * 0.35} ${t.bottom - 30} ${110 + t.hw * 0.64} ${t.bottom - 19}`}
            fill="none" stroke="#FBFAF7" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round"
          />
        </g>
      ))}
      {ORNAMENTS.map(([x, y, c], i) => (
        <circle key={i} cx={x} cy={y} r="4.6" fill={c} stroke="#191C1B" strokeOpacity="0.25" strokeWidth="0.6" />
      ))}
      {LIGHTS.map(([x, y, delay], i) => (
        <circle key={i} className="tree-light" cx={x} cy={y} r="6.5" fill="url(#tree-bulb)" style={{ animationDelay: `${delay}s` }} />
      ))}
      {/* The star */}
      <path
        d="M110 8 L114.4 22 L129 22.4 L117.4 31 L121.6 45 L110 36.6 L98.4 45 L102.6 31 L91 22.4 L105.6 22 Z"
        fill="#F4B24A" stroke="#D4871A" strokeWidth="1"
      />
    </svg>
  )
}
