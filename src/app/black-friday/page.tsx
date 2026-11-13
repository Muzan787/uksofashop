// src/app/black-friday/page.tsx
//
// Black Friday, told straight: the date, the offer that is really on, and what
// has not been announced. See components/Season/SeasonalLanding.tsx.
import type { Metadata } from 'next'
import { pageMetadata } from '@/utils/pageMetadata'
import { getShopSettings } from '@/utils/shopSettingsServer'
import SeasonalLanding from '@/components/Season/SeasonalLanding'

export const revalidate = 3600

export const metadata: Metadata = pageMetadata({
  title: 'Black Friday at UK Sofa Shop',
  description: 'Black Friday is 27 November. What offers are genuinely on, how long they last and how we show prices. Free delivery to most of the UK, pay on delivery.',
  path: '/black-friday',
})

export default async function BlackFridayPage() {
  return <SeasonalLanding kind="black_friday" settings={await getShopSettings()} />
}
