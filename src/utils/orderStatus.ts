// src/utils/orderStatus.ts
//
// One reading of an order's status, shared by the account page and the
// tracking page. They had two: the tracking page's own STATUS_MAP with five
// steps and a colour per status, and the account table's `bg-gray-100` pill
// that printed the raw database word — so the same order was "Being Prepared"
// in one place and "processing" in the other.
//
// Since 31 Oct 2026 the steps are the shop's real ones: placed, confirmed,
// delivered. "Being prepared" and "Out for delivery" were retired with the
// statuses behind them; On hold sits at Confirmed with the line stopped.

import { Clock, CheckCircle, PauseCircle, XCircle, type LucideIcon } from 'lucide-react'

interface StatusConfig {
  /** What a customer is told. Not the database's word. */
  label: string
  /** One line saying what that means and what happens next. */
  note: string
  icon: LucideIcon
  /** Tailwind classes for the pill: a tint and its text colour. */
  pill: string
  /** Where this sits on the three-stage timeline. -1 means it is not on it. */
  stage: number
  /** Whether something is happening next, so the current dot pulses. */
  moving: boolean
}

export const STATUS: Record<string, StatusConfig> = {
  pending_cod: {
    label: 'Order received',
    note: 'Open the confirm link in your email or on WhatsApp, check the details and confirm it; then we ring you to arrange delivery.',
    icon: Clock,
    pill: 'bg-ember-500/12 text-ember-700',
    stage: 0,
    moving: true,
  },
  confirmed: {
    label: 'Confirmed',
    note: 'We have your order and will ring you to agree the delivery day.',
    icon: CheckCircle,
    pill: 'bg-sage-50 text-sage-700',
    stage: 1,
    moving: true,
  },
  on_hold: {
    label: 'On hold',
    note: 'Delivery is paused, as agreed. Nothing is cancelled: message us when you are ready and we will book a new day.',
    icon: PauseCircle,
    pill: 'bg-ember-500/12 text-ember-700',
    stage: 1,
    moving: false,
  },
  delivered: {
    label: 'Delivered',
    note: 'It is with you. We hope it has settled in.',
    icon: CheckCircle,
    pill: 'bg-sage-50 text-sage-700',
    stage: 2,
    moving: false,
  },
  cancelled: {
    label: 'Cancelled',
    note: 'This order was cancelled. Talk to us if that was not intended.',
    icon: XCircle,
    pill: 'bg-rust-50 text-rust-700',
    stage: -1,
    moving: false,
  },
}

/** The timeline index for a status, or -1 where it does not belong on one. */
export function stageIndex(status: string): number {
  return (STATUS[status] ?? STATUS.pending_cod).stage
}
