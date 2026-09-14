import { MANUAL_META_ENTRIES } from '@/utils/offers/manualMetaEntries'
import { signOfferEntry } from '@/utils/offers/entryToken'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

const BASE_URL = 'https://www.uksofashop.co.uk'

export async function GET(): Promise<Response> {
  try {
    const entries = MANUAL_META_ENTRIES.map(entry => ({
      ...entry,
      websiteUrl: `${BASE_URL}/offer-entry/${signOfferEntry({
        v: 1,
        source: 'meta_ads',
        destination: entry.destination,
      })}`,
      cards: 'cards' in entry
        ? entry.cards.map(card => ({
            ...card,
            websiteUrl: `${BASE_URL}/offer-entry/${signOfferEntry({
              v: 1,
              source: 'meta_ads',
              destination: card.destination,
            })}`,
          }))
        : undefined,
    }))

    return Response.json(entries, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  } catch (error) {
    console.error('Failed to generate manual Meta entry links:', error)
    return Response.json({ error: 'Unavailable' }, { status: 503 })
  }
}
