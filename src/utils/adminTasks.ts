// src/utils/adminTasks.ts
//
// Home's "Needs doing" queue: the things a person should act on today, most
// urgent first, each saying what it is, why, and where to do it. A task with
// nothing to do is simply absent, and a count that could not be loaded is
// shown as unknown rather than as zero.
//
// Rules:
//   - Eligible Meta events come first when one is close to Meta's 7-day limit,
//     because that deadline cannot be recovered.
//   - "Overdue" means the CUSTOMER'S OWN requested date has passed and the
//     order is still not delivered. A date in the future is never a warning.
//   - A provider import is "unverified" until the provider says otherwise; a
//     staged or Sheet-synced row is not an accepted one.

export type TaskTone = 'urgent' | 'attention' | 'info'

export interface AdminTask {
  key: string
  tone: TaskTone
  title: string
  detail: string
  href: string
  count: number | null
}

export interface TaskInput {
  /** Orders waiting for the customer to confirm. */
  waitingToConfirm: number | null
  /** Oldest unconfirmed order's age in days. */
  oldestWaitingDays: number | null
  /** Meta events that are eligible to send right now. */
  metaEligible: number | null
  /** Hours until the soonest eligible event passes Meta's 7-day limit. */
  metaSoonestHours: number | null
  /** Orders whose own requested delivery date has passed and are not delivered or cancelled. */
  overdueDeliveries: number | null
  /** Google offline rows in the sheet whose Google Ads import is still not verified. */
  googleUnverified: number | null
  /** Notification emails in the last 7 days that did not send. */
  failedEmails: number | null
  /** Baskets waiting for a reminder. */
  leadsWaiting: number | null
  /** Open orders whose advert source is missing or contradictory (utils/sourceReview.ts). */
  sourceReview?: number | null
}

const unit = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function buildTasks(input: TaskInput): AdminTask[] {
  const out: AdminTask[] = []

  if (input.metaEligible === null) {
    out.push({
      key: 'meta', tone: 'attention', title: 'Meta events could not be checked',
      detail: 'Open Admin → Meta to see which sales are ready to send.', href: '/admin/meta?queue=eligible', count: null,
    })
  } else if (input.metaEligible > 0) {
    const hrs = input.metaSoonestHours
    const soon = hrs !== null && hrs <= 48
    out.push({
      key: 'meta', tone: soon ? 'urgent' : 'attention',
      title: `${unit(input.metaEligible, 'sale is', 'sales are')} ready to send to Meta`,
      detail: hrs === null ? 'Consent is recorded and each is inside Meta’s 7-day limit.'
        : soon ? `The soonest runs out in ${Math.max(1, Math.floor(hrs))} h and cannot be sent after that.`
        : `The soonest has ${Math.floor(hrs / 24)} days left before Meta refuses it.`,
      href: '/admin/meta?queue=eligible', count: input.metaEligible,
    })
  }

  if (input.waitingToConfirm !== null && input.waitingToConfirm > 0) {
    const days = input.oldestWaitingDays
    out.push({
      key: 'confirm', tone: days !== null && days >= 3 ? 'urgent' : 'attention',
      title: `${unit(input.waitingToConfirm, 'order is', 'orders are')} waiting for the customer to confirm`,
      detail: days !== null ? `The oldest has been waiting ${days} ${days === 1 ? 'day' : 'days'}. Ring or message them.` : 'Ring or message them.',
      href: '/admin/orders?status=pending_cod', count: input.waitingToConfirm,
    })
  }

  if (input.overdueDeliveries !== null && input.overdueDeliveries > 0) {
    out.push({
      key: 'overdue', tone: 'urgent',
      title: `${unit(input.overdueDeliveries, 'order is', 'orders are')} past the date the customer asked for`,
      detail: 'Only orders whose own requested date has passed are counted. A later date is never flagged.',
      href: '/admin/orders?status=attention', count: input.overdueDeliveries,
    })
  }

  if (input.failedEmails !== null && input.failedEmails > 0) {
    out.push({
      key: 'email', tone: 'urgent',
      title: `${unit(input.failedEmails, 'email', 'emails')} did not send in the last 7 days`,
      detail: 'Check Status for the provider’s reason before telling a customer it was sent.',
      href: '/admin/status', count: input.failedEmails,
    })
  }

  if (input.googleUnverified !== null && input.googleUnverified > 0) {
    out.push({
      key: 'google', tone: 'info',
      title: `${unit(input.googleUnverified, 'Google import is', 'Google imports are')} not yet verified`,
      detail: 'In the import Sheet is not the same as accepted by Google Ads. Check Goals → Uploads in Google Ads.',
      href: '/admin/google', count: input.googleUnverified,
    })
  }

  if (input.sourceReview) {
    out.push({
      key: 'source', tone: 'info',
      title: `${unit(input.sourceReview, 'order needs', 'orders need')} a source review`,
      detail: 'No advert evidence, or contradictory evidence. Ask the customer how they found us and record it.',
      href: '/admin/source-review', count: input.sourceReview,
    })
  }

  if (input.leadsWaiting !== null && input.leadsWaiting > 0) {
    out.push({
      key: 'leads', tone: 'info', title: `${unit(input.leadsWaiting, 'basket reminder', 'basket reminders')} to send`,
      detail: 'People who left items in their basket.', href: '/admin/leads?tab=reminders', count: input.leadsWaiting,
    })
  }

  const rank: Record<TaskTone, number> = { urgent: 0, attention: 1, info: 2 }
  return out.sort((a, b) => rank[a.tone] - rank[b.tone])
}
