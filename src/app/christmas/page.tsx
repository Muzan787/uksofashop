// src/app/christmas/page.tsx
//
// Christmas delivery, told straight: how timing works for made-to-order sofas
// and how to ask for a date. It states no cut-off and promises no date.
import type { Metadata } from 'next'
import { pageMetadata } from '@/utils/pageMetadata'
import { getShopSettings } from '@/utils/shopSettingsServer'
import SeasonalLanding from '@/components/Season/SeasonalLanding'
import { getMadeToOrderMembers } from '@/utils/seasonProducts'
import type { MainCollectionMember } from '@/utils/mainCollections'

export const revalidate = 3600

export const metadata: Metadata = pageMetadata({
  title: 'Christmas sofas and delivery',
  description: 'Made-to-order sofa ranges for Christmas: family sets, corners and U-shapes. £50 off with code CHRISTMAS in your offer window. Check the delivery date for your sofa and postcode.',
  path: '/christmas',
})

export default async function ChristmasPage() {
  const [settings, mto] = await Promise.all([getShopSettings(), getMadeToOrderMembers()])
  return <SeasonalLanding kind="christmas" settings={settings} members={mto.members as MainCollectionMember[]} />
}
