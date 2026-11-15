'use client'
// src/components/Season/YourOfferChip.tsx
//
// On the seasonal pages, the visitor's REAL offer, when they have one:
//   "Your sofa offer · SOFAEXTRA · ends Tue 17 Nov, 6:43pm"
// The deadline is the persisted entitlement's own expiry (useOfferCountdown
// reads OfferProvider, which OfferBoot keeps in step with the server), never a
// timer of this page's own. No money figure is shown here, because the amount
// depends on the sofa; each sofa's page states it beside its price. Without a
// live window it renders nothing, so nobody is shown an offer they do not hold.
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useOfferCountdown } from '@/components/Offer/useOfferCountdown'
import { OFFER_PUBLIC_CODE } from '@/utils/offers/constants'

export default function YourOfferChip({ className = '' }: { className?: string }) {
  const { active, deadline } = useOfferCountdown()
  const [copied, setCopied] = useState(false)
  if (!active || !deadline) return null

  async function copy() {
    try {
      await navigator.clipboard.writeText(OFFER_PUBLIC_CODE)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* the code is on screen to read */
    }
  }

  return (
    <p className={`m-0 inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-pill border border-ember-300/40 bg-calico-50/5 px-4 py-2 text-body-sm text-calico-50 ${className}`}>
      <span>Your sofa offer</span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-sm bg-ember-500 px-2.5 font-data text-caption font-bold tracking-[0.08em] text-ink-900"
        aria-label={`Copy offer code ${OFFER_PUBLIC_CODE}`}
      >
        {OFFER_PUBLIC_CODE}
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
      <span className="text-calico-300">ends {deadline}</span>
    </p>
  )
}
