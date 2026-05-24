import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UK Sofa Shop',
    short_name: 'USS',
    description: 'Discover luxury British sofas with 10-year guarantee. Free UK delivery, cash on delivery available. Shop corner sofas, fabric sofas, and more.',
    start_url: '/',
    display: 'standalone',
    background_color: '#80808080',
    theme_color: '#F97316', // Updated to match your new orange branding
    icons: [
      // {
      //   src: '/icon.svg', // Points to your new SVG
      //   sizes: 'any',
      //   type: 'image/svg+xml',
      // },
      // Keep these PNG references for PWA compatibility! 
      // (You should eventually save a 192x192 and 512x512 PNG version of your orange 'U' into the /public folder, as some older Android devices still require PNGs to trigger the install prompt).
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}