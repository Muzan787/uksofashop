'use client'
// src/components/UI/AnalyticsRedaction.tsx

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Re-applies the analytics URL redaction after every client-side navigation.
 *
 * Renders nothing.
 *
 * The head snippet (utils/redactUrl.ts) sets page_location once, on the
 * document load. Those fields are STICKY - gtag keeps using them for every
 * later event - which is exactly what makes the first pageview safe, and
 * exactly what makes this component necessary. Without it, a visitor who lands
 * on /confirm-order/[id] and then browses on would have every subsequent
 * pageview reported as /confirm-order/[id], because gtag would never look at
 * the address bar again.
 *
 * Keyed on the pathname alone. useSearchParams would opt the entire root
 * layout out of static rendering, which is a real cost on every page of the
 * site to catch query-only navigations that this app does not make.
 *
 * ORDERING, AND WHAT IT DOES NOT PROMISE
 *
 * This runs in an effect, so on a client-side navigation GA4's
 * enhanced-measurement pageview may be sent from the history event before the
 * effect updates the fields. When that happens the pageview is attributed to
 * the PREVIOUS page - which is a reporting inaccuracy, not a leak, because the
 * previous value was already redacted.
 *
 * The direction that would leak - navigating INTO a sensitive URL and having
 * its real path sent before redaction is re-applied - cannot arise from a
 * client-side navigation here: every sensitive URL on this site is opened from
 * an email, which is a fresh document load, where the head snippet has already
 * run before any tag exists.
 */
export default function AnalyticsRedaction() {
  const pathname = usePathname()

  useEffect(() => {
    const w = window as Window & { __applyAnalyticsRedaction?: () => void }
    w.__applyAnalyticsRedaction?.()
  }, [pathname])

  return null
}
