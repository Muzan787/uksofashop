'use client'
// src/components/Admin/CopyTextButton.tsx
//
// Copies a piece of text - a review link, a reference - and says so. Uses the
// same clipboard helper as Copy order, which also works in the older in-app
// browsers that refuse the modern clipboard.
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyText } from '@/utils/clipboard'

export default function CopyTextButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await copyText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className={className ?? 'inline-flex min-h-11 items-center gap-2 rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-500'}
    >
      {copied ? <Check className="h-4 w-4 text-green-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? 'Copied' : label}
    </button>
  )
}
