# Seasonal timeline: November 2026 to January 2027

Written 28 Oct 2026, and cut down the same day at Muaz's request to the main
events only.

**How it works:** there is no scheduling system. On each "ask me" day Muaz
says "today we build for <event>". The website is then changed for that
event by hand and pushed. When the event ends he asks again, and it comes
off. There is one exception: a discount always carries its own end time in
the database. That way the price can never outlive the advertised end, even
at midnight with nobody awake.

---

## Main events

| Event | Live | Ask me on | Comes off |
|---|---|---|---|
| Halloween | Thu 29 – Sat 31 Oct | Wed 28 Oct | Sun 1 Nov |
| Diwali (optional greeting, no discount) | Fri 6 – Tue 10 Nov | Thu 5 Nov | Wed 11 Nov |
| **Black Friday Week** (Black Friday Fri 27, Cyber Monday Mon 30) | Mon 23 – Mon 30 Nov 23:59 | **Mon 16 Nov** | Tue 1 Dec |
| Christmas delivery | Tue 1 – Fri 18 Dec | Tue 1 Dec | Sat 19 Dec (becomes "order now for January") |
| Christmas closure + "Sale starts Boxing Day" | Tue 22 – Fri 25 Dec | Mon 21 Dec | Sat 26 Dec |
| **Boxing Day / Winter Sale** | Sat 26 Dec – Sun 31 Jan 23:59 | **Tue 22 Dec** to build it, Sat 26 Dec to put it live | Mon 1 Feb |
| New Year (headline change inside the sale) | Fri 1 Jan | Fri 1 Jan | — |
| Winter Sale final weekend (January payday) | Fri 29 – Sun 31 Jan | Fri 29 Jan | Mon 1 Feb |

**Why Black Friday is asked for a week early:** its discount changes checkout
prices. The database and the site have to change together, or every order
fails at checkout with a price mismatch. So it gets built and checked during
that week and pushed on Mon 23 Nov. The same goes for the Winter Sale.

---

## Dates worth keeping in mind

- **Turn the online offer off** in Admin → Settings on **Sat 14 Nov** and
  **Sat 19 Dec**, and back on on **Tue 1 Dec** and **Mon 1 Feb**. Windows
  already given run to their own deadline. This stops a 48h countdown from
  telling someone their £30 off is ending days before a bigger sale you
  already know is coming.
- **Christmas order-by dates** (proposed, assuming the last van goes out
  Wed 23 Dec): Fri 18 Dec for free-delivery areas, Sun 13 Dec for charged
  areas. Made-to-order depends on R&S's lead time and their Christmas
  shutdown.
- **Bank holidays:** Fri 25 Dec, Mon 28 Dec (Boxing Day's substitute),
  Fri 1 Jan, and Mon 4 Jan in Scotland. The closure days are Muaz's call.
  The delivery-date picker has to block them, which is part of the
  Christmas build on Tue 1 Dec.
- **Payday:** Fri 27 Nov (Black Friday itself) and Fri 29 Jan (the Winter
  Sale's final weekend).

---

## Rules every event follows

1. A fixed end, honoured, never extended. Never relaunch the same deal under
   a new name the next day.
2. Countdowns only to real ends. "Last day" and "final weekend" only when
   true.
3. Don't raise any regular price before 1 Feb, so "was" prices stay genuine.
4. "Up to £X off" only if a fair share of sofas actually gets £X.
5. WhatsApp follows the site: same price, same end time, and no event price
   after it ends.
6. "Before Christmas" claims stop when the cut-off passes, on the site and in
   ads.
7. Mobile first: every change is checked at 375 px before it is pushed.
