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
    title: `${product.title} | UK Sofashop LTD`,
    description: product.description || `Buy ${product.title} at UK Sofashop LTD. British handcrafted luxury sofas.`,
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
    // Sort the nested variants array before grabbing the single product
    .order('priority', { referencedTable: 'product_variants', ascending: true })
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

  // --- NEW: Fetch Size Variants within the same Group ---
  let sizeVariants: any[] = [];
  if (product.variant_group_id) {
    const { data: groupProducts } = await supabase
      .from('products')
      .select('id, slug, size_label, base_price')
      .eq('variant_group_id', product.variant_group_id)
      .eq('is_active', true)
      .order('base_price', { ascending: true }); // Natural sort by price (e.g. 2 Seater -> 3 Seater)

    if (groupProducts) {
      sizeVariants = groupProducts.filter(p => p.size_label).map(p => ({
        id: p.id,
        slug: p.slug,
        size_label: p.size_label
      }));
    }
  }
  // ------------------------------------------------------

  // --- Fetch and Sort Similar Products ---
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
          product_variants ( image_url, priority )
        )
      `)
      .eq('category_id', categoryData.id)
      .order('priority', { referencedTable: 'products.product_variants', ascending: true });

    if (related) {
      const currentFirstWord = product.title.trim().split(' ')[0].toLowerCase();
      
      let relatedProducts = related
        .map((r: any) => r.products)
        .flat()
        .filter((p: any) => p && p.id !== product.id && p.is_active !== false);

      relatedProducts.sort((a: any, b: any) => {
        const aFirstWord = a.title.trim().split(' ')[0].toLowerCase();
        const bFirstWord = b.title.trim().split(' ')[0].toLowerCase();
        
        const matchA = aFirstWord === currentFirstWord ? 1 : 0;
        const matchB = bFirstWord === currentFirstWord ? 1 : 0;
        
        return matchB - matchA; 
      });

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
    // Add this new line:
    gallery_images: product.gallery_images as string[] | null,
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
      customer_name: r.customer_name || '', 
      image_url: r.image_url || null,
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
      similarProducts={safeSimilarProducts} 
      categorySlug={category}
      initialWishlistState={initialWishlistState}
      isLoggedIn={!!user}
      sizeVariants={sizeVariants} // Pass the new size variants down
    />
  );
}