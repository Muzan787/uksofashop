// src/utils/wallClock.ts
//
// A date and time read off somebody's screen, in the zone that screen shows,
// as the moment it names. The team reads WhatsApp in Pakistan time and the
// customer quotes UK time, so the zone is always said, never assumed.
//
// Intl rather than a fixed +05/+01 offset, so Europe/London keeps working
// across BST and GMT. (actions/manual-order.ts has its own copy for the
// older 12-hour contact-time fields; its tests load that file in isolation.)

export const WALL_CLOCK_ZONES = ['Asia/Karachi', 'Europe/London'] as const
export type WallClockZone = (typeof WALL_CLOCK_ZONES)[number]

/** "2026-11-01" + "14:05" in `zone`, as a Date; null when unreadable. */
export function wallClockToUtc(date: string, time: string, zone: WallClockZone): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const t = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!d || !t) return null
  const [year, month, day, hour, minute] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])]
  if (hour > 23 || minute > 59) return null

  const desired = Date.UTC(year, month - 1, day, hour, minute, 0)
  if (Number.isNaN(desired)) return null
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })

  // Two passes are enough to converge across normal offsets and DST.
  let guess = desired
  for (let i = 0; i < 2; i += 1) {
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(guess)).filter(p => p.type !== 'literal').map(p => [p.type, p.value]),
    )
    const seenAsUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), 0,
    )
    guess -= seenAsUtc - desired
  }
  const result = new Date(guess)
  return Number.isNaN(result.getTime()) ? null : result
}

/** The other way: a moment as { date, time } on a clock in `zone`. */
export function utcToWallClock(value: string | Date, zone: WallClockZone): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(value)).filter(p => p.type !== 'literal').map(p => [p.type, p.value]),
  )
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}
