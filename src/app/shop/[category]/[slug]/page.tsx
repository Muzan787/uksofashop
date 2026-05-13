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

  // 1. Get the current user session
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Fetch the product and related data
  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_variants(*), reviews(*)')
    .eq('slug', slug)
    .single();

  if (error || !product) notFound();

  // 3. Check if the product is in the user's wishlist
  let initialWishlistState = false;
  if (user) {
    const { data: wishlistItem } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle(); // Use maybeSingle to prevent throw errors if no match is found

    if (wishlistItem) {
      initialWishlistState = true;
    }
  }

  // 4. Explicitly map product to match the component's Product interface
  const safeProduct = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    base_price: product.base_price,
    specifications: product.specifications as Record<string, string> | string | null,
  };

  // 5. Explicitly map variants to match the component's Variant interface
  const safeVariants = (product.product_variants ?? []).map((v) => ({
    id: v.id,
    color: v.color,
    color_hex: v.color_hex,
    material: v.material,
    image_url: v.image_url,
    price_adjustment: v.price_adjustment ?? 0,
    stock_quantity: v.stock_quantity ?? 0,
  }));

  // 6. Explicitly map reviews to match the component's Review interface
  // (Supporting both 'status' and 'is_approved' depending on which database schema is active)
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
      categorySlug={category}
      initialWishlistState={initialWishlistState}
      isLoggedIn={!!user}
    />
  );
}