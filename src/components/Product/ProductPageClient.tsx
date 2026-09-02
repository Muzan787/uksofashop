'use client';
// src/components/Product/ProductPageClient.tsx
//
// The orchestrator. It owns the state the sections share — which variant is
// selected, whether the item is in the cart or on the wishlist — and nothing
// else. The page itself is six components:
//
//   Gallery      the photographs and the colour swatches
//   BuyBox       title, price, delivery dates, the choices, add to cart
//   StickyBar    the phone's add-to-cart bar
//   Details      description, specifications, delivery, dimensions
//   Reviews      the reviews and the form
//   Similar      more from the same category, and Recently viewed under it
//
// This file was 1,361 lines with all six of them inlined, roughly two hundred
// inline style objects, and one <h1> rendered twice.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Phone, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { toggleWishlist } from '@/app/actions/wishlist';
import { PHONE_HREF, whatsAppHref } from '@/constants/contact';
import { useCart } from '@/context/CartContext';
import { trackAddToCart, trackViewContent } from '@/utils/tracking';
import type { DeliveryWindow } from '@/utils/delivery';
import { accentVars } from './accent';
import BuyBox from './BuyBox';
import Details from './Details';
import Gallery from './Gallery';
import RecentlyViewed from './RecentlyViewed';
import Reviews from './Reviews';
import SecondaryActions from './SecondaryActions';
import Similar from './Similar';
import StickyBar from './StickyBar';
import WhatsAppIcon from './WhatsAppIcon';
import Modal from '@/components/UI/Modal';
import type { Fabric, FabricCollection, GalleryImage, Product, Review, SimilarProduct, SizeVariant, Swatch, Variant } from './types';

interface Props {
  product: Product;
  variants: Variant[];
  approvedReviews: Review[];
  similarProducts: SimilarProduct[];
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
  product, variants, approvedReviews, similarProducts,
  categorySlug, categoryName, deliveryEstimate,
  initialWishlistState, isLoggedIn,
  sizeVariants, subgroupTitle, currentSubgroup, initialVariantId,
  fabrics = [],
}: Props) {
  const { addToCart } = useCart();

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
  const swatches = useMemo<Swatch[]>(() => {
    const seen = new Set<string>();
    const out: Swatch[] = [];
    for (const v of inMaterial) {
      const key = v.color ?? '';
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id: v.id, color: key, hex: v.color_hex, image: v.image_url });
    }
    return out;
  }, [inMaterial]);

  const images = useMemo<GalleryImage[]>(() => {
    const seen = new Set<string>();
    const out: GalleryImage[] = [];

    // The selected variant's own photograph leads.
    const lead = selVariant?.image_url || inMaterial[0]?.image_url;
    if (lead) { out.push({ src: lead }); seen.add(lead); }

    for (const url of product.gallery_images ?? []) {
      if (url && !seen.has(url)) { out.push({ src: url }); seen.add(url); }
    }
    return out;
  }, [selVariant?.image_url, inMaterial, product.gallery_images]);

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
    trackViewContent({ variantId: selVariant.id, title: product.title, price, quantity: 1 });
  }, [selVariant, price, product.title]);

  // ── Fabric, on made-to-order frames ──────────────────────────────────────
  //
  // Held here rather than inside the picker because two things need it: the
  // basket line, and "Add to basket" itself, which opens the dialog rather than
  // complaining when nothing has been chosen yet.
  const madeToOrder = Boolean(product.custom_made) && fabrics.length > 0;
  const [fabric, setFabric] = useState<Fabric | null>(null);
  const [fabricOpen, setFabricOpen] = useState(false);

  // ── Cart ─────────────────────────────────────────────────────────────────
  const [added, setAdded] = useState(false);
  const handleAdd = useCallback(() => {
    if (!selVariant) return;

    // You cannot build a sofa without knowing what to build it in. Rather than
    // refusing, this puts the choice in front of them - one tap, instead of an
    // error they then have to go and resolve for themselves.
    if (madeToOrder && !fabric) {
      setFabricOpen(true);
      return;
    }

    addToCart({
      variant_id: selVariant.id,
      quantity: 1,
      price,
      title: product.title,
      color: fabric
        ? `${fabric.collectionName} ${fabric.name}`
        : `${selVariant.color ?? ''} ${selVariant.material ?? ''}`.trim(),
      image_url: images[0]?.src || '/placeholder.svg',
      fabric_id: fabric?.id ?? null,
      fabric_label: fabric ? `${fabric.collectionName} ${fabric.name}` : null,
      fabric_code: fabric?.code ?? null,
      fabric_swatch: fabric?.image ?? null,
    });
    // Fired here rather than inside the cart reducer: the reducer runs inside a
    // setState updater, which React may invoke more than once.
    trackAddToCart({ variantId: selVariant.id, title: product.title, price, quantity: 1 });
    setAdded(true);
    toast.success(`${product.title} added to cart`, { icon: '🛋️', position: 'top-center' });
    setTimeout(() => setAdded(false), 2000);
  }, [selVariant, price, product.title, images, addToCart, madeToOrder, fabric]);

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
  const agentHref = whatsAppHref(`Hi, I have a query about your product: ${product.title}`);

  // Structured so a made-to-order enquiry arrives with the answers already
  // prompted, rather than as an open-ended message.
  const customEnquiryHref = whatsAppHref(
    `Hi, I'd like a made-to-order ${product.title}.\n\nColour:\nFabric / material:\nSize or layout:\nAnything else:\n`,
  );

  const [showCustomSize, setShowCustomSize] = useState(false);

  // ── When the bar comes up ────────────────────────────────────────────────
  // Once the real add-to-cart button has left the top of the viewport, and not
  // before: a toolbar over the first screenful of a product page is covering
  // the product.
  const ctaRef = useRef<HTMLDivElement>(null);
  const [pastCta, setPastCta] = useState(false);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setPastCta(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const crumbCategory = titleCase(categoryName || categorySlug);

  return (
    <>
      {/* A div, not a <main>: the root layout already renders one, and two
          main landmarks in a document is invalid and leaves a screen reader
          with two "main" regions to choose between. */}
      <div className="grad-calico grain-light relative bg-calico-50" style={accent}>
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
              selectedColor={selColor}
              onSelectColor={setSelColor}
              material={selMat === 'Standard' ? '' : selMat}
              fabrics={fabrics}
              selectedFabric={fabric}
              onSelectFabric={madeToOrder ? setFabric : undefined}
              fabricDialogOpen={fabricOpen}
              onFabricDialogChange={madeToOrder ? setFabricOpen : undefined}
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
                materials={materials}
                selectedMaterial={selMat}
                onSelectMaterial={handleMaterial}
                added={added}
                onAdd={handleAdd}
                inWishlist={inWishlist}
                wishlistBusy={wishlistBusy}
                onWishlist={handleWishlist}
                ctaRef={ctaRef}
              />
            </div>
          </div>

          {/* Under the photograph on desktop, after the buy box on a phone —
              which is the reading order either way, because on one column
              `order` puts it third. */}
          <div className="order-3 md:col-start-1 md:row-start-2">
            <SecondaryActions
              customMade={Boolean(product.custom_made)}
              customEnquiryHref={customEnquiryHref}
              agentHref={agentHref}
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
          <Reviews productId={product.id} reviews={approvedReviews} isLoggedIn={isLoggedIn} />
        </div>

        {/* Both rows run the full width on Calico 100. The change of ground is
            what separates them from the product detail above — no rule needed,
            and nothing to line up when one of the two is absent. */}
        <Similar products={similarProducts} categorySlug={categorySlug} />
        <RecentlyViewed
          id={product.id}
          title={product.title}
          href={`/shop/${categorySlug}/${product.slug}`}
          image={images[0]?.src ?? null}
          price={price}
        />

        {/* Clears the sticky bar, which is fixed and out of the flow. */}
        <div aria-hidden="true" className="h-[76px] md:hidden" />
      </div>

      <StickyBar
        image={images[0]?.src ?? null}
        title={product.title}
        price={price}
        visible={pastCta}
        added={added}
        onAdd={handleAdd}
      />

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
            href={whatsAppHref(`Hi, I'm interested in a custom configuration for the ${title}. Can you help me out?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover-btn flex h-12 items-center justify-center gap-2 rounded-sm bg-whatsapp text-body-sm font-semibold text-calico-50 no-underline"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Chat on WhatsApp
          </a>
          <a
            href={PHONE_HREF}
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
