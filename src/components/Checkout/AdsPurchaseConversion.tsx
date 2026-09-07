'use client'
// src/components/Checkout/AdsPurchaseConversion.tsx

import { useEffect } from 'react'
import { trackAdsOrderPlaced } from '@/utils/tracking'
import { isBrowserTrackingEnabled } from '@/utils/trackingEnv'

/**
 * Fires the OPTIONAL, SECONDARY Google Ads "order placed" diagnostic
 * conversion for one order, once. Renders nothing.
 *
 * NOT A PURCHASE CONVERSION. This component and trackAdsOrderPlaced used to
 * report a live Google Ads Purchase at raw checkout submission - before any
 * order was confirmed, on a cash-on-delivery business where roughly a
 * quarter of orders never complete. That was the same overstatement Meta's
 * Purchase and GA4's purchase were both moved off this exact trigger to
 * avoid (see utils/orderConversions.ts) - Google Ads had simply never been
 * fixed to match. It now fires only if NEXT_PUBLIC_ADS_ORDER_PLACED_SEND_TO
 * names a conversion action configured for that purpose in the Ads UI, and
 * is a no-op otherwise. See utils/tracking.ts for the full history.
 *
 * ONE FIRING SITE. Previously mounted here AND on /confirm-order/[id] as a
 * cross-device backstop for a live Purchase conversion. There is no browser
 * "Purchase" left to back up: confirmed/delivered are staged in Supabase
 * (google_offline_conversions) for a separate offline-conversion import
 * instead - see docs/TRACKING_V2_EXPORT_CONTRACT.md. So this now mounts only
 * on the checkout success step, in the session that actually clicked the ad.
 *
 * WHY IT CANNOT SIMPLY FIRE ON MOUNT
 *
 * The confirm link lives in an email indefinitely. Customers re-open it to
 * check the reference, the amount, or the delivery address - days later, on a
 * different device, after a refresh, or by going back to it. Every one of
 * those is a fresh mount, and an unguarded gtag call in an effect would report
 * a new conversion each time.
 *
 * Three guards, weakest to strongest:
 *
 *   1. A module-level Set, which covers React re-renders and StrictMode's
 *      double effect invocation in development, and is the only guard left if
 *      Storage throws (Safari private mode throws rather than returning null).
 *   2. localStorage - NOT sessionStorage. A session store is cleared when the
 *      tab closes, so the second visit to a link designed to be revisited
 *      would report again. The key is derived from the order reference alone,
 *      so the two firing sites share one entry on a given device: placing the
 *      order and then opening the email on the same phone reports once,
 *      without relying on Google to deduplicate it.
 *   3. transaction_id on the event, which is what covers the case no local
 *      guard can see - the same order reported from two different devices.
 *
 * The key is claimed BEFORE the event is sent, not after, so two effects
 * running in the same tick cannot both pass the check.
 *
 * Consent is deliberately not checked. Consent Mode v2 is configured with
 * everything denied by default (utils/consentMode.ts), so gtag decides what
 * this event is allowed to be: a full conversion when consent was given, an
 * anonymous cookieless ping otherwise. Those pings are what Google's
 * conversion modelling is built from, so suppressing the call outright would
 * lose the modelled conversion as well as the observed one.
 */

const storageKey = (reference: string) => `ads_purchase_sent:${reference}`

/** Orders already reported in this document. */
const reportedThisLoad = new Set<string>()

interface Props {
  /**
   * The order's short reference - the first 8 characters of its uuid,
   * uppercased. THE canonical transaction id, and the same value the
   * server-side GA4 purchase and the Meta Conversions API report against.
   *
   * Not the full uuid. That is the access token for /confirm-order/[id] -
   * anyone holding it can confirm the order and read the customer's name,
   * total and address - and a transaction_id is transmitted to Google and
   * kept in its logs.
   */
  reference: string
  /** The database's own total_amount. Delivery inclusive, never cart state. */
  total: number
}

export default function AdsPurchaseConversion({ reference, total }: Props) {
  useEffect(() => {
    if (!isBrowserTrackingEnabled()) return
    // A total of zero is only possible if something upstream is broken, and a
    // zero-value conversion is worse than none.
    if (!reference || !Number.isFinite(total) || total <= 0) return
    if (reportedThisLoad.has(reference)) return

    const key = storageKey(reference)

    // Held in a variable rather than touched twice: if reading threw, writing
    // will throw too, and the in-memory Set is then the only guard there is.
    let store: Storage | null = null
    try {
      store = window.localStorage
      if (store.getItem(key)) return
    } catch {
      store = null
    }

    // Claim first, send second.
    reportedThisLoad.add(reference)
    try {
      store?.setItem(key, new Date().toISOString())
    } catch {
      // Nothing to do. The Set still holds for this page load.
    }

    trackAdsOrderPlaced(reference, total)
  }, [reference, total])

  return null
}
