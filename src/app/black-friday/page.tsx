// src/app/black-friday/page.tsx
//
// Black Friday, told straight: the date, the offer that is really on, and what
// has not been announced. See components/Season/SeasonalLanding.tsx.
import type { Metadata } from 'next'
import { pageMetadata } from '@/utils/pageMetadata'
import { getShopSettings } from '@/utils/shopSettingsServer'
import SeasonalLanding from '@/components/Season/SeasonalLanding'
import { getMadeToOrderMembers } from '@/utils/seasonProducts'
import type { MainCollectionMember } from '@/utils/mainCollections'

export const revalidate = 3600

export const metadata: Metadata = pageMetadata({
  title: 'Black Friday at UK Sofa Shop',
  description: 'Black Friday made-to-order sofa ranges, built to your size. £50 off the listed price of every made-to-order sofa in your 14-day offer window with code BLACKFRIDAY. Free delivery to most of the UK.',
  path: '/black-friday',
})

export default async function BlackFridayPage() {
  const [settings, mto] = await Promise.all([getShopSettings(), getMadeToOrderMembers()])
  return <SeasonalLanding kind="black_friday" settings={settings} members={mto.members as MainCollectionMember[]} />
}
