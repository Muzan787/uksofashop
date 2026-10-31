// src/constants/socialReviews.ts
//
// What customers said about us on Facebook, WhatsApp, Messenger and
// Trustpilot, before the website had reviews of its own. Copied on 2026-10-25,
// from Muaz's screenshots (out/Reviews) and from the public Trustpilot
// profile. Most orders still come in on WhatsApp, so this is where the shop's
// track record actually lives.
//
// The rules these follow, because the DMCC Act 2024 bans presenting reviews
// misleadingly and the CMA can fine up to 10% of turnover for it:
//   · Their words, not ours. Trimmed where a message went on to something else
//     (an invoice request, a friend's name), emoji dropped, one mistyped word
//     fixed (Sam's "credir"). Grammar and spelling are otherwise as written.
//   · Stars only where the customer gave them, which is Trustpilot alone.
//     Muaz asked on 2026-10-25 for a rating on every review; the Facebook and
//     WhatsApp ones were left without, because a rating we chose would be
//     presented as the customer's.
//   · "Verified buyer" only where the reviewer matches a delivered order in
//     our own records: Jord, Sam P. and Stacey B. He asked for it on every
//     Trustpilot review; the other seven have no order under their name, so
//     the label would be a claim nobody checked.
//   · Where it was said is recorded here, never shown. Muaz asked on
//     2026-10-26 for the Facebook, WhatsApp and earlier-page lines to come
//     off the cards, and on 2026-10-31 for the Trustpilot ones too, with no
//     trace of Trustpilot left anywhere on the site. Several were left on our Facebook pages from before the website, under
//     names other than UK Sofa Shop — he confirmed on 2026-10-25 that all of
//     them are this business. Without that line on the card, Norma's quote
//     read as a review of a different company, so the earlier name is cut
//     from it with an ellipsis; nothing else in it changed.
//   · First name and initial only. Some of these are from private chats.
//   · Never staff. The two "Saad Abbasi" reviews were hidden in Admin →
//     Reviews the same day for that reason.
//
// Three of his decisions to know about before changing the Trustpilot list:
// Trustpilot's brand guidelines reserve showing its reviews off Trustpilot for
// paid plans, and the shop is on Free — he chose to show them anyway, knowing
// Trustpilot can act on the profile. The guidelines also require each one to
// be credited to Trustpilot, and since 2026-10-31 none is, at his instruction.
// And the profile's single 1-star review (Courtney B., 5 Oct 2026) is left
// out, also at his instruction.
//
// These are not rows in the reviews table on purpose: that table's rating is
// required, and it feeds product star averages and the review count Google
// sees. None of these is about a known product.

export type ReviewChannel = 'facebook' | 'whatsapp' | 'messenger'

export interface SocialReview {
  id: string
  /** First name and initial. Null where the screenshot doesn't show a name. */
  name: string | null
  quote: string
  /** Facebook cut the comment short, so the quote ends mid-thought. */
  truncated?: boolean
  /** What we had asked, where the answer makes no sense without it. */
  prompt?: string
  /**
   * Where it was said, for our records - never rendered. Left off the
   * Trustpilot reviews below, whose source is in the comment above their
   * list instead: this data ships to the browser, and Muaz asked on
   * 2026-10-31 for no trace of Trustpilot anywhere on the site.
   */
  channel?: ReviewChannel
  /** The Facebook page it was left on, where we know it. */
  page?: string
  /** A Facebook "recommends", rather than a comment. */
  recommends?: boolean
  /** The stars the customer gave, on platforms that ask for them. */
  rating?: number
  /** When it was posted, where the platform shows it. YYYY-MM-DD. */
  date?: string
  /** Matched to a delivered order in our records. */
  verified?: boolean
  photo?: { src: string; width: number; height: number; alt: string }
}

/**
 * The Trustpilot profile on 2026-10-25, newest first: ten 5-star reviews of
 * the eleven (see above for the one left out). Dates are when each was posted.
 * These do not update themselves — new Trustpilot reviews have to be added
 * here by hand.
 */
export const RATED_REVIEWS: SocialReview[] = [
  {
    id: 'jord',
    name: 'Jord',
    quote:
      'I would highly recommend anyone using this company, queried about a sofa on a Sunday, and had it in my living room by Wednesday evening. Fast and friendly service, kept me up to date at all times. Will use again in future.',
    rating: 5,
    date: '2026-10-15',
    verified: true,
  },
  {
    id: 'laura',
    name: 'Laura',
    quote:
      'Sofa is beautiful and so comfortable, the colour is also really nice. Delivered on time. Driver was a nice guy helped assemble my sofa for me. Communication was also brilliant. Thank you would definitely recommend',
    rating: 5,
    date: '2026-10-03',
  },
  {
    id: 'stacey-b',
    name: 'Stacey B.',
    quote: 'Excellent service, great communication, delivered and set up, perfect sofa’s',
    rating: 5,
    date: '2026-10-11',
    verified: true,
  },
  {
    id: 'sam-p',
    name: 'Sam P.',
    quote:
      'Would highly recommend this company from ordering to delivery really helpful nothing was any trouble the delivery driver was brilliant very polite',
    rating: 5,
    date: '2026-10-09',
    verified: true,
  },
  {
    id: 'sonia-a',
    name: 'Sonia A.',
    quote:
      'I had a very good experience from start to finish. And very quick delivery and assembled the sofas for me too. Good communication with the staff and the delivery people. Will recommend the company to everyone thank you',
    rating: 5,
    date: '2026-09-24',
  },
  {
    id: 'millicent-a',
    name: 'Millicent A.',
    quote: 'I am so happy about the sofas I ordered. They are beautiful and I highly recommend. They did everything when came.',
    rating: 5,
    date: '2026-10-09',
  },
  {
    id: 'ameera-i',
    name: 'Ameera I.',
    quote: 'It was really good as I expected even the price was perfect',
    rating: 5,
    date: '2026-10-17',
  },
  {
    id: 'zam-j',
    name: 'Zam J.',
    quote: 'Very good service and quality is best im very happy with my sofa Thank you so much',
    rating: 5,
    date: '2026-10-13',
  },
  {
    id: 'ian-m',
    name: 'Ian M.',
    quote: 'Great service and quick delivery',
    rating: 5,
    date: '2026-10-19',
  },
  {
    id: 'sillah-h',
    name: 'Sillah H.',
    quote: 'Fast and reliable',
    rating: 5,
    date: '2026-10-11',
  },
]

/** The three every product page shows, with a link to the rest. */
export const PRODUCT_PAGE_REVIEW_IDS = ['jord', 'laura', 'mark-c'] as const

/**
 * Strongest first, with the photos spread through the list rather than
 * bunched, since the /reviews grid and the homepage ticker both read in order.
 */
export const SOCIAL_REVIEWS: SocialReview[] = [
  {
    id: 'norma-m',
    name: 'Norma M.',
    quote:
      "Well I would recommend this company … here is a photo of the 3 seater black leather reclining sofa that I had off them which was delivered to me they r beautiful Sofas a r comfortable to sit on this sofa wot I've got is a Manual one a not electric which is better for me.",
    channel: 'facebook',
    page: 'UK Cheap Leather Sofas',
    photo: { src: '/reviews/norma-black-recliner.jpg', width: 282, height: 372, alt: "Norma's black leather 3 seater recliner at home" },
  },
  {
    id: 'mark-c',
    name: 'Mark C.',
    quote:
      'Messaged yesterday got quoted a good price for delivery and take old suite away they delivered it next day absolutely fantastic service would highly recommend them if you need good quality furniture and service',
    channel: 'facebook',
    page: 'Uk Furniture World',
  },
  {
    id: 'sam',
    name: 'Sam',
    quote:
      'Thank you my sofa is beautiful and the delivery driver was so helpful and polite his a credit to your company',
    channel: 'whatsapp',
  },
  {
    id: 'whatsapp-tan-corner',
    name: null,
    prompt: 'Received your sofa?',
    quote: 'Hi, yes we did. Love it',
    channel: 'whatsapp',
    photo: { src: '/reviews/whatsapp-tan-corner.jpg', width: 450, height: 588, alt: 'A tan corner sofa in a customer’s living room' },
  },
  {
    id: 'elaine-p',
    name: 'Elaine P.',
    quote:
      'What a brilliant service, ordered mine on the Monday and was delivered Tuesday, 2 men brought it in and set it all up, 100% I do recommend there guys, thank you',
    channel: 'facebook',
    page: 'UK Cheap Leather Sofas',
  },
  {
    id: 'christopher-t',
    name: 'Christopher T.',
    quote:
      'I love mine in black and my brother in law got his in grey today so thanks for the good service very quick delivery would definitely recommend.',
    channel: 'facebook',
  },
  {
    id: 'lee-d',
    name: 'Lee D.',
    prompt: 'Are you happy with the service and the quality?',
    quote:
      'Yes and yes. I already did on Facebook. Wrote fantastic value and quality. Anyone asks I’ll put them onto you straight away for sofas',
    channel: 'messenger',
  },
  {
    id: 'facebook-black-recliners',
    name: null,
    quote: 'Best sofas I received today mine lovely Thank you',
    channel: 'facebook',
    page: 'Uk Furniture World',
    photo: { src: '/reviews/facebook-black-recliners.jpg', width: 355, height: 714, alt: 'Black leather recliner sofas on a wooden floor' },
  },
  {
    id: 'tammy-l',
    name: 'Tammy L.',
    quote: 'Had mine delivered on Friday and I couldn’t be anymore happier! Lovely sofa!! Thankyou!!',
    channel: 'facebook',
    page: 'UK Cheap Leather Sofas',
  },
  {
    id: 'santhakumar-g',
    name: 'Santhakumar G.',
    quote: "best delivery service and good stuff used in sofas also fine quality. I'm very happy for you service",
    channel: 'facebook',
    page: 'UK SOFA SHOP',
    recommends: true,
  },
  {
    id: 'whatsapp-brown-corner',
    name: null,
    quote: 'Absolutely chuffed with it, thankyou so much for the great service. Will highly recommend',
    channel: 'whatsapp',
    photo: { src: '/reviews/whatsapp-brown-corner.jpg', width: 502, height: 182, alt: 'A brown corner sofa with a throw and green cushions' },
  },
  {
    id: 'eve-r',
    name: 'Eve R.',
    quote: 'The furniture arrived yesterday and the lads were competent and polite',
    channel: 'messenger',
  },
  {
    id: 'ian-a',
    name: 'Ian A.',
    quote: 'Had mine delivered this morning absolutely over the moon with it',
    channel: 'facebook',
    page: 'Uk SOFA HUB',
  },
  {
    id: 'ann-s',
    name: 'Ann S.',
    prompt: 'Are you happy with the purchase?',
    quote: 'Very happy thank you.',
    channel: 'messenger',
    photo: { src: '/reviews/ann-recliner.jpg', width: 466, height: 492, alt: "Ann's black leather 3 seater recliner, with her dog on it" },
  },
  {
    id: 'debra-s',
    name: 'Debra S.',
    quote: 'Beautiful sofa so pleased',
    channel: 'facebook',
    page: 'UK Cheap Leather Sofas',
    recommends: true,
  },
  {
    id: 'cathy-b',
    name: 'Cathy B.',
    quote: 'Had mine delivered yesterday absolutely stunning x',
    channel: 'facebook',
    page: 'Uk SOFA HUB',
  },
]

/**
 * Everything, Trustpilot and the rest alternating, so the starred reviews and
 * the photographs are spread through the /reviews grid and the homepage
 * ticker rather than arriving in two blocks.
 */
export const CUSTOMER_REVIEWS: SocialReview[] = Array.from(
  { length: Math.max(RATED_REVIEWS.length, SOCIAL_REVIEWS.length) },
  (_, i) => [RATED_REVIEWS[i], SOCIAL_REVIEWS[i]],
).flat().filter((r): r is SocialReview => Boolean(r))

export const PRODUCT_PAGE_REVIEWS: SocialReview[] = PRODUCT_PAGE_REVIEW_IDS
  .map(id => CUSTOMER_REVIEWS.find(r => r.id === id))
  .filter((r): r is SocialReview => Boolean(r))
