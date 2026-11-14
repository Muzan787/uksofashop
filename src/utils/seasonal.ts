// src/utils/seasonal.ts
//
// The 2026 Black Friday and Christmas run-up, and what the shop may truthfully
// say about it on any given UK day. Pure, so the header, the landing pages and
// the tests read the same dates.
//
// What this file will not do:
//   - It never says a sale is live. The only price reductions the shop has are
//     the visitor's own offer (SOFAEXTRA, from Admin -> Settings), which the
//     product page and checkout already show with a real countdown. A
//     separate Black Friday discount has not been announced, so the pages say
//     the DATE and point to the real offer; they never invent a saving, a
//     was-price, a stock count or a deadline of their own.
//   - It never promises Christmas delivery. Made-to-order sofas depend on the
//     style, the fabric and the postcode, so the Christmas copy asks the
//     customer to check their own date and states no cut-off.

export const BLACK_FRIDAY = '2026-11-27'
export const CYBER_MONDAY = '2026-11-30'
export const CHRISTMAS_DAY = '2026-12-25'
/** Early-season wording starts here (owner request, Saturday 14 November). */
export const SEASON_START = '2026-11-14'

export type SeasonPhase = 'run_up' | 'black_friday' | 'christmas' | 'off'

/** The UK calendar date, 'YYYY-MM-DD', whatever zone the server or browser is in. */
export function ukDateKey(now: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function seasonPhase(now: Date): SeasonPhase {
  const day = ukDateKey(now)
  if (day < SEASON_START) return 'off'
  if (day < BLACK_FRIDAY) return 'run_up'
  if (day <= CYBER_MONDAY) return 'black_friday'
  if (day <= CHRISTMAS_DAY) return 'christmas'
  return 'off'
}

/** Whole UK calendar days from `now` to `dateKey` (negative once passed). */
export function daysUntil(dateKey: string, now: Date): number {
  const a = Date.parse(`${ukDateKey(now)}T00:00:00Z`)
  const b = Date.parse(`${dateKey}T00:00:00Z`)
  return Math.round((b - a) / 86400000)
}

export interface SeasonBar {
  /** The sentence. Never a price, a percentage or a deadline of its own. */
  lead: string
  /** The link's words: an action the visitor can take now. */
  cta: string
  href: string
}

/**
 * The announcement bar's seasonal message, or null (14 Nov 2026 revision).
 *
 * The first version said only "Black Friday is 27 Nov": a date with no reason
 * to act. This one gives the reason, chosen by what is TRUE for this visitor:
 *   - `offerActive` - they hold a live SOFAEXTRA window. The countdown beside
 *     this text is the real deadline; the message sends them to see their
 *     price, which every eligible product page shows with the saving taken off.
 *   - otherwise - no offer is claimed at all; the message is about choosing
 *     the sofa in time, which is what the season really asks of a buyer of a
 *     made-to-order sofa.
 * The bar has one line at 375px, so `lead` stays short and the full detail
 * lives on the pages it links to.
 */
export function seasonBar(phase: SeasonPhase, offerActive: boolean): SeasonBar | null {
  switch (phase) {
    case 'run_up':
      return offerActive
        ? { lead: 'Your sofa offer is ready', cta: 'Check your price', href: '/shop/all' }
        : { lead: 'Get set for Black Friday', cta: 'Explore the range', href: '/shop/all' }
    case 'black_friday':
      return offerActive
        ? { lead: 'Black Friday weekend: your offer is on', cta: 'Check your price', href: '/shop/all' }
        : { lead: 'Black Friday weekend', cta: 'See how our offers work', href: '/black-friday' }
    case 'christmas':
      return { lead: 'Planning for Christmas?', cta: 'Check delivery for your sofa', href: '/christmas' }
    default:
      return null
  }
}

/** Where the seasonal landing for this phase is (the homepage band links here). */
export function seasonHref(phase: SeasonPhase): string | null {
  switch (phase) {
    case 'run_up':
    case 'black_friday': return '/black-friday'
    case 'christmas': return '/christmas'
    default: return null
  }
}

export interface SeasonStrip {
  eyebrow: string
  headline: string
  body: string
  cta: string
  href: string
}

/** The homepage strip's words for each phase. Nothing here quotes a price. */
export function seasonStrip(phase: SeasonPhase): SeasonStrip | null {
  switch (phase) {
    case 'run_up':
      return {
        eyebrow: 'Black Friday is Friday 27 November',
        headline: 'See what is genuinely on before the weekend.',
        body: 'Our offers are the ones shown on each sofa, with a real countdown that never restarts. We will not post a was-price we have not charged.',
        cta: 'How the offers work', href: '/black-friday',
      }
    case 'black_friday':
      return {
        eyebrow: 'Black Friday weekend · Cyber Monday 30 November',
        headline: 'The offer on each sofa is the one you can use.',
        body: 'The saving, the price you pay and the deadline are shown on the sofa itself. Pay on delivery, free delivery to most of the UK.',
        cta: 'See how it works', href: '/black-friday',
      }
    case 'christmas':
      return {
        eyebrow: 'Christmas',
        headline: 'Want it before Christmas? Check your date first.',
        body: 'Made-to-order sofas are built after you order, so timing depends on the style, the fabric and your postcode. Tell us what you want and we will say honestly whether it can arrive in time.',
        cta: 'Christmas delivery', href: '/christmas',
      }
    default:
      return null
  }
}

/** A delivery day is Tuesday to Sunday; Monday has none (constants/promises). */
export function isDeliveryDay(dateKey: string): boolean {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay() !== 1
}
