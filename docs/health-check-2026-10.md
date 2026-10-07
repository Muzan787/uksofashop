# Site health check — October 2026

A fifteen-step audit of the whole site, run 5–7 October 2026, covering build and
code health, content and claims, mobile, accessibility, performance, the funnel,
tracking, security, data, email, infrastructure and search visibility.

Everything below is on `master`. Nine commits plus a merge: `8b3a8ad` through
`779ddbe`.

This document is the record of what changed and why. The short version:
**two bugs were costing money silently**, several customer-facing claims were
wrong in ways that matter legally, and the shared JavaScript baseline was 44 kB
heavier than it needed to be. What could be fixed in code is fixed. What is left
needs decisions or access that only the owner has, and is listed at the end.

---

## 1. The two live bugs

Both silent, both hidden behind a TypeScript `any`, both found by typing the code
rather than by using the site.

### Every style filter on the shop page returned nothing

`src/app/shop/[category]/productQuery.ts` filtered on `specifications->>style`.
Seventy of the seventy-one active products spell that key `Style`, with a capital
S. One spells it lowercase — the one tagged "Affordable".

So clicking **Modern**, **High Back**, **Scattered Back** or **U shaped** gave an
empty grid every time. Only "Affordable" ever returned anything. The filter now
matches either spelling:

```ts
function styleFilter(style: string): string {
  const v = JSON.stringify(style)
  return `specifications->>style.ilike.${v},specifications->>Style.ilike.${v}`
}
```

The data should be normalised to one spelling eventually, but the query should
not have been that brittle either way.

### `reviews.status` is not a column

Two places read `review.status` as though the table had it: the product page and
the admin reviews list. It does not — `is_approved` is the only approval flag
there is.

Both reads sat inside `any`, so nothing complained. The product page's filter
silently passed nothing through. The admin list's `|| review.status === 'approved'`
was dead code that looked like a second safety net.

Found by replacing the fourteen `any`s on the product page with the generated
`Database` types, which is the argument for doing that.

---

## 2. Claims, contracts and consumer law

The site said three different things about cancelling a made-to-order sofa, and
one of them was not lawful.

**What was wrong**

- A **24-hour deadline for reporting damage**, which cannot cut short a statutory
  right. Gone.
- **No cancellation mechanism at all** — the right was described but there was no
  way to exercise it.
- Telling a customer they cannot cancel when they can is a banned practice under
  the DMCC Act 2024. Three pages disagreed about when that applied.

**What replaced it**

`src/utils/cancellationRights.ts` is now the only definition of who loses the
14-day right. A line loses it if it carries a **fabric, a build, or a
customisation** — an actual choice the customer made.

It is deliberately *not* `products.custom_made`, which is true of anything
assembled after the order is placed. That flag answers "do we build this to
order?"; the cancellation exemption answers "did this customer specify it?".
Those are different questions and the site was using the first to answer the
second.

The product page, the order emails and the delivery-returns page all read the
same function.

> **A correction worth recording.** A first draft of the delivery-returns wording
> said *"ordered exactly as listed on this page, you keep the full 14 days."*
> That is false — `handleAdd` in `ProductPageClient.tsx` opens the fabric picker
> and refuses to add to the basket without a choice, so no such order exists. The
> sentence was caught and rewritten before it shipped.

**Claims now written once**

| Was hardcoded | Now |
|---|---|
| "70 colours", in nine places | `FABRIC_COLOUR_COUNT` |
| "six fabrics" | `FABRIC_COLLECTION_COUNT` |
| £50 re-delivery fee | `RE_DELIVERY_FEE` |
| £5 sample fee | `SAMPLE_FEE` |
| `07476 616022` on /size-guide and the global error page | `PHONE_DISPLAY` / `PHONE_HREF` |
| "2–4 working days" in two meta descriptions | `PROMISES.delivery.timingMeta` |

**The VAT line is gone.** `/terms` claimed "all prices include VAT at the current
rate". The business is not VAT registered, so that was a claim with nothing behind
it.

### The address was wrong

It read **Unit 04, Waverledge Street, Blackburn, BB6 7LS**. Three things short:

- the unit is **4**, not 04
- **Waverledge Business Park** was missing
- **Great Harwood** — the town the unit is actually in — was missing entirely

Blackburn stays on the `locality` line because it is the correct post town; BB6 is
Hyndburn. `addressRegion: Lancashire` is now in the structured data too.

This is one constant, so the footer, contact page, showroom, emails and JSON-LD
all moved together. Google matches a Business Profile against the whole string,
and so do local directories — a short version is a weaker match everywhere at once.

**Check your Google Business Profile matches the new string.**

### Trader identity — deliberately blank, needs filling

`TRADER` in `src/constants/contact.ts` is new and all nulls.

The Ecommerce Regulations 2002 (reg 6) and Schedule 2 of the Consumer Contracts
Regulations 2013 both require a trader to say who it is. The address, phone and
email are all on the site; the legal entity is not, anywhere.

Every surface renders **nothing** while it is null, rather than a placeholder —
a half-filled identity block is worse than an absent one, and an empty one is easy
to spot. Fill in either your own name (sole trader) or the registered name plus
company number.

---

## 3. Mobile and accessibility

Every customer is on a phone, so this is the pass that mattered most.

**Two real barriers, both fixed**

- The **checkout postcode field had no label**. A screen reader announced it as
  "edit text" — on the one field that decides whether delivery is free.
- The **checkout progress bar** announced "Step 2 of 3" with no indication of what
  was progressing.

**Contrast**

The wordmark used `ember-500`, which is 2.76:1 on the calico background and fails
WCAG AA. `tokens.css` already says amber *text* is `ember-700` on light and
`ember-300` on dark; the header was the one place in the site ignoring it, on
every page.

**Tap targets**

Links and controls at 32–40px went to 44px — the WCAG 2.5.5 minimum — across the
footer, swatch browser, gallery, track-order and the home sections.

**Except the carousel dots, on purpose.** Widening those to 44 square pushed the
homepage to 430px wide on a 375px screen: nine stops need 428px of dots and the
viewport has 343. They stay 24×44, which clears WCAG 2.5.8's 24×24 minimum, and
the rail's real interaction is the swipe. The reasoning is in a comment in
`ProductRail.tsx` so it does not get "corrected" later.

> **Note on tooling.** axe-core reported contrast failures on four dark sections
> because it could not resolve their backgrounds, and read the off-screen mobile
> menu as though it were visible. Each finding was checked against
> `elementsFromPoint` before acting. Taking them at face value would have wrecked
> four dark sections.

---

## 4. Performance

Roughly **59 kB of framer-motion and lenis was in the first load of every route**,
including `/terms` and `/privacy`, which animate nothing.

Each motion component is now a thin shell that decides whether the engine is
wanted and dynamically imports it only then:

| Shell | Engine, loaded only when wanted |
|---|---|
| `SmoothScroll` | `SmoothScrollEngine` |
| `Cursor` | `CursorRing` |
| `ScrollProgress` | `ScrollProgressRail` |
| `PageFade` | `PageFadeMotion` |

A phone never downloads the cursor ring. A visitor with reduced-motion set never
downloads any of it. **The shared baseline dropped 44 kB.**

Also:

- Four components carried `'use client'` without using anything client-side, so
  they were shipping to the browser to render static markup. Now server components.
- `usePointerFine` moved to `useSyncExternalStore`; the `useState` + `useEffect`
  version always rendered `false` first and corrected on the next frame.
- `<html>` takes `suppressHydrationWarning`. The pre-paint script adds `.entrance`
  before React hydrates — which is the entire point of it — and React logged a
  hydration mismatch for it on every homepage load.

---

## 5. The funnel

**WhatsApp is where the money is**, and every enquiry arrived saying only
*"Hi, I'm enquiring about the Verona."* Two round trips before the conversation
could start: what does it cost, and where are you.

Both are known at the moment the button is pressed. `utils/enquiryMessage.ts` now
puts the guide price in and asks for the postcode. The floating button reads the
price off the page so it cannot quote a different figure from the one beside it.

**71 of 72 product pages ended on "No reviews yet"** — an empty state at the exact
point a visitor is deciding, which reads as *nobody has bought this*. A product
with no reviews now shows nothing there at all.

This is a display fix for a stock problem. See the open items.

---

## 6. Security and data

- **A trigger function was executable by `anon` and `authenticated`** through
  PostgREST. Revoked.
- `is_admin()` stays executable, because twenty-two RLS policies call it.
- **Thirteen foreign keys** the storefront joins on had no index.
- **Eight RLS policies** re-evaluated `auth.uid()` once per row instead of once
  per query.
- **21 performance advisories and 1 security advisory cleared.**
- The order cookie's `Secure` flag was set from `VERCEL_ENV`, which has meant
  nothing since the move off Vercel. It now follows the protocol the request
  actually arrived over — a deletion whose `Secure` flag disagrees with the
  original is not guaranteed to land.
- The two Phase D QA routes ship on `master` because the validation workflow
  builds the real tree. A comment claimed one of them was "omitted from the clean
  release", which was never true. They now refuse on a production hostname *as
  well as* on the env flag, and the page is `noindex`.

Authorisation was verified by **impersonating the roles in Postgres**, not by
clicking through the admin panel.

> **Three findings from my own audit scripts were false.** A script searching for
> `requireAdmin|isAdmin(` flagged three admin actions as unguarded — they use
> `adminGuard()`. A secrets scan flagged three "leaked" values that are all public
> identifiers by design.

**Left alone on purpose:** the sixteen `multiple_permissive_policies` advisories.
That is premature optimisation on a 72-row catalogue.

---

## 7. Email

- **The checkout reminder had no unsubscribe.** PECR requires one in *every*
  marketing message, not just at opt-in. There is now a one-click link signed with
  an HMAC token, so it needs no login and cannot be forged.
- **Eight links fell back to `http://localhost:3000`** when `NEXT_PUBLIC_SITE_URL`
  was unset. They use the canonical origin now.
- **Every email went out as HTML only.** A plain-text part is now derived from the
  markup at send time.

Writing that last one turned up three defects, all found by reading the output
rather than assuming it worked: `&times;` and `&mdash;` came through undecoded,
table cells ran into each other, and every button in a row collapsed onto one line.

---

## 8. Infrastructure

The site moved from Vercel to Hostinger on **29 September 2026** and the tree had
not caught up.

- `vercel.json` was still present, doing nothing. Deleted.
- `@vercel/analytics` was still a dependency, sending to an endpoint nobody reads.
  Removed.
- The switch deciding whether a server-side conversion is real read `VERCEL_ENV`
  — **a variable Hostinger has never set**.

`TRACKING_ENV` is the new name, with `VERCEL_ENV` kept as a fallback so nothing
breaks in transit. **It still needs setting in the Hostinger panel.** Until then
the fallback is carrying it, and one rebuild away from carrying nothing.

The README is rewritten against what the host actually serves: response headers
read off production rather than copied from `next.config`, a wrong claim about the
service-role key corrected, and a new table of **the features that switch
themselves off when an env var is missing** — which is most of them, silently.

It also now warns that **the migrations folder cannot rebuild the database.** The
base tables were never in it and eleven applied migrations have no file, including
the core RLS policies.

---

## 9. Merging the parallel SEO work

While this audit was running, a separate session landed a technical-SEO pass over
all 46 routes on `origin/master` (`371f201`, `888f849`, merged as PR #35). It adds
`utils/pageMetadata.ts`, which fixes Next's shallow metadata merge — twenty-four
pages were inheriting the homepage's Open Graph card wholesale.

Eight files conflicted. All resolved so both sides keep what they were for:

- The empty-collection `noindex` goes through `pageMetadata`'s `robots` rather
  than a hand-built object, so a main collection finally gets a Twitter card too.
- `/privacy`, `/terms` and `/about` keep **both** sets of imports.
- The QA estimator keeps the hostname gate and `force-dynamic` from this side, and
  the title and description from that one.
- `/fabrics` and the fabric category keep the **shortened** descriptions — they
  were shortened for a real reason, the long ones ran to 232–244 characters and
  Google cut the delivery promise off the end — but read their figures from
  constants rather than restating them.
- The address stays as this side has it. The other branch still had the short
  "Unit 04, Waverledge Street".

That last resolution left two live hardcodes of "2–4 working days", which is why
`PROMISES.delivery.timingMeta` exists.

---

## What is still open

### Only the owner can close these

| # | Thing | Why |
|---|---|---|
| 1 | **Fill in `TRADER`** in `src/constants/contact.ts` — sole trader name, or Ltd name + company number | The site still does not say who it legally is. Required by the Ecommerce Regs. |
| 2 | **Ask the 15 delivered customers for a review**, on WhatsApp | 2 reviews across 72 products is the biggest hole in the funnel. The email pipeline works — 15 of 15 sent, 2 came back. Ten reviews unlocks the Trustpilot widgets already wired up. |
| 3 | **Confirm the Cloudinary `reviews` upload preset is Signed** | An Unsigned preset is a public write endpoint to the account. |
| 4 | **Set `TRACKING_ENV=production`** in the Hostinger panel | Server-side conversions currently rest on a fallback named after a host you left. |
| 5 | **Verify `TRUSTPILOT_INVITE_BCC` survived the move** | If it did not, no Trustpilot invitations are going out at all. |
| 6 | **Supabase → enable leaked-password protection** | One dashboard toggle. |
| 7 | **Remove the stale worktree** `.claude/worktrees/jovial-blackwell-01f9dc` | 109 MB. The fix it held is ported and verified. |
| 8 | **Check the Google Business Profile** matches the corrected address | See §2. |

```bash
git worktree remove --force .claude/worktrees/jovial-blackwell-01f9dc
```

### Can wait

- **`npx supabase db pull`** on a clean branch — the migrations folder is a change
  log, not a rebuildable schema. Read the diff before committing; it rewrites all
  63 files.
- **Category pages for Chesterfield, 2-seater and velvet.** ~33k searches/month for
  Chesterfield alone, and the stock already exists. The cheapest SEO wins available.
- **Sofa beds** — 301k searches/month, the biggest term in the market. A range
  decision, not a page.
- **Area pages** for Blackburn, Accrington, Burnley, Preston. Competitors have them.
- **The 1-year guarantee** against competitors' ten years. Not a page problem.
- `sims-footstool` has no dimensions; the `Test` product from June is still in the
  catalogue.
- Two prose passages in `llms.txt` still write "2-4 working days" by hand rather
  than reading `PROMISES.delivery.timingLong`. Low risk, mid-sentence, left alone.

---

## Three regressions I introduced and caught

Recorded because the fact they were caught is the argument for verifying rather
than assuming.

1. A rewritten cookie banner returned `null` as the server snapshot, which **flashed
   the banner on every page load** for anyone who had already answered. Fixed with
   an `UNKNOWN` sentinel.
2. The same rewrite fired `CONSENT_GRANTED_EVENT` **twice**, which would have re-run
   attribution capture. Fixed with a mount-only effect.
3. Widening the carousel dots **overflowed the homepage to 430px**. Reverted, with
   the reasoning left in the file.

One theory was also killed by the data: the 25% cancellation rate is **not** caused
by made-to-order lead times. It is exactly 25% for stocked products too.

---

*Final state: `npm run build`, `npm run lint` and `npx tsc --noEmit` all clean.
52 static pages generated. Pushed to `master` as `779ddbe`.*
