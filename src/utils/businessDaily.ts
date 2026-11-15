// src/utils/businessDaily.ts
//
// Admin -> Business "Orders day by day" (Run 9): for each UK day in the period,
// orders PLACED that day (split by where they stand now) and orders DELIVERED
// that day. Counts of real, non-test orders only; order value is the agreed
// order total, not cash received and not profit.

export interface DayOrders { day: string; placed: number; stillGoing: number; cancelled: number; delivered: number }

const ukDay = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))

/** Every UK day from `fromDay` to `toDay` inclusive, 'YYYY-MM-DD'. */
export function dayRange(fromDay: string, toDay: string): string[] {
  const out: string[] = []
  let t = Date.parse(`${fromDay}T12:00:00Z`)
  const end = Date.parse(`${toDay}T12:00:00Z`)
  while (t <= end && out.length < 400) { out.push(new Date(t).toISOString().slice(0, 10)); t += 86400000 }
  return out
}

export function ordersByDay(
  days: string[],
  placed: { created_at: string; status: string }[],
  delivered: { delivered_at: string | null }[],
): DayOrders[] {
  const rows = new Map(days.map(d => [d, { day: d, placed: 0, stillGoing: 0, cancelled: 0, delivered: 0 }]))
  for (const o of placed) {
    const r = rows.get(ukDay(o.created_at))
    if (!r) continue
    r.placed += 1
    if (o.status === 'cancelled') r.cancelled += 1
    else r.stillGoing += 1
  }
  for (const o of delivered) {
    if (!o.delivered_at) continue
    const r = rows.get(ukDay(o.delivered_at))
    if (r) r.delivered += 1
  }
  return days.map(d => rows.get(d)!)
}
