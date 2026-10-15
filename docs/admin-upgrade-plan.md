# Admin upgrade plan

Written 15 Oct 2026. It adapts another sofa shop's admin brief
(`docs/admin-upgrade-brief.md`) to this shop. Its feature numbers (A1, E3, …)
are used everywhere below. **Where the brief and this plan disagree, this plan
wins**, and the repository's own code and decisions win over both.

The brief's first step is a review of what we already have. This document is
that review: the feature table (§3), the brief's six checks (§4), Muaz's
decisions (§5) and the phases (§6). Each phase is a single prompt, and
the prompts are in the published plan page and in §6.

---

## 1. Ground rules for every phase

1. **Keep everything the admin does today.** §2 lists what we have that the
   brief never mentions. All of it stays and keeps giving the same results.
   If a brief feature overlaps one of ours, extend ours instead of building a
   second copy. Before you restructure a page, list what's on it, and check
   each item again afterwards.
2. **Keep the admin's look**: stone/zinc neutrals, the orange-500 accent,
   `rounded-sm`, uppercase tracked labels, lucide icons, and the existing
   wording style. New pages should look as if they had always been there.
3. **The shop is live.** It takes real orders, emails real customers, pushes
   every order to OrderFlow through database triggers (`orderflow` schema,
   Vault secrets `orderflow_ingest_url` / `orderflow_ingest_key`) and reports
   to Meta and Google.
   - Database changes only ever add. Give new columns defaults and backfill
     them, and check that existing rows pass a new rule before enforcing it.
     Never drop or rename anything the running code still reads.
   - Run every migration first inside `begin; … rollback;` through the
     Supabase MCP `execute_sql`, then apply it with `apply_migration`. Name
     the file after the version it was applied as (commit e1dfff9).
   - When you add a parameter with `create or replace`, PostgREST gets an
     overload it can't choose between, so drop the old signature in the same
     migration. `npm run test:tracking` replays migrations into PGlite, and
     it breaks on CRLF line endings in migrations that edit stored function
     text.
   - Links customers already hold must keep working: `/confirm-order/[id]`,
     tracking (8-character reference plus postcode), review links, and the
     8-character order code staff use on WhatsApp.
4. **Never change these without Muaz's yes:** prices, totals, the order
   lifecycle, what OrderFlow, Meta or Google receive (or how and when they're
   sent), what customers see or are emailed, and deleting data.
5. **Admin rights are checked in four places:** `src/proxy.ts`, the admin
   layout, every admin server action (`requireAdmin()` / `adminGuard()` in
   `src/utils/auth.ts`), and the database (RLS via `is_admin()`, and a check
   inside every staff function). Admin screens use the session client
   (`@/utils/supabase/server`). The service-role client is only for the
   server's own work: cron jobs, checkout, logging an email, sending a
   conversion.
6. **New owner-rights (SECURITY DEFINER) functions** go in a `private` schema
   that the API doesn't expose. The admin calls a thin `public` wrapper.
   Every new function starts with execute revoked, then gets granted only to
   the roles that need it.
7. **Business rules live in the database.** The browser sends ids and
   quantities, never prices. The database refuses with short codes, in the
   existing style (`NOT_AUTHORISED`, `NOT_FOUND`, `BAD_STATUS_CHANGE`, …), and
   the action turns each code into one plain sentence.
8. **Buttons work one of two ways**, following what's already here:
   - a plain `<form action>` that comes back to the same page with a green
     or red banner;
   - a `useActionState` button that confirms when it matters, shows
     "Working…", then the result (see `EmailLeadButton.tsx` and
     `MetaConversionButton.tsx`).

   Every action checks its input with zod.
9. **Emails caused by an admin action** go out in `after()`, so a slow mail
   server never holds up or undoes the change. Once the email log exists
   (Phase 3), every send is logged.
10. **After a catalogue or settings change**, refresh the shop's cache
    (`revalidatePath` / `updateTag` / `revalidateTag`, as `inventory.ts` and
    `videos.ts` already do).
11. **Rules are small pure functions with tests.** Use
    `node --test scripts/*.test.cjs`, and the PGlite harness for anything in
    SQL. For example, a test checks that the admin offers exactly the status
    moves the database allows.
12. **Phone first**, because the owner and the team work from phones:
    - check every screen at 375px;
    - tap targets at least 44px, inputs at 16px;
    - a label on every input;
    - state shown in words as well as colour;
    - empty states that say what to do next;
    - money in tabular figures, British English, UK dates;
    - every time shown in UK and Pakistan time.
13. **Admin pages stay `noindex`** (the admin layout already sets this) and
    load no tracking.
14. **Shipping a phase.** Run `npm run lint`, `npx tsc --noEmit`,
    `npm run test:tracking`, `npm run test:admin`, `node --test scripts/journey-analytics.test.cjs`
    and `npm run build`. Then `git fetch`, rebase if master moved
    (hassanali1864 also pushes, so rerun the checks after a rebase), and push
    to master. Never force-push.
15. **End every phase with three parts**:
    - **What I did**, in prose;
    - **What I need from you**: decisions, dashboard toggles, emails;
    - **What's next**: the next phase's prompt.

    No screenshots, terminal output or check-lists to prove it. Muaz has asked
    not to be handed verification work, so the brief's "what to check" part
    is left out.

**Status words.** The database values never change. The admin shows them as:

| DB value | Admin | Customer already sees |
| --- | --- | --- |
| pending_cod | Waiting to confirm | Order received |
| confirmed | Confirmed | Confirmed |
| processing | Processing | Being prepared |
| shipped | On its way | Out for delivery |
| delivered | Delivered | Delivered |
| cancelled | Cancelled | Cancelled |

---

## 2. What we have that the brief doesn't mention (all of it stays)

- **Admin → Meta**: Purchase and OrderDelivered are sent by hand per order,
  with Pending/Sent filters and the "Meta attributed" and "purchase sent"
  badges on order cards.
- **Admin → Journeys**: journey analytics and its CSV export (built by
  hassanali1864).
- **Order card extras**:
  - offer details (code, tier, offer source);
  - the distance delivery fee and its region;
  - `/build` customisation lines;
  - fabric code for the R&S purchase order;
  - "Call to confirm" for made-to-order items;
  - the "Ask for a Trustpilot review on WhatsApp" button.
- **Manual order form extras**:
  - WhatsApp message-time matcher;
  - lead reference (`UKSS-LD-…`);
  - custom line titles;
  - agreed price per line.
- **Shop emails**:
  - new-order email with the "Ask Customer to Confirm Order" WhatsApp
    button (the `/confirm-order` link must stay in it);
  - "customer confirmed" email;
  - a pre-written WhatsApp prompt for each status change;
  - swatch emails, review requests, the weekly digest.
- **Checkout reminders**: Waiting/Done views, the 48-hour offer hold shown on
  the lead, reminder email and WhatsApp message.
- **Catalogue**:
  - variant groups, main collections, subgroup labels;
  - `was_price`, origin, made to order;
  - the video library with its placements and signed uploads.
- **Feeds**: `/feeds/google-merchant.xml`, `/feeds/meta-catalog.xml`,
  `/feeds/meta-ad-links.json`.
- **Database jobs and triggers**:
  - the OrderFlow push triggers, plus `orderflow-resend-recent` every 15
    minutes;
  - `ukss-journey-retention-v1` daily;
  - the Google phase-2b lifecycle trigger and Sheets sync runs;
  - checkout-recovery auto-convert;
  - review stats maintenance;
  - `reporting` views.
- **GitHub Actions jobs**: review requests (10:00 UTC daily), recovery
  cleanup (08:30 daily), weekly digest (Mondays 07:00).
- **Admin PWA**: manifest scoped to `/admin`, with the browser's install
  prompt held back.
- **Differences we keep on purpose**:
  - deleting a video also deletes its Cloudinary file (L2 keeps the file);
  - customers are emailed at the Processing stage too (E14 doesn't email);
  - Meta conversions are sent by button and never on a status change (N3).

---

## 3. Feature by feature

Have = works today. Partly = some of it exists. Missing = nothing yet.

### A. Access and security
| ID | Now | Where it lives | Plan |
| --- | --- | --- | --- |
| A1 allowlist by email | Partly | `admins` (id, created_at), one row; `is_admin()` | Extend: email, name, active, claimed_at (no role: decision 4). Link on first confirmed sign-in. Keep `is_admin()` name and signature. `proxy.ts` reads `admins` directly; switch it to `is_admin()`. |
| A2 four layers | Partly | Proxy ✓, actions ✓, RLS ✓; **admin layout has no check** | Add the layout check, plus a test that every admin action calls a guard |
| A3 safe sign-in | Partly | `/login` shared with customers; shows Supabase's own error text; no rate limit; no return-to | One message, 10 tries per 15 min per device and per email, safe `next=` redirect |
| A4 don't reveal admin | Partly | Signed-in non-admin is redirected to `/` | Show the shop's 404 instead; customer sign-in and `/account` unchanged |
| A5 private schema | Missing | 9 owner-rights functions in `public`; advisor shows 12 warnings | Move behind `public` wrappers, one function at a time (Phase 5) |
| A6 Cloudinary uploads | Partly | CSP already allows api.cloudinary.com. **Product and category photos upload through an unsigned preset**, so anyone can upload to the account. | Sign uploads on the server, as videos already are |

### B. Layout and navigation
| ID | Now | Where | Plan |
| --- | --- | --- | --- |
| B1 desktop sidebar | Have | `AdminSidebarClient.tsx` | Add the signed-in email |
| B2 phone tab bar | Partly | 10 tabs that scroll sideways | Home · Orders · Leads · Catalogue · More (decision 1), plus a More page with one-line notes |
| B3 home-screen install | Have | `/admin/manifest.webmanifest`, excluded from the proxy | Leave |
| B4 printing hides menus | Missing | — | Print CSS |
| B5 two time zones | Partly | UK · PK on Orders and Meta; Leads shows UK only | One shared helper on every page |

### C. Home
| ID | Now | Where | Plan |
| --- | --- | --- | --- |
| C1 WhatsApp/phone order button | Partly | The form lives on Orders | Button on Home |
| C2 four tiles | Partly | Total revenue / Pending / Leads waiting / Active products | Needs attention / Waiting to confirm / To collect / On sale; real orders only |
| C3 "Waiting for you" strip | Missing | — | Samples, messages, reviews, reminders, enquiries |
| C4 health card | Missing | — | Phase 3 |
| C5 latest five orders | Missing | — | Add |

### D. Orders list
| ID | Now | Where | Plan |
| --- | --- | --- | --- |
| D1 filters with counts | Have | `admin/orders/page.tsx` | Add a Test filter; Needs attention excludes tests |
| D2 tiles | Have | Same four tiles | Exclude tests |
| D3 search | **Missing** | — | Code (8-char and full id), name, email, postcode with or without the space, phone with or without spaces |
| D4 20 per page | Have | Newer/Older | Leave |
| D5 order cards | Partly | Each card is the whole order, very long on a phone | Slim card that links to the order's own page |
| D6 messages | Partly | Empty state ✓; no banner after a delete | Add the banner |

### E. One order
Today the whole order sits inside its list card. E1–E13 move to
`/admin/orders/[id]`, and the list keeps an `#id` anchor redirect so old links
still land.

| ID | Now | Plan |
| --- | --- | --- |
| E1 header | Partly | Code, status, source, made-to-order and Test tags, total in large type |
| E2 next-step button | Have | Add the "usually the customer confirms from their WhatsApp link" hint on waiting orders |
| E3 pre-written WhatsApp | Partly: the shop email carries one per status; the card's button opens a blank chat | One message per status on the page, plus a "Tell {name} on WhatsApp" banner after a change that says whether they were emailed |
| E4 moved-back warning | Have | Leave |
| E5 customer | Partly: no tap-to-call; **the customer's notes aren't shown on the card** | Tap-to-call, WhatsApp, email, address with the postcode in bold, preferred day, notes, WhatsApp reference |
| E6 items and money | Partly | Lines unfolded; "To collect on delivery" in bold; full breakdown of the extras |
| E7 copy / print / edit | Have | Leave; delivery note in Phase 7 |
| E8 review | Partly: Trustpilot WhatsApp ask ✓, cron email ✓ | Show whether the review email went; "Send now" (asks first if already sent); "Copy review link" |
| E9 OrderFlow per order | Missing | Each send with OrderFlow's answer, and "Send to OrderFlow now" (Phase 3 records the answers) |
| E10 timeline | Have | Add who confirmed (customer or staff) |
| E11 history and notes | Missing | Phase 5 table, shown here, with an "Add a note" box |
| E12 where it came from | Partly: tracking badges ✓; `manual_acquisition_*` columns exist but there's no form | Show the tracking, plus a staff override form recorded in the history |
| E13 corrections | Partly: status dropdown, cancel reason and delete ✓ | Moves limited to what the DB allows; test flag; delete per decision 9 |

### F. Order rules in the database
| ID | Now | Plan |
| --- | --- | --- |
| F1 allowed moves | Missing: any move, including back to waiting and reopening cancelled | Trigger with `BAD_STATUS_CHANGE`, per decision 5 |
| F2 stamp once | Partly: stamped once in app code, not enforced; who confirmed isn't recorded | Enforce in the DB; add `confirmed_by` |
| F3 history table | Missing | `order_events`, filled by trigger; older orders start empty |
| F4 one way to change status | Missing: admin updates the row; customer uses `confirm_order()` | `change_order_status()`; `confirm_order()` goes through it |
| F5 test flag | Partly: tests guessed from campaign `offer-test` or "test" in the cancel reason; 1 order matches | `is_test` + `test_reason`; excluded from reports, tracking and the digest (decisions 6, 7) |
| F6 readable number | Missing | Decision 8 |
| F7 deleting | Partly: any order can be deleted, using the service key | Decision 9 |
| F8 staff functions | Partly: `place_manual_order` ✓ and `update_order_details` ✓ (both check admin) | Add status, test flag, note, attribution, delete test order |
| F9 DB tests | Partly: PGlite harness exists | Add order-rule tests, including "OrderFlow payload unchanged" |

### G. WhatsApp and phone orders
| ID | Now | Plan |
| --- | --- | --- |
| G1 new order form | Have, except: WhatsApp only (no phone choice), no test tick, no prefill from an enquiry | Add those three |
| G2 order lines | Have: product, fabric, quantity, agreed price | Add the SKU to the picker label |
| G3 database totals | Have | Leave |
| G4 edit in place | Have (lines updated by `item_id`) | Leave; move it onto the order page |

### H. Delivery note
| ID | Now | Plan |
| --- | --- | --- |
| H1 driver's note | Partly: the print is an **invoice** ("Total due") | Keep the invoice; add a driver's note with floor/lift, assembly, removal seats, what to collect, a signature space, and TEST ORDER when it is one |

### I. Leads (one page with tabs)
| ID | Now | Plan |
| --- | --- | --- |
| I1 samples | Have, on its own page `/admin/swatches` (8 waiting) | Becomes a tab; the old URL redirects |
| I2 messages | Missing: the contact form only emails | Store and list them (decision 10) |
| I3 WhatsApp enquiries | Missing: 271 recorded, 34 became orders, no screen | Tab with search, "Take this order" and an "Ordered #code" tag |
| I4 basket reminders | Have | Enforce "email only once"; leave the rest |
| I5 newsletter | Missing: 2 confirmed, 9 waiting | Counts, plus copy confirmed emails |
| I6 store messages | — | Decision 10 |

### J. Reviews
| ID | Now | Plan |
| --- | --- | --- |
| J1 display | Partly | Stars read as "4 out of 5", links to the product and order, Test tag |
| J2 Publish / Hide / Delete | Partly: no Hide | Add Hide; Delete asks first |
| J3 cache and stats | Have (trigger + revalidate) | Leave |

### K. Catalogue
| ID | Now | Plan |
| --- | --- | --- |
| K1 product list | Partly: cards with price and colours | Photo, flags, search, filters, totals |
| K2 editor | Partly: most fields ✓ | Add search title and description with counters, copy as new, an unsaved-changes warning, typed-DELETE for products never ordered |
| K3 one transaction | Missing: several separate writes | `save_product()` in the DB; colourways ever ordered get hidden, not deleted |
| K4 photo picker | Partly: upload only, unsigned | Signed upload (Phase 1), paste a link, pick from photos already used |
| K5 structure | Partly: categories can only be added and deleted (no edit); **no fabric library screen** (69 fabrics, edited by SQL) | Category edit; fabric collections and colours; refuse to delete what's in use |
| K6 product types | — | Decision 16: no change |

### L. Videos
| ID | Now | Plan |
| --- | --- | --- |
| L1 fields | Have | Leave |
| L2 deleting | Different: our delete also removes the Cloudinary file | Keep ours |

### M. Settings (`/admin/settings`)
| ID | Now | Plan |
| --- | --- | --- |
| M1 shop settings table | Missing: figures live twice, in `src/constants/delivery.ts` (display) and inside `place_order` (charging); offer amounts in `src/utils/offers/constants.ts`; distance fees in `delivery_distance_fees` | `shop_settings` read by `place_order` and the display, filled with **exactly today's figures**, plus a test that the same basket gives the same total |
| M2 offer on/off | Missing: every visitor gets the 48h offer since 12 Oct | Switch: off stops new offers; offers already given run out on their own date |
| M3 offer codes | Missing: SOFAEXTRA is written into the DB function | `offer_codes` table, with today's code as its first row |
| M4 OrderFlow card | Missing | Connected? on/off, send a test, latest answers |

### N. Tracking
| ID | Now | Plan |
| --- | --- | --- |
| N1 what's set up | Missing | Ticks only, never values |
| N2 modes | Partly: one production switch (`TRACKING_ENV ?? VERCEL_ENV`) | Dry run / Test / Live, defaulting to Live on production |
| N3 Purchase sending | Have, by button | Decision 12 |
| N4 Purchase queue | Have: Admin → Meta | Add Hold, Don't send, and Meta's reply from `conversion_events` |
| N5 cancelled after sending | Partly: warning on each order card | Add a red list on the Meta page |
| N6 exclude this device | Missing | Staff-device cookie that tracking respects |
| N7 latest events | Partly: `conversion_events` records them | 30-day viewer, personal data shown hashed |
| N8 never count tests | Partly | Test flag, cancelled, staff devices |

### O. Ad links
| ID | Now | Plan |
| --- | --- | --- |
| O1 feed card | Partly: feeds exist, no admin page | Address, count, what's left out and why |
| O2 URL parameters | Missing | Copy block |
| O3 tagged links | Partly: `/feeds/meta-ad-links.json` | Show and copy them |
| O4 profile links | Missing | Add |
| O5 test ad link | Partly: the `offer-test` campaign | Make it explicit |

### P. Status page
| ID | Now | Plan |
| --- | --- | --- |
| P1 checks | Missing | Database, environment, server key (actually try it), catalogue, orders, email, address lookup, photo uploads, jobs, tracking, feeds, OrderFlow, Google, Trustpilot, Sheets sync |
| P2 one function | Missing | One RPC collects, one pure function decides; Home, Status and the hourly alert all use it |

### Q. Background work
| ID | Now | Plan |
| --- | --- | --- |
| Q1 email log | Missing | `email_log`, written by `deliver()` in `src/utils/email.ts` |
| Q2 jobs in pg_cron | Partly: OrderFlow resend and journey retention are already pg_cron; three jobs are on GitHub Actions | Move them one at a time with a one-time ticket; keep the workflow until each job has run from the DB |
| Q3 hourly alert | Missing | Alert on break, a reminder after 24h, and on fix (decision 14) |
| Q4 uptime link | Missing | `/api/health`: 503 or 200, a count only, rate-limited, plus UptimeRobot steps |
| Q5 weekly summary | Have: sessions, sources, funnel, landing pages | Add confirmed orders and their value by campaign and ad; real orders only |

### R. OrderFlow monitoring
| ID | Now | Plan |
| --- | --- | --- |
| R1 record replies | **Missing.** pg_net keeps answers for about 6 hours. In the last day: 267 accepted, **9 refused with "ingest failed"**, and nobody saw. | `orderflow.sends` table: request id, order, time, by hand?; a job copies each answer in |
| R2 re-send only what's needed | Missing: every order touched in the last 3 days is re-sent every 15 minutes (about 270 sends a day) | Decision 13 |
| R3 Vault | Have | Leave |
| R4 no change without a yes | Rule | — |

---

## 4. The brief's six checks (run 14–15 Oct 2026)

1. **Server-side tracking switch.** `isServerTrackingEnabled()` reads
   `TRACKING_ENV ?? VERCEL_ENV`, and it is working: 29 Meta Purchase sends
   in the last 14 days, the latest on 13 Oct. It still depends on the
   Vercel-named variable on Hostinger. **Muaz:** set `TRACKING_ENV=production`
   there.
2. **Cookies.** None depend on a host-specific variable any more. Every
   `secure` flag follows the real request protocol, fixed after the move to
   Hostinger. Clean.
3. **GitHub Actions jobs.** Review requests, recovery cleanup and the weekly
   digest run from `.github/workflows/scheduled-jobs.yml`. The repo is
   active, so GitHub's 60-day switch-off isn't close, but nobody is told if a
   run fails. The run history couldn't be read from here (no `gh` CLI).
   Phase 4 moves them.
4. **Service key in admin work.** Every admin action checks admin rights
   itself. The service key is still used by:
   - Home (the leads count);
   - the Leads page and its actions (`checkout_recovery_leads` has no admin
     policy);
   - `deleteOrder`;
   - one Google step in the manual order.

   Phase 1 adds admin RLS policies so the first three can use the session
   client. `deleteOrder` moves into a database function in Phase 5.
5. **Security advisor.** No errors. Twelve warnings say owner-rights functions
   can be called through the API. Some are public on purpose (`confirm_order`,
   `track_order`, `order_for_confirmation`, `request_swatches`, `is_admin`);
   `place_manual_order` and `update_order_details` check admin rights inside.
   Thirteen info notes are service-only tables with no policy (on purpose).
   Leaked-password protection is off (Muaz's toggle). Phase 5 clears the
   function warnings.
6. **Public sign-ups.** The shop has customer accounts (28, the newest on
   10 Oct), so sign-ups stay on.

---

## 5. Decisions (answered by Muaz, 15 Oct 2026)

Every phase follows these. Where an answer differs from the brief, the answer
wins.

1. **Phone tab bar:** Home · Orders · Leads · Catalogue · More. More holds
   Meta, Journeys, Reviews, Videos, Categories, Status, Settings and Ad links.
2. **Second time zone:** Pakistan, on every page.
3. **Admins:** one admin, Muaz. The allowlist (A1) is still built so another
   address can be added later, but nobody else is added now.
4. **Who may change prices and settings:** whoever is an admin. There is no
   owner/staff role, so don't add one.
5. **Status moves:**
   - Waiting to confirm → Confirmed or Cancelled;
   - Confirmed, Processing, On its way and Delivered move freely between
     each other, or to Cancelled;
   - Cancelled is final, except that an admin may reopen a cancelled order
     to Confirmed with a reason.
6. **Test orders:** only one, Saad's of 10 Oct (campaign `offer-test`).
   No other existing order is a test.
7. **Test orders and OrderFlow:** keep it as it is. Every order goes to
   OrderFlow, tests included, unmarked. There's no "send test orders too"
   switch, and OrderFlow's payload is not touched.
8. **Readable order number:** no new number. Keep the 8-character code and
   show OrderFlow's own number (`order_number`) beside it once Phase 3
   records its answers.
9. **Deleting orders:** any order can still be deleted, as today. Keep the
   two-step confirmation; the delete moves into a database function in
   Phase 5, but which orders it allows doesn't change.
10. **Contact-form messages:** store them as well; the email carries on.
11. **Processing email:** keep sending it.
12. **Meta Purchase:** stays a button. Add Hold, Don't send and Meta's
    reply.
13. **OrderFlow re-sending:** yes. Re-send only orders OrderFlow hasn't
    accepted since their last change.
14. **Health alerts:** to the inbox that gets new-order emails
    (`ADMIN_EMAIL`).
15. **Ad links page:** build it.
16. **Product types:** no change; build on the current tables.

### Muaz's end list

Muaz does every one of these in one go after the last phase (15 Oct 2026).
Each phase adds what it creates here, instead of asking him mid-phase. When
he asks, give them as numbered steps with exact clicks.

1. Hostinger → environment variables: add `TRACKING_ENV=production`.
   Then `VERCEL_ENV` can go. (From the health check, Oct 2026.)
2. Supabase → Authentication → Passwords: turn on leaked-password
   protection.
3. Cloudinary → Settings → Upload → Upload presets → `products`: set
   Signing mode to Signed. (Phase 1 already signs every upload, so this
   is safe at any time.)
4. Decide whether to stop Google/Meta tracking scripts loading on admin
   pages. The recommendation is yes, together with "exclude this device"
   in Phase 11. (Phase 2.)
5. UptimeRobot: watch the shop and get an email when it's down or a Status
   check is red. (Phase 4.)
   1. Go to uptimerobot.com and sign up for a free account with the email
      you want alerts at.
   2. Click **+ New monitor**.
   3. Monitor type: **HTTP(s)**.
   4. Friendly name: `UK Sofa Shop`.
   5. URL: `https://www.uksofashop.co.uk/api/health`
   6. Monitoring interval: **5 minutes** (the free plan's shortest).
   7. Alert contacts: tick your email.
   8. Click **Create monitor**.

   It reports "Up" when the page answers 200 and "Down" when it answers
   503 or doesn't answer at all. 503 means a Status check is red, or the
   hourly check has stopped. The page only says how many problems there
   are; open Admin → Status to see which. Expect "Down" straight away
   while the Google Ads sync (item 6) is red.
6. Google Ads offline conversions. Confirmed WhatsApp sales reach Google
   Ads through a Google Sheet, but copying them into the Sheet has only
   ever run once, by hand, on 2 Oct, and 19 sales are waiting (Status
   shows this red). Decide: copy them by hand again, or let a later phase
   automate it. Automating needs a Google service account that can edit
   the Sheet. (Phase 3.)
7. OrderFlow (optional; it's the OrderFlow app, not this shop). Its
   `ingest-order` function sometimes fails on a cold start with "JWT
   issued at future", which is a clock-timing hiccup. The same order is
   accepted on the next 15-minute re-send, so nothing is lost; fixing it
   in OrderFlow would stop the amber notes on Status. (Phase 3.)
8. Customer status emails: a yes or no to each of these (E14; nothing
   customers receive was changed without it). (Phase 7.)
   1. When staff mark an order confirmed, the customer gets "Order Status
      Updated: There has been an update to your order." Replace it with a
      proper "Order confirmed: we'll ring you to agree a delivery day".
   2. The cancelled email doesn't say why. Add the reason given on the
      order page (the brief's E13 wants it; the WhatsApp message already
      carries it).
   3. The on-its-way email doesn't say what to pay. Add "To pay on delivery:
      £X, in cash or by bank transfer", as the WhatsApp message does.
   4. Pressing a status that is already set sends that status's email
      again. Send nothing when nothing changed.
9. Fabric extra charges: yes or no (K5; not built, because it changes what
   customers pay). Today every fabric costs the same: the fabrics table has
   no price, and checkout adds nothing for the fabric chosen. The brief's
   fabric screen has an "extra charge" per fabric. Saying yes means a new
   column, the product page showing "+£X" on dearer fabrics, and checkout and
   OrderFlow charging it. (Phase 9.)

---

## 6. Phases

Each phase is one prompt, one session, and one push to master. Skip a phase
if it's already done.

| # | Phase | Features | Done when |
| --- | --- | --- | --- |
| 1 | Access and sign-in | A1–A4, A6, service-key fixes from check 4 | Signed out goes to /login; a customer account gets "page not found"; an admin action called as a non-admin is refused (tested by impersonating the role); product photos upload signed; Home and Leads use no service key |
| 2 | Layout and navigation | B1–B5 | Five-tab bar + More at 375px, nothing hidden behind it; More stays highlighted; print shows no menus; every time on every page shows UK · PK |
| 3 | Email log, Status, OrderFlow replies | Q1, P1, P2, C4, R1, R3 | Every email appears in the log; Status shows each check green/amber/red in words; the 9-a-day OrderFlow refusals show up with their answer; Home shows the health card |
| 4 | Jobs and alerts | Q2, Q3, Q4, R2 (if decision 13 is yes) | Each moved job has run from pg_cron and shows its real result on Status; breaking a setting sends one alert and then one "back to normal"; `/api/health` answers 503/200 |
| 5 | Order rules in the database | F1–F5, F7–F9, A5, F6 (if wanted) | DB tests pass; every allowed move works and every refused move is refused; stage times never move; a non-admin is refused everywhere; OrderFlow and tracking receive exactly what they did before; the advisor shows only the leaked-password note |
| 6 | Orders list and order page | D1–D6, E1–E13, G1–G4 | A test order can go through every status on a phone, with the right messages and emails, and history shows each step; every feature from the old order card still works |
| 7 | Home, delivery note, emails, weekly summary | C1–C3, C5, H1, E14, Q5 | Home shows the four tiles, the waiting strip and the latest orders; the driver's note prints alone; the digest adds orders by campaign and ad |
| 8 | Leads, reviews, videos | I1–I6, J1–J3, L1–L2 | Each tab's buttons work and update its count; a reminder can be emailed only once; `/admin/swatches` still lands on Samples; Hide works |
| 9 | Catalogue | K1–K6 | An edit shows in the shop on the next visit; an ordered colourway is hidden, not deleted; an ordered product can't be deleted; a phone upload works; fabrics are editable |
| 10 | Settings | M1–M4 | The same basket gives the same total as before; a changed figure changes the next quote; the offer switch stops new offers only |
| 11 | Tracking and ad links | N1–N8, O1–O5 | Every Purchase waiting or sent is visible with Meta's reply; nothing about what's sent has changed without a yes |

The full prompt for each phase is on the published plan page. Each prompt
starts with "Read docs/admin-upgrade-plan.md", so a new session gets
everything above.
