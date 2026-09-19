'use client'
// src/components/Offer/OfferPrompt.tsx
//
// The offer sheet. It used to open by itself the moment a paid visitor's
// entitlement was confirmed - a scroll-locking dialog over the product they
// had just tapped an ad to see, with the cookie question behind it. Two in
// three closed it unread (86 of 131 in its first fortnight). Since
// 2026-09-19 it opens only when asked: the product page's OfferStrip says
// the real figure in one line under the price and dispatches
// OFFER_OPEN_EVENT when tapped, and the header's announcement bar carries
// the code everywhere else. Nothing about the entitlement itself changed -
// the discount still comes off at checkout whether or not this is ever seen.

import { useEffect, useState } from 'react'
import { Check, Copy, Truck, Wallet } from 'lucide-react'
import Modal from '@/components/UI/Modal'
import { OFFER_OPEN_EVENT, OFFER_PUBLIC_CODE } from '@/utils/offers/constants'
import { trackOfferAction } from '@/utils/tracking'
import { useOffer } from './OfferProvider'

function OfferContent({ amount, onCopied }: { amount: number | null; onCopied: () => void }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(OFFER_PUBLIC_CODE)
      onCopied()
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // The code remains visible and selectable when clipboard access is
      // unavailable, so copying never becomes a gate to using the offer.
      setCopied(false)
    }
  }

  return (
    <div>
      <p className="m-0 font-data text-eyebrow font-bold uppercase tracking-[0.18em] text-ember-700">
        Your online sofa offer is active
      </p>
      <h3 className="m-0 mt-2 font-display text-h3 font-semibold leading-tight text-ink-900">
        {amount ? `£${amount} off this sofa` : 'Extra savings on selected sofas'}
      </h3>

      <div className="mt-4 flex flex-col gap-2 rounded-md border border-calico-300 bg-calico-100/60 p-3.5">
        <div className="flex items-center gap-2 text-body-sm font-semibold text-ink-900">
          <Truck aria-hidden="true" className="h-4 w-4 shrink-0 text-ember-700" />
          FREE UK Mainland Delivery
        </div>
        <div className="flex items-center gap-2 text-body-sm font-semibold text-ink-900">
          <Wallet aria-hidden="true" className="h-4 w-4 shrink-0 text-ember-700" />
          Pay on delivery
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-sm border border-ember-500/30 bg-ember-500/[0.08] px-3.5 py-2.5">
        <code className="select-all font-data text-body font-extrabold tracking-[0.12em] text-ink-900">
          {OFFER_PUBLIC_CODE}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm border border-ink-900 bg-ink-900 px-3 text-caption font-bold text-calico-50"
        >
          {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>

      <p className="m-0 mt-3 text-caption leading-relaxed text-ink-500">
        It comes off automatically at checkout - nothing to type. The code is here in case you want to pass it on.
      </p>
    </div>
  )
}

export default function OfferPrompt() {
  const { active, startedAt } = useOffer()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState<number | null>(null)

  // Opened on request only. The strip sends the product's figure along so
  // the sheet can lead with it; anything else that asks gets the generic line.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ amount?: number }>).detail
      setAmount(typeof detail?.amount === 'number' && detail.amount > 0 ? detail.amount : null)
      setOpen(true)
      // The ledger's "shown" now means "opened by the visitor", which is the
      // more useful number anyway.
      if (startedAt) trackOfferAction('offer_prompt_shown', startedAt)
    }
    window.addEventListener(OFFER_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OFFER_OPEN_EVENT, onOpen)
  }, [startedAt])

  if (!open || !active) return null

  const title = 'Your online sofa offer is active'
  const close = () => {
    if (startedAt) trackOfferAction('offer_prompt_dismissed', startedAt)
    setOpen(false)
  }
  const copied = () => {
    if (startedAt) trackOfferAction('offer_code_copied', startedAt)
  }

  // Deliberately centred at every viewport width. The old mobile bottom sheet
  // competed with the cookie banner and covered too much of the first product
  // view; Modal keeps a 16px edge gap and a 420px maximum width instead.
  return (
    <Modal title={title} onClose={close} size="sm" hideTitle>
      <OfferContent amount={amount} onCopied={copied} />
    </Modal>
  )
}
