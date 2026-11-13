// src/app/christmas/page.tsx
//
// Christmas delivery, told straight: how timing works for made-to-order sofas
// and how to ask for a date. It states no cut-off and promises no date.
import type { Metadata } from 'next'
import { pageMetadata } from '@/utils/pageMetadata'
import { getShopSettings } from '@/utils/shopSettingsServer'
import SeasonalLanding from '@/components/Season/SeasonalLanding'

export const revalidate = 3600

export const metadata: Metadata = pageMetadata({
  title: 'Christmas delivery',
  description: 'Want a sofa before Christmas? How delivery timing works for made-to-order sofas, and how to check the date for your sofa and postcode.',
  path: '/christmas',
})

export default async function ChristmasPage() {
  return <SeasonalLanding kind="christmas" settings={await getShopSettings()} />
}
