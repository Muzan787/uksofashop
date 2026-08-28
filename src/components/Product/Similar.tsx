// src/components/Product/Similar.tsx

import ProductRow from './ProductRow';
import type { SimilarProduct } from './types';

interface Props {
  products: SimilarProduct[];
  categorySlug: string;
}

/**
 * More from the same category.
 *
 * These were once a fourth, private card design — square crop, its own border,
 * its own hover — so the same sofa was drawn one way on the homepage and
 * another way at the foot of a product page. They are the shared ProductCard
 * now, in the shared row, which is also what gives them the image morph into
 * the product they lead to.
 */
export default function Similar({ products, categorySlug }: Props) {
  return (
    <ProductRow
      eyebrow="More like this"
      title="Others in the same range."
      emphasise="range."
      items={products.map(p => ({
        id: p.id,
        title: p.title,
        href: `/shop/${categorySlug}/${p.slug}`,
        image: p.image_url,
        price: p.base_price,
      }))}
    />
  );
}
