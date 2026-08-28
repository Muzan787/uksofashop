// src/components/Home/HomeClient.tsx

import Hero from './Hero';
import TrustMarquee from './TrustMarquee';
import ProductRail from './ProductRail';
import CategoryBento, { type CategoryTile } from './CategoryBento';
import StatsBand from './StatsBand';
import CollectionShowcase, { type HomeCollection } from './CollectionShowcase';
import CraftStory from './CraftStory';
import QuoteStrip from './QuoteStrip';
import ReviewTicker, { type HomeReview } from './ReviewTicker';
import ClosingCta from './ClosingCta';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id: string; title: string; slug: string; base_price: number;
  average_rating?: number | null;
  review_count?: number | null;
  gallery_images?: string[] | null;
  product_variants?: { id: string; image_url?: string; color?: string | null; color_hex?: string | null }[];
  product_categories?: { categories?: { slug: string; name: string } }[];
}

interface Props {
  categories: CategoryTile[];
  products: Product[];
  collections: HomeCollection[];
  sofaCount: number;
  reviews: HomeReview[];
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE HOMEPAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Eleven sections, and the order is the argument:
 *
 *    1  Hero            ink      what this is, and the product, lit
 *    2  Trust marquee   ember    the four terms, moving
 *    3  Latest arrivals calico   something to buy, three screens sooner than
 *                                the build this replaces managed
 *    4  Categories      calico   the shape of the range
 *    5  Figures         ink      how big the shop actually is
 *    6  Collections     calico   the whole room at once
 *    7  How it works    indigo   what buying here involves
 *    8  Quote           image    a breath
 *    9  Reviews         calico   other people
 *   10  Closing         ink      the decision
 *
 * The grounds alternate the whole way down — dark, ember, light, light, dark,
 * light, indigo, dark, light, dark. That rhythm is doing real work. The page
 * this replaces ran five light sections in a row through its middle, and the
 * effect was that the entire centre of the homepage read as one long
 * undifferentiated block that people scrolled straight past. Two consecutive
 * light sections are allowed, and they are separated by calico-50 against
 * calico-100; three are not.
 *
 * Every section owns its own heading, ground, gradient and reveal timing. This
 * file decides nothing except what goes where, which is why it is 120 lines
 * rather than the 280 it used to be — five sections were assembled inline here,
 * each with its own hand-rolled heading treatment.
 */

/**
 * The quote strip's photograph, and the fallback behind the closing panel.
 *
 * Both are superseded the moment the matching slots in src/constants/homeArt.ts
 * are filled in — the closing panel already prefers `closingRoom` over this and
 * falls back to it. They are held here rather than inline in the components so
 * there is one place to swap them.
 */
const QUOTE_IMAGE =
  'https://res.cloudinary.com/dmlna04yk/image/upload/v1782255172/Home-Page-Furniture-Background-Image-3_dxl0qo.avif';

const CLOSING_FALLBACK =
  'https://res.cloudinary.com/dmlna04yk/image/upload/v1782255178/Home-Page-Furniture-Background-Image-4_j5camh.jpg';

/** Maps a homepage product onto the shared card. */
function toCard(product: Product) {
  const variants = product.product_variants ?? [];
  const cat = product.product_categories?.[0]?.categories ?? null;
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    price: product.base_price,
    href: `/shop/${cat?.slug ?? 'all'}/${product.slug}`,
    image: variants[0]?.image_url ?? null,
    secondaryImage: variants[1]?.image_url ?? product.gallery_images?.[0] ?? null,
    badge: cat?.name ?? null,
    reviewCount: product.review_count,
    averageRating: product.average_rating,
    swatches: variants
      .filter((v) => v.color_hex)
      .map((v) => ({ id: v.id, color: v.color ?? null, hex: v.color_hex ?? null, image: v.image_url ?? null })),
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function HomeClient({ categories, products, collections, sofaCount, reviews }: Props) {
  const lead = products[0] ?? null;
  const leadHref = lead
    ? `/shop/${lead.product_categories?.[0]?.categories?.slug ?? 'all'}/${lead.slug}`
    : null;

  return (
    <>
      <Hero
        image={lead?.product_variants?.[0]?.image_url ?? null}
        productTitle={lead?.title ?? null}
        productHref={leadHref}
        fromPrice={lead?.base_price ?? null}
        sofaCount={sofaCount}
      />

      <TrustMarquee />

      <ProductRail
        eyebrow="New in"
        heading="The latest through the door."
        emphasise="latest"
        items={products.map(toCard)}
        viewAllHref="/shop/all"
        viewAllLabel="View all sofas"
      />

      <CategoryBento categories={categories} />

      <StatsBand
        sofaCount={sofaCount}
        categoryCount={categories.length}
        collectionCount={collections.length}
      />

      <CollectionShowcase collections={collections} />

      <CraftStory />

      <QuoteStrip image={QUOTE_IMAGE} />

      <ReviewTicker reviews={reviews} />

      <ClosingCta fallbackImage={CLOSING_FALLBACK} />
    </>
  );
}
