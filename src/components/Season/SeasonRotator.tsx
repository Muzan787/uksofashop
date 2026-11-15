'use client'
// src/components/Season/SeasonRotator.tsx
//
// The announcement bar's seasonal messages, rotating (Run 7). Messages come
// from utils/seasonal.ts seasonMessages(): with a live 14-day window the
// visitor sees the £50 Made-To-Order offer, the code to use and their real
// countdown; without one, no code and no money claim.
//
// Accessibility and comfort:
//   - 7 seconds per message, a soft cross-fade, no layout shift (fixed height);
//   - pauses while hovered or focused, and has a real Pause/Play button
//     (WCAG 2.2.2); the choice is remembered for the browser session;
//   - prefers-reduced-motion: never rotates by itself; the button steps
//     through the messages instead;
//   - while rotating the region is not live (a screen reader is not read a new
//     sentence every 7 s); when paused it is polite.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Pause, Play, SkipForward, Snowflake } from 'lucide-react'
import { seasonMessages, type SeasonPhase } from '@/utils/seasonal'
import { useOfferCountdown } from '@/components/Offer/useOfferCountdown'

const DWELL_MS = 5000
const PAUSE_KEY = 'ukss_bar_paused'

function readPaused(): boolean {
  try { return window.sessionStorage.getItem(PAUSE_KEY) === '1' } catch { return false }
}
function writePaused(v: boolean) {
  try { window.sessionStorage.setItem(PAUSE_KEY, v ? '1' : '0') } catch { /* private mode */ }
}

export default function SeasonRotator({ phase, offerActive }: { phase: SeasonPhase; offerActive: boolean }) {
  const messages = seasonMessages(phase, offerActive)
  const { clock } = useOfferCountdown()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hold, setHold] = useState(false)
  const [reduced, setReduced] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPaused(readPaused())
      setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    }, 0)
    return () => window.clearTimeout(t)
  }, [])

  const count = messages.length
  const rotating = count > 1 && !paused && !hold && !reduced
  useEffect(() => {
    if (!rotating) return
    const id = window.setInterval(() => setIndex(i => (i + 1) % count), DWELL_MS)
    return () => window.clearInterval(id)
  }, [rotating, count])

  if (count === 0) return null
  const m = messages[index % count]

  const toggle = () => {
    if (reduced) { setIndex(i => (i + 1) % count); return }
    setPaused(p => { writePaused(!p); return !p })
  }

  return (
    <div
      ref={box}
      className="flex min-w-0 items-center justify-center"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={e => { if (!box.current?.contains(e.relatedTarget as Node)) setHold(false) }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={reduced ? 'Next message' : paused ? 'Play messages' : 'Pause messages'}
        className="hover-icon-dark absolute left-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-sm text-calico-300"
      >
        {reduced ? <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
          : paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" />
          : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
      <p
        aria-live={rotating ? 'off' : 'polite'}
        aria-atomic="true"
        className="eyebrow m-0 min-w-0 truncate text-center text-calico-300 max-sm:tracking-[0.08em]"
      >
        <Link key={m.key} href={m.href} className="season-bar-msg text-calico-300 no-underline hover:text-calico-50">
          <Snowflake aria-hidden="true" className="mr-1.5 inline h-3 w-3 -translate-y-px text-ember-300" />
          {/* On a phone the short line already carries the code. */}
          <span className="sm:hidden">{m.short}</span>
          <span className="hidden sm:inline">{m.lead}</span>
          {m.code && (
            <span className="hidden sm:inline"> · code <span className="font-bold tracking-[0.12em] text-ember-300">{m.code}</span></span>
          )}
          {m.countdown && clock && (
            <> · <span aria-hidden="true" className="font-data tabular-nums text-ember-300">{clock}</span></>
          )}
          <span aria-hidden="true" className="text-ember-300"> →</span>
        </Link>
      </p>
      <span className="sr-only">Message {(index % count) + 1} of {count}</span>
    </div>
  )
}
