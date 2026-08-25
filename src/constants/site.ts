// src/constants/site.ts
//
// One definition of the site's own address. Four files used to hardcode this
// and two of them disagreed - robots.txt advertised a sitemap on the bare
// domain while every canonical tag pointed at www, which tells Google the
// sitemap belongs to a different site than the pages in it.
//
// www is the canonical host. The bare domain must 301 to it at the hosting
// layer; see the note in next.config.ts.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://www.uksofashop.co.uk'

/**
 * What metadataBase should resolve relative URLs against. In development that
 * has to be localhost, or every canonical rendered locally claims to be the
 * production URL and local checks silently test nothing.
 */
export const METADATA_BASE =
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : SITE_URL
