import { buildProductFeed } from '@/utils/catalog/productFeed'
import { recordFeedFetch } from '@/utils/feedFetches'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET(request: Request): Promise<Response> {
  const response = await buildProductFeed('meta')
  // Notes Meta's fetches (only Meta's) for the Status page's feed check.
  recordFeedFetch('meta-catalog', request)
  return response
}
