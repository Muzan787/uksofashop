// src/utils/adminTime.ts
//
// Every time the admin shows, in UK time and Pakistan time side by side:
// "14 Oct 10:05 UK · 14 Oct 14:05 PK". The owner is in Blackburn and the team
// is in Pakistan, and a time in only one zone gets converted in somebody's
// head - which is how "I'll ring them at 3" ends up meaning two different
// hours. The server renders in UTC, so the zone is always named here rather
// than left to whatever machine draws the page.
//
// The year is added only when it isn't this year, so the usual case stays
// short enough for one line on a phone.

const ZONES = { uk: 'Europe/London', pk: 'Asia/Karachi' } as const

function formatter(timeZone: string, withYear: boolean) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' as const } : {}),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const FORMATS = {
  uk: { short: formatter(ZONES.uk, false), long: formatter(ZONES.uk, true) },
  pk: { short: formatter(ZONES.pk, false), long: formatter(ZONES.pk, true) },
}

const YEAR_UK = new Intl.DateTimeFormat('en-GB', { timeZone: ZONES.uk, year: 'numeric' })

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "14 Oct, 10:05" without the comma Intl puts between date and time. */
function tidy(text: string): string {
  return text.replace(',', '')
}

/**
 * The same moment in both zones, for layouts that put them on separate lines.
 * Null for an empty or unreadable value.
 */
export function dualTime(value: string | Date | null | undefined, now: Date = new Date()): { uk: string; pk: string } | null {
  const d = toDate(value)
  if (!d) return null
  const withYear = YEAR_UK.format(d) !== YEAR_UK.format(now)
  const style = withYear ? 'long' : 'short'
  return { uk: tidy(FORMATS.uk[style].format(d)), pk: tidy(FORMATS.pk[style].format(d)) }
}

/** "14 Oct 10:05 UK · 14 Oct 14:05 PK", or null for an empty value. */
export function dualTimeText(value: string | Date | null | undefined, now: Date = new Date()): string | null {
  const t = dualTime(value, now)
  return t ? `${t.uk} UK · ${t.pk} PK` : null
}
