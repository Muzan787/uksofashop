'use client'
// src/app/admin/meta/TrackingModeSwitch.tsx
//
// Dry run, Test or Live (admin upgrade N2). Live is how the shop has always
// sent; the other two ask first, because while they're on nothing reaches the
// live Meta or Google accounts.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { setTrackingMode } from '@/app/actions/tracking'
import type { TrackingMode } from '@/utils/shopSettings'

const MODES: { mode: TrackingMode; label: string; detail: string; confirm?: string }[] = [
  {
    mode: 'live',
    label: 'Live',
    detail: 'Sends to Meta and Google as the shop always has.',
  },
  {
    mode: 'test',
    label: 'Test',
    detail: 'Server events go to Meta’s Test events and Google’s validator only. The tags don’t load.',
    confirm: 'Switch to Test? Nothing reaches the live Meta or Google accounts until you switch back to Live, and a Purchase you send now still waits for the real send.',
  },
  {
    mode: 'dry_run',
    label: 'Dry run',
    detail: 'Every server event is built and logged below; nothing is sent. The tags don’t load.',
    confirm: 'Switch to Dry run? Nothing is sent to Meta or Google until you switch back to Live.',
  },
]

export default function TrackingModeSwitch({ mode }: { mode: TrackingMode }) {
  const router = useRouter()
  const [busy, setBusy] = useState<TrackingMode | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tracking mode">
        {MODES.map(m => {
          const current = m.mode === mode
          return (
            <button
              key={m.mode}
              type="button"
              role="radio"
              aria-checked={current}
              disabled={busy !== null || current}
              onClick={async () => {
                if (m.confirm && !window.confirm(m.confirm)) return
                if (!m.confirm && !window.confirm('Switch back to Live? Meta and Google receive events again from the next page view.')) return
                setBusy(m.mode)
                setMessage(null)
                const res = await setTrackingMode(m.mode)
                setBusy(null)
                setMessage(res.ok ? { ok: true, text: `${m.label} from the next page view.` } : { ok: false, text: res.text })
                if (res.ok) router.refresh()
              }}
              className={`min-h-16 rounded-sm border p-3 text-left transition disabled:cursor-default ${
                current
                  ? m.mode === 'live' ? 'border-green-300 bg-green-50' : 'border-violet-300 bg-violet-50'
                  : 'border-stone-200 bg-white hover:border-stone-400'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-stone-900">
                {busy === m.mode && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {m.label}
                {current && <span className="rounded-pill bg-stone-900 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">On</span>}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-stone-600">{m.detail}</span>
            </button>
          )
        })}
      </div>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`m-0 mt-2 text-sm font-semibold ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>
      )}
    </div>
  )
}
