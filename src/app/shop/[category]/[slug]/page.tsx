// src/app/shop/[category]/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProductPageClient from '../../../../components/Product/ProductPageClient';

type Params = Promise<{ slug: string; category: string }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { slug } = await props.params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('title, description')
    .eq('slug', slug)
    .single();

  if (!product) return { title: 'Product Not Found' };

  return {
    title: `${product.title} | Vantage Group LTD`,
    description: product.description || `Buy ${product.title} at Vantage Group LTD. British handcrafted luxury sofas.`,
  };
}

export default async function ProductPage(props: { params: Params }) {
  const { slug, category } = await props.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_variants(*), reviews(*)')
    .eq('slug', slug)
    .single();

  if (error || !product) notFound();

  let initialWishlistState = false;
  if (user) {
    const { data: wishlistItem } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle(); 

    if (wishlistItem) {
      initialWishlistState = true;
    }
  }

  // --- NEW: Fetch and Sort Similar Products ---
  const { data: categoryData } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', category)
    .single();

  let safeSimilarProducts: any[] = [];
  if (categoryData) {
    const { data: related } = await supabase
      .from('product_categories')
      .select(`
        products (
          id, title, slug, base_price, is_active,
          product_variants ( image_url )
        )
      `)
      .eq('category_id', categoryData.id);

    if (related) {
      const currentFirstWord = product.title.trim().split(' ')[0].toLowerCase();
      
      // Extract products from the join table and filter out the current product & inactive ones
      let relatedProducts = related
        .map((r: any) => r.products)
        .flat()
        .filter((p: any) => p && p.id !== product.id && p.is_active !== false);

      // Sort: Products matching the first word of the title come first
      relatedProducts.sort((a: any, b: any) => {
        const aFirstWord = a.title.trim().split(' ')[0].toLowerCase();
        const bFirstWord = b.title.trim().split(' ')[0].toLowerCase();
        
        const matchA = aFirstWord === currentFirstWord ? 1 : 0;
        const matchB = bFirstWord === currentFirstWord ? 1 : 0;
        
        return matchB - matchA; // High score (1) comes before low score (0)
      });

      // Take the top 4 and map to a safe format for the client
      safeSimilarProducts = relatedProducts.slice(0, 4).map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        base_price: p.base_price,
        image_url: p.product_variants?.[0]?.image_url || '/placeholder.svg'
      }));
    }
  }
  // --------------------------------------------

  const safeProduct = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    base_price: product.base_price,
    specifications: product.specifications as Record<string, string> | string | null,
  };

  const safeVariants = (product.product_variants ?? []).map((v: any) => ({
    id: v.id,
    color: v.color,
    color_hex: v.color_hex,
    material: v.material,
    image_url: v.image_url,
    price_adjustment: v.price_adjustment ?? 0,
    stock_quantity: v.stock_quantity ?? 0,
  }));

  const approvedReviews = (product.reviews ?? [])
    .filter((r: any) => r.status === 'approved' || r.is_approved === true)
    .map((r: any) => ({
      id: r.id,
      customer_name: r.customer_name || 'Verified Buyer',
      rating: r.rating,
      comment: r.comment ?? '',                             
      created_at: r.created_at ?? new Date().toISOString(), 
      status: r.status ?? (r.is_approved ? 'approved' : 'pending'),                       
    }));

  return (
    <ProductPageClient
      product={safeProduct}
      variants={safeVariants}
      approvedReviews={approvedReviews}
      similarProducts={safeSimilarProducts} // Pass the new data down
      categorySlug={category}
      initialWishlistState={initialWishlistState}
      isLoggedIn={!!user}
    />
  );
}