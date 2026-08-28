// src/app/shop/[category]/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { canonicalProductPath } from '@/utils/productUrl';
import { socialImageUrl, leadVariantImage, ogImage } from '@/utils/socialImage';
import { productSchema, breadcrumbSchema, jsonLd } from '@/utils/schema';
import { createClient } from '@/utils/supabase/server';
import { deliveryWindow } from '@/utils/delivery';
import ProductPageClient from '../../../../components/Product/ProductPageClient';

type Params = Promise<{ slug: string; category: string }>;
// NEW: Define searchParams type to read the URL
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { slug } = await props.params;
  const supabase = await createClient();

  // Selects the category relations so the canonical can be built here without
  // a second definition of the rule - see src/utils/productUrl.ts.
  const { data: product } = await supabase
    .from('products')
    .select('title, description, slug, is_active, categories!products_category_id_fkey(slug, name), product_categories(categories(slug)), product_variants(image_url, priority)')
    .eq('slug', slug)
    .maybeSingle();

  if (!product || product.is_active === false) return { title: 'Product Not Found' };

  const path = canonicalProductPath(product);
  const description =
    product.description ||
    `Buy the ${product.title} at UK Sofa Shop. Free UK Mainland delivery and cash on delivery available.`;

  // A 1200x630 card cut from the lead variant photo by Cloudinary. Falls back
  // to the site-wide card if the image isn't a Cloudinary upload.
  const card = socialImageUrl(leadVariantImage(product.product_variants));
  const images = card
    ? [ogImage(card, product.title)]
    : undefined;

  return {
    title: product.title,
    description,
    // One product, one indexable URL. Without this the same page is reachable
    // at /shop/<any-category>/<slug> and competes with itself.
    alternates: { canonical: path },
    // Without these the page inherits the root layout's card, so every product
    // shared on WhatsApp or Facebook shows the homepage title and image.
    openGraph: {
      type: 'website',
      title: product.title,
      description,
      url: path,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      images: card ? [card] : undefined,
    },
  };
}

// NEW: Accept searchParams in the component props
export default async function ProductPage(props: { params: Params, searchParams: SearchParams }) {
  const { slug, category } = await props.params;
  const searchParams = await props.searchParams;
  
  // Extract the variant ID from the URL (e.g., ?variant=123-abc)
  const initialVariantId = searchParams?.variant as string | undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_variants(*), reviews(*), categories!products_category_id_fkey(slug, name), product_categories(categories(slug))')
    .eq('slug', slug)
    .order('priority', { referencedTable: 'product_variants', ascending: true })
    .maybeSingle();

  if (error || !product) notFound();

  // A soft-deleted product used to stay fully public and indexable: the query
  // filtered on slug alone and the RLS policy is "public read products".
  if (product.is_active === false) notFound();

  // The category in the URL has to be one this product genuinely belongs to.
  // Otherwise /shop/anything/<slug> renders the same page and Google sees as
  // many copies as there are categories. Anything else redirects to the one
  // canonical path rather than 404ing, so old links and feed URLs still land.
  const belongsToUrlCategory = (product.product_categories ?? []).some((pc: any) => {
    const cats = Array.isArray(pc?.categories) ? pc.categories : pc?.categories ? [pc.categories] : [];
    return cats.some((c: any) => c?.slug === decodeURIComponent(category));
  });

  // Permanent rather than temporary: a 308 passes ranking to the canonical
  // URL, where redirect()'s 307 does not. The trade-off is that browsers cache
  // a 308 indefinitely, so if a product is later moved to a different category
  // a returning visitor gets one extra hop through the old target. That
  // resolves correctly, it is just not the shortest path.
  //
  // (This used to resolve client-side on top of a 200 because the route had a
  // loading.tsx committing the response first. That file is gone and the page
  // suspends internally instead, so this is a real HTTP redirect again.)
  const canonicalPath = canonicalProductPath(product);
  if (!belongsToUrlCategory) {
    permanentRedirect(canonicalPath);
  }

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

  let sizeVariants: any[] = [];
  let subgroupTitle = 'Style';
  if (product.variant_group_id) {
    const [{ data: groupProducts }, { data: groupInfo }] = await Promise.all([
      supabase
        .from('products')
        .select('id, slug, size_label, subgroup_label, base_price')
        .eq('variant_group_id', product.variant_group_id)
        .eq('is_active', true)
        .order('base_price', { ascending: true }),
      supabase
        .from('variant_groups')
        .select('subgroup_title')
        .eq('id', product.variant_group_id)
        .single(),
    ]);

    if (groupInfo?.subgroup_title) subgroupTitle = groupInfo.subgroup_title;

    if (groupProducts) {
      sizeVariants = groupProducts.filter(p => p.size_label).map(p => ({
        id: p.id,
        slug: p.slug,
        size_label: p.size_label,
        subgroup_label: p.subgroup_label
      }));
    }
  }

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
      
      const relatedProducts = related
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

  const safeProduct = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    base_price: product.base_price,
    specifications: product.specifications as Record<string, string> | string | null,
    gallery_images: product.gallery_images as string[] | null,
    // Drives the "Made in the UK" badge. Only 'uk' shows anything.
    origin: product.origin ?? 'unspecified',
    // Drives the "Made to your specification" block and its CCR notice.
    custom_made: product.custom_made ?? false,
  };

  const safeVariants = (product.product_variants ?? []).map((v: any) => ({
    id: v.id,
    color: v.color,
    color_hex: v.color_hex,
    material: v.material,
    image_url: v.image_url,
    price_adjustment: v.price_adjustment ?? 0,
    // stock_quantity is deliberately not passed through: sofas are made to
    // order, so availability is the product-level is_active flag, not a count.
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
      // Present only where the review came in against a real order - either
      // through the tokenised link in the delivery email, or matched later.
      order_id: r.order_id ?? null,
      status: r.status ?? (r.is_approved ? 'approved' : 'pending'),                       
    }));

  // ── Structured data ──
  // Built from the same values the page renders, so the markup and the visible
  // page can never disagree - which is what Google checks for.
  const variantPrices = safeVariants.length
    ? safeVariants.map(v => Number(product.base_price) + Number(v.price_adjustment ?? 0))
    : [Number(product.base_price)]

  const galleryImages = [
    ...safeVariants.map(v => v.image_url).filter(Boolean),
    ...((product.gallery_images as string[] | null) ?? []),
  ].filter((v, i, a): v is string => typeof v === 'string' && a.indexOf(v) === i)

  const productLd = productSchema({
    productId: product.id,
    title: product.title,
    description: product.description,
    canonicalPath: canonicalPath,
    images: galleryImages,
    prices: variantPrices,
    skus: (product.product_variants ?? []).map((v: any) => v.sku).filter(Boolean),
    origin: product.origin,
    customMade: product.custom_made,
    // Only genuine approved reviews reach this - see the filter above.
    reviews: approvedReviews.map(r => ({
      rating: r.rating,
      comment: r.comment,
      customer_name: r.customer_name,
      created_at: r.created_at,
    })),
  })

  const primaryCat: any = Array.isArray(product.categories) ? product.categories[0] : product.categories
  const crumbCategorySlug = primaryCat?.slug ?? decodeURIComponent(category)
  // Human-readable name in the trail, not the URL slug.
  const categoryName = primaryCat?.name ?? crumbCategorySlug
  const breadcrumbLd = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop/all' },
    { name: categoryName, path: `/shop/${encodeURIComponent(crumbCategorySlug)}` },
    { name: product.title, path: canonicalPath },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd) }} />
    <ProductPageClient
      product={safeProduct}
      variants={safeVariants}
      approvedReviews={approvedReviews}
      similarProducts={safeSimilarProducts} 
      categorySlug={category}
      categoryName={categoryName}
      deliveryEstimate={deliveryWindow()}
      initialWishlistState={initialWishlistState}
      isLoggedIn={!!user}
      sizeVariants={sizeVariants}
      subgroupTitle={subgroupTitle}
      currentSubgroup={product.subgroup_label}
      initialVariantId={initialVariantId}
    />
    </>
  );
}