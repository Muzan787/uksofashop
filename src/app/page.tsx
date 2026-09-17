// src/app/page.tsx
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { summariseCollections } from '@/utils/collections';
import { getFabricLibrary } from '@/utils/fabrics';
import HomeClient from '@/components/Home/HomeClient';
import { organizationSchema, webSiteSchema, jsonLd } from '@/utils/schema';

// The title deliberately repeats the layout default rather than using the
// "%s | UK Sofa Shop" template - the homepage should not read "Home | ...".
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const supabase = await createClient();

  // 1. Fetch Categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')
    .limit(6);

  // Cheapest active product and how many there are, per category. One pass
  // over the active products rather than a query each — the tiles need a
  // price anchor and a count, and neither is worth six round trips.
  const { data: categoryStats } = await supabase
    .from('products')
    .select('base_price, product_categories!inner(category_id)')
    .eq('is_active', true);

  const stats = new Map<string, { fromPrice: number; count: number }>();
  for (const row of categoryStats ?? []) {
    const price = Number(row.base_price);
    if (!Number.isFinite(price)) continue;
    for (const pc of row.product_categories ?? []) {
      const id = pc.category_id;
      if (!id) continue;
      const seen = stats.get(id);
      stats.set(id, seen
        ? { fromPrice: Math.min(seen.fromPrice, price), count: seen.count + 1 }
        : { fromPrice: price, count: 1 });
    }
  }

  const categoriesData = categories?.map(cat => ({
    ...cat,
    image_url: cat.image_url ?? undefined,
    fromPrice: stats.get(cat.id)?.fromPrice ?? null,
    productCount: stats.get(cat.id)?.count ?? 0,
  })) ?? [];

  // 2. Fetch Featured Products
  //
  //    is_featured first, then newest — the same order the shop's "Featured"
  //    sort uses, so ticking a product in the admin moves it in both places.
  //    This rail previously sorted on created_at alone, which meant the front
  //    page showed whatever had been added last and the flag on the products
  //    table did nothing here. With fewer than six ticked the remainder still
  //    fills from the newest, so the rail is never short.
  const { data: featuredProducts } = await supabase
    .from('products')
    // categories!products_category_id_fkey is the designated primary category
    // and the first thing canonicalProductPath looks at, so the card's link
    // has to have it or it silently falls back to the priority order and can
    // name a different URL than the product page's own canonical tag.
    .select('id, title, slug, base_price, gallery_images, average_rating, review_count, product_variants(id, image_url, color, color_hex, price_adjustment, priority), categories!products_category_id_fkey(slug, name), product_categories(categories(slug, name))')
    .eq('is_active', true)
    .order('is_featured', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('priority', { referencedTable: 'product_variants', ascending: true })
    .limit(6);

  const productsData = (featuredProducts ?? []).map(product => ({
    ...product,
    product_variants: (product.product_variants ?? []).map(variant => ({
      id: variant.id,
      image_url: variant.image_url ?? undefined,
      color: variant.color,
      color_hex: variant.color_hex,
    })),
  }));

  // 3. Fetch Collections with Smart Image Selection
  const { data: groupsData } = await supabase
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
    .limit(6); // Optional: Limit to top 6 on homepage

  const collectionsData = summariseCollections(groupsData);

  // 4. How many sofas are actually live. head:true means the rows are counted
  //    server-side and none of them are transferred.
  const { count: sofaCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  // 5. The most recent approved reviews, for the homepage ticker. order_id
  //    is what makes a review a verified purchase rather than an open comment.
  const { data: reviewRows } = await supabase
    .from('reviews')
    .select('id, rating, comment, customer_name, order_id, products ( title )')
    .eq('is_approved', true)
    .not('comment', 'is', null)
    .order('created_at', { ascending: false })
    .limit(12);

  // 6. The "build your own" board: one made-to-order frame to photograph the
  //    section with, the cheapest 3 seater we build, and the fabric library
  //    for its count and three swatches. The Ashton high back is the first
  //    choice because it is the best studio shot in the range; anything
  //    custom_made with a photograph will do if it is ever retired.
  const [{ data: buildFrames }, fabricLibrary] = await Promise.all([
    supabase
      .from('products')
      .select('slug, title, base_price, size_label, product_variants(image_url, priority)')
      .eq('custom_made', true)
      .eq('is_active', true),
    getFabricLibrary(),
  ]);

  const frames = (buildFrames ?? []).map(f => ({
    ...f,
    image: [...(f.product_variants ?? [])]
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      .find(v => v.image_url)?.image_url ?? null,
  }));
  const board =
    frames.find(f => f.slug === 'ashton-high-back-3-seater' && f.image) ??
    frames.find(f => f.size_label === '3 Seater' && f.image) ??
    frames.find(f => f.image) ??
    null;
  const threeSeaters = frames
    .filter(f => f.size_label === '3 Seater')
    .map(f => Number(f.base_price))
    .filter(Number.isFinite);
  const allFabrics = fabricLibrary.flatMap(c => c.fabrics);
  // Three that read as a range at 28px: a colour, a neutral and a dark.
  const wanted = ['PL08', 'CH02', 'CH05'];
  const swatches = wanted
    .map(code => allFabrics.find(f => f.code === code))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));
  const buildTeaser = {
    image: board?.image ?? null,
    title: board?.title ?? null,
    threeSeaterFrom: threeSeaters.length ? Math.min(...threeSeaters) : null,
    fabricCount: allFabrics.length,
    swatches: (swatches.length === 3 ? swatches : allFabrics.slice(0, 3)).map(f => ({
      image: f.image, hex: f.hex, name: f.name,
    })),
  };

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