'use client'
// src/app/admin/orders/CopyOrderButton.tsx
//
// The button. The text it copies is src/utils/orderText.ts, which the admin's
// new-order email also renders, so what Muaz pastes out of his inbox and what
// he pastes out of this panel are the same block of words.

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyText } from '@/utils/clipboard'
import { formatOrderForCopy } from '@/utils/orderText'
import type { AdminOrderDisplay } from '@/types/adminOrders'

// Re-exported for EditOrderForm, which splits the stored address back into its
// two fields and has imported it from here since before there was a util.
export { splitAddress, formatOrderForCopy } from '@/utils/orderText'

export default function CopyOrderButton({ order }: { order: AdminOrderDisplay }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await copyText(formatOrderForCopy(order))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="flex items-center justify-center gap-2 bg-stone-100 text-stone-700 px-4 py-2.5 rounded-sm text-sm font-bold hover:bg-stone-200 active:scale-95 transition"
      title="Copy the whole order as text"
      aria-label="Copy order details"
    >
      {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
    </button>
  )
}
