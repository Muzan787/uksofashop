# Tracking and conversion audit — 7 October 2026

What is measured, where each event goes, what the data proves is working, and
what is not.

Everything in the "verified" sections was checked against production — the live
site in a browser, and the live Supabase database — not read off the code. Where
I could not prove something, it says so rather than guessing.

---

## 1. The short version

**Working, proven:**

- Google Tag Manager, GA4 and Consent Mode v2 are live and correctly configured.
- The server-side conversion pipeline runs on every confirmed order. 38 Meta
  Purchase sends, 17 GA4 purchases accepted by Google, 52 offline-conversion
  rows staged.
- Consent is granted by **91.5%** of visitors — an unusually good rate, and it
  means almost all traffic is fully measurable.
- A first-party attribution layer records the entire funnel in your own
  database: 11,115 sessions and 17,724 actions, independent of any ad platform.

**Three problems, in order of cost:**

1. **GA4 may be receiving page views only.** I could not observe a single
   ecommerce event leaving the browser. Unresolved — see §6.
2. **Nothing records whether Meta accepted a conversion.** 38 "sent" rows prove
   an attempt was made, not that it landed.
3. **Google Ads has 331 clicks and no attributable sale.** The offline-conversion
   table has 52 rows and zero click IDs.

---

## 2. Architecture — three systems, not one

| System | Runs | Purpose |
|---|---|---|
| **Google** — GTM `GTM-MXQ8S66N` → GA4 `G-GTBKG6RSNF` | Browser | Behaviour, funnel, acquisition |
| **Meta** — Pixel `1613016580155004` + Conversions API | Browser + server | Ad optimisation |
| **First-party attribution** — Supabase tables | Server | Your own record, owned outright |

The third is the one most shops don't have, and here it is the most reliable of
the three — it cannot be blocked, and it is the only one that sees WhatsApp.

### Consent model

Two deliberately different approaches, both correct:

- **Google** loads on every page with Consent Mode v2 defaulted to *denied*. In
  that state it writes no cookies but still sends anonymous pings that feed
  Google's conversion modelling.
- **Meta** does not load at all until consent is granted. The Pixel has no
  cookieless mode, so loading it earlier would be transmitting personal data
  without a basis. **Verified:** `fbq` was undefined in a fresh, unconsented
  session.

The Pixel is also withheld entirely on URLs carrying an order ID, a token or a
postcode, because Meta puts the full URL into every request and offers no way to
redact it. Google is handled by URL redaction instead, so those pages stay
measured.

---

## 3. Event inventory

### Google / GA4 — pushed to the dataLayer as `ukss.*`

| Event | Fires on | Verified live |
|---|---|---|
| `page_view` | Every page, including soft navigation | ✅ |
| `view_item` | Product page | ✅ with full ecommerce payload |
| `select_item` | Product card click | ✅ |
| `view_item_list` | Product card, 50% visible for 1s | ⚠️ untestable — see §6 |
| `add_to_cart` / `remove_from_cart` | Cart changes | Code present |
| `view_cart` | Cart step | Code present |
| `begin_checkout`, `checkout_progress` | Checkout | Code present |
| `add_shipping_info` | Mainland postcode accepted | Code present |
| `order_placed` | Checkout success | Code present |
| `whatsapp_click`, `phone_click` | Contact buttons | Code present |

A verified `view_item` payload from production:

```json
{ "event": "ukss.view_item",
  "ecommerce": { "currency": "GBP", "value": 799,
    "items": [{ "item_id": "91f6502c-…", "item_name": "Verona Family Set Scattered Back",
                "price": 799, "quantity": 1 }] },
  "ukss": { "data_class": "production_real", "environment": "production",
            "consent": { "ad_storage": "denied", … } } }
```

This is a well-built event layer: validated before it is pushed, schema
versioned, consent state attached, URLs redacted, and every event deduplicated.
**The quality of what reaches GA4 depends entirely on the GTM container
forwarding it — which is configuration I cannot see from the code.**

### Meta

| Event | Where | Path |
|---|---|---|
| `PageView` | Every page after consent | Pixel |
| `ViewContent` | Product page | Pixel + CAPI mirror |
| `AddToCart` | Add to basket | Pixel + CAPI mirror |
| `InitiateCheckout` | Checkout start | Pixel + CAPI mirror |
| `Contact` | WhatsApp / phone | Pixel + CAPI mirror |
| `OrderPlaced` | Checkout success | Pixel only (custom) |
| **`Purchase`** | **Order confirmed in admin** | **Server only** |
| `OrderDelivered` | Order delivered | Server only (custom) |

Browser and server send the same `event_id`, so Meta keeps one and discards the
twin. Without that, every event arriving by both routes would count twice and
reported ROAS would double.

---

## 4. The conversion path, step by step

This is the part worth understanding, because it is unusual — and deliberately so.

**Purchase does not fire at checkout. It fires when you confirm the order in the
admin panel.**

Why: about a quarter of cash-on-delivery orders are never completed. Firing at
checkout overstated revenue by roughly a third and — worse — told Meta and Google
to optimise for *people who fill in forms*, not people who pay.

Confirmation happens within minutes, so it removes that noise without the two
costs of waiting for delivery: conversions falling outside Meta's 7-day click
window, and an ad set never reaching the ~50 weekly conversions it needs to leave
the learning phase.

```
Customer orders        →  order row created, _ga / _fbp / _fbc / IP / UA saved
        ↓
You confirm in admin   →  reportOrderConversion(orderId, 'purchase')
        ↓
   production gate     →  isServerTrackingEnabled()
        ↓
   guard column        →  purchase_event_sent_at claimed with `is null`
        ↓
   ┌────────────┬──────────────────┬─────────────────────────┐
   │ Meta CAPI  │ GA4 Measurement  │ google_offline_          │
   │ Purchase   │ Protocol         │ conversions (staged)     │
   └────────────┴──────────────────┴─────────────────────────┘
        ↓
Order delivered        →  OrderDelivered (true revenue, reporting only)
```

Three design decisions worth keeping:

- **The guard column is claimed *before* sending**, with an `is null` predicate.
  Two admins double-clicking produce one conversion, not two.
- **The production gate sits before the guard**, so an order confirmed on a test
  server sends nothing *and* leaves the column unclaimed — the same order still
  reports correctly later.
- **WhatsApp orders go as `action_source: 'chat'`**, not `website`. They have no
  browser, no `_fbp`, no URL. Sending them as website events would read to Meta
  as a broken pixel rather than a sale made elsewhere.

### What the database proves

| | Sept | Oct (to 7th) |
|---|---|---|
| Orders | 30 | 10 |
| Confirmed | 28 | 10 |
| **Purchase sent** | **28** | **10** |
| Delivered | 15 | 0 |
| Delivered event sent | 14 | — |
| Has `_ga` client ID | 25 | 9 |
| Has `_fbp` | 25 | 8 |
| **Has gclid** | **0** | **0** |
| WhatsApp orders | 17 | 5 |

Every confirmed order has fired. The pipeline is not silently skipping orders.

| Platform / event | Rows | Last |
|---|---|---|
| Meta `Purchase` | 38 | 5 Oct |
| Meta `OrderDelivered` | 14 | 5 Oct |
| GA4 `purchase` (old path) | 15 | 27 Sep — superseded, see below |
| Google offline staging `confirmed` | 37 | 5 Oct |
| Google offline staging `delivered` | 14 | 5 Oct |
| **GA4 delivery — `transport_accepted`** | **17** | **5 Oct** |

The GA4 rows stopping on 27 Sep is **not** a fault. When GTM mode was switched
on, GA4 purchases moved from `orderConversions.ts` to `googleServer.ts`. The 17
`transport_accepted` rows are the new path, and they confirm Google accepted
every one. This also proves `GA4_MEASUREMENT_ID` and `GA4_API_SECRET` are
correctly set on the server.

One gap: **15 orders delivered, 14 `OrderDelivered` sent.** One did not fire.

---

## 5. Problems, ranked

### 1. Meta acceptance is never recorded — flying blind

`sendCapiEvent` logs a rejection with `console.error` and nothing else. The
`conversion_events` row is written regardless, and the code says so plainly:
*"'sent' here means the attempt completed, not that Meta accepted it."*

So those 38 Purchase rows are consistent with everything working perfectly **and**
with the access token having expired weeks ago. There is no way to tell from the
data, and Hostinger's console logs are not retained anywhere you would see them.

GA4 has exactly this — `google_ga4_delivery` records `transport_accepted`. Meta
needs the same table. Until it does, the only check is opening Meta Events
Manager and comparing its Purchase count against 38.

**This is the highest-value fix: it is the difference between knowing your ad
spend is being optimised and assuming it.**

### 2. Google Ads: 331 clicks, nothing attributable

| Source / medium | Sessions | With click ID |
|---|---|---|
| (direct) | 6,392 | 10 |
| **meta / paid_social** | **4,154** | **4,119** |
| **google / cpc** | **331** | **330** |
| chatgpt.com | 175 | 0 |
| trustpilot | 7 | 0 |

The gclid *is* being captured correctly at arrival — 330 of 331. But **no order
has ever come from a visitor whose session carried a Google click ID.** I checked
by joining orders to sessions; the result is empty.

So this is not a broken pipeline — it is that Google Ads has not produced a
traceable sale. The consequence is that all 52 staged offline-conversion rows
have no click ID, and a gclid-based import into Google Ads would match nothing.

**All 52 rows do have a hashed email and phone.** That is what Google's *Enhanced
Conversions for Leads* matches on, and it is the route that would actually work
here — especially for WhatsApp orders, which never had a click ID to begin with.

Worth noting alongside: **ChatGPT sent 175 sessions**, more than Trustpilot and
Instagram combined. That is a real and growing channel.

### 3. WhatsApp is invisible to GA4

22 of 40 orders came through WhatsApp. They have no `_ga` cookie, so GA4 never
sees them. They reach Meta correctly as `chat`, and your own attribution tables
have them — but **GA4's revenue figure is roughly half your actual revenue, by
design.**

This is not a bug to fix, it is a number to know. Do not treat GA4 Monetisation
as your revenue report. The `orders` table is the truth.

### 4. `TRACKING_ENV` is still unset on Hostinger

The entire server pipeline is gated on:

```ts
(process.env.TRACKING_ENV ?? process.env.VERCEL_ENV) === 'production'
```

The evidence above proves the fallback is currently carrying it. But it is named
after a host you left on 29 September. **One rebuild without `VERCEL_ENV` and
every Meta CAPI send, every GA4 purchase and every staged conversion stops
silently — no error anywhere.** Setting `TRACKING_ENV=production` in the
Hostinger panel takes a minute.

---

## 6. The open question: is GA4 getting your ecommerce events?

This is the one I could not settle, and it is the most important.

**What I observed.** With an interceptor on `sendBeacon`, `fetch`, `XHR` and
image requests — all four verified working with a control — I recorded **zero
outgoing GA4 hits** during in-app navigation, across multiple pages, with the
flush path forced. The GA4 config tag *did* initialise on first load
(`G-GTBKG6RSNF` is registered in `google_tag_manager`), so the tag itself is
installed.

**What that does and does not mean.** Two explanations fit, and I cannot
distinguish them from outside:

- **(a)** The GTM container has no tags bound to the `ukss.*` events. GA4 then
  receives page views and nothing else — no `view_item`, no `add_to_cart`, no
  `begin_checkout`. The site would push a perfect event layer into a container
  that drops it.
- **(b)** The GA4 event tags are consent-gated inside GTM, so nothing fires
  while consent is denied. My session was unconsented.

If (b), the setup contradicts its own stated design — the whole point of Consent
Mode v2 here is that declining visitors still contribute modelling pings.

I should flag that one of my own tests here was faulty: I tried calling
`gtag('event', …)` to bypass GTM, but with GTM installed `gtag` is only a
dataLayer stub, so that proved nothing. And `view_item_list` could not be tested
at all — it needs an element 50% visible, and my browser pane reported a zero
height viewport; a control observer of my own returned no callbacks either, so
that event is **unproven in both directions**, not broken.

**How to settle it in five minutes:**

1. Open GTM → container `GTM-MXQ8S66N` → **Tags**. Is there a GA4 Event tag
   triggered on `ukss.view_item`, `ukss.add_to_cart`, `ukss.begin_checkout`,
   `ukss.order_placed`? If not, that is the answer, and building those four tags
   is the single highest-value change available.
2. GTM **Preview** mode on the live site, accept cookies, open a product. Watch
   whether a GA4 tag fires on `ukss.view_item`.
3. GA4 → **Realtime**. Open a product page with cookies accepted. If only
   `page_view` appears, confirmed.

I can do this with you if you grant consent in my test browser — I did not want
to click Accept on your banner without asking.

---

## 7. What is genuinely well built

Worth saying, because the problems above are all at the edges:

- **Purchase at confirmation, not checkout** — correct for cash on delivery, and
  most shops get this wrong.
- **Idempotent conversions** — guard column claimed before send, with a
  conditional predicate. Cannot double-count.
- **Production host allowlist, not an env var** — browser tracking checks the
  actual hostname, so a laptop or staging box cannot pollute live ad accounts.
- **Event deduplication** across browser and server via shared `event_id`.
- **PII hashed before it leaves the server**; postcodes stripped of whitespace,
  phones normalised to `447…` as Meta requires.
- **URL redaction** before anything reaches Google — order IDs, tokens and
  postcodes all become `[id]` or `[private]`.
- **QA orders hard-blocked**: `utm_campaign = 'offer-test'` can never train a
  model, even if confirmed by hand.
- **Consent evidence persisted** — 3,378 receipts with policy version and
  timestamp. That is a GDPR audit trail most sites cannot produce.

---

## 8. Your real funnel

From `attribution_actions` — your own data, unblockable, and the most trustworthy
numbers you have:

| Step | Count | Of previous |
|---|---|---|
| Product view | 11,408 | — |
| Add to cart | 523 | 4.6% |
| Checkout start | 200 | 38% |
| Place order clicked | 66 | 33% |
| **Order placed** | **17** | **26%** |
| | | |
| WhatsApp click | 156 | — |
| Call click | 19 | — |

**Two thirds of people who click "Place order" do not end up with an order.**
That is the sharpest drop in the funnel and the one worth investigating next —
66 clicks, 17 orders. It is a bigger loss than anything in the tracking itself.

---

## 9. Recommended order of work

| # | Action | Why |
|---|---|---|
| 1 | Check the GTM container for `ukss.*` tags (§6) | Decides whether GA4 has any ecommerce data at all |
| 2 | Set `TRACKING_ENV=production` on Hostinger | Removes a silent single point of failure |
| 3 | Persist Meta CAPI responses to a table | You currently cannot tell if Meta is accepting anything |
| 4 | Compare Meta Events Manager Purchase count against 38 | One-off check while #3 is built |
| 5 | Investigate the place-order → order drop (66 → 17) | Larger than any tracking gain |
| 6 | Switch Google Ads to Enhanced Conversions for Leads | gclid will never match; email and phone will |
| 7 | Find the one delivered order that did not send | 15 delivered, 14 sent |

---

*Audited 7 October 2026 against production and the live database. Browser checks
run on www.uksofashop.co.uk in an unconsented session unless stated.*
