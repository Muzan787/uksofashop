'use client'
// src/components/Season/useSeasonPhase.ts
//
// Which part of the 2026 run-up it is in the UK. 'off' until the browser has
// mounted, so the server render and the first client render agree and the
// seasonal words appear a frame later instead of causing a hydration mismatch.
import { useEffect, useState } from 'react'
import { seasonPhase, type SeasonPhase } from '@/utils/seasonal'

export function useSeasonPhase(): SeasonPhase {
  const [phase, setPhase] = useState<SeasonPhase>('off')
  useEffect(() => {
    const t = window.setTimeout(() => setPhase(seasonPhase(new Date())), 0)
    return () => window.clearTimeout(t)
  }, [])
  return phase
}
