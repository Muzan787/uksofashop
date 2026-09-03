// src/constants/categorySeo.ts
//
// What a category page says about itself, beyond the grid of photographs.
//
// Two problems this fixes, both of them visible in Search Console.
//
// 1. THE TITLE WAS THE DATABASE NAME. `generateMetadata` read `categories.name`
//    and used it as the <title>, so the corner sofa page went to market as
//    "Corner Settees" and the recliner page as the singular "Recliner". Those
//    are the labels that read well in the admin panel and in a breadcrumb; they
//    are not what anybody types into Google. "Corner sofa" is the dominant UK
//    phrasing by a wide margin and "corner settee" is a regional variant of it,
//    so the page was competing for the smaller half of its own market. The
//    titles here are keyword-first, and the DB name still drives every heading,
//    chip and breadcrumb on the page, which is where it belongs.
//
// 2. EVERY DESCRIPTION WAS THE SAME SENTENCE. The old line was built as
//    `Shop our premium ${name} collection. Free delivery across UK Mainland.
//    Cash on Delivery available.` - one template, seven near-identical
//    descriptions across the seven most commercially valuable pages on the site.
//
// And one thing it adds: prose. A category page was a hero, a filter sidebar
// and a grid, which is close to zero indexable words about the category itself.
// The copy below is what somebody behind the counter would say if you walked in
// and asked for a corner sofa, and it is deliberately evergreen - no counts, no
// prices. The hero already prints both from the live catalogue, and a number
// hardcoded in a paragraph is a number that goes stale and starts lying.
//
// Everything asserted here is checked against src/constants/promises.ts,
// src/constants/delivery.ts and the fabric library. Do not add a claim to this
// file that is not true in those.

export interface CategoryCopy {
  /**
   * Replaces the DB category name in <title> and the meta description only.
   * The layout template appends " | UK Sofa Shop", so 45 characters is the
   * budget before Google starts truncating.
   */
  title: string
  /** ~150 characters. Distinct per category - that is the whole point. */
  description: string
  /** The H2 introducing the copy under the grid. */
  heading: string
  /**
   * Paragraphs, in order. Inline links use markdown link syntax -
   * `[label](/path)` - which CategoryCopy renders as a real anchor. It is a
   * deliberately tiny subset: one regex parses it, nothing else is supported,
   * and a paragraph with no link in it is just a string.
   */
  body: string[]
}

export const CATEGORY_COPY: Record<string, CategoryCopy> = {
  'corner-sofa': {
    title: 'Corner Sofas & Corner Settees',
    description:
      'Corner sofas and corner settees for family rooms, with fabric shapes made in your own size and colour. Free UK Mainland delivery and cash on delivery.',
    heading: 'Choosing a corner sofa',
    body: [
      'A corner sofa earns its place by seating more people in the same floor area than two separate sofas would, and by giving a room a defined edge instead of a gap behind the furniture. It is the shape most people end up with in a rectangular living room, and the shape most likely to be measured wrong.',
      'The measurement that matters is not the room. It is the doorway, the hallway and the turn at the bottom of the stairs, because a corner unit arrives in pieces but each piece is still the length of one arm. Our [size guide](/size-guide) has a calculator that takes your doorway width and tells you what goes through it, and it is worth two minutes before you order rather than after.',
      'Fabric corner sofas here are made to order, so the size can follow your room rather than the other way round, and the colour is yours to pick from the [69-fabric library](/fabrics) - chenille, plush velvet, crushed velvet, naple, marble and PVC leather. Leather corners are stocked in set sizes and go out sooner.',
      'Every corner sofa is delivered free to a UK Mainland address in 2 to 4 working days, brought to the ground floor or a ground-floor room of your choice, and paid for in cash or by bank transfer on the doorstep. Nothing upfront. It carries a 1-year guarantee on the frame and springs.',
    ],
  },

  'fabric-sofa': {
    title: 'Fabric Sofas Made to Your Own Size',
    description:
      'Fabric sofas made to order in your choice of 69 colours across chenille, velvet and more. Free UK Mainland delivery in 2-4 working days, paid on arrival.',
    heading: 'About our fabric sofas',
    body: [
      'Our fabric sofas are made to order rather than pulled off a shelf, which means three things are yours to decide: the size, the shape and the cloth. If your alcove is 214cm and every sofa you have found is 220cm, that is a solvable problem here.',
      'There are 69 colours across six fabrics, and they behave differently rather than just looking different. Chenille is the hard-wearing everyday choice with a soft, slightly nubby surface. Plush velvet has a deep even pile and reads as the expensive one. Crushed velvet catches the light and hides very little. Naple and marble carry their pattern in the weave itself. PVC leather wipes clean in seconds, which matters with small children. The [fabric library](/fabrics) explains each one properly and shows all 69 colours side by side.',
      'Because a made-to-order sofa is built to your specification, it is the standard exemption from the 14-day right to change your mind under the Consumer Contracts Regulations - we cannot resell a sofa cut to your alcove. Faults are a separate matter entirely, and covered by the 1-year frame guarantee. The [delivery and returns page](/delivery-returns) sets out exactly where that line sits.',
      'Delivery is free to UK Mainland in 2 to 4 working days and you pay cash or by bank transfer when it arrives. Fabric needs a little care to stay looking new; the [care guide](/care-guide) covers the first thirty seconds of a spill, which is the part that decides the outcome.',
    ],
  },

  'leather-sofa': {
    title: 'Leather Sofas & Leather Sofa Sets',
    description:
      'Leather sofas and 3+2 leather sofa sets that wipe clean in seconds. Free UK Mainland delivery in 2-4 working days, and you pay when it arrives.',
    heading: 'Leather, and who it suits',
    body: [
      'Leather is the practical choice, which is not how it is usually sold. A spilled drink on leather is a cloth and ten seconds; on an untreated woven fabric it can be permanent. If you have young children, a dog, or a habit of eating on the sofa, this is the category to start in.',
      'It also ages differently. Fabric wears evenly and eventually looks tired all over. Leather takes marks in the places you actually sit and gets darker and softer there, which some people want and some people do not. Worth knowing which of the two you are before you choose.',
      'What leather asks in return is that you keep it away from five things that will ruin it - direct radiator heat, sunlight, baby wipes, household cleaning spray, and anything containing alcohol. The [care guide](/care-guide) names them and says what to use instead.',
      'Leather sofas here are stocked in set sizes rather than made to order, so they ship sooner and, being a standard size, they come with the full 14-day right to change your mind. Delivery is free across UK Mainland in 2 to 4 working days, cash or bank transfer on the doorstep, with a 1-year guarantee on the frame and springs. Check the doorway first with the [size guide](/size-guide): a leather three-seater does not give under pressure the way a fabric one does.',
    ],
  },

  recliner: {
    title: 'Recliner Sofas & Reclining Sofa Sets',
    description:
      'Recliner sofas, reclining armchairs and 3+2 recliner sets, manual and electric. Free UK Mainland delivery, and you pay cash when it arrives.',
    heading: 'Before you buy a recliner',
    body: [
      'The thing nobody mentions about recliners is the clearance behind them. A reclining back needs room to travel, and a recliner pushed flat against a wall is a recliner that does not recline. Leave a hand-width behind it at minimum, more on the deeper frames, and measure that gap before you commit to where it is going.',
      'Manual recliners work on a lever or a push through the back and need nothing but a floor. Electric recliners move at the touch of a button, hold any position on the way, and need a socket within reach - so they suit anyone who finds the manual push hard work, which is often the exact reason a recliner is being bought in the first place. Those are gathered separately under [electric recliners](/shop/electric-sofa).',
      'Recliners come as single armchairs and as [3+2 sets](/shop/3-2-seater) where the reclining seats are the two outer positions. In a set that is worth checking against your room, because the two ends are the seats that need the clearance and they are the ones nearest the walls.',
      'Free delivery to UK Mainland in 2 to 4 working days, brought to a ground-floor room of your choice, paid in cash or by bank transfer on arrival. A 1-year guarantee covers the frame and springs. Upstairs delivery, assembly and taking your old sofa away are available as paid extras chosen at checkout - see [delivery and returns](/delivery-returns).',
    ],
  },

  'electric-sofa': {
    title: 'Electric Recliner Sofas',
    description:
      'Electric recliner sofas and power reclining sofa sets, reclining at the touch of a button. Free UK Mainland delivery in 2-4 working days, cash on delivery.',
    heading: 'How electric recliners differ',
    body: [
      'An electric recliner uses a motor rather than your own weight, so it goes back at the touch of a button and stops wherever you let go. That matters more than it sounds. A manual recliner needs a firm push through the back of the seat, and for anyone with a bad shoulder, a bad back, reduced grip, or simply less strength than they used to have, that push is the reason a manual one ends up never being used.',
      'The practical requirements are a socket within reach of where the sofa is going, and clearance behind the seat for the back to travel into. Both are easier to sort out before delivery day than after.',
      'The trade-off against a [manual recliner](/shop/recliner) is that there is a motor, a transformer and a handset, which is more to go wrong than a lever - and the price sits higher for the same size of sofa. In exchange you get positions a manual mechanism cannot hold, and a seat anyone in the house can operate.',
      'Delivered free to UK Mainland in 2 to 4 working days and paid for in cash or by bank transfer when it arrives. The 1-year guarantee covers structural faults in the frame and springs. Measure the doorway first with the [size guide](/size-guide): powered frames carry their mechanism inside the seat and do not pack down as small as you might expect.',
    ],
  },

  '3-2-seater': {
    title: '3+2 Seater Sofa Sets',
    description:
      'A three seater and a two seater together - the usual answer for a family living room. Free UK Mainland delivery in 2-4 working days, cash on delivery.',
    heading: 'Why a 3+2 rather than a corner',
    body: [
      'A 3+2 set is a three-seater and a two-seater bought together and upholstered to match. It seats five, and it is the arrangement most UK living rooms end up with, for a reason worth spelling out: two separate sofas can face each other, sit at right angles, or move to opposite walls, and they can be rearranged again next year. A [corner sofa](/shop/corner-sofa) commits you to one layout on the day it arrives.',
      'Two pieces are also easier to get into the house than one long L-shape, which is the single most common cause of a delivery that goes wrong. If your hallway has a tight turn or a narrow front door, a 3+2 is the safer shape - though it is still worth running both pieces through the calculator on the [size guide](/size-guide).',
      'What you give up is floor efficiency. Two arms sit in the middle of the room where a corner unit would have a continuous seat, so a 3+2 seats slightly fewer people in the same square metres and leaves less usable lounging length.',
      'Fabric sets are made to order in your own size and any of the 69 colours in the [fabric library](/fabrics); leather sets are stocked in set sizes. Either way delivery is free to UK Mainland in 2 to 4 working days, both pieces are brought to a ground-floor room of your choice, and you pay cash or by bank transfer on the doorstep. A 1-year guarantee covers frame and springs on both pieces.',
    ],
  },

  all: {
    title: 'All Sofas',
    description:
      'Every sofa we sell: corner sofas, fabric sofas, leather sofas, recliners and 3+2 sets. Free UK Mainland delivery, and you pay when it arrives at your door.',
    heading: 'Everything in one place',
    body: [
      'This is the whole catalogue, filterable by style, fabric, colour and price. If you already know the shape you want, the faster route is [corner sofas](/shop/corner-sofa), [3+2 sets](/shop/3-2-seater), [recliners](/shop/recliner), [electric recliners](/shop/electric-sofa), [fabric sofas](/shop/fabric-sofa) or [leather sofas](/shop/leather-sofa).',
      'Two decisions do most of the work. The first is fabric or leather: fabric is warmer to sit on, comes in 69 colours and can be made to your own size, while leather wipes clean in seconds and copes better with children and pets. The [fabric library](/fabrics) covers the first properly.',
      'The second is whether it fits, and it is the one people skip. Almost every delivery that goes wrong goes wrong at the front door rather than in the room, and almost all of those were preventable with a tape measure. The [size guide](/size-guide) has a calculator for exactly this.',
      'However you get there: free delivery to any UK Mainland address in 2 to 4 working days, brought to the ground floor or a ground-floor room of your choice, and paid for in cash or by bank transfer when it arrives rather than upfront. A 1-year guarantee covers the frame and springs. You can also see everything in person at the Blackburn [showroom](/showroom), by appointment.',
    ],
  },
}
