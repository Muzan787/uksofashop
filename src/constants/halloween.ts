// src/constants/halloween.ts
//
// Halloween 2026, asked for by Muaz on 28 Oct: the announcement bar, the
// homepage hero, a "Midnight sofas" rail, a badge on those sofas' cards, and
// a WhatsApp opening line that says the chat came from them. No discount -
// the online offer carries on exactly as it is.
//
// Everything Halloween reads from this file. HALLOWEEN_LIVE = false takes all
// of it off the site at once. To remove it for good, delete this file,
// src/components/Halloween/ and src/utils/halloweenHome.ts, then the imports
// that stop compiling.

export const HALLOWEEN_LIVE = true

/**
 * Where every "midnight sofas" link goes: the shop's own colour filter. It
 * already shows the black photograph on each card and links to that
 * colourway, so there is no page to build.
 */
export const MIDNIGHT_HREF = '/shop/all?color=black'

interface Pick {
  slug: string
  /** The dark colourway - the photograph shown and the one the link opens. */
  variantId: string
}

/** The sofa in the hero: black leather, photographed in a dark room. */
export const HALLOWEEN_HERO: Pick = {
  slug: 'michigan-electric-recliner-5-seater-corner',
  variantId: '636794fb-b085-4180-a53a-0a94338e20ca',
}

/**
 * The rail, in the order shown. Eight, because the rail draws a 24px dot per
 * card plus one for the closing panel, and more than about a dozen overflows
 * a 375px screen.
 */
export const MIDNIGHT_RAIL: Pick[] = [
  { slug: 'michigan-electric-recliner-3and2-seater', variantId: '90d824b9-55bb-4e64-a543-7de2882eb6a0' },
  { slug: 'sims-high-back-u-shape', variantId: '406cc78d-8d8d-4f12-8d74-e49f9a5c5ab0' },
  { slug: 'oxford-electric-corner', variantId: '5365712c-9cf3-4074-acde-01617f13c6ce' },
  { slug: 'sims-high-back-3and2-seater', variantId: '7a1bc0db-8846-4572-bd07-8415ad430220' },
  { slug: 'orlando-electric-recliner', variantId: 'b25f145d-ed78-4957-bcc4-8a7c0da96c5f' },
  { slug: 'ruby-scattered-back-5-seater-corner-2c2', variantId: '1fe18267-9299-4526-9423-9d6036bcfeca' },
  { slug: 'roma-recliner-manual-3-and-2', variantId: 'fdc54adb-777c-4dcd-83e1-64e5938b631a' },
  { slug: 'olympia-scattered-back-5-seater-corner-2c2', variantId: 'efde84f9-4a8c-44ec-b4b7-8a41a67770a9' },
]

/**
 * Every sofa that wears the "Halloween pick" badge: the 18 that come in
 * black, charcoal or navy. Product ids AND their dark colourways' variant
 * ids, because most listings key a card by product while a collection page
 * keys it by variant - there only the dark colourway's card gets the badge.
 * "Grey & Black" (Tango) and "Black & Grey" (Shannon) are left out: both
 * photograph as grey sofas.
 */
const PICKS = new Set([
  'c543bb50-7fa1-4bad-96f8-5c2c0fcbf306', '90d824b9-55bb-4e64-a543-7de2882eb6a0', // Michigan 3+2
  '00186d8a-ee18-4a15-a788-2066198935c1', '636794fb-b085-4180-a53a-0a94338e20ca', // Michigan 5 seater corner
  'd6167240-beb6-4397-bafa-485ef4f26294', '064ef2eb-6ef8-4bba-a115-8ab9b0cf3e18', // Michigan 3 seater
  '7456382c-0d6a-4ed0-b8fd-813d4396ffbe', '80cf80c8-2c5a-43b6-b0c4-0d749ce8d58b', // Michigan 2 seater
  'e417340c-3ee4-4951-b446-19e379d1ab75', '5365712c-9cf3-4074-acde-01617f13c6ce', // Oxford corner
  '43a9f607-2258-49a7-a6cf-c1576f17fdab', 'b25f145d-ed78-4957-bcc4-8a7c0da96c5f', // Orlando 3+2
  '701ed71f-a187-4cb6-95ee-062083bcec1c', '406cc78d-8d8d-4f12-8d74-e49f9a5c5ab0', 'a6abe0e0-e3c0-4a89-9794-6f726681a0e6', // Sims U-shape
  'a585764d-0051-4b2c-8f4d-57122ad59d72', '97e1a331-63d2-4761-bc30-9d28313bd698', '08e0959c-6b04-4bcf-9f1c-35959cb9f282', // Sims high back corner
  '5a2d01ab-4c6e-48e8-b4b1-3f37c200399a', '7a1bc0db-8846-4572-bd07-8415ad430220', 'cbbedf53-5e5e-42b5-ba31-e330a6b26e02', // Sims high back 3+2
  'a3952a61-ca29-41cb-b448-b7488a6c8973', '71ea52b1-8601-4c83-bb73-ca6544add0dd', '566da7b9-4054-4d96-8834-8a1f95df6773', // Sims scattered back 3+2
  '0fc8ff1a-4b18-4168-a537-e04fa7545240', '48bc0d9e-44ec-4093-a65e-e0519efccf62', '2220a506-74ca-42da-a242-78ef94bf18f0', // Sims scattered back corner
  'dcf6223c-9973-438b-a485-eb0c60b4d88f', '9664c6e0-ea94-4034-862c-096262daade2', // Roma corner
  'dca5a543-4db8-40a5-95c6-d4acbef2ba51', 'fdc54adb-777c-4dcd-83e1-64e5938b631a', // Roma 3+2
  '6d625b26-5fa4-4c6b-823a-a5fd2ac819fb', 'f13a1532-dc17-4b86-840b-b86fc21681c0', // Roma 3 seater
  'e4382057-b9b0-4e12-a5c6-aff607973e16', '4b6dc9c2-91ec-432f-9735-abb6899b1a95', // Roma 2 seater
  'b2653e61-6096-4fe5-9029-ebb35b580c61', '5919957f-88b7-400f-b12f-71aa75f05bc4', // Roma armchair
  'e636b30c-bc54-4180-bb13-c17d9d26d797', '1fe18267-9299-4526-9423-9d6036bcfeca', // Ruby corner (charcoal)
  '5bee289b-a6eb-4772-8394-49510360a5e3', 'efde84f9-4a8c-44ec-b4b7-8a41a67770a9', // Olympia corner (navy)
])

export function isHalloweenPick(id: string | null | undefined): boolean {
  return HALLOWEEN_LIVE && Boolean(id) && PICKS.has(id!)
}

/**
 * A WhatsApp enquiry about a pick says where it came from, so Muaz can see in
 * the chat which conversations Halloween started: "Hi, I'm interested in…"
 * becomes "Hi, I saw your Halloween picks. I'm interested in…". Anything that
 * does not open with "Hi, " is left exactly as it was.
 */
export function withHalloweenOpener(message: string, productId: string | null | undefined): string {
  if (!isHalloweenPick(productId) || !message.startsWith('Hi, ')) return message
  const rest = message.slice(4)
  return `Hi, I saw your Halloween picks. ${rest.charAt(0).toUpperCase()}${rest.slice(1)}`
}

/** The floating button's message on the homepage, where the picks are. */
export const HALLOWEEN_HOME_MESSAGE = 'Hi, I saw your Halloween picks and I’d like some help choosing a sofa.'
