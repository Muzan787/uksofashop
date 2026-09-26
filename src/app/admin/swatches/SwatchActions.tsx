'use client'
// src/app/admin/swatches/SwatchActions.tsx
//
// The two things you do with a swatch request once the samples are in the
// post: chase it, and pass it on. Same pair the orders card carries, same
// styling, because they are the same two jobs.

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { whatsAppLink } from '@/utils/phone'
import { copyText } from '@/utils/clipboard'
import {
  formatSwatchForCopy,
  swatchFollowUpMessage,
  type SwatchCopyInput,
} from '@/utils/swatchText'

/** The WhatsApp glyph the orders card uses. Kept identical on purpose. */
function WhatsAppGlyph() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 3.825 0 6.938 3.112 6.938 6.937 0 3.825-3.113 6.938-6.938 6.938z" />
    </svg>
  )
}

export default function SwatchActions({ request }: { request: SwatchCopyInput }) {
  const [copied, setCopied] = useState(false)

  // null for anything that is not a dialable UK mobile, and for a request that
  // gave no number at all - which is allowed, the form only asks for one. The
  // button is hidden rather than rendered as a link that goes nowhere.
  const chaseUrl = request.customerPhone
    ? whatsAppLink(request.customerPhone, swatchFollowUpMessage(request.customerName, request.items))
    : null

  const handleCopy = async () => {
    await copyText(formatSwatchForCopy(request))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chaseUrl && (
        <a
          href={chaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-[#25D366]/10 py-2.5 text-sm font-bold text-[#128C7E] no-underline transition hover:bg-[#25D366]/20"
          title="Open the customer's WhatsApp with the follow-up written"
        >
          <WhatsAppGlyph />
          Ask how they got on
        </a>
      )}

      <button
        onClick={handleCopy}
        type="button"
        className="flex items-center justify-center gap-2 rounded-sm bg-stone-100 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-200 active:scale-95"
        title="Copy the whole request as text"
        aria-label="Copy swatch request details"
      >
        {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
      </button>
    </div>
  )
}
