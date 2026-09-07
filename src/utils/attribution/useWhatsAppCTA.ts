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

import { useRef, type MouseEvent } from 'react'
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
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void
}

export function useWhatsAppCTA(opts: WhatsAppCTAOptions): WhatsAppCTA {
  const acquisition = opts.acquisition !== false
  const preparedReferenceRef = useRef('')
  const preparedContextKeyRef = useRef('')
  const sentReferenceRef = useRef('')

  // Keep a normal href in the markup for accessibility/no-JS fallback. For an
  // acquisition click the handler below synchronously replaces this href with
  // the reference-bearing URL before the browser performs the anchor's default
  // navigation.
  const href = whatsAppHref(opts.message)

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    // Existing-order/account support should remain reachable via WhatsApp, but
    // it must not create a new acquisition reference or Contact conversion.
    if (!acquisition) return

    // Build this from the values in the CURRENT render at click time. Product
    // and variant selectors update these props in-place, so comparing this key
    // here avoids both effect-driven state and stale prepared references.
    const currentContextKey = [
      opts.pageContext,
      opts.productId ?? '',
      opts.variantId ?? '',
      opts.productName ?? '',
    ].join('\u0000')

    let reference = preparedReferenceRef.current
    if (!reference || preparedContextKeyRef.current !== currentContextKey) {
      reference = generateWhatsAppReference()
      preparedReferenceRef.current = reference
      preparedContextKeyRef.current = currentContextKey
    }

    // Changing the DOM href inside the click handler happens before the
    // browser's default anchor navigation. Repeated clicks in the same context
    // therefore reuse the same prepared reference, while a new product/variant
    // gets a new one without needing React state or an effect.
    event.currentTarget.href = whatsAppHref(withReferenceLine(opts.message, reference))

    // One enquiry row per prepared reference. Re-rendering or clicking the same
    // prepared CTA twice must not duplicate the acquisition beacon.
    if (sentReferenceRef.current === reference) return
    sentReferenceRef.current = reference

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
