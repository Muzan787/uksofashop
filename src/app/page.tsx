// src/app/page.tsx
import { createClient } from '@/utils/supabase/server';
import HomeClient from '@/components/Home/HomeClient';

export default async function HomePage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')
    .limit(6);

  const categoriesData = categories?.map(cat => ({ ...cat, image_url: cat.image_url ?? undefined })) ?? [];

  const { data: featuredProducts } = await supabase
    .from('products')
    .select('*, product_variants(image_url), product_categories(categories(slug, name))')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(6);

  const productsData = (featuredProducts ?? []).map(product => ({
    ...product,
    product_variants: (product.product_variants ?? []).map(variant => ({
      image_url: variant.image_url ?? undefined
    }))
  }));

  return (
    <HomeClient
      categories={categoriesData}
      products={productsData}
    />
  );
}