import { buildProductFeed } from '@/utils/catalog/productFeed'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET(): Promise<Response> {
  return buildProductFeed('meta')
}
