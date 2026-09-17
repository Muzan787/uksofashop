// src/constants/feet.ts
//
// The feet a made-to-order sofa can be built on.
//
// A constant rather than a table, on purpose. Sixteen styles that change
// about once a year do not need an admin screen, a migration and an RLS
// policy; they need to be readable in one place. If the range ever grows past
// what a file can hold comfortably, it moves to Postgres beside `fabrics` and
// nothing that reads FEET has to change shape.
//
// Every photograph is the supplier's (R&S Components - the same firm the
// fabric library comes from), re-hosted on Cloudinary under feet/ so the site
// never depends on their CDN being up. The codes are theirs and are what goes
// on the purchase order, exactly as the fabric codes are.
//
// What the feet cost is NOT here. Feet are offered on /build only, and that
// page quotes a guide price for the frame and leaves the feet - like the piping
// and anything custom - to the phone call that follows every made-to-order
// order. When a foot carries a surcharge, it is agreed on that call and
// recorded on the manual order, not priced by the browser.

export interface FeetFinish {
  /** Stable key, for the radio group. */
  key: string
  /** "Rose gold". What the customer reads and what the order records. */
  name: string
  /** A swatch for the finish dot. Approximate, like a fabric's hex. */
  hex: string
  image: string
}

export interface FeetStyle {
  /** The supplier's code. Unique across the range. */
  code: string
  /** Ours. Short enough for a tile at 160px. */
  name: string
  /** Footprint and height as the supplier lists them. Null where they don't. */
  size: string | null
  /** One line about what it does for the sofa. */
  blurb: string
  group: 'metal' | 'wood' | 'plain'
  /** One entry where the style comes in a single finish. */
  finishes: FeetFinish[]
}

const CDN = 'https://res.cloudinary.com/dmlna04yk/image/upload'

const FINISH_HEX = {
  silver: '#C7C9CC',
  chrome: '#D8DADD',
  gold: '#C9A227',
  roseGold: '#B76E79',
  gunmetal: '#4A4C50',
  white: '#F4F4F2',
  black: '#1B1B1B',
  bronze: '#8C6B3F',
  brown: '#5A3A22',
  darkWood: '#3A2317',
} as const

export const FEET: FeetStyle[] = [
  {
    code: 'SF015G',
    name: 'Fluted shell',
    size: '75 × 140 mm',
    blurb: 'A tall, sculpted foot that catches the light. The one people notice.',
    group: 'metal',
    finishes: [
      { key: 'silver', name: 'Silver', hex: FINISH_HEX.silver, image: `${CDN}/v1789677938/feet/sf015g-silver.png` },
      { key: 'black', name: 'Black', hex: FINISH_HEX.black, image: `${CDN}/v1789677940/feet/sf015g-black.jpg` },
      { key: 'rose-gold', name: 'Rose gold', hex: FINISH_HEX.roseGold, image: `${CDN}/v1789677937/feet/sf015g-rose-gold.png` },
      { key: 'gunmetal', name: 'Gunmetal', hex: FINISH_HEX.gunmetal, image: `${CDN}/v1789677939/feet/sf015g-gun.png` },
      { key: 'bronze', name: 'Bronze', hex: FINISH_HEX.bronze, image: `${CDN}/v1789677941/feet/sf015g-bronze.jpg` },
      { key: 'white', name: 'White', hex: FINISH_HEX.white, image: `${CDN}/v1789677935/feet/sf015g-white.png` },
    ],
  },
  {
    code: 'SF012',
    name: 'Angled wing',
    size: '125 × 140 mm',
    blurb: 'Three flat blades set at an angle. Modern, and very stable on a corner.',
    group: 'metal',
    finishes: [
      { key: 'chrome', name: 'Chrome', hex: FINISH_HEX.chrome, image: `${CDN}/v1789677953/feet/sf012s-chrome.jpg` },
      { key: 'gold', name: 'Gold', hex: FINISH_HEX.gold, image: `${CDN}/v1789677952/feet/sf012s-gold.jpg` },
      { key: 'silver', name: 'Silver', hex: FINISH_HEX.silver, image: `${CDN}/v1789677951/feet/sf012s-silver.jpg` },
    ],
  },
  {
    code: 'SF014SM',
    name: 'Tapered pin',
    size: '80 × 145 mm',
    blurb: 'A slim, splayed leg that lifts the sofa off the floor. Mid-century in feel.',
    group: 'metal',
    finishes: [
      { key: 'silver', name: 'Silver', hex: FINISH_HEX.silver, image: `${CDN}/v1789677930/feet/sf014sm-silver.png` },
      { key: 'gold', name: 'Gold', hex: FINISH_HEX.gold, image: `${CDN}/v1789677931/feet/sf014sm-gold.png` },
    ],
  },
  {
    code: 'SF107',
    name: 'Tubular bar',
    size: '45 × 155 mm',
    blurb: 'A round bar on a flat plate. Quiet, low and hard to knock.',
    group: 'metal',
    finishes: [
      { key: 'silver', name: 'Silver', hex: FINISH_HEX.silver, image: `${CDN}/v1789677943/feet/sf107.jpg` },
      { key: 'black', name: 'Black', hex: FINISH_HEX.black, image: `${CDN}/v1789677942/feet/sf107b.jpg` },
    ],
  },
  {
    code: 'SF011B',
    name: 'Curved black',
    size: '70 × 160 mm',
    blurb: 'A soft S-curve in matt black. Reads well under a dark velvet.',
    group: 'metal',
    finishes: [
      { key: 'black', name: 'Black', hex: FINISH_HEX.black, image: `${CDN}/v1789677955/feet/sf011b.jpg` },
    ],
  },
  {
    code: 'SF007',
    name: 'Chrome triangle',
    size: '80 × 155 mm',
    blurb: 'An open triangular frame. Light on its feet, plenty of height for a hoover.',
    group: 'metal',
    finishes: [
      { key: 'chrome', name: 'Chrome', hex: FINISH_HEX.chrome, image: `${CDN}/v1789677955/feet/sf007.jpg` },
    ],
  },
  {
    code: 'SF026C',
    name: 'Chrome cylinder',
    size: '120 × 50 mm',
    blurb: 'A polished barrel foot. Low, wide and very stable.',
    group: 'metal',
    finishes: [
      { key: 'chrome', name: 'Chrome', hex: FINISH_HEX.chrome, image: `${CDN}/v1789677946/feet/sf026c.jpg` },
    ],
  },
  {
    code: 'SF20S',
    name: 'Square block',
    size: '65 × 65 × 65 mm',
    blurb: 'The chrome block our photographed sofas stand on. A safe choice.',
    group: 'metal',
    finishes: [
      { key: 'silver', name: 'Silver', hex: FINISH_HEX.silver, image: `${CDN}/v1789677949/feet/sf20s.jpg` },
    ],
  },
  {
    code: 'SF025W',
    name: 'Low round',
    size: '50 × 50 mm',
    blurb: 'A short round foot that keeps the sofa close to the floor.',
    group: 'metal',
    finishes: [
      { key: 'chrome', name: 'Chrome', hex: FINISH_HEX.chrome, image: `${CDN}/v1789677947/feet/sf025w.jpg` },
    ],
  },
  {
    code: 'SF027',
    name: 'Corner plate, scroll',
    size: '58 × 120 mm',
    blurb: 'Wraps the corner of the frame with a pierced scroll pattern.',
    group: 'metal',
    finishes: [
      { key: 'white', name: 'White', hex: FINISH_HEX.white, image: `${CDN}/v1789677944/feet/sf027.jpg` },
    ],
  },
  {
    code: 'SF029',
    name: 'Corner plate, plain',
    size: '55 × 110 mm',
    blurb: 'The same corner wrap without the pattern. Nearly invisible from the front.',
    group: 'metal',
    finishes: [
      { key: 'white', name: 'White', hex: FINISH_HEX.white, image: `${CDN}/v1789677945/feet/sf029.jpg` },
    ],
  },
  {
    code: 'SF017WL',
    name: 'Tapered wood, brass cap',
    size: null,
    blurb: 'A turned wooden leg with a brass ferrule. Warm, and a little Scandinavian.',
    group: 'wood',
    finishes: [
      { key: 'brown', name: 'Walnut', hex: FINISH_HEX.brown, image: `${CDN}/v1789677950/feet/sf017wl-brown.jpg` },
      { key: 'black', name: 'Black', hex: FINISH_HEX.black, image: `${CDN}/v1789677949/feet/sf017wl-black.jpg` },
    ],
  },
  {
    code: 'SF21W',
    name: 'Turned wood, brass collar',
    size: null,
    blurb: 'A traditional turned foot in dark wood with a brass band. Suits the Malibu.',
    group: 'wood',
    finishes: [
      { key: 'dark', name: 'Dark wood', hex: FINISH_HEX.darkWood, image: `${CDN}/v1789677948/feet/sf21w.jpg` },
    ],
  },
  {
    code: 'SF006',
    name: 'Wooden bun',
    size: '58 × 100 mm',
    blurb: 'The classic bun foot. Rounded, solid and the right thing under a Chesterfield arm.',
    group: 'wood',
    finishes: [
      { key: 'brown', name: 'Mahogany', hex: FINISH_HEX.brown, image: `${CDN}/v1789677956/feet/sf006-brown.jpg` },
      { key: 'black', name: 'Black', hex: FINISH_HEX.black, image: `${CDN}/v1789677957/feet/sf006-black.jpg` },
    ],
  },
  {
    code: 'SF002',
    name: 'Plain block',
    size: null,
    blurb: 'A plain black foot that sits out of sight, for a sofa that looks like it rests on the floor.',
    group: 'plain',
    finishes: [
      { key: 'black', name: 'Black', hex: FINISH_HEX.black, image: `${CDN}/v1789677959/feet/sf002.jpg` },
    ],
  },
]

export function findFeet(code: string | null | undefined): FeetStyle | null {
  if (!code) return null
  return FEET.find(f => f.code === code) ?? null
}
