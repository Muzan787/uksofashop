// src/utils/redactUrl.ts
//
// Keeps identifiers out of what the analytics tags report as the page.
//
// THE PROBLEM
//
// Several URLs on this site carry a credential in the path or the query
// string, because that credential IS the access control - there is no login on
// any of them:
//
//   /confirm-order/<uuid>          the uuid confirms the order and reads the
//                                  customer's name, total and address
//   /review?token=<signed>         posts a review as that customer
//   /newsletter/confirm?token=     confirms that subscriber
//   /newsletter/unsubscribe?token= unsubscribes them
//   /track-order?ref=&postcode=    the pair is the tracking lookup credential,
//                                  and a postcode is personal data by itself
//
// GA4's automatic page_view sends `page_location` straight from
// document.location, so every one of those was being transmitted to Google and
// shown in the Pages report - where it is readable by anyone with access to
// the property, and retained under Google's retention policy rather than ours.
// `page_referrer` leaks the same values one navigation later.
//
// THE APPROACH
//
// Override, rather than suppress. `gtag('set', {...})` writes global fields
// that every later event inherits, and gtag prefers them over reading
// document.location itself. Setting page_location BEFORE the first `config`
// means the automatic pageview, the enhanced-measurement pageviews that fire
// on history changes, and every e-commerce event all carry the redacted value
// - without disabling any of them, and without a manual pageview
// implementation that would have to be kept correct forever.
//
// The page is still reported, as /confirm-order/[id]. It is one row per route
// instead of one row per order, which is what a Pages report should have been
// showing in the first place.
//
// Redaction is a denylist, not an allowlist, so gclid, utm_* and the search
// page's q are untouched and attribution still works.

/** A canonical uuid, as it appears in a path segment. */
export const UUID_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

/**
 * Query parameters whose VALUE is a credential or personal data.
 *
 * The key is kept and the value replaced, so the reports still show that a
 * tokenised link was used without showing which one.
 *
 * `q` is deliberately absent - site search terms are wanted in GA4. So are
 * gclid and every utm_*, which is why this is a denylist.
 */
export const SENSITIVE_PARAMS = ['token', 'ref', 'code', 'postcode', 'email']

/**
 * Does this URL carry something that must not reach an analytics vendor?
 *
 * Takes a path with its query string, as `location.pathname + location.search`
 * gives it. Used to decide whether the Meta Pixel may run at all: unlike gtag
 * it has no field-override mechanism, and sends the document URL and referrer
 * on every request it makes.
 */
export function isSensitiveUrl(pathAndQuery: string): boolean {
  if (new RegExp(UUID_PATTERN, 'i').test(pathAndQuery)) return true

  const query = pathAndQuery.split('?')[1]
  if (!query) return false

  const params = new URLSearchParams(query)
  return SENSITIVE_PARAMS.some(name => params.has(name))
}

/**
 * Installs the redaction and applies it, as a plain inline <script>.
 *
 * IT HAS TO BE IN THE HEAD, and ahead of gtag.js. `gtag('set', ...)` only
 * governs the events queued after it, so a redaction that lands after the
 * first `config` has already sent its pageview with the real URL in it. Being
 * inline and synchronous is what makes the ordering a fact rather than a
 * scheduling hope - the same reason the Consent Mode defaults ship this way.
 *
 * It also publishes __applyAnalyticsRedaction so client-side navigations can
 * re-run it (components/UI/AnalyticsRedaction.tsx). The values set here are
 * sticky: without that, every pageview after the first would keep reporting
 * whichever page the visitor happened to land on.
 *
 * Written as a string rather than imported because nothing about it needs
 * React, and it must run before React exists on the page. The two patterns are
 * interpolated from the constants above so there is still only one definition
 * of what counts as sensitive.
 */
export const ANALYTICS_REDACTION_SNIPPET = `
(function () {
  var UUID = /${UUID_PATTERN}/gi;
  var STRIP = ${JSON.stringify(SENSITIVE_PARAMS)};

  function clean(href) {
    if (!href) return null;
    try {
      var u = new URL(href, window.location.origin);
      u.pathname = u.pathname.replace(UUID, '[id]');
      for (var i = 0; i < STRIP.length; i++) {
        if (u.searchParams.has(STRIP[i])) u.searchParams.set(STRIP[i], 'redacted');
      }
      return u;
    } catch (e) {
      // An unparseable URL must not be forwarded on the chance it is clean.
      return null;
    }
  }

  function apply() {
    var here = clean(window.location.href);
    if (!here) return;

    var fields = {
      page_location: here.toString(),
      page_path: here.pathname + here.search
    };

    // Only when there is one. Setting page_referrer to '' would overwrite a
    // referrer gtag could otherwise work out for itself.
    var ref = clean(document.referrer);
    if (ref) fields.page_referrer = ref.toString();

    gtag('set', fields);
  }

  window.__applyAnalyticsRedaction = apply;
  apply();
})();
`.trim()
