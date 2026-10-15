import type { Metadata } from 'next'
// src/app/admin/ad-links/page.tsx
//
// Ad links (admin upgrade O1-O5, decision 15): the Meta catalogue feed, the
// URL parameters for every ad, a ready link for every page Meta ads point at,
// the profile links and the test ad link. This file loads and signs the
// links; AdLinksView shows them.
import { createClient } from '@/utils/supabase/server'
import { buildProductFeed } from '@/utils/catalog/productFeed'
import { canonicalProductPath } from '@/utils/productUrl'
import { signOfferEntry } from '@/utils/offers/entryToken'
import { MANUAL_META_ENTRIES } from '@/utils/offers/manualMetaEntries'
import { feedLeftOut, SITE, TEST_LINK_QUERY, type FeedProduct } from '@/utils/adLinks'
import AdLinksView, { type AdLink, type ProductLinks } from './AdLinksView'

export const metadata: Metadata = { title: 'Ad links' }
export const dynamic = 'force-dynamic'

/** An offer-entry link: the page, arriving as a Meta ad visitor would. */
function adLink(destination: string): string {
  return `${SITE}/offer-entry/${signOfferEntry({ v: 1, source: 'meta_ads', destination })}`
}

type ProductRow = FeedProduct & {
  slug: string
  variant_group_id: string | null
  base_price: number
  categories: { slug: string; name: string } | { slug: string; name: string }[] | null
  product_categories: { categories: { slug: string } | { slug: string }[] | null }[] | null
}

async function countFeedItems(): Promise<number | null> {
  try {
    const res = await buildProductFeed('meta')
    if (!res.ok) return null
    return ((await res.text()).match(/<item>/g) ?? []).length
  } catch {
    return null
  }
}

async function loadAdLinks() {
  const supabase = await createClient()
  const [productsRes, categoriesRes, rangesRes, fetchRes, feedItems] = await Promise.all([
    supabase
      .from('products')
      .select('id, title, slug, is_active, gallery_images, variant_group_id, base_price, categories!products_category_id_fkey ( slug, name ), product_categories ( categories ( slug ) ), product_variants ( id, color, is_active, image_url )')
      .order('title'),
    supabase.from('categories').select('name, slug').eq('is_active', true).order('sort').order('name'),
    supabase.from('variant_groups').select('id, name').order('name'),
    supabase.from('feed_fetches').select('fetched_at, item_count').eq('feed', 'meta-catalog').order('fetched_at', { ascending: false }).limit(1).maybeSingle(),
    countFeedItems(),
  ])

  const products = (productsRes.data ?? []) as unknown as ProductRow[]
  const shown = products.filter(p => p.is_active)
  const { items, leftOut } = feedLeftOut(products)

  const productLinks: ProductLinks[] = shown.map(p => {
    const path = canonicalProductPath(p)
    return {
      title: p.title,
      url: adLink(path),
      colourways: (p.product_variants ?? [])
        .filter(v => v.is_active)
        .map(v => ({ label: v.color || 'Colourway', url: adLink(`${path}?variant=${v.id}`) })),
    }
  })

  // A range opens on its cheapest shown size, the first one a shopper would see.
  const ranges: AdLink[] = (rangesRes.data ?? []).flatMap(r => {
    const first = shown
      .filter(p => p.variant_group_id === r.id)
      .sort((a, b) => Number(a.base_price) - Number(b.base_price))[0]
    return first ? [{ label: r.name, detail: `Opens ${first.title}`, url: adLink(canonicalProductPath(first)) }] : []
  })

  const ads: AdLink[] = MANUAL_META_ENTRIES.flatMap(entry => [
    { label: `${entry.ad} · ${entry.slug}`, detail: entry.destination, url: adLink(entry.destination) },
    ...('cards' in entry
      ? entry.cards.map(card => ({ label: `${entry.ad} card · ${card.slug}`, detail: card.destination, url: adLink(card.destination) }))
      : []),
  ])

  return {
    feed: {
      items: feedItems ?? items,
      leftOut,
      lastFetch: fetchRes.data ?? null,
    },
    ads,
    home: { label: 'Home page', detail: '/', url: adLink('/') },
    departments: (categoriesRes.data ?? []).map(c => ({ label: c.name, detail: `/shop/${c.slug}`, url: adLink(`/shop/${c.slug}`) })),
    ranges,
    products: productLinks,
    testLink: `${adLink('/')}?${TEST_LINK_QUERY}`,
  }
}

export default async function AdLinksPage() {
  return <AdLinksView {...await loadAdLinks()} />
}
