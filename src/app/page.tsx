// src/app/page.tsx
import { createClient } from '@/utils/supabase/server';
import HomeClient from '@/components/Home/HomeClient';
import { Analytics } from '@vercel/analytics/next';

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

  const collectionsData = (groupsData || [])
    .map((group: any) => {
      const activeProducts = group.products?.filter((p: any) => p.is_active) || [];
      if (activeProducts.length === 0) return null;

      const prices = activeProducts.map((p: any) => p.base_price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // --- SMART IMAGE SELECTION ALGORITHM ---
      const selectedImages: string[] = [];
      const usedImages = new Set<string>();

      // Pass 1: Try to get 1 primary image from EACH distinct product
      activeProducts.forEach((p: any) => {
        let imgToUse = null;
        if (p.product_variants?.[0]?.image_url) {
          imgToUse = p.product_variants[0].image_url;
        } else if (p.gallery_images?.[0]) {
          imgToUse = p.gallery_images[0];
        }

        if (imgToUse && !usedImages.has(imgToUse)) {
          selectedImages.push(imgToUse);
          usedImages.add(imgToUse);
        }
      });

      // Pass 2: If we still don't have 3 images, backfill with extra variants or gallery images
      if (selectedImages.length < 3) {
        for (const p of activeProducts) {
          if (Array.isArray(p.product_variants)) {
            for (const v of p.product_variants) {
              if (v.image_url && !usedImages.has(v.image_url) && selectedImages.length < 3) {
                selectedImages.push(v.image_url);
                usedImages.add(v.image_url);
              }
            }
          }
          if (Array.isArray(p.gallery_images)) {
            for (const img of p.gallery_images) {
              if (!usedImages.has(img) && selectedImages.length < 3) {
                selectedImages.push(img);
                usedImages.add(img);
              }
            }
          }
          if (selectedImages.length >= 3) break;
        }
      }

      return {
        id: group.id,
        name: group.name,
        slug: group.slug,
        minPrice,
        maxPrice,
        images: selectedImages.slice(0, 3) 
      };
    })
    .filter(Boolean) as any[];

  return (
    <>
      <HomeClient
        categories={categoriesData}
        products={productsData}
        collections={collectionsData}
      />
      <Analytics />
    </>
  );
}