// src/utils/feedFetches.ts
//
// Notes each time Meta or Google fetches a product feed, so the Status page
// can say "Meta last read the catalogue 3 hours ago" - or that it has
// stopped. Anyone else opening the feed (a person, a checker) is not
// recorded. The note is written after the feed has been sent, so it never
// slows the fetch down, and a failed write is only logged.

import 'server-only'
import { after } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

/** Who is fetching, from the user agent: 'meta', 'google', or null for anyone else. */
export function feedFetcher(userAgent: string | null): 'meta' | 'google' | null {
  if (!userAgent) return null
  if (/facebookexternalhit|facebookcatalog|facebot|meta-externalagent/i.test(userAgent)) return 'meta'
  if (/google/i.test(userAgent)) return 'google'
  return null
}

export function recordFeedFetch(feed: string, request: Request): void {
  const fetcher = feedFetcher(request.headers.get('user-agent'))
  if (!fetcher) return
  after(async () => {
    try {
      const { error } = await createAdminClient().from('feed_fetches').insert({ feed, fetcher })
      if (error) throw new Error(error.message)
    } catch (err) {
      console.error(`[feeds] could not record a ${fetcher} fetch of ${feed}:`, err instanceof Error ? err.message : err)
    }
  })
}
