// src/utils/journeyCharts.ts
//
// Shapes and the "biggest observed loss" rule for Admin -> Journeys. Pure, so
// the page and the tests use the same arithmetic.

export interface DailyRow {
  day: string
  sessions: number; product: number; added: number; cart: number; delivery: number
  typed: number; place: number; saved: number; whatsapp: number; confirmed: number
}

export interface JourneyOutcomes {
  reached_delivery: number
  placed_order: number
  switched_to_whatsapp: number
  whatsapp_then_confirmed: number
  typed_then_stopped: number
  left_untouched: number
  form_error: number
}

export interface Loss { key: string; lost: number; title: string; detail: string }

/**
 * The transition that lost the most sessions, in sessions (not percent), among
 * the steps staff can act on. WhatsApp switch-outs at the delivery step are
 * NOT counted as lost: they are a working way to order.
 */
export function biggestLoss(t: Record<string, number | undefined>): Loss | null {
  const n = (k: string) => Number(t[k] ?? 0)
  const candidates: Loss[] = [
    {
      key: 'product_to_basket',
      lost: Math.max(0, n('product_sessions') - n('added_sessions')),
      title: `${(n('product_sessions') - n('added_sessions')).toLocaleString('en-GB')} product viewers did not add anything to the basket.`,
      detail: 'Usual for browsing; look at the most viewed products on Website to see which ones convert least.',
    },
    {
      key: 'basket_to_delivery',
      lost: Math.max(0, n('cart_sessions') - n('cart_then_delivery')),
      title: `${(n('cart_sessions') - n('cart_then_delivery')).toLocaleString('en-GB')} sessions opened the basket but did not reach delivery details.`,
      detail: 'Often a price or delivery check. Compare devices below before changing anything.',
    },
    {
      key: 'delivery_untouched',
      lost: n('delivery_left_untouched'),
      title: `${n('delivery_left_untouched').toLocaleString('en-GB')} sessions reached delivery details and left without typing or WhatsApp.`,
      detail: 'This is the step the 14 Nov phone change targets.',
    },
  ]
  // Browsing loss is expected and huge; only call it the biggest when nothing
  // later in the journey has data.
  const actionable = candidates.slice(1).filter(c => c.lost > 0).sort((a, b) => b.lost - a.lost)
  if (actionable.length) return actionable[0]
  return candidates[0].lost > 0 ? candidates[0] : null
}
