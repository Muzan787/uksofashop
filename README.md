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
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS. Used **only** for newsletter double opt-in, where there is no caller identity. Never expose to the browser. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, `https://www.uksofashop.co.uk`. Feeds canonicals, the sitemap, robots.txt and structured data. |

### Email (transactional)

| Variable | What it does |
| --- | --- |
| `EMAIL_USER` | Gmail address used as the sender |
| `EMAIL_APP_PASSWORD` | Gmail app password, not the account password |
| `ADMIN_EMAIL` | Where new-order and contact notifications go |

Order confirmations currently send through Gmail SMTP. Moving to a dedicated
sender on the `uksofashop.co.uk` domain (Resend or Postmark, with SPF, DKIM and
DMARC) is outstanding and will improve deliverability.

### Advertising and analytics — optional

Everything below no-ops when unset, so the site runs normally without them.

| Variable | What it does |
| --- | --- |
| `META_PIXEL_ID` | Meta Conversions API target |
| `META_CAPI_ACCESS_TOKEN` | Events Manager → Settings → Conversions API |
| `META_CAPI_TEST_EVENT_CODE` | Optional. Routes events to the Test Events tab. |
| `GA4_MEASUREMENT_ID` | GA4 Measurement Protocol |
| `GA4_API_SECRET` | GA4 Admin → Data Streams → Measurement Protocol API secrets |

---

## Database

The schema lives in `supabase/migrations/` as SQL. **That directory is the
source of truth, not the hosted dashboard.**

Working rule: write the migration file first, review the SQL, then apply it.
Changing the schema in the Supabase dashboard leaves no record and the next
`db pull` produces a confusing diff.

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

Hosted on Vercel; pushes to `master` deploy.

The apex domain must redirect to `www`. There is a backstop redirect in
`next.config.ts`, but set www as the primary domain in **Project → Settings →
Domains** so it happens at the edge.
