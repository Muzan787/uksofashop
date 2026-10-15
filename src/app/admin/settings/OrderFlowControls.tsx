'use client'
// src/app/admin/settings/OrderFlowControls.tsx
//
// OrderFlow's buttons (admin upgrade M4): switch sending on or off, send a
// test order, check for replies. Switching on is refused while OrderFlow's
// address and key aren't in Vault. Decision 7: there is no "send test orders
// too" switch - every order goes, tests included, unmarked - so "Send a test
// order" re-sends the order already marked as a test, exactly as it would go.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { checkOrderFlowReplies, sendOrderFlowTest, setOrderFlowEnabled } from '@/app/actions/settings'

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800 disabled:opacity-50'

export default function OrderFlowControls({ connected, enabled, testOrderCode }: { connected: boolean; enabled: boolean; testOrderCode: string | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function run(key: string, action: () => Promise<{ ok: true } | { ok: false; text: string }>, done: string) {
    setBusy(key)
    setMessage(null)
    const res = await action()
    setBusy(null)
    setMessage(res.ok ? { ok: true, text: done } : { ok: false, text: res.text })
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null || (!enabled && !connected)}
          className={button}
          onClick={() => {
            const question = enabled
              ? 'Stop sending orders to OrderFlow? Orders are still placed and kept here. When you switch it back on, the 15-minute re-send picks up any from the last three days.'
              : 'Start sending orders to OrderFlow again?'
            if (!window.confirm(question)) return
            void run('switch', () => setOrderFlowEnabled(!enabled), enabled ? 'Sending to OrderFlow is off.' : 'Sending to OrderFlow is on.')
          }}
        >
          {busy === 'switch' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {enabled ? 'Switch sending off' : 'Switch sending on'}
        </button>
        <button
          type="button"
          disabled={busy !== null || !connected || !enabled || !testOrderCode}
          className={button}
          onClick={() => {
            if (!window.confirm(`Send test order ${testOrderCode} to OrderFlow again? It goes exactly as every order does; OrderFlow already has it, so it updates that order.`)) return
            void run('test', sendOrderFlowTest, `Sent ${testOrderCode}. OrderFlow's reply shows below within five minutes, or tap Check for replies.`)
          }}
        >
          {busy === 'test' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Send a test order
        </button>
        <button
          type="button"
          disabled={busy !== null || !connected}
          className={button}
          onClick={() => void run('replies', checkOrderFlowReplies, 'Checked. Any new replies are below.')}
        >
          {busy === 'replies' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Check for replies
        </button>
      </div>
      <p className="m-0 text-xs leading-relaxed text-stone-500">
        {!connected && !enabled
          ? 'Sending can be switched on once OrderFlow’s address and key are in Supabase Vault.'
          : testOrderCode
            ? `The test order is ${testOrderCode}, the latest order marked as a test. It reaches OrderFlow unmarked, like every order.`
            : 'No order is marked as a test, so there is nothing to send as one. Mark one on its order page.'}
      </p>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`m-0 text-sm font-semibold ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>
      )}
    </div>
  )
}
