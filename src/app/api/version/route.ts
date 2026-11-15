// src/app/api/version/route.ts
//
// The deploy this server is running (Run 8). VersionGuard compares it with
// the deploy the open page was built from, so a page kept alive by a browser
// cache or the PWA service worker refreshes itself once after a new release.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  const response = NextResponse.json({ build: process.env.NEXT_PUBLIC_BUILD_STAMP ?? 'none' })
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  return response
}
