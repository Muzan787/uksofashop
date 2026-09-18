'use client'

import { useEffect } from 'react'

type CheckoutStep = 'cart' | 'delivery' | 'success'
type CheckoutField = 'name' | 'email' | 'phone' | 'postcode' | 'address' | 'special_instructions'
type TelemetryAction =
  | 'checkout_step_viewed'
  | 'checkout_field_started'
  | 'checkout_field_completed'
  | 'checkout_validation_error'
  | 'postcode_lookup_attempt'
  | 'postcode_lookup_result'
  | 'address_results_returned'
  | 'address_selected'
  | 'delivery_extra_toggled'
  | 'offer_code_attempt'
  | 'offer_code_result'
  | 'place_order_clicked'
  | 'place_order_failed'
  | 'checkout_back_to_cart'
  | 'checkout_quote_whatsapp_click'
  | 'checkout_exit'

type Meta = {
  step?: CheckoutStep
  field?: CheckoutField
  error_code?: 'required' | 'invalid_format' | 'invalid_mobile' | 'invalid_postcode' | 'address_missing' | 'delivery_unavailable' | 'server_error' | 'unknown'
  attempt?: number
  outcome?: 'submitted' | 'mainland_success' | 'custom_quote' | 'invalid' | 'not_found' | 'network_error' | 'available' | 'selected' | 'valid' | 'success' | 'error'
  extra?: 'upstairs' | 'lift' | 'assembly' | 'sofa_removal'
  enabled?: boolean
}

const fieldMap: Record<string, CheckoutField> = {
  customerName: 'name',
  customerEmail: 'email',
  customerPhone: 'phone',
  postcode: 'postcode',
  shippingAddress: 'address',
  specialInstructions: 'special_instructions',
}

function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes)
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function isProductionHost(): boolean {
  return location.hostname === 'uksofashop.co.uk' || location.hostname === 'www.uksofashop.co.uk'
}

function detectStep(): CheckoutStep {
  const body = document.body.textContent ?? ''
  if (/ORDER CONFIRMED/i.test(body)) return 'success'
  if (document.querySelector('[name="customerName"]')) return 'delivery'
  return 'cart'
}

function errorCode(field: CheckoutField, text: string): Meta['error_code'] {
  const lower = text.toLowerCase()
  if (lower.includes('required') || lower.includes('please enter')) {
    if (field === 'postcode') return lower.includes('valid') ? 'invalid_postcode' : 'required'
    if (field === 'address') return 'address_missing'
    if (field === 'email') return 'invalid_format'
    if (field === 'phone') return 'invalid_mobile'
    return 'required'
  }
  if (field === 'postcode') return 'invalid_postcode'
  if (field === 'email') return 'invalid_format'
  if (field === 'phone') return 'invalid_mobile'
  if (field === 'address') return 'address_missing'
  return 'unknown'
}

function checkboxKind(input: HTMLInputElement): Meta['extra'] | null {
  const label = input.closest('label')?.textContent?.toLowerCase() ?? ''
  if (label.includes('upstairs delivery')) return 'upstairs'
  if (label.includes("there's a lift") || label.includes('there’s a lift')) return 'lift'
  if (label.includes('assembly')) return 'assembly'
  if (label.includes('old sofa removal')) return 'sofa_removal'
  return null
}

export default function CheckoutTelemetry() {
  useEffect(() => {
    if (!isProductionHost()) return

    const once = new Set<string>()
    const activeErrors = new Set<string>()
    let postcodeAttempt = 0
    let postcodeResultAttempt = 0
    let addressResultAttempt = 0
    let offerAttempt = 0
    let offerResultAttempt = 0
    let placeOrderAttempt = 0
    let placeOrderFailureAttempt = 0
    let currentStep = detectStep()
    let scanQueued = false

    const transmit = (action: TelemetryAction, metadata: Meta = {}, retry = true) => {
      const actionId = newId()
      const payload = JSON.stringify({ action, actionId, metadata })
      const write = () => {
        try {
          void fetch('/api/checkout/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            body: payload,
          }).catch(() => {})
        } catch {
          // Telemetry must never interrupt checkout.
        }
      }
      write()
      if (retry) window.setTimeout(write, 750)
    }

    const transmitOnce = (key: string, action: TelemetryAction, metadata: Meta = {}) => {
      if (once.has(key)) return
      once.add(key)
      transmit(action, metadata)
    }

    const recordStep = () => {
      const next = detectStep()
      currentStep = next
      transmitOnce(`step:${next}`, 'checkout_step_viewed', { step: next })
    }

    const scan = () => {
      scanQueued = false
      recordStep()

      // Validation errors are reported by field name + safe category only.
      const invalid = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[aria-invalid="true"][name]'))
      const nowInvalid = new Set<string>()
      for (const el of invalid) {
        const field = fieldMap[el.name]
        if (!field) continue
        nowInvalid.add(el.name)
        if (!activeErrors.has(el.name)) {
          const described = el.getAttribute('aria-describedby')
          const message = described ? document.getElementById(described)?.textContent ?? '' : ''
          transmit('checkout_validation_error', { field, error_code: errorCode(field, message) })
        }
      }
      for (const name of Array.from(activeErrors)) if (!nowInvalid.has(name)) activeErrors.delete(name)
      for (const name of nowInvalid) activeErrors.add(name)

      const body = document.body.textContent ?? ''
      if (postcodeAttempt > postcodeResultAttempt) {
        let outcome: Meta['outcome'] | null = null
        if (/FREE UK Mainland delivery to/i.test(body)) outcome = 'mainland_success'
        else if (/custom delivery quote|confirm delivery first/i.test(body)) outcome = 'custom_quote'
        else if (document.querySelector('[name="postcode"][aria-invalid="true"]')) outcome = 'invalid'
        if (outcome) {
          postcodeResultAttempt = postcodeAttempt
          transmit('postcode_lookup_result', { attempt: postcodeAttempt, outcome })
        }
      }

      if (postcodeAttempt > addressResultAttempt) {
        const selectAddress = Array.from(document.querySelectorAll('button')).some(button =>
          /select your address/i.test(button.textContent ?? ''),
        )
        if (selectAddress) {
          addressResultAttempt = postcodeAttempt
          transmit('address_results_returned', { attempt: postcodeAttempt, outcome: 'available' })
        }
      }

      if (offerAttempt > offerResultAttempt) {
        if (/offer code not recognised/i.test(body)) {
          offerResultAttempt = offerAttempt
          transmit('offer_code_result', { attempt: offerAttempt, outcome: 'invalid' })
        } else if (/online offer applied|offer applied/i.test(body)) {
          offerResultAttempt = offerAttempt
          transmit('offer_code_result', { attempt: offerAttempt, outcome: 'valid' })
        }
      }

      if (placeOrderAttempt > placeOrderFailureAttempt && currentStep === 'delivery') {
        const serverError = Array.from(document.querySelectorAll('div')).some(div => {
          const text = div.textContent?.trim() ?? ''
          return text.length > 0 && text.length < 300 && /could not confirm delivery|try again|unable to place|something went wrong/i.test(text)
        })
        if (serverError) {
          placeOrderFailureAttempt = placeOrderAttempt
          transmit('place_order_failed', { attempt: placeOrderAttempt, error_code: 'server_error', outcome: 'error' })
        }
      }
    }

    const queueScan = () => {
      if (scanQueued) return
      scanQueued = true
      window.requestAnimationFrame(scan)
    }

    const onFocusIn = (event: FocusEvent) => {
      const el = event.target
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return
      const field = fieldMap[el.name]
      if (!field) return
      transmitOnce(`field-start:${field}`, 'checkout_field_started', { field })
    }

    const onFocusOut = (event: FocusEvent) => {
      const el = event.target
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return
      const field = fieldMap[el.name]
      if (!field) return
      if (el.value.trim().length > 0) transmitOnce(`field-complete:${field}`, 'checkout_field_completed', { field })
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest('button')
      const anchor = target.closest('a')
      const text = (button?.textContent ?? anchor?.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

      if (button && /^find(?: address)?$/.test(text)) {
        postcodeAttempt += 1
        transmit('postcode_lookup_attempt', { attempt: postcodeAttempt, outcome: 'submitted' })
        return
      }
      if (button && /^apply$/.test(text)) {
        offerAttempt += 1
        transmit('offer_code_attempt', { attempt: offerAttempt, outcome: 'submitted' })
        return
      }
      if (button && /place order/.test(text)) {
        placeOrderAttempt += 1
        transmit('place_order_clicked', { attempt: placeOrderAttempt, outcome: 'submitted' })
        return
      }
      if (button && /back to cart/.test(text)) {
        transmit('checkout_back_to_cart', { step: currentStep })
        return
      }
      if (anchor && /delivery quote on whatsapp/.test(text)) {
        transmit('checkout_quote_whatsapp_click', { step: currentStep })
        return
      }

      // Address result buttons live inside the checkout's scrollable results list.
      if (button && button.parentElement?.className.includes('overflow-y-auto') && button.parentElement.className.includes('max-h-60')) {
        transmit('address_selected', { outcome: 'selected' })
      }
    }

    const onChange = (event: Event) => {
      const el = event.target
      if (!(el instanceof HTMLInputElement) || el.type !== 'checkbox') return
      const extra = checkboxKind(el)
      if (!extra) return
      transmit('delivery_extra_toggled', { extra, enabled: el.checked })
    }

    const onPageHide = () => {
      transmit('checkout_exit', { step: currentStep }, false)
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('click', onClick)
    document.addEventListener('change', onChange)
    window.addEventListener('pagehide', onPageHide)

    const observer = new MutationObserver(queueScan)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-invalid'] })
    recordStep()

    return () => {
      observer.disconnect()
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('click', onClick)
      document.removeEventListener('change', onChange)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  return null
}
