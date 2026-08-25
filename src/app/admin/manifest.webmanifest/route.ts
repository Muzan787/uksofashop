// src/app/admin/manifest.webmanifest/route.ts
//
// A separate installable app for the shop owner, scoped to /admin.
//
// Kept apart from the customer manifest at /manifest.webmanifest, which is
// served to every visitor. Pointing that one at /admin - which is what it used
// to do - meant a customer who installed the app got the admin dashboard and
// an immediate redirect to a login page.
//
// Linked from the admin layout only, so a customer is never offered it.

import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json(
    {
      name: 'UK Sofa Shop Admin',
      short_name: 'USS Admin',
      description: 'Manage orders, products and reviews for UK Sofa Shop.',
      start_url: '/admin',
      scope: '/admin',
      display: 'standalone',
      background_color: '#0c0c0b',
      theme_color: '#d4871a',
      lang: 'en-GB',
      icons: [
        { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  )
}
