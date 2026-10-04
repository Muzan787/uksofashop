// src/utils/pageMetadata.ts
//
// One builder for a page's title, description, canonical and social card.
//
// WHY THIS EXISTS. Next merges `metadata` shallowly, one key at a time, and
// `openGraph` is a single key. So a page that sets `title` and `description`
// but no `openGraph` does not get an Open Graph card built from them - it
// inherits the ROOT LAYOUT'S card wholesale. Twenty-four pages were in that
// state: /about, /fabrics, /faq, /delivery-returns, /size-guide, /care-guide,
// /showroom, /reviews, /collection, /journal, /contact, /terms, /privacy,
// /cookies, /sitemap and the rest all advertised themselves on WhatsApp,
// Facebook and LinkedIn as "UK Sofa Shop | Sofas with Cash on Delivery" with
// the homepage blurb and the homepage photograph. Fifteen different pages,
// one indistinguishable card.
//
// The same shallowness bites the other way round. A page that DOES set
// `openGraph` replaces the parent's entirely, so omitting `images` does not
// fall back to the site card - it emits no og:image at all. Every Journal
// article, every category listing and any product whose lead photo is not a
// Cloudinary upload was sharing as a bare text card for that reason.
//
// Both failures are invisible on the page itself, which is why they survived:
// nothing renders wrong, and only a scraper ever reads the tags. A helper that
// cannot produce either state is the fix, rather than remembering to write
// four near-identical blocks on every new page.

import type { Metadata } from 'next'
import { ogImage } from '@/utils/socialImage'

/** Appended to `title` for the social card, because og:title does not go
 *  through the layout's "%s | UK Sofa Shop" template - only <title> does. */
export const BRAND = 'UK Sofa Shop'

/** The site-wide 1200x630 card, used whenever a page has no photograph of
 *  its own. Lives in public/. */
export const SITE_CARD = '/og-image.jpg'

export interface PageMetaInput {
  /** Bare title. The layout template adds the brand to <title>; this helper
   *  adds it to og:title and twitter:title. Keep it under ~45 characters so
   *  the two together stay inside the ~60 Google will show. */
  title: string
  /** Meta description and card description. Aim for 120-160 characters. */
  description: string
  /** Site-root-relative path, e.g. '/about'. Becomes the canonical and og:url.
   *  Pass `null` for a page that should carry no canonical - a tokenised or
   *  per-visitor URL has nothing stable to point at. */
  path: string | null
  /** A page-specific card. Falls back to the site card rather than to nothing. */
  image?: string
  /** Alt text for the card. Defaults to the title. */
  imageAlt?: string
  /** 'article' for Journal pieces, 'website' for everything else. */
  type?: 'website' | 'article'
  /** Passed straight through, for the noindex pages. */
  robots?: Metadata['robots']
  /** og:article:published_time / modified_time, for the Journal. */
  publishedTime?: string
  modifiedTime?: string
}

/**
 * The full metadata object for a page: title, description, canonical, and an
 * Open Graph and Twitter card that both describe THIS page and both carry an
 * image.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = SITE_CARD,
  imageAlt,
  type = 'website',
  robots,
  publishedTime,
  modifiedTime,
}: PageMetaInput): Metadata {
  const socialTitle = `${title} | ${BRAND}`

  return {
    title,
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    ...(robots ? { robots } : {}),
    openGraph: {
      type,
      title: socialTitle,
      description,
      ...(path ? { url: path } : {}),
      images: [ogImage(image, imageAlt ?? title)],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [image],
    },
  }
}

/** What Google will render before it starts cutting. Not a hard limit - it
 *  measures pixels, not characters - but it is the budget the rest of the
 *  site's hand-written descriptions are held to. */
export const META_DESCRIPTION_MAX = 160

/**
 * A description short enough to be shown whole.
 *
 * Product descriptions in the database run 311 to 517 characters, because they
 * are body copy for the page: the style, the cushions, the feet, the
 * dimensions, the delivery promise. Handed straight to `description` - which is
 * what the product page did for all 72 of them - that is a meta description
 * two to three times the length of the snippet, so every product result was
 * cut off, usually mid-word and sometimes mid-number.
 *
 * So: take whole sentences while they fit. Those descriptions open by saying
 * what the thing is, which is exactly what a snippet should say. If even the
 * first sentence is too long, fall back to a word boundary and an ellipsis,
 * because a clean break at a space reads as an excerpt while a break inside
 * "button-tuf" reads as a bug.
 *
 * The full text stays on the page untouched. This only governs the tag.
 */
export function metaDescription(text: string, max = META_DESCRIPTION_MAX): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean.length <= max) return clean

  // Sentence ends, keeping the punctuation that closes each one.
  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)/g)
  if (sentences) {
    let out = ''
    for (const sentence of sentences) {
      if ((out + sentence).trim().length > max) break
      out += sentence
    }
    out = out.trim()
    if (out) return out
  }

  // No sentence fits. Cut at the last space inside the budget, leaving room
  // for the ellipsis, and strip any punctuation left dangling at the break.
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-–—]$/, '')}…`
}
