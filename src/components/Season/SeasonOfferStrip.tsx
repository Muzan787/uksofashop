'use client'
// src/components/Season/SeasonOfferStrip.tsx
//
// The seasonal pages' offer line, inside the collection hero (Run 7).
//   - With a live 96-hour window: "£50 off every made-to-order sofa · code
//     BLACKFRIDAY · ends Thu 19 Nov, 1:16pm", with a copy button. The amount is
//     what calculate_order_offer takes off each made-to-order line; the
//     deadline is the persisted window's own expiry.
//   - Without one: no code and no money claim; just the way into the ranges.
import { useState } from 'react'
import Link from 'next/link'
import { ArrowDown, Check, Copy, MessageCircle, Truck } from 'lucide-react'
import WhatsAppLink from '@/components/UI/WhatsAppLink'
import { useOfferCountdown } from '@/components/Offer/useOfferCountdown'
import { MTO_OFFER_AMOUNT } from '@/utils/offers/amount'

export default function SeasonOfferStrip({ kind }: { kind: 'black_friday' | 'christmas' }) {
  const { active, deadline } = useOfferCountdown()
  const [copied, setCopied] = useState(false)
  const code = kind === 'christmas' ? 'CHRISTMAS' : 'BLACKFRIDAY'

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { /* the code is on screen to read */ }
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {active && deadline && (
        <p className="m-0 inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-2 self-start rounded-md border border-ember-300/40 bg-calico-50/[0.06] px-4 py-2.5 text-body-sm text-calico-50">
          <span className="font-semibold">£{MTO_OFFER_AMOUNT} off every made-to-order sofa</span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-sm bg-ember-500 px-3 font-data text-caption font-bold tracking-[0.1em] text-ink-900"
            aria-label={`Copy code ${code}`}
          >
            {code}
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          <span className="text-calico-300">ends {deadline}</span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="#ranges"
          className="hover-btn btn-ember inline-flex h-12 items-center gap-2 rounded-pill bg-ember-500 px-6 text-body-sm font-semibold text-ink-900 no-underline"
        >
          Explore made-to-order ranges <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </Link>
        {kind === 'christmas' ? (
          <WhatsAppLink
            message="Hello, I would like to check Christmas delivery. The sofa is: [sofa name]. My postcode is: [postcode]."
            pageContext="seasonal_christmas"
            className="glass-dark-panel hover-btn hover-btn-dark inline-flex h-12 items-center gap-2 rounded-pill px-5 text-body-sm font-medium text-calico-50 no-underline"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> Check Christmas delivery
          </WhatsAppLink>
        ) : (
          <Link href="/christmas" className="glass-dark-panel hover-btn hover-btn-dark inline-flex h-12 items-center gap-2 rounded-pill px-5 text-body-sm font-medium text-calico-50 no-underline">
            <Truck className="h-4 w-4" aria-hidden="true" /> Christmas delivery
          </Link>
        )}
      </div>
    </div>
  )
}
