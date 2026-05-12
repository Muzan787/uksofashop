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

  const approvedReviews = (product.reviews ?? []).filter(
    (r: { status: string | null }) => r.status === 'approved'
  );

  return (
    <ProductPageClient
      product={product}
      variants={product.product_variants ?? []}
      approvedReviews={approvedReviews}
      categorySlug={category}
    />
  );
}