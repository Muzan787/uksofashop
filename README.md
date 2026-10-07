# UK Sofa Shop

Storefront and admin panel for [uksofashop.co.uk](https://www.uksofashop.co.uk) — a UK
sofa retailer selling on a cash-on-delivery model, with a showroom in Blackburn.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres + Auth + RLS)

---

## Running it locally

```bash
npm install
npm run dev          # http://localhost:3000
```

`dev` and `build` both pass `--webpack` deliberately. The project has a webpack
config (next-pwa), and Next 16 defaults to Turbopack, which errors on startup if
a webpack config is present without a matching turbopack one.

```bash
npm run build        # production build
npm run lint         # eslint
npx tsc --noEmit     # type check
```

**If `next start` returns 500s on every route**, delete `.next` and rebuild.
Stale incremental artifacts produce a "Could not find the module … in the React
Client Manifest" error that a clean build resolves.

---

## Environment variables

Create `.env` in the project root. Nothing here has a safe default — the app
degrades quietly rather than crashing when one is missing, so check this list
first when something silently does nothing.

### Required

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key. Every storefront query goes through RLS with this. |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS entirely. Never expose to the browser. Used by about thirty server-side modules — the attribution and offer routes, the crons, the conversion reporters and the double opt-in — because the tables they write (`attribution_*`, `offer_*`, `google_*`, `whatsapp_enquiries` and the rest) have RLS on with **no policies at all**, which is deliberate: no anon or signed-in role can touch them by any route, and the server is the only way in. This line used to say "only for newsletter double opt-in", which has not been true for a long time. Anything reached by a visitor and holding this key must therefore carry its own gate — see `isProductionRequestHost`, `CRON_SECRET` and the zod schema on every such route. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, `https://www.uksofashop.co.uk`. Feeds canonicals, the sitemap, robots.txt and structured data. |

### Email (transactional)

Automated mail (order confirmations, status updates, review requests, admin
notifications) goes out through the shop's own mailbox on Hostinger Mail,
authenticated as `enquiries@uksofashop.co.uk` and shown to customers as
`orders@uksofashop.co.uk`, with replies directed to `enquiries@`. The domain
carries Hostinger's MX, SPF, DKIM and DMARC records, so the mail is
authenticated. The addresses live in `src/constants/contact.ts`; the transport
is `src/utils/email.ts`.

| Variable | What it does |
| --- | --- |
| `SMTP_PASSWORD` | Password of the `enquiries@` mailbox. **The one variable that switches the site onto the domain sender.** Unset, it falls back to Gmail below. |
| `ADMIN_EMAIL` | Where new-order, contact and swatch notifications go. Defaults to `enquiries@`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` | Only to move to a different relay (Resend, Postmark, SES). Default to Hostinger and the `enquiries@` mailbox. |
| `MAIL_FROM`, `MAIL_REPLY_TO` | Override the From and Reply-To addresses. Default to `orders@` and `enquiries@`. |
| `EMAIL_USER`, `EMAIL_APP_PASSWORD` | Legacy Gmail fallback, used only while `SMTP_PASSWORD` is unset. Mail sent this way is not authenticated for the domain and lands in spam. |

### Features that silently switch themselves off

Audited 2026-10-06: these were all read by the code and documented nowhere.
None of them throws when missing — the feature just stops existing, which is
the problem. Since the move, environment variables live only in Hostinger's
panel, so a rebuilt server with an incomplete list loses these without a
single error in the log.

| Variable | What disappears without it |
| --- | --- |
| `ANTHROPIC_API_KEY` | The "Ask us" assistant. The root layout checks for it on the server, so the pill simply never renders rather than opening onto an error. |
| `NEXT_PUBLIC_HOMEDATA_API_KEY` | Address lookup at checkout. The postcode field still validates, but "Find address" throws a message asking the customer to type it by hand. |
| `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` | Review photo uploads. The server action signs the upload with these; without them it refuses and tells the customer to email the photo instead. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Every image upload path, admin and customer. Build-time inlined. |
| `NEXT_PUBLIC_CLOUDINARY_PRODUCT_UPLOAD_PRESET` | Product and category image uploads in the admin panel. Build-time inlined. |
| `REVIEW_TOKEN_SECRET` | Signs the per-product review links in the post-delivery email, and the one-click unsubscribe on the checkout reminder. Falls back to `SUPABASE_SERVICE_ROLE_KEY`, so links keep working — but the two can then only be rotated together. |
| `OFFER_ENTRY_SIGNING_SECRET` | The paid-offer entry tokens behind `/offer-entry/[token]`. |
| `NEXT_PUBLIC_ADS_ORDER_PLACED_SEND_TO` | The Google Ads order-placed conversion label. Build-time inlined. Its Vercel-era name was `NEXT_PUBLIC_ADS_PURCHASE_SEND_TO`, which never matched the code and so never fired. |
| `PHASE_D_QA_ENABLE` | Only ever `1`, and only on the CI harness. In production it must stay unset — see `src/app/api/qa/phase-d-server/route.ts`. |

`LIVE_URL` and `VERCEL_GIT_COMMIT_REF` also appear in the tree but are not
application configuration: the first is set inside
`.github/workflows/p2a-validation.yml`, and the second is a leftover the
2026-10-06 audit removed from `next.config.ts`.

### Trustpilot — optional

The Trustpilot profile (business unit `6aad5fc120d98657b6af39aa`,
`uk.trustpilot.com/review/uksofashop.co.uk`) is claimed. The public ids
live in `src/constants/trustpilot.ts`; these three switch the integration on.

| Variable | What it does |
| --- | --- |
| `TRUSTPILOT_INVITE_BCC` | The Automatic Feedback Service address from the Trustpilot dashboard. Set, the **delivered** email is BCC'd to it and Trustpilot sends the customer an invitation on its own schedule; the order is stamped `review_request_sent_at` so the site's own review-request email does not ask a second time. Treat it as private: anyone holding it can send invitations in the shop's name. |
| `TRUSTPILOT_INVITE_LINK` | Optional. The shareable invitation link from the dashboard, used by the admin "Ask for a Trustpilot review on WhatsApp" button on delivered orders. Reviews through it count as invited; unset, the button uses the public review page and reviews count as organic. |
| `NEXT_PUBLIC_TRUSTPILOT_WIDGETS` | Set to `1` to show the TrustBoxes (homepage reviews section, product page buy box, checkout header). Leave unset until there are enough reviews for a rating to mean something. Needs a deploy to change. |

### Advertising and analytics — optional

Everything below no-ops when unset, so the site runs normally without them.

| Variable | What it does |
| --- | --- |
| `TRACKING_ENV` | **The master switch for every server-side send.** Set it to exactly `production` on the live server and nowhere else. Unset — or any other value — and Meta CAPI, the GA4 Measurement Protocol and the Google offline-conversion rows all stay silent, so a staging box or a local `next start` can never report a real conversion. `VERCEL_ENV` is still honoured as a fallback for the server that is running today; prefer this one. See `src/utils/trackingEnv.ts`. |
| `META_PIXEL_ID` | Meta Conversions API target. Must equal the pixel id the browser uses, which is a constant in `src/utils/consentMode.ts` — if the two disagree, the browser and server halves of an event land in different pixels and Meta cannot deduplicate them. |
| `META_CAPI_ACCESS_TOKEN` | Events Manager → Settings → Conversions API |
| `META_CAPI_TEST_EVENT_CODE` | Optional. Routes events to the Test Events tab. |
| `GA4_MEASUREMENT_ID` | GA4 Measurement Protocol. Same rule as the pixel id: it must match `GA_ID` in `src/utils/consentMode.ts`. |
| `GA4_API_SECRET` | GA4 Admin → Data Streams → Measurement Protocol API secrets |
| `NEXT_PUBLIC_GOOGLE_TRACKING_MODE` | `gtm-v1` loads the GTM container instead of gtag directly; `gtm-qa` exposes the event contract to Tag Assistant on a non-production host. Unset means the plain gtag path. |

---

## Database

Schema changes live in `supabase/migrations/` as SQL. Write the migration
file first, review the SQL, then apply it — changing the schema in the
Supabase dashboard leaves no record, and the next `db pull` produces a
confusing diff.

**That directory is a change log, not a rebuildable schema. Do not assume you
can recreate this database from it.** Audited 2026-10-06:

- The base tables were never in it. `create table public.products` and its
  siblings appear in **no** migration — they were made in the dashboard
  before the folder existed.
- **Eleven migrations are applied on the server with no file here**, among
  them `rls_policies_phase1_core_access` and
  `rls_policies_phase2_guest_order_functions` — the foundational row-level
  security — plus `swatch_requests`, `add_variant_subgroups`,
  `place_order_with_fabric` and `fix_modren_style_typo`. Applying this folder
  to an empty database would produce one with no tables and most of its
  security missing.
- One file here, `seed_fabrics`, was never applied under that name.

Closing the gap is one command, which rewrites the folder from the live
database — do it on a clean branch and read the diff before committing:

```bash
npx supabase db pull                                    # capture drift
npx supabase gen types typescript --linked --output src/types/supabase.ts
```

Use the `--output` flag rather than a shell redirect. PowerShell's `>` writes
UTF-16LE, which ESLint cannot parse at all.

### Business logic that lives in Postgres

| Function | Why it is server-side |
| --- | --- |
| `place_order` | Prices every line from the database and rejects a mismatch against the client's figure, so the browser cannot decide what a sofa costs |
| `track_order` | Requires order reference **and** postcode, returns at most one row |
| `confirm_order` | Customer confirmation from the emailed link |
| `newsletter_subscribe` / `_confirm` / `_unsubscribe` | Double opt-in |
| `is_admin` | Single source of truth for admin rights — the `admins` table, used by middleware, server actions and login routing alike |

---

## Things worth knowing before you change them

**No stock tracking.** Sofas are made to order, so stock is effectively
infinite. Availability is the product-level `is_active` flag alone. Don't
reintroduce stock counts, "only N left" badges, or `out_of_stock` in the
Merchant feed.

**Origin claims are per-product.** Some ranges are UK-made; recliners are
imported. The "Made in the UK" badge reads `products.origin` and must never
become a sitewide claim.

**Purchase conversions fire on `confirmed`, not at checkout.** Around a quarter
of cash-on-delivery orders are never completed, so counting a submitted form as
a sale overstates revenue and teaches the ad platforms to optimise for the
wrong thing. See `src/utils/orderConversions.ts`.

**No `loading.tsx` under `/shop` or `/collection`.** A loading boundary commits
a 200 before the page's `notFound()` or `redirect()` runs, which turns every
unknown category or product into a soft 404. Those routes suspend internally
instead.

**Promises are centralised.** Delivery, guarantee, payment and made-to-order
copy lives in `src/constants/promises.ts`; prices in `src/constants/delivery.ts`;
name, address and phone in `src/constants/contact.ts`. Import them — the site
previously advertised a £500 delivery threshold and a 30-day trial that were
never real, because the strings were duplicated across a dozen files.

---

## Deploying

Hosted on **Hostinger** since 29 September 2026. Pushes to `master` deploy, but
not instantly — allow a few minutes, and check the live page rather than
assuming the push landed. `vercel.json` was deleted on 2026-10-06; it had been
dead since the move and its three cron entries had already been reimplemented
as a GitHub Actions workflow. Git history still has it.

Verified against production on 2026-10-06, so you know what good looks like:

| | |
| --- | --- |
| `https://uksofashop.co.uk/` | **308** to www — a real permanent redirect now. On Vercel the edge forced a 307 that `next.config.ts` could never override; there is no edge in front of the app any more, so the rule in the repo is what answers. |
| Compression | Brotli (`content-encoding: br`), from Hostinger's CDN (`server: hcdn`). |
| Static assets | `public, max-age=31536000, immutable`. |
| HSTS | `max-age=63072000; includeSubDomains; preload`. |
| `/sw.js`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml` | all 200, correct content types. |

Three things moved with the host and are now maintained by hand:

| What | Where it lives now |
| --- | --- |
| Environment variables | Hostinger's panel — that is the source of truth. The `.env*` files are gitignored and local only, so adding a variable to one does nothing in production until it is set in the panel too. |
| Cron jobs | `.github/workflows/scheduled-jobs.yml` — review requests, recovery cleanup, weekly digest. Vercel Cron stopped existing with the move. Each is a GET guarded by `CRON_SECRET`, held both as a GitHub Actions secret and as a Hostinger variable; if the two drift the call 401s and the workflow fails loudly. |
| Build settings | Hostinger's panel. There is no `vercel.json` equivalent under version control. |

**A variable that is only set at runtime is not the same as one set at build
time.** Every `NEXT_PUBLIC_*` value is inlined into the JavaScript when
Hostinger compiles the app, so it has to be present for the *build*, not just
for the running server. `next.config.ts` also turns `TRACKING_ENV` /
`VERCEL_ENV` into `NEXT_PUBLIC_GOOGLE_TRACKING_MODE` at build time, which is
what decides whether the site loads the GTM container or plain gtag — and it
fails silently either way, because both code paths ship and the site keeps
measuring through whichever one it baked in.

Because a deploy is not instant and nothing announces it, the honest way to
confirm one is to fetch something only the new build contains. Note that
server-rendered React separates adjacent text nodes with comment markers, so a
string like `10% off` written as `{n}% off` never appears contiguously in the
HTML — grep for a fragment, not the whole phrase.

Schema changes are the exception to "push and wait": apply the migration first,
then push. The code selects columns the migration adds, so the deploy is
harmless against a newer database and breaks against an older one.

The apex domain must redirect to `www`. There is a backstop redirect in
`next.config.ts`, and the apex should also be pointed at `www` in Hostinger's
DNS so it happens before the request reaches the app.
