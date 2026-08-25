import { MetadataRoute } from 'next'
import { SITE_URL } from '@/constants/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // The Merchant Centre feed is called out explicitly: it used to live
      // under /api/ and was silently unreachable because of the rule below.
      // Merchant Centre honours robots.txt when fetching a scheduled feed.
      allow: ['/', '/feeds/google-merchant.xml'],
      disallow: [
        '/admin/',
        // Genuinely unreadable to a crawler, and no page exists to carry a
        // noindex tag, so a Disallow is the only tool available here.
        '/api/',
      ],
      // NOTE on /checkout, /track-order, /account, /wishlist, /login, /signup
      // and /search: these are deliberately NOT disallowed. They each send
      // `robots: { index: false }` in their metadata, and a crawler has to
      // fetch a page to read that tag. Disallowing them as well would hide the
      // noindex, leaving Google free to list the bare URL from inbound links
      // with no way to learn it should not. Blocking and noindexing the same
      // URL is self-defeating; noindex alone is what actually removes it.
    },
    // Must be the canonical host. Advertising the sitemap on the bare domain
    // while every canonical tag points at www tells Google the sitemap belongs
    // to a different site than the URLs inside it.
    sitemap: `${SITE_URL}/sitemap.xml`,
    // No `host:` directive. It is a Yandex extension that Google ignores, it
    // expects a bare hostname rather than a URL, and the apex -> www redirect
    // in next.config.ts is what actually settles the canonical host.
  }
}
