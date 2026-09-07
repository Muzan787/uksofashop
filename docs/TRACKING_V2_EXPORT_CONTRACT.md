# Tracking V2 — export contract

What a future operational layer (Google Sheets, Data Manager, an ops
dashboard) reads from Supabase, and exactly what each field means. Supabase
remains the source of truth; nothing described here is a Google Sheet that
has been built — this document only defines the contract another system
should build against.

Nothing in this codebase uploads anything to Google or Meta beyond what
already existed before Tracking V2 (Meta CAPI Purchase/OrderDelivered, GA4
server-side purchase). `google_offline_conversions` is staged data, read-only
from the storefront's perspective from here on.

## Consent and what's marketing vs. operational

- **Not gated on cookie consent**: `attribution_sessions`, `attribution_actions`,
  `whatsapp_enquiries` and the `visitor_id`/`session_id`/`arrival_id` cookies
  themselves. These are first-party, non-advertising identifiers — closer to
  a session id or a shopping-cart cookie than an ad tracker — the same
  category most cookie regimes treat as "strictly necessary" or "functional"
  rather than "marketing". They exist so an order can be traced back to a
  WhatsApp conversation or a landing page even when the visitor declined
  analytics/advertising cookies.
- **Gated on cookie consent** (`getConsent() === 'granted'`): the Meta Pixel,
  the Meta CAPI mirror, `_fbp`/`_fbc` themselves (Meta only sets these once
  its own cookie is allowed to run), and every value read from those cookies.
  `gclid`/`gbraid`/`wbraid`/`fbclid`/UTMs captured off the URL are stored
  alongside the operational identifiers above regardless of consent, because
  they are already public (present in the URL the visitor arrived on) and
  Google's own Consent Mode v2 defaults independently govern whether Google
  can actually use them.
- **Flag for a future privacy-policy update**: the existing `/cookies` and
  privacy pages describe Google Analytics and Meta Pixel cookies. They do not
  yet mention the first-party `uksofashop_vid`/`_sid`/`_aid`/`_ft`/`_lt`
  cookies or the WhatsApp-reference system. Recommend a short addition
  describing them as functional/operational identifiers, not third-party
  advertising cookies — this document does not edit that copy.

## 1. Attribution Ledger

Source: `attribution_sessions` (one row per `session_id`), joined to
`attribution_actions` for action counts.

| Sheet column | Source field | Meaning | Nullable | Dedup key |
|---|---|---|---|---|
| Visitor ID | `visitor_id` | Persistent ~400-day first-party id | No | — |
| Session ID | `session_id` | One browsing session (30-min inactivity window) | No | **Primary key** |
| Arrival ID | `arrival_id` | One meaningful touch within a session | No | — |
| First seen | `created_at` | When this session row was first written | No | — |
| Last seen | `last_seen_at` | Updated on later arrivals in the same session | No | — |
| First-touch source/medium/campaign/content/term | `first_touch_*` | Never overwritten once set | Yes | — |
| Last-touch source/medium/campaign/content/term | `last_touch_*` | Updated by fresh campaign touches; direct returns do not erase the last meaningful touch | Yes | — |
| Google Click ID | `gclid` | Last-touch preferred, falls back to first-touch | Yes | — |
| Google Enhanced Conversions IDs | `gbraid`, `wbraid` | Same fallback rule | Yes | — |
| Meta Click ID | `fbclid` | Same fallback rule | Yes | — |
| GA4 Client ID | `ga_client_id` | From the `_ga` cookie | Yes | — |
| Meta Browser ID | `meta_fbp` | From `_fbp` | Yes | — |
| Meta Click ID (cookie) | `meta_fbc` | From `_fbc` | Yes | — |
| Landing page | `landing_page` | First page of the session | Yes | — |
| Referrer | `referrer` | `document.referrer` at first touch | Yes | — |
| Initial product/variant | `initial_product_id`, `initial_variant_id` | Set only when the first arrival lands on a product page | Yes | — |

## 2. WhatsApp Enquiries

Source: `whatsapp_enquiries`.

| Sheet column | Source field | Meaning | Nullable | Dedup key |
|---|---|---|---|---|
| Reference | `reference` | `UKSS-WA-YYMMDD-XXXXXX` | No | **Primary key**, unique |
| Created | `created_at` | When the WhatsApp button was clicked | No | — |
| Visitor/Session/Arrival ID | `visitor_id`/`session_id`/`arrival_id` | Joins to Attribution Ledger | Yes | — |
| Page | `page_url`, `page_context` | Which page/CTA (`product_agent`, `whatsapp_fab`, `contact_page`, ...) | Yes | — |
| Product | `product_id`, `variant_id`, `product_name` | What the enquiry was about, if known | Yes | — |
| Click IDs / UTMs | `gclid`/`gbraid`/`wbraid`/`fbclid`/`utm_*` | Same shape as the Attribution Ledger | Yes | — |
| GA/Meta IDs | `ga_client_id`/`meta_fbp`/`meta_fbc` | Same shape | Yes | — |
| Converted order | `converted_order_id`, `converted_at` | Set when a staff member enters this reference in the "Take a WhatsApp order" form | Yes | — |

## 3. Orders & Profit

Source: `orders` (joined `order_items` for line items). This sheet is where
a manual profit model belongs — nothing here or in the app computes margin
or ad spend.

| Sheet column | Source field | Meaning | Nullable | Dedup key |
|---|---|---|---|---|
| Order ID | `id` | Full uuid — do not publish outside a trusted sheet; it is the bearer token for `/confirm-order/[id]` | No | **Primary key** |
| Short reference | first 8 chars of `id`, uppercased | The public-facing reference | No | — |
| Placed | `created_at` | Order submitted | No | — |
| Confirmed | `confirmed_at` | First time status reached `confirmed` | Yes | — |
| Delivered | `delivered_at` | First time status reached `delivered` | Yes | — |
| Cancelled | `cancelled_at`, `cancellation_reason` | First time status reached `cancelled` | Yes | — |
| Status | `status` | Current status | Yes | — |
| Customer | `customer_name`, `customer_email`, `customer_phone` | | Varies | — |
| Address / postcode | `shipping_address` (postcode is the trailing token) | | No | — |
| Revenue | `total_amount` | Delivery-inclusive | No | — |
| Source | `source` | `website` or `whatsapp` | No | — |
| WhatsApp reference | `whatsapp_reference` | Links to WhatsApp Enquiries | Yes | — |
| Attribution | `visitor_id`/`session_id`/`arrival_id`/`gclid`/`gbraid`/`wbraid`/`fbclid`/`utm_*`/`landing_page`/`referrer` | Last-touch at the moment of checkout | Yes | — |
| Conversion flags | `purchase_event_sent_at`, `delivered_event_sent_at` | Whether Meta/GA4 already have this order | Yes | — |

## 4. Google Conversion Upload

Source: `google_offline_conversions`. This is the ONLY table meant to feed a
Google Ads offline/enhanced-conversion or Data Manager import. Nothing in
this codebase performs that upload.

| Sheet column | Source field | Meaning | Nullable | Dedup key |
|---|---|---|---|---|
| Order ID | `order_id` | | No | Part of composite key |
| Stage | `conversion_stage` | `confirmed` or `delivered` | No | Part of composite key — `(order_id, conversion_stage)` is unique |
| Conversion time | `conversion_time` | Business event time, for Google's `conversion_date_time` | No | — |
| Value / currency | `value`, `currency` | GBP unconditionally | No | — |
| Click IDs | `gclid`, `gbraid`, `wbraid` | Whichever the order carried at checkout | Yes | — |
| Customer match data | `customer_email`, `customer_phone`, `customer_first_name`, `customer_last_name`, `customer_postcode` | For enhanced conversions matching | Yes | — |
| Upload status | `upload_status`, `uploaded_at`, `error_message` | **Written back by whatever process performs the actual upload** — the storefront only ever writes `pending` | No / Yes / Yes | — |

**Important**: after a real upload job runs, it should update `upload_status`
to `uploaded`/`error` on the rows it processed, so a re-run of the same job
does not resubmit them. This table does not do that itself.

## 5. Meta Outcome Ledger

Source: `conversion_events` filtered to `platform = 'meta'`, joined to
`orders` for revenue/status.

| Sheet column | Source field | Meaning | Nullable | Dedup key |
|---|---|---|---|---|
| Order ID | `order_id` | | Yes | — |
| Event | `event_name` | `Purchase`, `OrderDelivered`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Contact` | No | — |
| Event ID | `event_id` | The dedup id shared with the browser Pixel copy | Yes | — |
| Attempted | `created_at` | | No | — |
| Sent | `sent_at`, `status` | `status` means "the attempt completed", not "Meta accepted it" — see the note in `utils/orderConversions.ts` | Yes | — |

## 6. Daily Performance

A rollup, not a single source table — computed by grouping:

- **Sessions/arrivals**: `attribution_sessions` by day (`created_at`), by
  `last_touch_source`/`last_touch_medium`/`last_touch_campaign`.
- **WhatsApp enquiries**: `whatsapp_enquiries` by day, same campaign group.
- **Orders/revenue**: `orders` by day (`created_at`), by campaign group (via
  `utm_*`/`gclid` presence), split by `status`.
- **Conversion completeness**: `orders.purchase_event_sent_at IS NOT NULL`
  vs. total confirmed, as a sanity check that Meta/GA4 are actually receiving
  what the business thinks they are.

## Migration sequence (for reference)

1. `20260906100000_attribution_sessions.sql`
2. `20260906110000_whatsapp_enquiries.sql`
3. `20260906120000_attribution_actions.sql`
4. `20260906130000_order_attribution_fields.sql`
5. `20260906140000_google_offline_conversions.sql`
6. `20260906150000_conversion_events_audit.sql`
7. `20260906160000_manual_order_whatsapp_reference.sql`

## Testing sequence (for reference)

See the implementation report's N. TEST RESULTS section for what was
actually run. A live end-to-end test (ad click → site visit → WhatsApp click
→ chat order → confirm → deliver, checked against Meta Events Manager, GA4
DebugView and this table set) still needs to happen against a staging Meta
CAPI test-event-code and a non-production Ads account before any of this
feeds a real Google/Meta upload.
