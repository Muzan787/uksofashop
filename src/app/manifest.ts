import { MetadataRoute } from 'next'
import { META_DESCRIPTION } from '@/constants/promises'

/**
 * The customer-facing installable app.
 *
 * start_url used to be '/admin', and the manifest is served to everyone - so
 * any customer who accepted the install prompt got an app that opened the
 * admin dashboard and bounced them straight to a login screen.
 *
 * The admin app lives at /admin/manifest.webmanifest instead, so the two no
 * longer share one definition.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UK Sofa Shop',
    short_name: 'UK Sofa Shop',
    description: META_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0c0c0b',
    theme_color: '#d4871a',
    lang: 'en-GB',
    categories: ['shopping', 'lifestyle'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      // Some Android versions still require a PNG before they will offer the
      // install prompt at all.
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
