'use client'
// src/components/Checkout/OrderOnWhatsApp.tsx
//
// The way out of the checkout form.
//
// Four people reached the delivery form and left without ordering. The form
// is six required fields, a postcode lookup and a "Place Order" button that
// stays grey until the postcode resolves — reasonable for someone who wants
// to type, and a wall for someone who came from a WhatsApp ad and expected
// to talk. Every real sale this shop has made was closed in a chat, so the
// chat has to be offered here, in the checkout itself, with the basket
// already written into the first message.
//
// One component, three sizes, so the cart step, the top of the form and the
// foot of the form can each offer the same door at the weight that suits
// where it stands. The message is built here too, from the basket the
// customer is looking at, so the shop reads "I want to buy the Roma Recliner
// 3 Seater (Grey)" rather than "Hi".

import { ArrowRight } from 'lucide-react'
import WhatsAppIcon from '@/components/Product/WhatsAppIcon'
import { useWhatsAppCTA } from '@/utils/attribution/useWhatsAppCTA'
import type { DisplayCartItem } from '@/context/CartContext'
import { deliveryBreakdown, NO_EXTRAS, type DeliveryOptions } from '@/constants/delivery'
import { describeBuild } from '@/types/build'
import { isValidUkPostcode, normalisePostcode } from '@/utils/postcode'

/** Whole pounds read as whole pounds; anything else gets its pence. */
function pounds(amount: number): string {
  return Number.isInteger(amount)
    ? `£${amount.toLocaleString('en-GB')}`
    : `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** "Roma Recliner 3 Seater (Grey · R123)" — the line as the shop needs to read it. */
function describe(item: DisplayCartItem): string {
  const specification = [
    item.fabric_label?.trim() || item.color?.trim() || '',
    item.fabric_code?.trim() || '',
    // Everything /build recorded, so the chat opens with the whole sofa.
    ...describeBuild(item.build).map(line => `${line.label}: ${line.value}`),
  ].filter(Boolean).join(' · ')
  return specification ? `${item.title} (${specification})` : item.title
}

export interface OrderMessageContext {
  /** The product total the customer has seen, after any online offer. */
  total: number
  /** Whether that total already has an offer taken off it. */
  discounted?: boolean
  /** Whatever is in the postcode field, if the customer got that far. */
  postcode?: string
  /** Delivery extras ticked on the form, if any. */
  extras?: DeliveryOptions
}

/**
 * The first message of the chat.
 *
 * One item reads as a sentence, because that is how a person would say it.
 * More than one becomes a list. The website price follows so the shop knows
 * what the customer was looking at, and anything the customer had already
 * typed into the form — a postcode, a floor, assembly — comes along rather
 * than being asked for again.
 */
export function whatsAppOrderMessage(items: DisplayCartItem[], ctx: OrderMessageContext): string {
  const lines: string[] = []

  if (items.length === 1) {
    const [item] = items
    lines.push(
      item.quantity === 1
        ? `Hi, I want to buy the ${describe(item)}.`
        : `Hi, I want to buy ${item.quantity} x ${describe(item)}.`,
    )
  } else {
    lines.push('Hi, I want to buy:')
    for (const item of items) lines.push(`- ${describe(item)} x ${item.quantity}`)
  }

  lines.push('')
  lines.push(
    `Website ${items.length === 1 && items[0].quantity === 1 ? 'price' : 'total'}: ${pounds(ctx.total)}${
      ctx.discounted ? ' (online offer applied)' : ''
    }`,
  )

  if (ctx.postcode && isValidUkPostcode(ctx.postcode)) {
    lines.push(`Postcode: ${normalisePostcode(ctx.postcode)}`)
  }

  const extras = deliveryBreakdown(ctx.extras ?? NO_EXTRAS).lines
    .map(line => `${line.label}${line.detail ? ` (${line.detail})` : ''}`)
  if (extras.length > 0) lines.push(`Delivery extras: ${extras.join(', ')}`)

  return lines.join('\n')
}

interface Props extends OrderMessageContext {
  items: DisplayCartItem[]
  /** Which step of the checkout this stands on — recorded against the enquiry. */
  pageContext: string
  /**
   * `panel`  — a card with a heading, a line of reassurance and the button.
   * `button` — the button alone, full width, for standing beside another.
   * `link`   — one line of text, for the foot of the form.
   */
  variant: 'panel' | 'button' | 'link'
  className?: string
}

export default function OrderOnWhatsApp({
  items, pageContext, variant, className = '', ...ctx
}: Props) {
  // A single-line basket is a product enquiry with extra steps, and the
  // enquiry row should say which product. A mixed basket has no one answer.
  const only = items.length === 1 ? items[0] : null

  const cta = useWhatsAppCTA({
    message: whatsAppOrderMessage(items, ctx),
    pageContext,
    variantId: only?.variant_id,
    productName: only?.title,
  })

  if (variant === 'link') {
    // Two lines on purpose: the question and the link each fit a 375px
    // screen whole, where one long link wrapped with its icon and arrow
    // pushed to opposite edges.
    return (
      <div className={`text-center ${className}`}>
        <p className="m-0 text-caption text-ink-500">Rather not fill this in?</p>
        <a
          href={cta.href}
          onClick={cta.onClick}
          target="_blank"
          rel="noopener noreferrer"
          className="hover-link inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold text-whatsapp-dark no-underline"
        >
          <WhatsAppIcon className="h-4 w-4 shrink-0" />
          Order on WhatsApp instead
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        </a>
      </div>
    )
  }

  const button = (
    <a
      href={cta.href}
      onClick={cta.onClick}
      target="_blank"
      rel="noopener noreferrer"
      className={`hover-btn btn-whatsapp shadow-whatsapp flex min-h-14 w-full items-center justify-center gap-3 rounded-pill bg-whatsapp px-5 text-center font-data text-eyebrow font-bold uppercase tracking-[0.08em] text-ink-900 no-underline ${
        variant === 'button' ? className : ''
      }`}
    >
      <WhatsAppIcon className="h-5 w-5 shrink-0" />
      Order on WhatsApp
    </a>
  )

  if (variant === 'button') return button

  return (
    <div className={`rounded-md border border-whatsapp/40 bg-whatsapp/[0.08] p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-whatsapp text-ink-900">
          <WhatsAppIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-body font-bold leading-snug text-ink-900">
            Prefer to skip the form? Order on WhatsApp instead
          </p>
          <p className="m-0 mt-1 text-caption leading-relaxed text-ink-500">
            One tap sends us your basket. We confirm the details and delivery with you in the
            chat — and you still pay nothing until your sofa arrives.
          </p>
        </div>
      </div>
      <div className="mt-4">{button}</div>
    </div>
  )
}
