// src/components/Admin/HealthState.tsx
//
// How a check's state looks: always a word as well as a colour, so it reads
// the same to someone who can't tell amber from green.
import { CheckCircle2, CircleAlert, CircleDashed } from 'lucide-react'
import { STATE_WORDS, type CheckState } from '@/utils/health/checks'

const STYLES: Record<CheckState, { pill: string; icon: typeof CheckCircle2 }> = {
  ok: { pill: 'border-green-200 bg-green-50 text-green-800', icon: CheckCircle2 },
  amber: { pill: 'border-amber-200 bg-amber-50 text-amber-800', icon: CircleDashed },
  red: { pill: 'border-red-200 bg-red-50 text-red-800', icon: CircleAlert },
}

export function StatePill({ state, label }: { state: CheckState; label?: string }) {
  const { pill, icon: Icon } = STYLES[state]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-bold ${pill}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label ?? STATE_WORDS[state]}
    </span>
  )
}

/** The left edge colour for a check's card. */
export const STATE_EDGE: Record<CheckState, string> = {
  ok: 'border-l-green-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
}
