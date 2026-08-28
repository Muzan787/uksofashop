// src/utils/orderStatus.ts
//
// One reading of an order's status, shared by the account page and the
// tracking page. They had two: the tracking page's own STATUS_MAP with five
// steps and a colour per status, and the account table's `bg-gray-100` pill
// that printed the raw database word — so the same order was "Being Prepared"
// in one place and "processing" in the other.

import { Clock, Package, Truck, CheckCircle, XCircle, type LucideIcon } from 'lucide-react'

export interface StatusConfig {
  /** What a customer is told. Not the database's word. */
  label: string
  /** One line saying what that means and what happens next. */
  note: string
  icon: LucideIcon
  /** Tailwind classes for the pill: a tint and its text colour. */
  pill: string
  /** Where this sits on the four-stage timeline. -1 means it is not on it. */
  stage: number
}

export const STATUS: Record<string, StatusConfig> = {
  pending_cod: {
    label: 'Awaiting your confirmation',
    note: 'Check your email and confirm the order, and we will start preparing it.',
    icon: Clock,
    pill: 'bg-ember-500/12 text-ember-700',
    stage: -1,
  },
  confirmed: {
    label: 'Confirmed',
    note: 'We have your order and it is queued for preparation.',
    icon: CheckCircle,
    pill: 'bg-sage-50 text-sage-700',
    stage: 0,
  },
  processing: {
    label: 'Being prepared',
    note: 'Your sofa is being checked over and wrapped for the journey.',
    icon: Package,
    pill: 'bg-indigo-50 text-indigo-700',
    stage: 1,
  },
  shipped: {
    label: 'Out for delivery',
    note: 'It is on its way. The driver will call before arriving.',
    icon: Truck,
    pill: 'bg-indigo-50 text-indigo-700',
    stage: 2,
  },
  delivered: {
    label: 'Delivered',
    note: 'It is with you. We hope it has settled in.',
    icon: CheckCircle,
    pill: 'bg-sage-50 text-sage-700',
    stage: 3,
  },
  cancelled: {
    label: 'Cancelled',
    note: 'This order was cancelled. Talk to us if that was not intended.',
    icon: XCircle,
    pill: 'bg-rust-50 text-rust-700',
    stage: -1,
  },
}

/** The timeline index for a status, or -1 where it does not belong on one. */
export function stageIndex(status: string): number {
  return (STATUS[status] ?? STATUS.pending_cod).stage
}
