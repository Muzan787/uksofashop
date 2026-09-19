// src/components/Product/Similar.tsx

import ProductRow from './ProductRow';
import type { SimilarProduct } from './types';

interface Props {
  products: SimilarProduct[];
  categorySlug: string;
  /** The category's real name - "Corner Sofas" - for the heading. */
  categoryName: string;
}

/**
 * More from the same category.
 *
 * Headed with the category's name rather than "Others in the same range":
 * under a Malibu these are Roma, Oxford and Nova, which is the same category
 * and not the same range, and the old line said so wrongly on every page.
 *
 * These were once a fourth, private card design — square crop, its own border,
 * its own hover — so the same sofa was drawn one way on the homepage and
 * another way at the foot of a product page. They are the shared ProductCard
 * now, in the shared row, which is also what gives them the image morph into
 * the product they lead to.
 */
export default function Similar({ products, categorySlug, categoryName }: Props) {
  const name = categoryName.trim().toLowerCase();
  const lastWord = name.split(/s+/).pop() ?? name;
  return (
    <ProductRow
      eyebrow="More like this"
      title={`More ${name}.`}
      emphasise={`${lastWord}.`}
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
