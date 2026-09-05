import { createClient } from '@supabase/supabase-js';
import { canonicalProductPath } from '@/utils/productUrl';

export const revalidate = 3600;

interface ProductVariant {
  id: string;
  sku: string;
  color: string | null;
  material: string | null;
  price_adjustment: number;
  image_url: string | null;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  base_price: number;
  size_label: string | null;
  gallery_images: string[] | null;
  categories: { slug: string; name: string } | null; // slug for the link, name for g:product_type
  // The join table, only so canonicalProductPath has something to fall back to
  // when category_id has not been set. See the note on the link below.
  product_categories: { categories: { slug: string } | null }[] | null;
  product_variants: ProductVariant[] | null;
}

export async function GET(): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response("Missing Supabase credentials", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Updated query to disambiguate the categories relationship
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, 
      title, 
      slug, 
      description, 
      base_price, 
      size_label, 
      gallery_images,
      categories!products_category_id_fkey ( slug, name ),
      product_categories ( categories ( slug ) ),
      product_variants (
        id, 
        sku, 
        color, 
        material, 
        price_adjustment,
        image_url
      )
    `)
    .eq('is_active', true);

  if (error) {
    console.error("Error fetching products:", error);
    return new Response("Error generating feed", { status: 500 });
  }

  const products = data as unknown as Product[];

  /**
   * Google's own taxonomy id for Furniture > Sofas.
   *
   * The numeric id rather than the text path: the path is localised, so
   * "Furniture > Sofas" is only correct while the feed is read as en-GB,
   * whereas 460 means the same node in every locale. Verified against
   * google.com/basepages/producttype/taxonomy-with-ids.en-GB.txt rather than
   * remembered - the ids are not guessable and a wrong one silently
   * miscategorises the whole catalogue.
   *
   * Google will infer a category when this is absent, and infers it badly
   * for furniture: a "3+2 Seater High Back" reads as bedding or as a chair
   * about as often as it reads as a sofa. It also governs which shopping
   * surfaces an item can appear on.
   */
  const GOOGLE_PRODUCT_CATEGORY = '460';

  /**
   * Delivery, stated in the feed rather than left to the account.
   *
   * Zero because mainland UK delivery IS free - place_order computes
   * delivery as upstairs + assembly + removal and nothing else, so a sofa
   * with no extras ticked ships at no charge. The paid extras are chosen at
   * checkout, are not shipping in the sense Google means, and would be a
   * misquote here.
   *
   * Stated explicitly because an item with neither a feed shipping value nor
   * an account-level shipping service configured is DISAPPROVED, not merely
   * shown without a price. This removes that dependency.
   */
  const SHIPPING = `
            <g:shipping>
              <g:country>GB</g:country>
              <g:price>0.00 GBP</g:price>
            </g:shipping>`;
  const baseUrl = 'https://www.uksofashop.co.uk';
  let itemsXml = '';

  /**
   * Availability is always in_stock, and that is deliberate.
   *
   * We do not track stock. The sofas are made to order, so anything listed can
   * be built. This used to read `stock_quantity > 0`, which meant 28 of the 77
   * variants were being declared out_of_stock to Google purely because a column
   * nobody maintains was sitting at zero — and an out_of_stock item is
   * suppressed from Shopping rather than shown as unavailable. Over a third of
   * the catalogue was invisible for no reason.
   *
   * What decides whether something is sellable is `is_active`, the same flag
   * the storefront uses, and it is applied by the query above: an inactive
   * product never reaches this loop at all. So every item that gets written
   * here is, by definition, available.
   */

  /**
   * The rest of the photographs, as Google wants them.
   *
   * One <g:additional_image_link> per URL, capped at the ten Google accepts,
   * and never repeating whatever already went out as the main <g:image_link> —
   * a duplicate is rejected as an invalid additional image rather than being
   * quietly ignored.
   *
   * Today this emits almost nothing, because one active product has a gallery
   * and the rest have a single variant photograph each. It is here so that it
   * starts working the day the photography lands, rather than being the thing
   * somebody has to remember afterwards.
   */
  const additionalImages = (gallery: string[] | null, main: string) =>
    (gallery ?? [])
      .filter(url => url && url !== main)
      .slice(0, 10)
      .map(url => `<g:additional_image_link>${url}</g:additional_image_link>`)
      .join('');

  products.forEach((product) => {
    /**
     * The landing page Google sends a shopper to. It must not redirect.
     *
     * This was `product.categories?.slug || 'uncategorized'`, and
     * 'uncategorized' is not a category — /shop/uncategorized/<slug> answers
     * with a 308 to wherever the product actually lives. That is worse here
     * than anywhere else on the site for one specific reason: the variant
     * links below carry `?variant=<id>`, and permanentRedirect() sends a bare
     * path, so the query string is DROPPED on the way through.
     *
     *   /shop/uncategorized/verona-...?variant=abc  ->  308
     *   /shop/3-2-seater/verona-...                     (no ?variant)
     *
     * So a shopper who clicked an ad for a specific colour would land on the
     * default one, at the default price, and Merchant Centre would see a
     * landing page whose price and colour do not match the item it was given.
     *
     * Every active product has category_id set today, so this is latent rather
     * than live — it is one unset column away from mispricing a paid click.
     * canonicalProductPath falls back through the join table and can only ever
     * name a real category.
     */
    const productPath = canonicalProductPath(product);

    if (product.product_variants && product.product_variants.length > 0) {
      product.product_variants.forEach((variant) => {
        const finalPrice = Number(product.base_price) + Number(variant.price_adjustment || 0);

        const attributes = [product.size_label, variant.color, variant.material]
          .filter(Boolean)
          .join(' - ');
        
        const variantTitle = attributes ? `${product.title} - ${attributes}` : product.title;
        const imageUrl = variant.image_url || (product.gallery_images && product.gallery_images[0]) || '';

        itemsXml += `
          <item>
            <g:id>${variant.id}</g:id>
            <g:item_group_id>${product.id}</g:item_group_id>
            <g:title><![CDATA[${variantTitle}]]></g:title>
            <g:description><![CDATA[${product.description || product.title}]]></g:description>
            <!-- Exact variant link structure -->
            <g:link>${baseUrl}${productPath}?variant=${variant.id}</g:link>
            <g:image_link>${imageUrl}</g:image_link>
            ${additionalImages(product.gallery_images, imageUrl)}
            <g:condition>new</g:condition>
            <g:availability>in_stock</g:availability>
            <g:price>${finalPrice.toFixed(2)} GBP</g:price>
            <g:brand>UK Sofa Shop</g:brand>
            <g:google_product_category>${GOOGLE_PRODUCT_CATEGORY}</g:google_product_category>
            ${product.categories?.name ? `<g:product_type><![CDATA[${product.categories.name}]]></g:product_type>` : ''}
            ${SHIPPING}
            ${variant.sku ? `<g:mpn><![CDATA[${variant.sku}]]></g:mpn>` : ''}
            ${variant.color ? `<g:color><![CDATA[${variant.color}]]></g:color>` : ''}
            ${variant.material ? `<g:material><![CDATA[${variant.material}]]></g:material>` : ''}
            ${product.size_label ? `<g:size><![CDATA[${product.size_label}]]></g:size>` : ''}
          </item>
        `;
      });
    } else {
      const fallbackImageUrl = product.gallery_images && product.gallery_images[0] ? product.gallery_images[0] : '';
      
      itemsXml += `
        <item>
          <g:id>${product.id}</g:id>
          <g:title><![CDATA[${product.title}]]></g:title>
          <g:description><![CDATA[${product.description || product.title}]]></g:description>
          <!-- Base product link structure -->
          <g:link>${baseUrl}${productPath}</g:link>
          <g:image_link>${fallbackImageUrl}</g:image_link>
          ${additionalImages(product.gallery_images, fallbackImageUrl)}
          <g:condition>new</g:condition>
          <g:availability>in_stock</g:availability>
          <g:price>${Number(product.base_price).toFixed(2)} GBP</g:price>
          <g:brand>UK Sofa Shop</g:brand>
          <g:google_product_category>${GOOGLE_PRODUCT_CATEGORY}</g:google_product_category>
          ${product.categories?.name ? `<g:product_type><![CDATA[${product.categories.name}]]></g:product_type>` : ''}
          ${SHIPPING}
          <!-- Brand without an MPN is an incomplete identifier pair, and an
               unstated one is treated as missing rather than absent. These
               are made-to-order sofas with no GTIN, which is what this says. -->
          <g:identifier_exists>no</g:identifier_exists>
          ${product.size_label ? `<g:size><![CDATA[${product.size_label}]]></g:size>` : ''}
        </item>
      `;
    }
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
      <channel>
        <title>UK Sofa Shop</title>
        <link>${baseUrl}</link>
        <description>Premium Sofas and Furniture from UK Sofa Shop</description>
        ${itemsXml}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
