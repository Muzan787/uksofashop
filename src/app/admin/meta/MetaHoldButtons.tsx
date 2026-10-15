'use client'
// src/app/admin/meta/MetaHoldButtons.tsx
//
// Hold and Don't send on an order's Meta signals (admin upgrade N4). Hold
// keeps it out of the queue until released; Don't send means it never goes,
// and asks first. Either can be undone.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { setMetaHold } from '@/app/actions/tracking'

const button = 'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-sm border px-3 text-xs font-bold disabled:opacity-50'

export default function MetaHoldButtons({ orderId, state }: { orderId: string; state: 'hold' | 'dont_send' | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function set(next: 'hold' | 'dont_send' | null) {
    setBusy(next ?? 'release')
    setError('')
    const res = await setMetaHold(orderId, next)
    setBusy(null)
    if (res.ok) router.refresh()
    else setError(res.text)
  }

  const spinner = (key: string) => busy === key && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        {state === null && (
          <button type="button" disabled={busy !== null} onClick={() => set('hold')} className={`${button} border-stone-300 bg-white text-stone-800`}>
            {spinner('hold')} Hold
          </button>
        )}
        {state === 'hold' && (
          <button type="button" disabled={busy !== null} onClick={() => set(null)} className={`${button} border-stone-300 bg-white text-stone-800`}>
            {spinner('release')} Release
          </button>
        )}
        {state !== 'dont_send' ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => { if (window.confirm('Never send this order’s Meta signals? You can undo it later.')) void set('dont_send') }}
            className={`${button} border-red-200 bg-white text-red-700`}
          >
            {spinner('dont_send')} Don’t send
          </button>
        ) : (
          <button type="button" disabled={busy !== null} onClick={() => set(null)} className={`${button} border-stone-300 bg-white text-stone-800`}>
            {spinner('release')} Undo Don’t send
          </button>
        )}
      </div>
      {error && <p role="alert" className="m-0 mt-1.5 text-[11px] font-semibold text-red-700">{error}</p>}
    </div>
  )
}
