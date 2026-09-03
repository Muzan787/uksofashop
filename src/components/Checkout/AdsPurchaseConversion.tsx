'use client'
// src/components/Checkout/AdsPurchaseConversion.tsx

import { useEffect } from 'react'
import { trackAdsPurchase } from '@/utils/tracking'

/**
 * Fires the Google Ads purchase conversion for one order, once.
 *
 * Renders nothing. It exists because both places that report an order are
 * server-rendered, and gtag lives in the browser.
 *
 * TWO FIRING SITES, ONE CONVERSION
 *
 * Mounted on the checkout success step, and again on /confirm-order/[id].
 *
 *   - Checkout success is the reliable one. It runs in the session that
 *     clicked the ad, so the _gcl cookie is present and Google can attribute
 *     the conversion to the click.
 *   - /confirm-order/[id] is the backstop. It only runs if the customer opens
 *     the confirmation email, and if they open it on another device there is
 *     no _gcl cookie there to attribute against. It catches the case where the
 *     first site never ran - a closed tab, a blocked script, a crash.
 *
 * Firing from both is deliberate, and safe, because both emit the SAME
 * `transaction_id`: the order's short reference. Google Ads discards a
 * conversion whose order id it has already recorded, so the pair counts once.
 * If the two sites ever disagree about that identifier, every order that
 * reaches both is counted twice - which is why the value is threaded through
 * this one component rather than built independently at each call site.
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

    trackAdsPurchase(reference, total)
  }, [reference, total])

  return null
}
