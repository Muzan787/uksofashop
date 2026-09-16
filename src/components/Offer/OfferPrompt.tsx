'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Truck, Wallet } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Modal from '@/components/UI/Modal'
import { OFFER_PUBLIC_CODE } from '@/utils/offers/constants'
import { trackOfferAction } from '@/utils/tracking'
import { CONSENT_CHANGED_EVENT, getConsent } from '@/utils/consent'
import { useOffer } from './OfferProvider'

const EXCLUDED_PREFIXES = [
  '/checkout',
  '/account',
  '/admin',
  '/track-order',
  '/confirm-order',
  '/login',
  '/signup',
  '/review',
  '/privacy',
  '/cookies',
  '/terms',
  '/delivery-returns',
  '/contact',
]

function promptAllowed(pathname: string): boolean {
  return !EXCLUDED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function OfferContent({ onCopied }: { onCopied: () => void }) {
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
        Extra savings on selected sofas
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
        We&apos;ll apply the best available sofa saving automatically at checkout. The code stays shareable if you want to keep it handy.
      </p>
    </div>
  )
}

export default function OfferPrompt() {
  const pathname = usePathname() ?? '/'
  const { active, startedAt } = useOffer()
  const [open, setOpen] = useState(false)
  const [consentResolved, setConsentResolved] = useState(false)
  const shownThisMount = useRef(new Set<string>())
  const shownEventThisMount = useRef(new Set<string>())

  // Do not stack the paid-offer dialog on top of the cookie question. The offer
  // is not conditional on accepting advertising cookies; it simply waits until
  // the visitor has answered either way, then appears as the one active dialog.
  useEffect(() => {
    const update = () => {
      const resolved = getConsent() !== null
      setConsentResolved(resolved)
      if (!resolved) setOpen(false)
    }
    update()
    window.addEventListener(CONSENT_CHANGED_EVENT, update)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, update)
  }, [])

  useEffect(() => {
    if (!active || !startedAt || !consentResolved || !promptAllowed(pathname)) return

    const version = startedAt
    const key = `uksofashop_offer_prompt_seen:${version}`
    if (shownThisMount.current.has(version)) return

    try {
      if (localStorage.getItem(key)) return
    } catch {
      // Keep the in-memory guard below even if storage is unavailable.
    }

    shownThisMount.current.add(version)
    try { localStorage.setItem(key, '1') } catch {}
    queueMicrotask(() => setOpen(true))
  }, [active, startedAt, consentResolved, pathname])

  useEffect(() => {
    if (!open || !startedAt || shownEventThisMount.current.has(startedAt)) return
    shownEventThisMount.current.add(startedAt)
    trackOfferAction('offer_prompt_shown', startedAt)
  }, [open, startedAt])

  if (!open) return null

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
      <OfferContent onCopied={copied} />
    </Modal>
  )
}
