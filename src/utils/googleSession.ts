/** Read only Google's real session cookie. Never substitute our UUID or the current time. */
export function googleSessionId(cookie: string | undefined, now = Date.now()): string | null {
  if (!cookie || cookie.length > 512) return null
  const match = /^GS1\.\d+\.(\d{10})(?:\.|$)/.exec(cookie)
    ?? /^GS2\.\d+\.s(\d{10})(?:\$|$)/.exec(cookie)
  const id = match?.[1]
  if (!id || Number(id) * 1000 > now || Number(id) * 1000 < now - 86400_000) return null
  return id
}

/** A real session belongs to its original GA client and must meet Google's 24-hour deadline. */
export function googlePurchaseSession(id: unknown, recordedClient: unknown, client: string, conversionTime: string, now = Date.now()): Record<string, number> {
  if (typeof id !== 'string' || !/^\d{10}$/.test(id) || recordedClient !== client) return {}
  const start = Number(id) * 1000, conversion = Date.parse(conversionTime)
  if (!Number.isFinite(conversion) || conversion < start || conversion > now || now < start || now - start > 86400_000) return {}
  return { session_id: Number(id) }
}
