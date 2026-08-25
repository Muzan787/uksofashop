// src/utils/phone.ts
//
// One place that understands UK phone numbers.
//
// The WhatsApp links in src/utils/email.ts and the admin orders page build
// wa.me URLs, which need a bare international number (447476616022 - no plus,
// no spaces). The previous inline version had a real bug: a number already
// entered as "+447476616022" didn't start with "0", and didn't start with "44"
// either because of the leading plus, so it fell through to the last branch and
// became "44+447476616022" - a dead link, silently.

/** Digits only, with a leading + preserved if the user typed one. */
function tidy(input: string): string {
  const trimmed = (input || '').trim()
  const digits = trimmed.replace(/[^\d]/g, '')
  return trimmed.startsWith('+') ? `+${digits}` : digits
}

/**
 * Convert any way a customer might type a UK mobile into the bare
 * international form wa.me expects. Returns null if it isn't a valid UK mobile.
 *
 *   07476 616022    -> 447476616022
 *   +44 7476 616022 -> 447476616022
 *   447476616022    -> 447476616022
 *   0044 7476616022 -> 447476616022
 */
export function normaliseUkMobile(input: string): string | null {
  let n = tidy(input)

  if (n.startsWith('+')) n = n.slice(1)
  if (n.startsWith('0044')) n = n.slice(2)
  else if (n.startsWith('44')) { /* already international */ }
  else if (n.startsWith('0')) n = `44${n.slice(1)}`
  else if (n.startsWith('7') && n.length === 10) n = `44${n}`

  // UK mobiles are 07x xxx xxxx, where the digit after 7 is 1-9.
  // 070x is personal numbering rather than a mobile, so it's excluded.
  return /^447[1-9]\d{8}$/.test(n) ? n : null
}

export function isValidUkMobile(input: string): boolean {
  return normaliseUkMobile(input) !== null
}

/** 447476616022 -> 07476 616022, for reading back to a human. */
export function formatUkMobile(input: string): string {
  const n = normaliseUkMobile(input)
  if (!n) return input
  const local = `0${n.slice(2)}`
  return `${local.slice(0, 5)} ${local.slice(5)}`
}

/**
 * wa.me link for a UK mobile, or null when the number isn't one - so callers
 * can hide the button rather than render a link that goes nowhere.
 */
export function whatsAppLink(input: string, message?: string): string | null {
  const n = normaliseUkMobile(input)
  if (!n) return null
  return message
    ? `https://wa.me/${n}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${n}`
}

export const UK_MOBILE_ERROR =
  'Please enter a UK mobile number, for example 07700 900123.'
