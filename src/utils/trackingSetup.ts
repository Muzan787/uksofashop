// src/utils/trackingSetup.ts
//
// What's set up for tracking (admin upgrade N1): one tick or cross per piece,
// read from this server's settings. Never a value - no ID, token, code or
// label leaves this file, only whether it is there.

import 'server-only'
import { isServerTrackingEnabled } from '@/utils/trackingEnv'
import { GA_ID, META_PIXEL_ID } from '@/utils/consentMode'
import { GOOGLE_GTM_ENABLED } from '@/utils/googleMeasurement'

export interface SetupItem {
  key: string
  label: string
  /** true: set up; false: missing; 'warn': set, but worth knowing about. */
  state: boolean | 'warn'
  note: string
}

const has = (name: string) => Boolean(process.env[name]?.trim())

export function trackingSetup(): SetupItem[] {
  const production = isServerTrackingEnabled()
  const viaOldName = production && process.env.TRACKING_ENV !== 'production'
  return [
    {
      key: 'live-server',
      label: 'This is the live server',
      state: production ? (viaOldName ? 'warn' : true) : false,
      note: production
        ? viaOldName
          ? 'Yes, but through the old VERCEL_ENV name. Set TRACKING_ENV=production on Hostinger.'
          : 'Yes: server events can be sent from here.'
        : 'No: nothing is sent to Meta or Google from this server, whatever the mode.',
    },
    {
      key: 'pixel',
      label: 'Meta Pixel',
      state: Boolean(META_PIXEL_ID),
      note: META_PIXEL_ID ? 'In the site’s code; loads once a visitor accepts cookies.' : 'Missing from the site’s code.',
    },
    {
      key: 'capi',
      label: 'Meta Conversions API',
      state: has('META_PIXEL_ID') && has('META_CAPI_ACCESS_TOKEN'),
      note: has('META_PIXEL_ID') && has('META_CAPI_ACCESS_TOKEN')
        ? 'The dataset ID and access token are on the server.'
        : `Missing on the server: ${[!has('META_PIXEL_ID') && 'META_PIXEL_ID', !has('META_CAPI_ACCESS_TOKEN') && 'META_CAPI_ACCESS_TOKEN'].filter(Boolean).join(' and ')}. Purchases can’t be sent.`,
    },
    {
      key: 'test-code',
      label: 'Meta test code',
      state: has('META_CAPI_TEST_EVENT_CODE') ? 'warn' : false,
      note: has('META_CAPI_TEST_EVENT_CODE')
        ? 'Set. Every server event carries it, Live included, as it did before the modes. Remove it once testing is done.'
        : 'Not set. Only Test mode needs it.',
    },
    {
      key: 'ga4',
      label: 'Google Analytics 4',
      state: Boolean(GA_ID),
      note: GA_ID ? 'In the site’s code; measures without cookies until a visitor accepts them.' : 'Missing from the site’s code.',
    },
    {
      key: 'gtm',
      label: 'Google Tag Manager',
      state: GOOGLE_GTM_ENABLED,
      note: GOOGLE_GTM_ENABLED ? 'On: Google’s tags run through the container.' : 'Off: the site uses Google’s tag directly.',
    },
    {
      key: 'ga4-server',
      label: 'GA4 server events',
      state: has('GA4_MEASUREMENT_ID') && has('GA4_API_SECRET'),
      note: has('GA4_MEASUREMENT_ID') && has('GA4_API_SECRET')
        ? 'The measurement ID and API secret are on the server.'
        : 'Not set on the server, so a confirmed order’s purchase isn’t sent to GA4 from the server.',
    },
    {
      key: 'ads-label',
      label: 'Google Ads conversion label',
      state: has('NEXT_PUBLIC_ADS_ORDER_PLACED_SEND_TO'),
      note: has('NEXT_PUBLIC_ADS_ORDER_PLACED_SEND_TO') ? 'Set for “order placed”.' : 'Not set: no Google Ads conversion fires when an order is placed.',
    },
    {
      key: 'offline',
      label: 'Google Ads offline conversions',
      state: true,
      note: 'Confirmed sales are staged in the database for the Google Sheet; the upload is by hand. Admin → Status shows what is waiting.',
    },
  ]
}
