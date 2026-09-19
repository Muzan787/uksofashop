// src/app/page.tsx
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/utils/supabase/public';
import { summariseCollections } from '@/utils/collections';
import { getFabricLibrary } from '@/utils/fabrics';
import { getBuildTeaser } from '@/utils/buildTeaser';
import HomeClient from '@/components/Home/HomeClient';
import { organizationSchema, webSiteSchema, jsonLd } from '@/utils/schema';

// The title deliberately repeats the layout default rather than using the
// "%s | UK Sofa Shop" template - the homepage should not read "Home | ...".
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};


/**
 * Everything the homepage draws, read in one go and kept for five minutes.
 *
 * WHY. Every homepage request used to run these queries fresh - six of them,
 * one after another, each a round trip to the database - so the first byte
 * took 1.8 seconds on the page 117 ad clicks a month land on, long after the
 * product pages had been made fast. Nothing here depends on who is asking:
 * it is the catalogue, the categories, approved reviews and the fabric
 * count, which is the same page for everyone. So it is read with the
 * cookie-less public client (utils/supabase/public.ts), the reads run in
 * parallel, and the result is shared through unstable_cache the way the
 * navigation already is. Five minutes is how long a product edited in the
 * admin panel can take to reach the front page; the tag lets anything that
 * wants it sooner call revalidateTag('home').
 */
const getHomeData = unstable_cache(
  async () => {
    const supabase = createPublicClient();

    const [
      { data: categories },
      { data: categoryStats },
      { data: featuredProducts },
      { data: groupsData },
      { count: sofaCount },
      { data: reviewRows },
      fabricLibrary,
    ] = await Promise.all([
      // Categories
      supabase.from('categories').select('*').order('name').limit(6),

      // Cheapest active product and how many there are, per category. One pass
      // over the active products rather than a query each — the tiles need a
      // price anchor and a count, and neither is worth six round trips.
      supabase.from('products').select('title, base_price, product_categories!inner(category_id)').eq('is_active', true),

      // Featured products: is_featured first, then newest — the same order the
      // shop's "Featured" sort uses, so ticking a product in the admin moves it
      // in both places. categories!products_category_id_fkey is the designated
      // primary category and the first thing canonicalProductPath looks at, so
      // the card's link has to have it or it silently falls back to the
      // priority order and can name a different URL than the product page's
      // own canonical tag.
      supabase
        .from('products')
        .select('id, title, slug, base_price, gallery_images, average_rating, review_count, product_variants(id, image_url, color, color_hex, price_adjustment, priority), categories!products_category_id_fkey(slug, name), product_categories(categories(slug, name))')
        .eq('is_active', true)
        .order('is_featured', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .order('priority', { referencedTable: 'product_variants', ascending: true })
        .limit(6),

      // Collections, with their products for the smart image selection.
      supabase
        .from('variant_groups')
        .select(`
          id,
          name,
          slug,
          products (
            id,
            base_price,
            is_active,
            gallery_images,
            product_variants ( image_url )
          )
        `)
        .limit(6),

      // How many sofas are actually live. head:true means the rows are counted
      // server-side and none of them are transferred.
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),

      // The most recent approved reviews, for the homepage ticker. order_id is
      // what makes a review a verified purchase rather than an open comment.
      supabase
        .from('reviews')
        .select('id, rating, comment, customer_name, order_id, products ( title )')
        .eq('is_approved', true)
        .not('comment', 'is', null)
        .order('created_at', { ascending: false })
        .limit(12),

      // The fabric library, for the "build your own" board's count.
      getFabricLibrary(supabase),
    ]);

    // The "build your own" board - the frame it is photographed with, the
    // cheapest 3 seater and the fabric count. Shared with the free-samples
    // page, which carries the same section. After the reads above because it
    // needs the library.
    const buildTeaser = await getBuildTeaser(fabricLibrary, supabase);

    return { categories, categoryStats, featuredProducts, groupsData, sofaCount, reviewRows, buildTeaser };
  },
  ['uksofashop-home-data-v1'],
  { revalidate: 300, tags: ['home'] },
);

export default async function HomePage() {
  const {
    categories, categoryStats, featuredProducts, groupsData, sofaCount, reviewRows, buildTeaser,
  } = await getHomeData();

  // "from £149" under Fabric Sofas was the Lily footstool. The tile says
  // "sofas", so the price anchor is the cheapest thing that is one: footstools
  // and armchairs still count towards the tile's total, they just cannot set
  // its price.
  const notASofa = /footstool|arm\s?chair/i;
  const stats = new Map<string, { fromPrice: number | null; count: number }>();
  for (const row of categoryStats ?? []) {
    const price = Number(row.base_price);
    if (!Number.isFinite(price)) continue;
    const anchors = !notASofa.test(row.title ?? '');
    for (const pc of row.product_categories ?? []) {
      const id = pc.category_id;
      if (!id) continue;
      const seen = stats.get(id) ?? { fromPrice: null, count: 0 };
      stats.set(id, {
        fromPrice: anchors ? (seen.fromPrice === null ? price : Math.min(seen.fromPrice, price)) : seen.fromPrice,
        count: seen.count + 1,
      });
    }
  }

  const categoriesData = categories?.map(cat => ({
    ...cat,
    image_url: cat.image_url ?? undefined,
    fromPrice: stats.get(cat.id)?.fromPrice ?? null,
    productCount: stats.get(cat.id)?.count ?? 0,
  })) ?? [];

  const productsData = (featuredProducts ?? []).map(product => ({
    ...product,
    product_variants: (product.product_variants ?? []).map(variant => ({
      id: variant.id,
      image_url: variant.image_url ?? undefined,
      color: variant.color,
      color_hex: variant.color_hex,
    })),
  }));

  const collectionsData = summariseCollections(groupsData);

  const reviews = (reviewRows ?? []).map(r => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    customerName: r.customer_name,
    verified: Boolean(r.order_id),
    productTitle: r.products?.title ?? null,
  }));

  return (
    <>
      {/* Organization is referenced by @id from the Product offers, so the
          seller resolves to one entity rather than being repeated per page.
          WebSite carries the sitelinks search box. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(webSiteSchema()) }} />
      <HomeClient
        categories={categoriesData}
        products={productsData}
        collections={collectionsData}
        sofaCount={sofaCount ?? 0}
        reviews={reviews}
        buildTeaser={buildTeaser}
      />
    </>
  );
}