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
    title: `${product.title} | UK Sofa Shop`,
    description: product.description || `Buy ${product.title} at UK Sofa Shop. British handcrafted luxury sofas.`,
  };
}

export default async function ProductPage(props: { params: Params }) {
  const { slug, category } = await props.params;
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_variants(*), reviews(*)')
    .eq('slug', slug)
    .single();

  if (error || !product) notFound();

  // 1. Explicitly map product to match the component's Product interface
  const safeProduct = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    base_price: product.base_price,
    specifications: product.specifications as Record<string, string> | string | null,
  };

  // 2. Explicitly map variants to match the component's Variant interface
  const safeVariants = (product.product_variants ?? []).map((v) => ({
    id: v.id,
    color: v.color,
    color_hex: v.color_hex,
    material: v.material,
    image_url: v.image_url,
    price_adjustment: v.price_adjustment ?? 0, // Fallback to 0 if null
    stock_quantity: v.stock_quantity ?? 0,     // Fallback to 0 if null
  }));

  // 3. Explicitly map reviews to match the component's Review interface
  const approvedReviews = (product.reviews ?? [])
    .filter((r) => r.status === 'approved')
    .map((r) => ({
      id: r.id,
      customer_name: r.customer_name,
      rating: r.rating,
      comment: r.comment ?? '',                             // Fallback to string if null
      created_at: r.created_at ?? new Date().toISOString(), // Fallback to string if null
      status: r.status ?? 'approved',                       // Fallback to string if null
    }));

  return (
    <ProductPageClient
      product={safeProduct}
      variants={safeVariants}
      approvedReviews={approvedReviews}
      categorySlug={category}
    />
  );
}