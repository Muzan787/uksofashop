'use client'
// src/app/admin/orders/DeleteOrderButton.tsx
//
// Deletes an order for good. Two taps, on purpose: the first turns the
// button into a question, the second answers it, and anything else - a tap
// elsewhere, a few seconds of nothing - puts it back. A single-tap delete on
// a phone, in a list of cards with the same button on each, is how the wrong
// order goes.
//
// For tests and mistakes. An order that fell through is cancelled with a
// reason instead, so the record of what happened stays.

import { useEffect, useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteOrder } from '@/app/actions/orders'

export default function DeleteOrderButton({ orderId, reference }: { orderId: string; reference: string }) {
  const [armed, setArmed] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  // Disarm on its own. Someone who tapped once and wandered off should not
  // come back to a page where the next tap deletes an order.
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 6000)
    return () => window.clearTimeout(t)
  }, [armed])

  const confirm = () => {
    setError('')
    startTransition(async () => {
      const res = await deleteOrder(orderId)
      if ('error' in res) {
        setError(res.error)
        setArmed(false)
      }
      // On success the list re-renders without this card; nothing to reset.
    })
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="flex items-center justify-center gap-2 rounded-sm px-3 py-2.5 text-xs font-bold text-stone-500 transition hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Delete order
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-red-200 bg-red-50 p-3">
      <p className="m-0 text-sm text-red-800">
        Delete <span className="font-mono font-bold">#{reference}</span> permanently? This cannot be undone.
        If a customer pulled out, cancel it with a reason instead.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="flex-1 rounded-sm bg-red-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? 'Deleting…' : 'Yes, delete it'}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={pending}
          className="flex-1 rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
        >
          Keep it
        </button>
      </div>
      {error && <p className="m-0 text-xs text-red-700">{error}</p>}
    </div>
  )
}
