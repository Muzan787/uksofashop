'use client'
// src/utils/attribution/useWhatsAppCTA.ts
//
// One hook behind every customer-facing WhatsApp button on the site
// (components/Layout/WhatsAppFab.tsx, components/Product/SecondaryActions.tsx
// and its ProductPageClient callers, app/contact, app/showroom,
// app/swatches, components/Checkout/SuccessStep.tsx). It exists so the
// reference-minting, the enquiry beacon and the Contact event are written
// once rather than five times, and so every entry point behaves identically.
//
// Returns a plain { href, onClick } pair to spread onto whatever <a> markup
// the call site already has - deliberately not a component, so none of the
// five very different visual treatments of these buttons has to change.

import { useEffect, useMemo, useRef, useState } from 'react'
import { whatsAppHref } from '@/constants/contact'
import { trackContactEvent } from '@/utils/tracking'
import {
  generateWhatsAppReference,
  withReferenceLine,
  sendWhatsAppEnquiry,
} from './whatsapp'

export interface WhatsAppCTAOptions {
  /** The human-readable message, exactly as it read before - no ids in it. */
  message: string
  /** A short label for which entry point this is, e.g. 'product_agent', 'fab', 'contact_page'. */
  pageContext: string
  productId?: string
  variantId?: string
  productName?: string
  /** Support-only contacts must not mint a fresh acquisition reference or write acquisition events. */
  acquisition?: boolean
}

export interface WhatsAppCTA {
  href: string
  onClick: () => void
}

export function useWhatsAppCTA(opts: WhatsAppCTAOptions): WhatsAppCTA {
  const acquisition = opts.acquisition !== false
  const referenceContext = [
    opts.pageContext,
    opts.productId ?? '',
    opts.variantId ?? '',
    opts.productName ?? '',
  ].join('\u0000')
  const sent = useRef(false)
  const [reference, setReference] = useState('')

  // Generate after hydration, and regenerate whenever the live enquiry context
  // changes in-place. Reset the one-beacon guard in the same transition so a
  // newly selected product/variant cannot inherit the previous context's sent
  // state or reference.
  useEffect(() => {
    sent.current = false
    setReference(acquisition ? generateWhatsAppReference() : '')
  }, [acquisition, referenceContext])

  const href = useMemo(
    () => whatsAppHref(acquisition && reference ? withReferenceLine(opts.message, reference) : opts.message),
    [acquisition, opts.message, reference],
  )

  function onClick() {
    // Existing-order/account support should remain reachable via WhatsApp, but
    // it must not create a new acquisition reference or Contact conversion.
    if (!acquisition) return
    if (!reference) return
    if (sent.current) return
    sent.current = true

    const path = typeof window !== 'undefined' ? window.location.pathname : ''

    trackContactEvent({
      channel: 'whatsapp',
      path,
      productId: opts.productId,
      variantId: opts.variantId,
      whatsappReference: reference,
    })

    sendWhatsAppEnquiry({
      reference,
      pageUrl: typeof window !== 'undefined' ? window.location.href : path,
      pageContext: opts.pageContext,
      productId: opts.productId,
      variantId: opts.variantId,
      productName: opts.productName,
    })
  }

  return { href, onClick }
}
