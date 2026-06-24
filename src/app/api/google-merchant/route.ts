import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600;

// 1. Define your TypeScript interfaces based on your schema
interface ProductVariant {
  id: string;
  sku: string;
  color: string | null;
  material: string | null;
  price_adjustment: number;
  stock_quantity: number;
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
  product_variants: ProductVariant[] | null;
}

export async function GET(): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response("Missing Supabase credentials", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

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
      product_variants (
        id, 
        sku, 
        color, 
        material, 
        price_adjustment, 
        stock_quantity, 
        image_url
      )
    `)
    .eq('is_active', true);

  if (error) {
    console.error("Error fetching products:", error);
    return new Response("Error generating feed", { status: 500 });
  }

  const products = data as unknown as Product[];
  const baseUrl = 'https://www.uksofashop.co.uk';
  let itemsXml = '';

  products.forEach((product) => {
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
            <g:link>${baseUrl}/product/${product.slug}?variant=${variant.id}</g:link>
            <g:image_link>${imageUrl}</g:image_link>
            <g:condition>new</g:condition>
            <g:availability>${variant.stock_quantity > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
            <g:price>${finalPrice.toFixed(2)} GBP</g:price>
            <g:brand>UK Sofa Shop</g:brand>
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
          <g:link>${baseUrl}/product/${product.slug}</g:link>
          <g:image_link>${fallbackImageUrl}</g:image_link>
          <g:condition>new</g:condition>
          <g:availability>in_stock</g:availability>
          <g:price>${Number(product.base_price).toFixed(2)} GBP</g:price>
          <g:brand>UK Sofa Shop</g:brand>
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