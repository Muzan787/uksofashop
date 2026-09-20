// src/app/shop/[category]/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { canonicalProductPath } from '@/utils/productUrl';
import { socialImageUrl, leadVariantImage, ogImage } from '@/utils/socialImage';
import { productSchema, breadcrumbSchema, jsonLd } from '@/utils/schema';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createPublicClient } from '@/utils/supabase/public';
import type { OfferTier } from '@/types/offers';
import { deliveryWindow } from '@/utils/delivery';
import ProductPageClient from '../../../../components/Product/ProductPageClient';
import { getFabricLibrary } from '@/utils/fabrics';
import { parseDimensions } from '@/components/Product/dimensions';
import type { ProductVideo } from '@/components/Product/types';

type Params = Promise<{ slug: string; category: string }>;
// NEW: Define searchParams type to read the URL
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Everything about a product that is the same for every visitor, read once
 * and kept for five minutes - the same treatment the homepage got.
 *
 * WHY. This page is where every ad lands, and it answered in ~0.7 s because
 * every request ran the product, category, size-group, related, fabric,
 * video and offer-tier reads afresh. None of them depend on who is asking.
 * The two that do - the session and the wishlist flag - stay on the
 * request-bound client in the page itself, and run beside this rather than
 * after it.
 *
 * Keyed by slug AND the category in the URL, because the related rail is
 * drawn from the category the visitor came through. Returns null for a
 * product that does not exist or is inactive; the page turns that into the
 * 404, since notFound() cannot be called from inside a cache.
 *
 * Invalidation: five minutes, or revalidateTag('product') from the admin
 * inventory actions the moment a product is saved.
 */
const getProductPageData = unstable_cache(
  async (slug: string, category: string) => {
    const db = createPublicClient();

    const [{ data: product, error }, { data: categoryData }] = await Promise.all([
      db
        .from('products')
        .select('*, product_variants(*), reviews(*), categories!products_category_id_fkey(slug, name), product_categories(categories(slug))')
        .eq('slug', slug)
        .order('priority', { referencedTable: 'product_variants', ascending: true })
        .maybeSingle(),
      db.from('categories').select('id').eq('slug', category).maybeSingle(),
    ]);

    if (error || !product) return null;
    // A soft-deleted product used to stay fully public and indexable: the
    // query filtered on slug alone and the RLS policy is "public read".
    if (product.is_active === false) return null;

    // Everything below needs the product row, and nothing below needs anything
    // else below, so it is one round trip. A product with no variant_group_id
    // asks nothing of variant_groups, and a stocked recliner does not load 70
    // fabrics.
    const [group, related, fabrics, videos, offerTierRow] = await Promise.all([
      product.variant_group_id
        ? Promise.all([
            db
              .from('products')
              .select('id, slug, size_label, subgroup_label, base_price')
              .eq('variant_group_id', product.variant_group_id)
              .eq('is_active', true)
              .order('base_price', { ascending: true }),
            db
              .from('variant_groups')
              .select('subgroup_title')
              .eq('id', product.variant_group_id)
              .maybeSingle(),
          ])
        : null,

      categoryData
        ? db
            .from('product_categories')
            .select(`
              products (
                id, title, slug, base_price, is_active,
                product_variants ( image_url, priority )
              )
            `)
            .eq('category_id', categoryData.id)
            .order('priority', { referencedTable: 'products.product_variants', ascending: true })
            .then(r => r.data)
        : null,

      // The fabric range, fetched only where it can be chosen.
      product.custom_made ? getFabricLibrary(db) : [],

      // The product's clips: studio ones join the gallery, customer ones make
      // the strip above the reviews. Public policy already limits this to
      // active rows.
      db
        .from('videos')
        .select('id, kind, url, caption, width, height')
        .eq('product_id', product.id)
        .in('kind', ['studio', 'customer'])
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
        .then(r => r.data ?? []),

      // Which offer tier this product is in, so the page can say "£30 off this
      // sofa" to a visitor holding a paid entitlement. Service role because the
      // tiers table has no public policy - it is a label, not a price, and the
      // database prices the order itself whatever the page says.
      createAdminClient()
        .from('offer_product_tiers')
        .select('tier')
        .eq('product_id', product.id)
        .maybeSingle()
        .then(r => r.data),
    ]);

    return { product, categoryData, group, related, fabrics, videos, offerTierRow };
  },
  ['uksofashop-product-page-v1'],
  { revalidate: 300, tags: ['product'] },
);

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { slug, category } = await props.params;

  // The same cached read the page makes, so the title, canonical and card
  // cost nothing extra. The category relations are what the canonical is
  // built from - see src/utils/productUrl.ts.
  const data = await getProductPageData(slug, category);
  const product = data?.product;

  if (!product) return { title: 'Product Not Found' };

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

  // ── First round trip ──
  //
  // These three know nothing about each other, and they used to be awaited one
  // after another anyway: the session, then the product, then — thirty lines
  // further down, past two more awaits — the category row the "similar
  // products" query needs. Three sequential trips to Supabase before the page
  // had anything to render, each one paying the full round-trip latency again.
  //
  // Issued together they cost one. Nothing here is wasted on the redirect path
  // either: the category lookup that a redirecting request does not need was
  // already in flight beside the product query rather than after it.
  // The session (cookie-bound, per visitor) beside the cached product read
  // (shared by every visitor). Neither waits on the other.
  const [{ data: { user } }, data] = await Promise.all([
    supabase.auth.getUser(),
    getProductPageData(slug, category),
  ]);

  if (!data) notFound();
  const { product, group, related, fabrics, videos, offerTierRow } = data;

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

  // ── Second round trip ──
  //
  // Everything below needs the product row, and nothing below needs anything
  // else below. The wishlist flag, the size/style siblings, the "similar
  // products" rail and the fabric library were four more awaits in a line —
  // so a made-to-order sofa in a size group, viewed by a signed-in customer,
  // spent five round trips here on work that fits in one.
  //
  // The conditions are unchanged: a signed-out visitor still asks nothing of
  // the wishlist table, a product with no variant_group_id still asks nothing
  // of variant_groups, and a stocked recliner still does not load 70 fabrics.
  // The one per-visitor read: whether a signed-in customer has this sofa on
  // their wishlist. A signed-out visitor asks nothing of the table.
  const wishlistItem = user
    ? await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle()
        .then(r => r.data)
    : null;

  const offerTier: OfferTier | null =
    offerTierRow?.tier === 'ELECTRIC' || offerTierRow?.tier === 'ROMA' ||
    offerTierRow?.tier === 'STANDARD' || offerTierRow?.tier === 'EXCLUDED'
      ? offerTierRow.tier
      : null;

  const initialWishlistState = Boolean(wishlistItem);

  let sizeVariants: any[] = [];
  let subgroupTitle = 'Style';
  if (group) {
    const [{ data: groupProducts }, { data: groupInfo }] = group;

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

  let safeSimilarProducts: any[] = [];
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

  // The measurements, read from the same place the diagram reads them and
  // parsed with the same function, so the markup cannot claim a width the
  // dialog does not draw.
  //
  // Both spellings of the key are tried because both are in the data: the
  // column is free-form jsonb and the admin panel has never enforced a case.
  // ProductPageClient does exactly this, and CategoryFilters does it for the
  // neighbouring `style` key.
  const specs = ((): Record<string, unknown> => {
    const raw = product.specifications
    if (!raw) return {}
    if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return {} } }
    return raw as Record<string, unknown>
  })()
  const dimensionsRaw =
    typeof specs.dimensions === 'string' ? specs.dimensions
    : typeof specs.Dimensions === 'string' ? specs.Dimensions
    : ''
  const dims = parseDimensions(dimensionsRaw)

  // Deduplicated, because a colour appears once per variant that offers it
  // and repeating "Grey" eleven times describes nothing.
  const distinct = (values: (string | null)[]) =>
    [...new Set(values.filter((v): v is string => Boolean(v && v.trim())).map(v => v.trim()))]

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
    width: dims.width,
    depth: dims.depth,
    height: dims.height,
    materials: distinct(safeVariants.map(v => v.material)),
    colors: distinct(safeVariants.map(v => v.color)),
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
      fabrics={fabrics}
      videos={videos as ProductVideo[]}
      offerTier={offerTier}
    />
    </>
  );
}