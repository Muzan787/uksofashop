# Admin upgrade

I want to upgrade this shop's admin (`/admin`). This brief lists every feature I want it to have. The admin already has some of them, has some only in part, and is missing others. Your job is to work out which is which, keep everything the admin already does, and add what's missing. When something needs a decision, ask me; don't decide it yourself.

---

## 1. Rules

1. **Keep everything the admin does today.** Every existing page, button, filter, email, print, export, integration (OrderFlow, Meta, Google, Trustpilot, Sheets or anything else) and scheduled job must keep working and give the same results.
   - If a feature in this brief overlaps one that already exists, extend the existing one. Don't build a second copy.
   - Before you restructure a page (for example, splitting one long page into several), list every feature on it. Afterwards, check each one still works.
   - Never remove something because this brief doesn't mention it.
2. **Keep the admin's look:** its colours, fonts, icons and the way it words things. New pages should look as if they were always there.
3. **The shop is live.** It takes real orders, emails real customers, sends orders to OrderFlow and reports to Meta and Google. So:
   - Database changes only add things and must work with the code that's already running. Add columns with defaults and fill them in for existing rows. Check that existing rows pass a new rule before you enforce it. Never drop or rename anything the running code still reads.
   - Try every database change first in a transaction that rolls back (or on a Supabase branch or staging project, if there is one). Only then apply it to production.
   - Links customers already have (order confirmation, tracking, review links) and the order codes staff already use must keep working.
4. **Ask me** wherever this brief says **Ask me**. Also ask before any change that would alter what customers see, what they're charged, what OrderFlow, Meta or Google receive, or that would delete data. Put your questions together in one numbered message, each with your recommendation, so I can answer quickly.
5. **The repository's own `CLAUDE.md`, README and rules come first** if they disagree with this brief.
6. **Check the current docs** for Next.js, Supabase (row level security, pg_cron, pg_net, Vault), Cloudinary and the hosting provider rather than relying on memory. If a feature needs a newer version of a framework than the shop runs, make the upgrade its own step first.
7. **One phase per prompt,** in the order in section 6. End every phase with four parts, in this order: **what I did**, **what I need from you**, **what to check** (a short list I can try on my phone, on the live site) and **what's next** (the prompt for the next phase). Run lint, type checks, tests and the build before every commit. Don't make screenshots or demos just to show something.

---

## 2. First prompt: what we already have

Do this before you write any code:

1. Read the whole admin: its pages, server actions, components, the database (migrations or schema), the email code and the scheduled jobs.
2. Make a table with one row per feature in section 4, using my numbering (A1, A2…). For each row give: **Have**, **Partly** or **Missing**; where it lives now; and what you'd do (leave it, extend it, or add it).
3. Make a second list of everything the admin does today that this brief doesn't mention. All of it stays exactly as it is.
4. Run the checks in section 5 and tell me what you find.
5. List every question: the **Ask me** items, plus any of your own. Put your recommendation with each one.
6. Adjust the phases in section 6 to what's actually missing, and skip any phase that's already done.

Then stop and wait for my answers.

---

## 3. How to build it (applies to every feature)

- **Admin rights are checked in four places,** so a mistake in one never opens the admin:
  1. The proxy (middleware) sends anyone who isn't signed in to the sign-in page.
  2. The admin layout checks that the signed-in account is an admin.
  3. Every server action checks admin rights before it does anything. Server actions can be called from outside a page, so the layout's check alone isn't enough.
  4. The database checks again, in its row level security rules and inside every staff function.
- **The admin reads and writes as the signed-in admin,** under row level security. The secret (service-role) key is only for the server's own work, such as placing an order, logging an email or sending a conversion. Admin screens never use it.
- **Database functions that run with the owner's rights** live in a `private` schema the API doesn't expose. The admin calls a thin wrapper in `public`. Every new function starts with no execute rights; grant only the roles that need it.
- **Business rules live in the database:** prices, totals, order status moves and deleting rules. The browser sends identities and quantities, never prices.
- **The database refuses with short codes** (for example `NOT_AUTHORISED`, `BAD_STATUS_CHANGE`, `NOT_A_TEST_ORDER`). The admin turns each code into a plain sentence.
- **Buttons work in one of two ways:**
  - A form that works without JavaScript and comes back to the same page with a green "done" or red "error" banner.
  - A one-action button that can ask "Are you sure?", shows "Working…", then shows the result and refreshes the page.
- **Every action checks its input** (for example with zod), and the database's own constraints back up every rule.
- **Emails caused by an admin action** (status updates, review requests) are sent after the page has responded. A slow mail server must never hold up or undo the change. Every send is logged (feature Q1).
- **After a catalogue or settings change,** refresh the shop's cache so customers see it on their next visit.
- **Keep rules as small pure functions with tests.** For example, a test checks that the admin offers exactly the status moves the database allows.
- **Phone first:**
  - Tap targets at least 44 px, and inputs at 16 px so iPhones don't zoom.
  - A label on every input; the current tab or filter marked for screen readers.
  - States shown as colour and words, never colour alone.
  - Empty states that say what to do next.
  - Money in aligned figures.
  - British English and UK dates.
- **Admin pages are hidden from search engines** (noindex) and load no tracking scripts.

---

## 4. The features

### A. Access and security

- **A1. An admin allowlist by email.** A table of admin email addresses, holding the email, the linked account, a name, whether it's active, and when it was claimed.
  - I add an email to the table and create the account myself.
  - On first sign-in, an account with a confirmed email is linked to its allowlisted address.
  - From then on, "is admin" means: this account is linked and active. Never trust anything stored in the sign-in token.
  - Keep the existing "is admin" database function's name and signature, so existing security rules keep working.
- **A2. The four layers of checks** in section 3, on every page and every action.
- **A3. Safe sign-in:**
  - One message for every failure: wrong password, unknown email, or an account that isn't an admin (sign that account straight back out).
  - At most 10 attempts per 15 minutes, per device and per email address.
  - After signing in, the admin goes back to the page they asked for, but only to addresses on this site.
- **A4. Don't reveal the admin.** Someone who isn't signed in goes to the sign-in page. A signed-in account that isn't an admin (for example a customer account) sees the shop's normal "page not found". If the shop has customer accounts, their sign-in keeps working exactly as it does now.
- **A5. Owner-rights functions in a `private` schema,** with `public` wrappers (section 3). Supabase's security advisor shows no findings before or after each phase.
- **A6. Photo uploads straight to Cloudinary** are allowed in the Content Security Policy on admin pages only.

### B. Layout and navigation

- **B1. Desktop:** a fixed sidebar with the shop name and "Admin", the signed-in email, every section, and Sign out at the bottom.
- **B2. Phones:** a bottom tab bar with five tabs: **Home, Orders, Leads, Catalogue, More**. It respects the phone's safe area, and nothing on the page hides behind it.
  - **More** lists the remaining sections, each with a one-line note ("Reviews · 3 waiting", "Status · Is everything working?"), then a Sign out button.
  - The More tab stays highlighted while you're on any of those sections.
  - **Ask me** which four sections go on the tab bar, if the current bar shows different ones.
- **B3. Install on a phone's home screen.** The admin has its own web app manifest, scoped to `/admin`, opening full screen at the dashboard. The browser must be able to fetch the manifest without being signed in.
- **B4. Printing** hides the menus.
- **B5. Two time zones.** Every time shows in UK time and Pakistan time, for example "14 Oct 10:05 UK · 14 Oct 14:05 PK", so the UK owner and the team in Pakistan mean the same minute. Keep this if it already exists. **Ask me** if the second zone should be a different one.

### C. Home (dashboard)

- **C1.** A **WhatsApp or phone order** button.
- **C2. Four tiles,** each a link:
  - **Needs attention:** real orders waiting to confirm, confirmed or processing. This is the highlighted tile.
  - **Waiting to confirm.**
  - **To collect:** the total of all real open orders (waiting, confirmed, processing, on its way).
  - **Products on sale.**
- **C3. "Waiting for you" strip.** It shows only when something is waiting, as chips such as "2 samples to post", "1 message", "3 reviews to check", "4 basket reminders". Each chip opens the right tab.
- **C4. Health card.** It lists only the checks that aren't green, in the Status page's own words (feature P), with an overall badge, or "Everything is working." It links to the full Status page.
- **C5. Latest orders:** the last five, with the order code, status, a Test tag, customer name, total and time.

### D. Orders list

- **D1. Filters,** each with its count: **Needs attention** (the default: waiting, confirmed or processing, real orders only), All, Waiting, Confirmed, Processing, On its way, Delivered, Cancelled and Test. On phones they scroll sideways.
- **D2. Tiles:** Needs attention, To collect, Processing, and On its way (with how many open orders have a preferred delivery day).
- **D3. Search** by order code (old and new formats), name, email, postcode (with or without the space) and phone.
  - A phone number typed without spaces still finds "07700 900123".
  - Strip anything that isn't a safe character before it reaches the database query.
- **D4.** 20 orders a page, with **Newer** and **Older** buttons.
- **D5. Each order as a card:**
  - Code and status badge, plus tags for where it came from (WhatsApp or phone), Made to order and Test.
  - Customer name and postcode, and the total.
  - The number of items, when it was placed (both time zones) and the preferred day.
  - A **WhatsApp {first name}** button that opens the chat.
- **D6. Messages:** a banner after a test order is deleted, and an empty state that says "Nothing needs your attention".

### E. One order (its own page)

- **E1. Header:**
  - The order code and status badge.
  - Tags: where it came from (if not the website), "Made to order: ring to confirm", and "Test: <reason>".
  - The total in large type.
- **E2. Next step.** One big button that moves the order on: **Mark confirmed**, **Start processing**, **Mark on its way**, **Mark delivered**.
  - When there's nothing left to do, it says "All done" or "Cancelled: no next step".
  - On waiting orders, a hint: usually the customer confirms from their email; mark it confirmed yourself only if they confirmed by phone or WhatsApp.
- **E3. WhatsApp messages written for you,** one for each status. Each opens WhatsApp to the customer with the message already filled in, in the shop's own voice:
  - **Waiting:** asks them to confirm, with the confirmation link.
  - **Confirmed:** asks which days suit them for delivery.
  - **Processing:** it's being prepared, and you'll be in touch about the day.
  - **On its way:** the driver will ring before arriving; the amount to pay, in cash or by bank transfer; the tracking link.
  - **Delivered:** thank you.
  - **Cancelled:** the reason, and "reply if this isn't what you expected".

  After any status change, a green banner says whether the customer was emailed ("No email on this order, so let them know on WhatsApp"), with a big **Tell {name} on WhatsApp** button.
- **E4. A warning when the status was moved back.** If an order reached a later stage than its status now shows, an amber note says when.
- **E5. Customer:**
  - Name; phone as a tap-to-call link, plus WhatsApp and email links.
  - The address, with the postcode in bold.
  - The preferred delivery day, their notes, and the WhatsApp reference.
- **E6. Items and money:**
  - Each line: quantity × name, the colour or the full fabric name and code, the SKU, and the line total.
  - Then: items total, the offer (code and amount taken off), delivery extras, and **To collect on delivery** in bold.
  - A breakdown of the delivery extras: upstairs (which floor, and whether there's a lift), assembly, and removal (how many seats). If staff agreed their own delivery charge, say "Delivery agreed with the customer".
- **E7. Buttons:**
  - **Copy order:** a plain-text block for OrderFlow or a message. It must work in older in-app browsers too.
  - **Delivery note** (feature H).
  - **Edit** (feature G), not shown for cancelled orders.
- **E8. Review** (delivered orders only):
  - Whether the review email has gone.
  - **Send the review email now**, which asks first if one has already been sent.
  - **Copy their review link**, for customers with no email address.
- **E9. OrderFlow:** each time this order was sent, with OrderFlow's answer (accepted, refused and why, or waiting for a reply), and whether it was sent by hand. A **Send to OrderFlow now** button; for a test order it says "marked TEST" and asks first.
- **E10. Timeline:** placed, confirmed (and whether by the customer or staff), processing, on its way, delivered, and cancelled (with the reason). Each step appears once it has happened, in both time zones.
- **E11. History and notes:**
  - Every event on the order: placed, status changed (from → to), details changed, test flag changed, notes.
  - Each says whether staff or the customer/system did it, and when.
  - An **Add a note** box ("what was agreed, a delivery slot…").
- **E12. Where it came from:**
  - The tracking saved with the order: source, campaign, Facebook or Google click, WhatsApp reference.
  - A staff override: Facebook or Instagram, Google, Came straight to us, Recommended by someone, or Something else, plus a note. It's recorded in the history.
- **E13. Corrections, folded away:**
  - **Change the status** to any move the database allows. A reason is required to cancel, and it goes in the customer's email.
  - **Mark as a test order**, with an optional reason, or **Not a test order**.
  - For test orders only: **Delete this test order**, after typing DELETE.
- **E14. Customer emails on a status change:** confirmed (when staff confirm it), on its way, delivered and cancelled. Processing is internal, so no email goes for it. Keep any emails the shop already sends at other steps.

### F. Order rules in the database

Before adding any of these rules, check the existing orders: statuses, missing values, and stage times that are out of order. Tell me anything that would break a rule.

- **F1. Allowed status moves,** enforced by a database trigger. A refused move gives `BAD_STATUS_CHANGE`.

  | From | May move to |
  | --- | --- |
  | Waiting to confirm | Confirmed, Cancelled |
  | Confirmed, Processing, On its way, Delivered | any of those four, or Cancelled (so mistakes can be corrected) |
  | Cancelled | nothing: it's final |

  **Ask me** if the current admin allows other moves (for example, reopening a cancelled order).
- **F2. Each stage's time is stamped once and never moved.** Who confirmed the order (the customer or staff) is recorded once.
- **F3. An order history table:** order, time, kind (placed, status changed, details changed, test flag changed, note), from and to status, which staff account did it (empty for the customer or the system), and a note. A trigger fills it, and the order page shows it (E11). Older orders simply start with an empty history.
- **F4. One way to change a status.** Every status change, from the admin buttons and from the customer's confirm link, goes through one database function that checks admin rights for staff.
- **F5. Test orders:** a test flag with a reason. Test orders never count in reports, tracking or the weekly summary.
  - **Ask me** which existing orders are tests. Draft a list from staff names and numbers, and orders with "test" in them.
  - **Ask me** whether test orders may go to OrderFlow, marked TEST: only by hand, or automatically with a switch in Settings (useful for trying the flow).
- **F6. A readable order number,** like `ABC-100101`, alongside the current code. **Ask me** whether we want it, which prefix, and whether OrderFlow agrees before what it receives changes. Old codes must still be searchable and their links must keep working.
- **F7. Deleting orders.** **Ask me**: only test orders may be deleted, and real orders are cancelled with a reason (my recommendation), or keep the current behaviour.
- **F8. Staff database functions,** each checking admin rights itself:
  - change status;
  - set the test flag;
  - add a note;
  - set where the order came from;
  - delete a test order;
  - take a manual order (priced by the database, with an agreed price allowed per line);
  - edit an order's details and lines (the database works out the totals again; a cancelled order can't be edited).
- **F9. Database tests** for these rules that roll themselves back. They should check that every allowed move works, every refused move is refused, the stage times never move, a non-admin is refused everywhere, and OrderFlow still receives exactly what it did before.

### G. WhatsApp and phone orders, and editing

- **G1. New order form:**
  - Choose WhatsApp or phone.
  - The WhatsApp reference, filled in automatically when I come from a WhatsApp enquiry (I3).
  - Name, UK phone, optional email, address, postcode.
  - Preferred day: from today up to a year ahead (staff may agree dates further out than customers can pick).
  - Notes, a delivery charge, and a "test order" tick box.
- **G2. Order lines:**
  - A product picker showing "name · colour · SKU (£price)", with live products only.
  - A fabric picker for made-to-order pieces.
  - Quantity, and **Agreed price each** (left blank, it uses the catalogue price).
- **G3.** The database works out every total. Each refusal shows as a plain sentence. After saving, the new order's page opens.
- **G4. Edit an order** with the same form, opened in place on the order page. Existing lines are updated rather than replaced.

### H. Delivery note

- **H1.** A printable page for the driver, with a Print button. Nothing else on the screen prints. It shows:
  - the shop name and "Delivery note";
  - the order code, the order date, and "TEST ORDER" if it's a test;
  - who and where: name, phone, address, and the postcode in bold;
  - the agreed day (or "as agreed by phone");
  - the floor and lift, assembly, and removal with the number of seats;
  - the items, with fabric and SKU;
  - **What to collect** (cash or bank transfer);
  - a space for a signature.

  Keep the current printout if it already does this; add only what's missing.

### I. Leads (one page, with tabs)

Each tab shows its count. Tabs that are queues have a "Show all" link.

- **I1. Samples:** "Ring or WhatsApp to take the fee, post them, then mark them posted." Buttons: **Paid and posted**, **Cancel** (asks first), **Back to waiting**.
- **I2. Messages** from the contact form: **Mark replied**, **Close without reply**, **Mark as new**.
- **I3. WhatsApp enquiries:** every tap on a WhatsApp button, with its reference, product, page and campaign. Searchable by reference.
  - **Take this order** opens the new order form with the reference filled in.
  - An "Ordered <code>" tag appears once the enquiry has become an order.
- **I4. Basket reminders:**
  - **Email the reminder:** only if they asked for email, and only ever once.
  - A WhatsApp link with the message already written, then **Reminded on WhatsApp**.
  - **Done.**
  - A reminder closes itself if the shopper orders.
- **I5. Newsletter:** counts of confirmed, waiting and unsubscribed, and **Copy confirmed emails**. Only confirmed addresses may be emailed.
- **I6.** **Ask me** whether to store contact-form messages, if today they're only emailed. I2 needs them stored.

### J. Reviews

- **J1. Each review shows:** its stars (read out as "4 out of 5" for screen readers), title and text, a link to the product and to the order, and a Test tag if it's from a test order.
- **J2. Buttons:** **Publish**, **Hide from the shop** and **Delete** (asks first). The page says: publish genuine reviews, good or bad; hide or delete only spam, abuse or private details.
- **J3.** Publishing or hiding refreshes the shop's cache. The product's review count and average stay correct automatically.

### K. Catalogue

- **K1. Product list:**
  - Each product shows its photo, type, size, colour swatches and flags (hidden, featured, made to order, missing photo, missing size).
  - Search by name, range, colour or SKU.
  - Filters: by type, and shown / hidden / needs attention.
  - Totals, and **Add a product**.
- **K2. Product editor.** One form, in sections:
  - **Basics:** name; web address (filled in from the name until changed by hand); price; offer tier; range and its options; trade name for the warehouse and OrderFlow.
  - **Where it appears:** main and other categories, shown, featured, sort order.
  - **Sizes in cm,** including corner sides, a note, and named pieces for sets.
  - **Specifications.**
  - **Where it's made,** and made to order.
  - **Colourways:** SKU, name, swatch colour, material, price difference, photo, shown, and order.
  - **Gallery photos.**
  - **Words:** description, highlights, and search title and description, each with a character counter.
  - **Copy as a new product:** copies everything except the SKUs; the copy starts hidden.
  - **Hide or show.**
  - **Delete:** only for products that have never been ordered, after typing DELETE.
  - A warning before leaving the page with unsaved changes.
- **K3. Saving happens in one database transaction:** product, categories, offer tier and colourways together. A colourway removed from the form is deleted, or hidden instead if it has ever been ordered. Refusals (address taken, SKU taken, bad colour, no colourways…) show as sentences next to the field.
- **K4. Photo picker,** three ways:
  1. **Upload from the phone straight to Cloudinary.** The server signs the upload, so the secret never reaches the browser. Cloudinary names the file, so nothing is overwritten. iPhone HEIC photos are delivered as JPEG.
  2. **Paste a Cloudinary link.**
  3. **Pick from photos the catalogue already uses** (searchable).

  Without the upload keys, Status shows uploads as amber and the other two ways still work.
- **K5. Catalogue structure:**
  - Categories (parent, order, shown, photo, introduction, search words; a category can't end up inside itself).
  - Ranges or groups (option names, trade name).
  - Fabric collections and colours (codes, swatches, extra charge, shown, can be sent as a sample).

  Deleting is refused, with the reason, while something still uses the item.
- **K6.** **Ask me** before changing how the catalogue is stored (for example, adding product types so other kinds of furniture can be added). My default: build the editor on the tables we have.

### L. Videos

- **L1. Each video has:** a Cloudinary video link (or an upload signed the same way as photos), the product it shows, its kind (customer, studio or warehouse), a caption, its order and whether it's shown.
- **L2. Deleting** removes it from the site; the file stays in Cloudinary.

### M. Settings

- **M1. Shop settings in one database table,** read by the checkout's own database functions. Fill it with **exactly today's figures**, and add a test that a checkout quote for the same basket gives the same total as before. It holds:
  - **Delivery extras:** first floor, each extra floor, the highest floor we carry to, assembly, removal per seat, and the fewest, suggested and most seats.
  - **Delivery dates:** when the delivery window starts and ends (working days), and the earliest and latest day a customer can choose.
  - **Offer tier amounts,** each showing how many products sit in that tier.
  - **How many days an ad-visitor offer lasts.**
  - **The sample limit.**

  Checks: a window can't end before it starts, and the tiers stay in order. After saving: "Saved. Checkout uses the new figures from the next visit." **Ask me** who may change prices.
- **M2. Ad-visitor offer** switch, on or off. Off stops new offers; offers already given run until their date.
- **M3. Offer codes:** add (4 to 24 letters and numbers, with an optional label), switch off or on, delete. Orders keep the code as text, so deleting a code never changes an order.
- **M4. OrderFlow card:**
  - Whether it's connected (the address and key are in Supabase Vault).
  - Switch on or off; switching on is refused while the Vault values are missing.
  - **Send a test order (marked TEST).**
  - The "send test orders too" switch, if you agree it (F5).
  - **Check for replies,** and the latest sends with OrderFlow's answers.

### N. Tracking (Meta and Google)

- **N1. What's set up:** ticks only, never the values (Pixel ID, Conversions API token, test code, GA4 IDs, and whatever Google pieces the shop already uses).
- **N2. Mode:**
  - **Dry run:** every event is built and logged, but nothing is sent.
  - **Test:** events go to Meta's Test events and Google's validator only.
  - **Live:** only on the production site.
- **N3. Purchase sending.** **Ask me**: automatic a set time after the customer confirms (I recommend 30 minutes, which leaves time to mark a mistake as a test or cancel it), or by button as now.
- **N4. The Purchase queue:** each order's code and status, the event, the platform, its state, the attempts and Meta's reply. Buttons: **Send now**, **Hold**, **Don't send** (asks first).
- **N5. "Cancelled after sending":** a red list of Purchases sent for orders that were cancelled later, because Meta can't take them back.
- **N6. Exclude this device:** a switch that marks the phone or computer as staff, so nothing done on it counts.
- **N7. Latest events,** exactly as they were built, with personal details hashed. Kept for 30 days.
- **N8.** Test orders, cancelled orders, test links and staff devices never count. Personal details are only ever sent hashed. Order codes and private links are never sent.

Build this on the shop's existing tracking tables and keep everything they do today.

### O. Ad links

- **O1. The catalogue feed:** its address (with a copy button), how many items are in it, which items are left out and why, when Meta last fetched it, and what each custom label holds.
- **O2. URL parameters** to paste into every ad (source, medium, and campaign, ad set and ad names).
- **O3. Ready-tagged links** for the home page, each department, each range, each product and each colourway.
- **O4. Profile links** for Instagram, Facebook and WhatsApp. These aren't ads, so no offer.
- **O5. A test ad link** that opens exactly like an ad but never counts.

**Ask me** whether we need this page, if the shop doesn't run Meta catalogue ads.

### P. Status page and Health card

- **P1.** One card per check, each **green (OK)**, **amber (not set up yet)** or **red (problem)**, in words as well as colour, with a summary I can act on and a few details. The headline at the top: "Everything is working." / "Working. Some parts aren't set up yet." / "Something needs attention."

  | Check | Amber or red when |
  | --- | --- |
  | Database | red: not connected or can't be read (when green: shows the number of migrations and the latest one) |
  | Environment | always green: shows the environment, the site address, whether search engines are allowed, and the build |
  | Server key | red: missing, or it doesn't open this database (actually try it, don't just check it's set) |
  | Catalogue | amber: no products on sale |
  | Orders | always green: real, test and waiting counts, and the latest order |
  | Email | red: not set up, or sends failed in the last 24 hours |
  | Address lookup, photo uploads | amber: not set up |
  | Scheduled jobs | amber: paused or hasn't run yet; red: failed, or started and never reported back |
  | Tracking | amber: dry run or test; red: conversions failed |
  | Catalogue feed | amber: never fetched; red: not fetched for 26 hours |
  | OrderFlow | amber: off, or still sending test orders; red: on but not configured, or orders refused in the last 24 hours |
  | Each extra integration the shop has (Google conversions, Trustpilot, Sheets…) | whatever "not working" means for it |

- **P2.** One database call collects everything the page needs. One pure function turns it into the checks. **The Home Health card, the Status page and the hourly alert email (Q3) all use that same function,** so they can never disagree.

### Q. Background work

- **Q1. Email log:** one row per email, with its kind, order, recipient, subject, whether it was sent, failed or skipped, the provider's message ID and the error. Only admins can read it. It drives the Email check.
- **Q2. Scheduled jobs run from the database (pg_cron), not GitHub Actions.**
  - Jobs that only touch the database run as plain SQL.
  - Jobs that need the website work like this:
    1. The database records the run with a one-time ticket.
    2. It calls `/api/jobs/<job>` with that ticket.
    3. The site claims the ticket (it works once, for that job, for 15 minutes), does the work, and reports back "ok", "failed" or "skipped" with details.
    4. A run that doesn't report back within 30 minutes counts as failed.
  - No secret is stored anywhere.
  - Move jobs one at a time, and keep the old scheduler until each job has run once from the database.
- **Q3. Hourly health check.** It works out the Status checks and emails the shop when something turns red: once when it breaks, again if it's still red a day later, and once when it's fixed. **Ask me** which inbox it goes to.
- **Q4. An uptime link for UptimeRobot:** it answers 503 when anything is red or the hourly check has stopped, and 200 otherwise. It gives only a count, never details. It's rate limited. Write the UptimeRobot steps for me.
- **Q5. Weekly summary** every Monday morning: last week's confirmed orders and their value against the week before, where they came from (Meta campaign and ad, Google, WhatsApp, phone, direct), visits and enquiries, and top landing pages. Real orders only. If one already exists, keep it and add only what's missing.

### R. OrderFlow monitoring

- **R1.** Record OrderFlow's reply to every send, so the admin can show it (E9, M4).
- **R2.** The re-send job only re-sends orders OrderFlow hasn't accepted since their last change.
- **R3.** The OrderFlow address and key stay in Supabase Vault and never pass through the app.
- **R4.** **Don't change what OrderFlow receives, or how and when it's sent, without asking me.** Add the monitoring on top of what's already there.

---

## 5. Checks to run in the first prompt

Report what you find. Don't fix anything yet.

1. **Server-side tracking switch.** Find what decides whether the server sends events to Meta and Google. If it depends on a variable only one hosting provider sets (for example `VERCEL_ENV` on a site no longer hosted on Vercel), it may be off on the live site and conversions may not have been sent. Check the hosting provider's environment variables and when Meta last received a server event. **Ask me** before changing it; the fix is the shop's own environment setting (for example `APP_ENV=production`).
2. **Cookies:** any cookie whose secure flag depends on a host-specific variable.
3. **Scheduled jobs on GitHub Actions:** GitHub switches scheduled workflows off after 60 days without repository activity, and nothing tells anyone.
4. **Admin actions** that use the secret key for admin work, or that don't check admin rights themselves.
5. **Supabase security advisor** findings.
6. **Public sign-ups:** if the shop has no customer accounts they should be off; if it has, leave them alone.

---

## 6. Phases (one per prompt; skip what's already done)

Each phase gets its own branch, passes the checks, is merged and deployed, and ends with the four-part report.

- **Phase A: Access and the shell.** A1–A6, B1–B5, Q1, and fixes from section 5 that I've agreed to.
  - *Done when:* signed out goes to sign-in; a customer account gets "page not found"; every admin action refuses a non-admin (tested by calling one); the security advisor is clean; emails appear in the log.
- **Phase B: Status, health and jobs.** P1–P2, C4, Q2–Q4.
  - *Done when:* each moved job has run from the database and shows its real result; breaking a setting turns its check red and one alert email arrives, then "back to normal" once fixed.
- **Phase C: Order rules in the database.** F1–F9.
  - *Done when:* the database tests pass; OrderFlow and tracking receive exactly what they did before.
- **Phase D: Order pages.** C1–C3, C5, D1–D6, E1–E14, G1–G4, H1, Q5.
  - *Done when:* a test order can be taken through every status on a phone, with the right messages and emails, and the history shows each step. Every feature from the old orders page still works.
- **Phase E: Settings.** M1–M4.
  - *Done when:* the same basket gives the same total as before, and a changed figure changes the next quote.
- **Phase F: Leads, reviews and videos.** I1–I6, J1–J3, L1–L2.
  - *Done when:* each button works and updates its count, and a basket reminder can only be emailed once.
- **Phase G: Catalogue.** K1–K6.
  - *Done when:* an edit shows in the shop on the next visit; an ordered colourway is hidden, not deleted; an ordered product can't be deleted; an upload from a phone works (or shows amber until the keys are added).
- **Phase H: Tracking, ad links and OrderFlow monitoring.** N1–N8, O1–O5, R1–R4.
  - *Done when:* I can see every Purchase waiting or sent, with Meta's reply, and nothing about what's sent has changed without my yes.

---

## 7. Never

- Remove, rename or break a feature the admin has today.
- Use the secret key for admin screens, or rely on the proxy alone to protect the admin.
- Change prices, totals, the order lifecycle, or what OrderFlow, Meta or Google receive without my yes.
- Apply a database change to production without trying it in a rolled-back transaction or a branch first.
- Delete customer data, orders, reviews or leads without my yes.
- Add fake reviews, ratings, urgency or countdowns, or send customers' personal details to Meta or Google unhashed.
- Put keys, passwords or tokens in the code; they go in the hosting provider's environment variables or Supabase Vault.
