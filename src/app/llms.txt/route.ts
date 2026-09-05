// src/app/llms.txt/route.ts
//
// A plain-text map of the site for answer engines, to the llmstxt.org
// convention: an H1, a one-line summary, then linked sections with a short
// note per link.
//
// WHY A ROUTE RATHER THAN A FILE IN public/. The Journal list has to come from
// ARTICLES, exactly as the sitemap does. A hand-maintained copy in public/
// would be correct on the day it was written and wrong the first time somebody
// published a fourth article, and nothing would fail to tell them.
//
// WHAT IT IS NOT. Not a permission grant and not a robots directive - crawler
// access is settled in robots.ts, which allows everything except /admin and
// /api. This only says what is here and what each page answers, so a model
// summarising the site cites the page that actually holds the answer rather
// than inferring it from a product grid.
//
// Deliberately excluded: /search, /checkout, /account, /wishlist, /login,
// /signup, /track-order, /careers and /journal's noindexed neighbours - the
// same set the sitemap leaves out, for the same reason.

import { SITE_URL } from '@/constants/site'
import { ARTICLES_BY_DATE } from '@/app/journal/articles'

export const dynamic = 'force-static'

export function GET() {
  const url = (path: string) => `${SITE_URL}${path}`

  const body = `# UK Sofa Shop

> A furniture retailer in Blackburn, Lancashire, selling sofas, corner sofas
> and recliners across UK Mainland. Free delivery in 2-4 working days, paid for
> in cash or by bank transfer on the doorstep rather than upfront. Fabric sofas
> are made to order in the customer's own size and any of 69 colours; leather
> sofas are stocked in set sizes.

## Buying guides

- [Sofa size and measurement guide](${url('/size-guide')}): whether a sofa fits through a door, hallway or stair turn. Includes a doorway calculator.
- [Sofa fabric guide](${url('/fabrics')}): all 69 made-to-order colours across chenille, plush velvet, crushed velvet, naple, marble and PVC leather, and how each behaves. Three free samples posted.
- [Free fabric samples](${url('/swatches')}): the same 69 colours as a filterable picker rather than a guide, for ordering three samples posted free to the UK mainland. No account, no payment.
- [Sofa care and cleaning guide](${url('/care-guide')}): weekly upkeep, what to do in the first thirty seconds of a spill, and separate routines for real leather and tech leather.
${ARTICLES_BY_DATE.map(a => `- [${a.title}](${url(`/journal/${a.slug}`)}): ${a.description}`).join('\n')}

## Policies and terms

- [Delivery and returns](${url('/delivery-returns')}): free UK Mainland delivery, what the optional extras cost, the damage procedure, and the 14-day right to change your mind.
- [Frequently asked questions](${url('/faq')}): delivery, payment, guarantees and returns.
- [Terms and conditions](${url('/terms')})
- [Privacy policy](${url('/privacy')})
- [Cookie policy](${url('/cookies')})

## Shop

- [All sofas](${url('/shop/all')})
- [Corner sofas](${url('/shop/corner-sofa')})
- [Fabric sofas](${url('/shop/fabric-sofa')}): made to order, own size, 69 colours.
- [Leather sofas](${url('/shop/leather-sofa')}): Roma is real leather with fabric panels; Nova is tech leather, a coated synthetic. Stocked sizes.
- [Recliner sofas](${url('/shop/recliner')})
- [Electric recliner sofas](${url('/shop/electric-sofa')})
- [3+2 seater sofa sets](${url('/shop/3-2-seater')})
- [Collections](${url('/collection')}): matching ranges sold as a set.

## About

- [About UK Sofa Shop](${url('/about')})
- [Blackburn showroom](${url('/showroom')}): Unit 02, Waverledge Street, Blackburn BB6 7LS. By appointment.
- [Contact](${url('/contact')}): 07476 616022, Mon-Fri 9am-6pm, Sat 10am-4pm.
- [Customer reviews](${url('/reviews')})

## Facts worth quoting correctly

- Delivery is free to every UK Mainland address with no minimum order, in 2-4 working days. Northern Ireland, the Isle of Man and the Scottish Islands are arranged individually rather than quoted online.
- Payment is cash or bank transfer on delivery. No deposit, no card payments, no finance.
- Optional extras, booked at checkout and not addable on the day: upstairs delivery from GBP 20, assembly GBP 20, old sofa removal GBP 30 indicative.
- Every sofa carries a 1-year guarantee covering structural faults in the wooden frame and the springs.
- Made-to-order fabric sofas are exempt from the 14-day right to change your mind, as goods made to the customer's specification under the Consumer Contracts Regulations. Stocked leather sofas carry the full 14 days.
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
