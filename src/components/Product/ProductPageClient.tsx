'use client';
// src/components/Product/ProductPageClient.tsx
//
// The orchestrator. It owns the state the sections share — which variant is
// selected, whether the item is in the cart or on the wishlist — and nothing
// else. The page itself is six components:
//
//   Gallery      the photographs and the colour swatches
//   BuyBox       title, price, delivery dates, the choices, add to cart
//   AddToCartFab the floating add-to-cart pill, bottom left, every width
//   Details      description, specifications, delivery, dimensions
//   Reviews      the reviews and the form
//   Similar      more from the same category, and Recently viewed under it
//
// On made-to-order frames it also renders the fabric picker (FabricDialog),
// because "Build mine in this" puts the sofa in the cart and the cart is held
// here.
//
// This file was 1,361 lines with all six of them inlined, roughly two hundred
// inline style objects, and one <h1> rendered twice.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Phone, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { toggleWishlist } from '@/app/actions/wishlist';
import { PHONE_HREF } from '@/constants/contact';
import { useCart } from '@/context/CartContext';
import { trackAddToCart, trackViewContent } from '@/utils/tracking';
import { useWhatsAppCTA } from '@/utils/attribution/useWhatsAppCTA';
import { usePhoneClick } from '@/utils/attribution/usePhoneClick';
import type { DeliveryWindow } from '@/utils/delivery';
import { accentVars } from './accent';
import AddToCartFab from './AddToCartFab';
import BuyBox from './BuyBox';
import Details from './Details';
import FabricDialog from './FabricDialog';
import Gallery from './Gallery';
import RecentlyViewed from './RecentlyViewed';
import Reviews from './Reviews';
import SecondaryActions from './SecondaryActions';
import Similar from './Similar';
import WhatsAppIcon from './WhatsAppIcon';
import Modal from '@/components/UI/Modal';
import type { Fabric, FabricCollection, GalleryImage, Product, ProductVideo, Review, SimilarProduct, SizeVariant, Swatch, Variant } from './types';
import VideoStrip from '@/components/UI/VideoStrip';
import { videoPoster } from '@/utils/cloudinary';
import type { OfferTier } from '@/types/offers';

interface Props {
  product: Product;
  variants: Variant[];
  approvedReviews: Review[];
  similarProducts: SimilarProduct[];
  /** Studio and customer clips for this product. Empty for most. */
  videos?: ProductVideo[];
  categorySlug: string;
  /** The category's real name. See the note on the breadcrumb below. */
  categoryName: string;
  /** Computed on the server so the dates are in the HTML and cannot drift. */
  deliveryEstimate: DeliveryWindow;
  initialWishlistState: boolean;
  isLoggedIn: boolean;
  sizeVariants?: SizeVariant[];
  subgroupTitle?: string;
  currentSubgroup?: string | null;
  initialVariantId?: string;
  /** The whole made-to-order fabric range. Empty on stocked products. */
  fabrics?: FabricCollection[];
  /** This product's paid-offer tier, for the strip under the price. */
  offerTier?: OfferTier | null;
}

/**
 * "corner-sofas" → "Corner Sofas".
 *
 * Only reached when the category row has no name, which is the case the
 * breadcrumb used to hit every time: it printed the raw URL slug, so the trail
 * on every product page in that category read "Corner-sofas".
 */
function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\p{Ll}/gu, c => c.toUpperCase());
}

export default function ProductPageClient({
  product, variants, approvedReviews, similarProducts, videos = [],
  categorySlug, categoryName, deliveryEstimate,
  initialWishlistState, isLoggedIn,
  sizeVariants, subgroupTitle, currentSubgroup, initialVariantId,
  fabrics = [], offerTier = null,
}: Props) {
  const { addToCart } = useCart();
  const router = useRouter();

  // ── Variant selection ────────────────────────────────────────────────────
  const materials = useMemo(
    () => [...new Set(variants.map(v => v.material || 'Standard'))],
    [variants],
  );

  const startingVariant = useMemo(
    () => (initialVariantId ? variants.find(v => v.id === initialVariantId) : undefined) ?? variants[0],
    [variants, initialVariantId],
  );

  const [selMat, setSelMat] = useState(startingVariant?.material || 'Standard');
  const [selColor, setSelColor] = useState(startingVariant?.color ?? '');

  // Someone can arrive at ?variant=… while already on the page — a swatch on a
  // card in Similar, for instance. Adjusted during render rather than in an
  // effect: an effect would paint the previous variant first and then correct
  // itself, which is a visible flash of the wrong sofa.
  const [appliedVariantId, setAppliedVariantId] = useState(initialVariantId);
  if (initialVariantId && initialVariantId !== appliedVariantId) {
    setAppliedVariantId(initialVariantId);
    const target = variants.find(v => v.id === initialVariantId);
    if (target) {
      setSelMat(target.material || 'Standard');
      setSelColor(target.color || '');
    }
  }

  const inMaterial = useMemo(
    () => variants.filter(v => (v.material || 'Standard') === selMat),
    [variants, selMat],
  );
  const selVariant = variants.find(v => (v.material || 'Standard') === selMat && v.color === selColor) ?? inMaterial[0];

  const handleMaterial = (mat: string) => {
    setSelMat(mat);
    const cols = variants.filter(v => (v.material || 'Standard') === mat);
    if (!cols.find(v => v.color === selColor)) setSelColor(cols[0]?.color ?? '');
  };

  // ── The accent ───────────────────────────────────────────────────────────
  // Six custom properties on this one wrapper. The page ground stays Calico;
  // the variant colour reaches swatches, rings and the trust row and stops
  // there. See accent.ts for what the whole-page tint used to do.
  const accent = accentVars(selVariant?.color_hex);

  // ── Subgroups ────────────────────────────────────────────────────────────
  const subgroups = useMemo(
    () => [...new Set((sizeVariants ?? []).map(sv => sv.subgroup_label).filter(Boolean) as string[])],
    [sizeVariants],
  );

  // Sizes shown are only those available in the currently selected style, so
  // the customer can never land on a size/style combination that doesn't exist.
  const sizes = useMemo(() => {
    if (!sizeVariants) return [];
    if (subgroups.length < 2) return sizeVariants;
    return sizeVariants.filter(sv => sv.subgroup_label === currentSubgroup);
  }, [sizeVariants, subgroups, currentSubgroup]);

  const currentSizeLabel = useMemo(
    () => (sizeVariants ?? []).find(sv => sv.slug === product.slug)?.size_label,
    [sizeVariants, product.slug],
  );

  // Switching style keeps the customer on the same size where that combination
  // exists, otherwise falls back to the cheapest size in the chosen style.
  const hrefForSubgroup = useCallback((sub: string) => {
    const inSub = (sizeVariants ?? []).filter(sv => sv.subgroup_label === sub);
    const slug = (inSub.find(sv => sv.size_label === currentSizeLabel) ?? inSub[0])?.slug;
    return slug ? `/shop/${categorySlug}/${slug}` : undefined;
  }, [sizeVariants, currentSizeLabel, categorySlug]);

  // ── Gallery inputs ───────────────────────────────────────────────────────
  //
  // Two kinds of product, two readings of the variant rows.
  //
  // A stocked recliner's variants are real choices: Black leather or Grey
  // fabric is what turns up on the van. So the swatches choose, and the
  // gallery leads with the chosen colour's photograph.
  //
  // A made-to-order frame is built in whichever of the 70 fabrics the
  // customer picks in the dialog, and its variant rows are only the colourways
  // we happen to have photographed - Lily in grey, black, navy and beige. A
  // colour swatch there was a second, misleading choice that changed nothing
  // about what got built. Muaz asked (2026-09-18) for those photographs to be
  // treated as the gallery instead: every colourway in one swipeable strip,
  // no swatch row, no material pills, and the fabric picker as the only
  // choice. Each photograph carries its own colour for the alt text, since
  // the first picture is no longer "the selected variant".
  const photographsAreGallery = Boolean(product.custom_made);

  const swatches = useMemo<Swatch[]>(() => {
    if (photographsAreGallery) return [];
    const seen = new Set<string>();
    const out: Swatch[] = [];
    for (const v of inMaterial) {
      const key = v.color ?? '';
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id: v.id, color: key, hex: v.color_hex, image: v.image_url });
    }
    return out;
  }, [inMaterial, photographsAreGallery]);

  const images = useMemo<GalleryImage[]>(() => {
    const seen = new Set<string>();
    const out: GalleryImage[] = [];
    const push = (src: string | null | undefined, label?: string) => {
      if (src && !seen.has(src)) { out.push({ src, label }); seen.add(src); }
    };

    if (photographsAreGallery) {
      // The variant a card's swatch linked to (?variant=) still leads, so the
      // colour that was tapped is the colour that appears; after that, every
      // colourway in priority order, then the gallery proper.
      const labelOf = (v: Variant) => [v.color, v.material].filter(Boolean).join(' ') || undefined;
      if (selVariant) push(selVariant.image_url, labelOf(selVariant));
      for (const v of variants) push(v.image_url, labelOf(v));
    } else {
      // The selected variant's own photograph leads.
      push(selVariant?.image_url || inMaterial[0]?.image_url);
    }

    for (const url of product.gallery_images ?? []) push(url);

    // Studio clips last, behind their first frame. After the photographs
    // because the photographs are what the card promised and what the view
    // transition lands on; the clip is the extra.
    for (const v of videos) {
      if (v.kind === 'studio' && !seen.has(v.url)) {
        out.push({ src: videoPoster(v.url), video: v.url });
        seen.add(v.url);
      }
    }
    return out;
  }, [photographsAreGallery, selVariant, variants, inMaterial, product.gallery_images, videos]);

  const customerVideos = useMemo(
    () => videos.filter(v => v.kind === 'customer'),
    [videos],
  );

  // ── Specs ────────────────────────────────────────────────────────────────
  const specs = useMemo<Record<string, string>>(() => {
    if (!product.specifications) return {};
    if (typeof product.specifications === 'string') {
      try { return JSON.parse(product.specifications); } catch { return {}; }
    }
    return product.specifications;
  }, [product.specifications]);

  const dimensions = (specs.dimensions ?? specs.Dimensions ?? '').trim();
  const price = product.base_price + (selVariant?.price_adjustment || 0);

  const reviewCount = approvedReviews.length;
  const averageRating = reviewCount
    ? approvedReviews.reduce((s, r) => s + r.rating, 0) / reviewCount
    : 0;

  // ── ViewContent ──────────────────────────────────────────────────────────
  // Fired per variant, because the variant id is what the Merchant feed
  // publishes and therefore what a dynamic ad can retarget. The ref guard
  // exists because React runs effects twice under StrictMode in development.
  const lastViewed = useRef<string | null>(null);
  useEffect(() => {
    if (!selVariant || lastViewed.current === selVariant.id) return;
    lastViewed.current = selVariant.id;
    trackViewContent({ productId: product.id, variantId: selVariant.id, title: product.title, price, quantity: 1 });
  }, [selVariant, price, product.id, product.title]);

  // ── Fabric, on made-to-order frames ──────────────────────────────────────
  //
  // Held here rather than inside the picker because two things need it: the
  // basket line, and "Add to cart" itself, which opens the dialog rather than
  // complaining when nothing has been chosen yet.
  const madeToOrder = Boolean(product.custom_made) && fabrics.length > 0;
  const [fabric, setFabric] = useState<Fabric | null>(null);
  const [fabricOpen, setFabricOpen] = useState(false);

  // ── Cart ─────────────────────────────────────────────────────────────────
  const [added, setAdded] = useState(false);

  // The one place a line goes into the cart. Both add-to-cart buttons and the
  // fabric picker's "Build mine in this" come through here, so the line, the
  // toast and the AddToCart event are the same whichever was pressed. Takes
  // the fabric as an argument rather than reading state because the picker
  // has just chosen it, and the state will not have caught up yet.
  const addLine = useCallback((inFabric: Fabric | null) => {
    if (!selVariant) return false;

    addToCart({
      variant_id: selVariant.id,
      quantity: 1,
      price,
      title: product.title,
      color: inFabric
        ? `${inFabric.collectionName} ${inFabric.name}`
        : `${selVariant.color ?? ''} ${selVariant.material ?? ''}`.trim(),
      image_url: images[0]?.src || '/placeholder.svg',
      fabric_id: inFabric?.id ?? null,
      fabric_label: inFabric ? `${inFabric.collectionName} ${inFabric.name}` : null,
      fabric_code: inFabric?.code ?? null,
      fabric_swatch: inFabric?.image ?? null,
    });
    // Fired here rather than inside the cart reducer: the reducer runs inside a
    // setState updater, which React may invoke more than once.
    trackAddToCart({ productId: product.id, variantId: selVariant.id, title: product.title, price, quantity: 1 });
    setAdded(true);
    toast.success(`${product.title} added to cart`, { icon: '🛋️', position: 'top-center' });
    setTimeout(() => setAdded(false), 2000);
    return true;
  }, [selVariant, price, product.id, product.title, images, addToCart]);

  // The buy box's button and the floating pill.
  const handleAdd = useCallback(() => {
    // You cannot build a sofa without knowing what to build it in. Rather than
    // refusing, this puts the choice in front of them - one tap, instead of an
    // error they then have to go and resolve for themselves.
    if (madeToOrder && !fabric) {
      setFabricOpen(true);
      return;
    }
    addLine(fabric);
  }, [madeToOrder, fabric, addLine]);

  // "Build mine in this", from inside the picker: the sofa goes into the cart
  // in that fabric and the customer goes with it. Nothing is left to decide on
  // this page once the fabric is chosen, so there is no reason to close the
  // dialog and leave them looking for the next button.
  const handleBuild = useCallback((chosen: Fabric) => {
    setFabric(chosen);
    setFabricOpen(false);
    if (addLine(chosen)) router.push('/checkout');
  }, [addLine, router]);

  // ── Wishlist ─────────────────────────────────────────────────────────────
  const [inWishlist, setInWishlist] = useState(initialWishlistState);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const handleWishlist = useCallback(async () => {
    setWishlistBusy(true);
    const result = await toggleWishlist(product.id);
    if (result.success) {
      setInWishlist(result.isWishlisted ?? false);
      toast.success(result.isWishlisted ? 'Added to wishlist' : 'Removed from wishlist');
    } else {
      toast.error(result.error || 'You must be logged in to modify your wishlist.');
    }
    setWishlistBusy(false);
  }, [product.id]);

  // ── Enquiry links ────────────────────────────────────────────────────────
  // Each mints its own UKSS-WA-... reference before the visitor leaves for
  // WhatsApp - see utils/attribution/useWhatsAppCTA.ts - so a conversation
  // that becomes a sale can be linked back to this exact product/variant.
  const agentCta = useWhatsAppCTA({
    message: `Hi, I'm enquiring about the ${product.title}.`,
    pageContext: 'product_agent',
    productId: product.id,
    variantId: selVariant?.id,
    productName: product.title,
  });

  // Structured so a made-to-order enquiry arrives with the answers already
  // prompted, rather than as an open-ended message.
  const customEnquiryCta = useWhatsAppCTA({
    message: `Hi, I'd like a made-to-order ${product.title}.\n\nColour:\nFabric / material:\nSize or layout:\nAnything else:\n`,
    pageContext: 'product_custom_enquiry',
    productId: product.id,
    variantId: selVariant?.id,
    productName: product.title,
  });

  const [showCustomSize, setShowCustomSize] = useState(false);

  const crumbCategory = titleCase(categoryName || categorySlug);

  return (
    <>
      {/* A div, not a <main>: the root layout already renders one, and two
          main landmarks in a document is invalid and leaves a screen reader
          with two "main" regions to choose between. */}
      <div className="grad-calico grain-light relative bg-calico-50" style={accent}>
        {/* Exposes the live product + selected variant to the global fixed
            WhatsApp button. The marker is hidden and carries no user-visible
            content; React updates its data attributes whenever the variant
            changes, and WhatsAppFab observes those updates. */}
        <span
          hidden
          data-whatsapp-product-context
          data-product-id={product.id}
          data-variant-id={selVariant?.id ?? ''}
          data-product-name={product.title}
        />
        {/* ── Breadcrumb ───────────────────────────────────────────────────
            The category link used to print the URL slug with its first letter
            capitalised, so it read "Corner-sofas". It carries the category's
            real name now, resolved on the server.

            One line that scrolls, not four items that wrap. With a long
            product title at the end this was wrapping to two rows on a 375px
            phone — 58px of trail above the photograph, on the one screen where
            every pixel belongs to the sofa. The scroll is hidden and the fade
            at the right edge is what says it continues. */}
        <div
          className="relative mx-auto max-w-shell pt-3"
          style={{ ['--fade-from' as string]: 'var(--color-calico-50)' }}
        >
        <nav
          aria-label="Breadcrumb"
          className="no-scrollbar overflow-x-auto px-4 sm:px-6"
        >
          <ol className="m-0 flex list-none flex-nowrap items-center gap-2 whitespace-nowrap p-0">
            {[
              { href: '/', label: 'Home' },
              { href: '/shop/all', label: 'Shop' },
              { href: `/shop/${encodeURIComponent(categorySlug)}`, label: crumbCategory },
            ].map(({ href, label }, i) => (
              <li key={href} className="flex items-center gap-2">
                {i > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 text-ink-400" />}
                <Link href={href} className="hover-link text-caption text-ink-500 no-underline">{label}</Link>
              </li>
            ))}
            <li className="flex items-center gap-2 pr-6">
              <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-ink-400" />
              <span aria-current="page" className="text-caption font-semibold text-[var(--pdp-accent-text)]">
                {product.title}
              </span>
            </li>
          </ol>
        </nav>
          {/* Outside the scroller, so it stays pinned to the right edge
              instead of travelling with the trail it is fading. */}
          <span aria-hidden="true" className="rail-fade rail-fade-end" />
        </div>

        {/* ── Hero ──────────────────────────────────────────────────────────
            Two grid items, placed by `order` rather than by being rendered
            twice. On a phone this stacks gallery → swatches → buy box, which
            is the reading order the page needs; at md the same two items sit
            side by side and the gallery pins. The <h1> lives in the buy box
            and is rendered exactly once at both widths. */}
        <div className="mx-auto grid max-w-shell grid-cols-1 items-start gap-x-10 gap-y-7 px-4 pb-10 pt-3 sm:px-6 md:grid-cols-2 md:items-stretch md:gap-y-8 md:pb-12 md:pt-4">
          <div className="order-1 md:col-start-1 md:row-start-1">
            <Gallery
              productId={product.id}
              title={product.title}
              images={images}
              swatches={swatches}
              // On a made-to-order frame each photograph names its own colour
              // (see `images` above), so no page-wide colour is claimed.
              selectedColor={photographsAreGallery ? '' : selColor}
              onSelectColor={setSelColor}
              material={photographsAreGallery || selMat === 'Standard' ? '' : selMat}
            />
          </div>

          {/* The buy box pins. Two things make that work, and both are in
              the markup rather than in a comment somewhere else:

              The grid item spans both desktop rows and is left to STRETCH, so
              its area is as tall as the whole left column. The inner div is
              what is sticky, and it travels inside that area — an item sized
              to its own content would have nowhere to go, which is exactly why
              this did nothing when it was one div.

              And nothing follows the buy box in this column. A sibling after a
              sticky element scrolls over it from the instant it pins; the
              made-to-order and WhatsApp blocks are in the left column now. */}
          <div className="order-2 md:col-start-2 md:row-start-1 md:row-span-3">
            <div className="md:sticky md:top-[76px]">
              <BuyBox
                product={product}
                price={price}
                reviewCount={reviewCount}
                averageRating={averageRating}
                estimate={deliveryEstimate}
                categorySlug={categorySlug}
                subgroups={subgroups}
                subgroupTitle={subgroupTitle || 'Style'}
                currentSubgroup={currentSubgroup}
                hrefForSubgroup={hrefForSubgroup}
                sizes={sizes}
                onCustomSize={() => setShowCustomSize(true)}
                // No material pills on a made-to-order frame: the fabric
                // picker is the material choice, and "Marble / Plush Velvet"
                // was only which colourways had been photographed.
                materials={photographsAreGallery ? [] : materials}
                selectedMaterial={selMat}
                onSelectMaterial={handleMaterial}
                // The fabric card stands here, after the name, the price and
                // the size, rather than under the photographs: on a phone it
                // used to be the first thing after the picture, ahead of what
                // the sofa was called and what it cost.
                fabrics={fabrics}
                selectedFabric={fabric}
                onOpenFabrics={madeToOrder ? () => setFabricOpen(true) : undefined}
                offerTier={offerTier}
                added={added}
                onAdd={handleAdd}
                inWishlist={inWishlist}
                wishlistBusy={wishlistBusy}
                onWishlist={handleWishlist}
              />
            </div>
          </div>

          {/* Under the photograph on desktop, after the buy box on a phone —
              which is the reading order either way, because on one column
              `order` puts it third. */}
          <div className="order-3 md:col-start-1 md:row-start-2">
            <SecondaryActions
              customMade={Boolean(product.custom_made)}
              customEnquiryCta={customEnquiryCta}
              agentCta={agentCta}
            />
          </div>

          {/* The accordion is what gives the pin its travel. The buy box is
              877px tall and the photograph is 643px, so without something
              below it the left column is the SHORTER one and a sticky buy box
              has nowhere to go — which is exactly what happened the first time
              this was built. Details here makes the left column ~1,265px and
              the pin real. */}
          <div className="order-4 md:col-start-1 md:row-start-3">
            <Details
              description={product.description || ''}
              specs={specs}
              dimensions={dimensions}
            />
          </div>
        </div>

        <div className="relative mx-auto max-w-shell px-4 pb-12 sm:px-6 lg:pb-16">
          {/* Clips customers sent us of this sofa in their homes. Above the
              written reviews because a room with the sofa in it answers
              "what does it actually look like" faster than a paragraph. */}
          <VideoStrip
            videos={customerVideos}
            eyebrow="In customers' homes"
            heading="Delivered and in place."
            emphasise="place."
            fallbackTitle={`${product.title} in a customer's home`}
            className="mb-12 lg:mb-16"
          />
          <Reviews productId={product.id} reviews={approvedReviews} isLoggedIn={isLoggedIn} />
        </div>

        {/* Both rows run the full width on Calico 100. The change of ground is
            what separates them from the product detail above — no rule needed,
            and nothing to line up when one of the two is absent. */}
        <Similar products={similarProducts} categorySlug={categorySlug} categoryName={crumbCategory} />
        <RecentlyViewed
          id={product.id}
          title={product.title}
          href={`/shop/${categorySlug}/${product.slug}`}
          image={images[0]?.src ?? null}
          price={price}
        />
      </div>

      {/* Bottom left, opposite the WhatsApp pill, from the moment the page
          loads. The same handler as the buy box's button, so a made-to-order
          frame with no fabric chosen opens the picker from here too. */}
      <AddToCartFab price={price} added={added} onAdd={handleAdd} />

      {madeToOrder && fabricOpen && (
        <FabricDialog
          collections={fabrics}
          selectedId={fabric?.id ?? null}
          productSlug={product.slug}
          onBuild={handleBuild}
          onClose={() => setFabricOpen(false)}
        />
      )}

      {showCustomSize && (
        <CustomSizeModal
          title={product.title}
          accent={accent}
          onClose={() => setShowCustomSize(false)}
        />
      )}
    </>
  );
}

// ─── Custom size ─────────────────────────────────────────────────────────────
//
// The shell — role, aria-modal, Escape, the Tab trap, the scroll lock and the
// focus handover — is the shared Modal now. This panel had the scroll lock and
// Escape and neither of the last two, so Tab walked out of it and into the
// page behind, which is still there, just invisible.
function CustomSizeModal({ title, accent, onClose }: {
  title: string; accent: React.CSSProperties; onClose: () => void;
}) {
  const configCta = useWhatsAppCTA({
    message: `Hi, I'm interested in a custom configuration for the ${title}. Can you help me out?`,
    pageContext: 'product_custom_size_modal',
    productName: title,
  });
  const onPhoneClick = usePhoneClick();

  return (
    <Modal
      title="Custom configuration"
      onClose={onClose}
      size="sm"
      style={accent}
      icon={<Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--pdp-accent-text)]" />}
    >
      <div className="text-center">
        <p className="m-0 font-display text-h3 font-semibold text-ink-900">Need more seats?</p>
        <p className="m-0 mt-2 text-body-sm leading-relaxed text-ink-500">
          Want a different number of seats, or a layout that isn&apos;t listed? Talk to us and
          we&apos;ll build it around your room. It is usually cheaper than adding pieces one by one.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <a
            href={configCta.href}
            onClick={configCta.onClick}
            target="_blank"
            rel="noopener noreferrer"
            className="hover-btn flex h-12 items-center justify-center gap-2 rounded-sm bg-whatsapp text-body-sm font-semibold text-calico-50 no-underline"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Chat on WhatsApp
          </a>
          <a
            href={PHONE_HREF}
            onClick={onPhoneClick}
            className="hover-btn hover-btn-dark flex h-12 items-center justify-center gap-2 rounded-sm bg-ink-900 text-body-sm font-semibold text-calico-50 no-underline"
          >
            <Phone aria-hidden="true" className="h-4 w-4" />
            Call us directly
          </a>
        </div>
      </div>
    </Modal>
  );
}
