// src/app/page.tsx
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { summariseCollections } from '@/utils/collections';
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

  const categoriesData = categories?.map(cat => ({ ...cat, image_url: cat.image_url ?? undefined })) ?? [];

  // 2. Fetch Featured Products
  const { data: featuredProducts } = await supabase
    .from('products')
    .select('*, product_variants(image_url, priority), product_categories(categories(slug, name))')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .order('priority', { referencedTable: 'product_variants', ascending: true })
    .limit(6);

  const productsData = (featuredProducts ?? []).map(product => ({
    ...product,
    product_variants: (product.product_variants ?? []).map(variant => ({
      image_url: variant.image_url ?? undefined
    }))
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
      />
    </>
  );
}