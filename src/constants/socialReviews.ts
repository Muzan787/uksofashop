// src/constants/socialReviews.ts
//
// What customers said about us on Facebook, WhatsApp and Messenger, before the
// website had reviews of its own. Copied from Muaz's screenshots on 2026-10-25
// (out/Reviews). Most orders still come in on WhatsApp, so this is where the
// shop's track record actually lives.
//
// The rules these follow, because the DMCC Act 2024 bans presenting reviews
// misleadingly and the CMA can fine up to 10% of turnover for it:
//   · Their words, not ours. Trimmed where a message went on to something else
//     (an invoice request, a friend's name), emoji dropped, one mistyped word
//     fixed (Sam's "credir"). Grammar and spelling are otherwise as written.
//   · No star ratings. None of these came with one, so none is shown. A
//     Facebook "recommends" says exactly that and nothing more.
//   · Where it was said, on every card. Several were left on our Facebook pages
//     from before the website, under names other than UK Sofa Shop — Muaz
//     confirmed on 2026-10-25 that all of them are this business.
//   · First name and initial only. Some of these are from private chats.
//   · Never staff. The two "Saad Abbasi" reviews were hidden in Admin →
//     Reviews the same day for that reason.
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
  channel: ReviewChannel
  /** The Facebook page it was left on, where we know it. */
  page?: string
  /** A Facebook "recommends", rather than a comment. */
  recommends?: boolean
  photo?: { src: string; width: number; height: number; alt: string }
}

/** Our Facebook pages from before the website, which some of these were left on. */
export const EARLIER_PAGES = ['UK Cheap Leather Sofas', 'Uk Furniture World', 'Uk SOFA HUB'] as const

/** "Facebook comment", "Recommended us on Facebook", "WhatsApp message"… */
export function channelLabel(review: SocialReview): string {
  if (review.channel === 'whatsapp') return 'WhatsApp message'
  if (review.channel === 'messenger') return 'Facebook Messenger'
  return review.recommends ? 'Recommended us on Facebook' : 'Facebook comment'
}

/**
 * Strongest first, with the photos spread through the list rather than
 * bunched, since the /reviews grid and the homepage ticker both read in order.
 */
export const SOCIAL_REVIEWS: SocialReview[] = [
  {
    id: 'norma-m',
    name: 'Norma M.',
    quote:
      "Well I would recommend this company UK Cheap Leather Sofas as here is a photo of the 3 seater black leather reclining sofa that I had off them which was delivered to me they r beautiful Sofas a r comfortable to sit on this sofa wot I've got is a Manual one a not electric which is better for me. I'm so thrilled to have contacted UK Cheap Leather Sofas in the first place",
    truncated: true,
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
