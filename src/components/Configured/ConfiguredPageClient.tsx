'use client';
// src/components/Configured/ConfiguredPageClient.tsx
//
// The product page for anything that is one product in several versions with
// priced extras on top: a bed (five sizes, frame or set, mattress upgrade,
// storage) and a mattress (five sizes). Dining will be the next.
//
// It is the sofa page's orchestrator with a different buy box. The gallery,
// the fabric picker, the reviews, the details accordion, the floating
// add-to-cart and the added-to-cart dialog are the sofa page's own components,
// so a bed page and a sofa page look and behave as one shop.
//
// What is different is how the variant is chosen. A sofa's sizes are separate
// products, linked by pills that change the page; a bed's sizes are its own
// variants, chosen in place, because the price of every option depends on the
// size and the customer needs to see that change under their thumb. See
// ConfiguredBuyBox for the choices, and utils/productOptions.ts for the words.
//
// The price shown is the variant's price plus the chosen add-ons. The basket
// carries the add-on ids, and place_order prices them itself - see the
// beds-and-mattresses migration - so nothing here is trusted for money.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { toggleWishlist } from '@/app/actions/wishlist';
import { useCart } from '@/context/CartContext';
import { trackAddToCart, trackOperationalAction, trackViewContent } from '@/utils/tracking';
import { trackJourney } from '@/utils/journey';
import type { JourneySurface } from '@/utils/journeyContract';
import { useWhatsAppCTA } from '@/utils/attribution/useWhatsAppCTA';
import { customEnquiryMessage, photoRequestMessage, productEnquiryMessage } from '@/utils/enquiryMessage';
import type { DeliveryWindow } from '@/utils/delivery';
import { videoPoster } from '@/utils/cloudinary';
import {
  AXES, PRODUCT_NOUN, optionsLabel, type Axis, type OptionsSnapshot, type ProductType,
} from '@/utils/productOptions';
import { accentVars } from '@/components/Product/accent';
import AddedToCartDialog from '@/components/Product/AddedToCartDialog';
import AddToCartFab from '@/components/Product/AddToCartFab';
import Details from '@/components/Product/Details';
import FabricChoice from '@/components/Product/FabricChoice';
import FabricDialog from '@/components/Product/FabricDialog';
import Gallery from '@/components/Product/Gallery';
import RecentlyViewed from '@/components/Product/RecentlyViewed';
import Reviews from '@/components/Product/Reviews';
import SecondaryActions from '@/components/Product/SecondaryActions';
import ShopReviews from '@/components/Product/ShopReviews';
import Similar from '@/components/Product/Similar';
import VideoStrip from '@/components/UI/VideoStrip';
import type {
  Addon, AddonGroup, Fabric, FabricCollection, GalleryImage, Product, ProductVideo, Review,
  SimilarProduct, Swatch, Variant,
} from '@/components/Product/types';
import ConfiguredBuyBox from './ConfiguredBuyBox';

interface Props {
  product: Product;
  productType: ProductType;
  variants: Variant[];
  addonGroups: AddonGroup[];
  approvedReviews: Review[];
  similarProducts: SimilarProduct[];
  videos?: ProductVideo[];
  categorySlug: string;
  categoryName: string;
  deliveryEstimate: DeliveryWindow;
  initialWishlistState: boolean;
  isLoggedIn: boolean;
  initialVariantId?: string;
  fabrics?: FabricCollection[];
}

type Selection = Record<string, string>;

/** True when the variant carries every option in `want`. */
function matches(v: Variant, want: Selection): boolean {
  return Object.entries(want).every(([k, code]) => v.options?.[k] === code);
}

/** Whether a group is offered on this variant - its only_when, as the database tests it. */
export function groupApplies(group: AddonGroup, variant: Variant | undefined): boolean {
  return Boolean(variant) && matches(variant!, group.onlyWhen);
}

export default function ConfiguredPageClient({
  product, productType, variants, addonGroups, approvedReviews, similarProducts, videos = [],
  categorySlug, categoryName, deliveryEstimate, initialWishlistState, isLoggedIn,
  initialVariantId, fabrics = [],
}: Props) {
  const { addToCart } = useCart();
  const router = useRouter();
  const noun = PRODUCT_NOUN[productType];

  // ── The axes this product actually varies on ─────────────────────────────
  // In the order AXES lists them, with only the values some variant has. An
  // axis with one value is not a choice and is not drawn.
  const axes = useMemo<Axis[]>(() => AXES
    .map(axis => ({
      ...axis,
      values: axis.values.filter(val => variants.some(v => v.options?.[axis.key] === val.code)),
    }))
    .filter(axis => axis.values.length > 1), [variants]);

  const startingVariant = useMemo(
    () => (initialVariantId ? variants.find(v => v.id === initialVariantId) : undefined) ?? variants[0],
    [variants, initialVariantId],
  );

  const [selection, setSelection] = useState<Selection>(() => ({ ...(startingVariant?.options ?? {}) }));

  // Arriving at ?variant=… while already on the page (a card in Similar):
  // adjusted during render, as on the sofa page, so the old size never paints.
  const [appliedVariantId, setAppliedVariantId] = useState(initialVariantId);
  if (initialVariantId && initialVariantId !== appliedVariantId) {
    setAppliedVariantId(initialVariantId);
    const target = variants.find(v => v.id === initialVariantId);
    if (target) setSelection({ ...(target.options ?? {}) });
  }

  const selVariant = useMemo(() => {
    const want: Selection = {};
    for (const axis of axes) if (selection[axis.key]) want[axis.key] = selection[axis.key];
    return variants.find(v => matches(v, want)) ?? variants[0];
  }, [axes, selection, variants]);

  const variantPrice = (v: Variant | undefined) => Number(product.base_price) + Number(v?.price_adjustment ?? 0);

  /**
   * Choosing one value keeps the others where that combination exists, and
   * otherwise takes the first variant that has it - so a choice can never land
   * on a version of the product that does not exist.
   */
  const choose = useCallback((axisKey: string, code: string) => {
    setSelection(prev => {
      const next = { ...prev, [axisKey]: code };
      if (variants.some(v => matches(v, next))) return next;
      const fallback = variants.find(v => v.options?.[axisKey] === code);
      return fallback ? { ...(fallback.options ?? {}) } : prev;
    });
    trackOperationalAction('pdp_size_selected', {
      productId: product.id,
      metadata: { step: axisKey, value: code },
    });
  }, [variants, product.id]);

  /** What each tile costs if chosen, given everything else as it stands. */
  const priceIf = useCallback((axisKey: string, code: string): number | null => {
    const want: Selection = {};
    for (const axis of axes) if (selection[axis.key]) want[axis.key] = selection[axis.key];
    want[axisKey] = code;
    const exact = variants.find(v => matches(v, want));
    if (exact) return variantPrice(exact);
    const any = variants.filter(v => v.options?.[axisKey] === code).map(variantPrice);
    return any.length ? Math.min(...any) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- variantPrice reads only product.base_price
  }, [axes, selection, variants, product.base_price]);

  // ── Add-ons ──────────────────────────────────────────────────────────────
  // Picks are kept per group even when the group stops applying - switch a
  // set back to the frame and the mattress upgrade is not offered, but switch
  // back again and it is still chosen. Only the groups that apply now count.
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const liveGroups = useMemo(
    () => addonGroups.filter(g => groupApplies(g, selVariant)),
    [addonGroups, selVariant],
  );
  const chosen = useMemo(() => liveGroups.flatMap(g =>
    (picks[g.id] ?? []).flatMap(id => {
      const addon = g.addons.find(a => a.id === id);
      return addon ? [{ group: g, addon }] : [];
    })), [liveGroups, picks]);

  const togglePick = useCallback((group: AddonGroup, addon: Addon | null) => {
    setPicks(prev => {
      const current = prev[group.id] ?? [];
      if (group.selection === 'one') return { ...prev, [group.id]: addon ? [addon.id] : [] };
      if (!addon) return prev;
      return {
        ...prev,
        [group.id]: current.includes(addon.id) ? current.filter(id => id !== addon.id) : [...current, addon.id],
      };
    });
    if (addon) {
      trackOperationalAction('pdp_style_selected', {
        productId: product.id,
        metadata: { step: group.slug, value: addon.slug },
      });
    }
  }, [product.id]);

  const basePrice = variantPrice(selVariant);
  const extrasTotal = chosen.reduce((t, c) => t + Number(c.addon.price), 0);
  const price = basePrice + extrasTotal;

  // ── Fabric ───────────────────────────────────────────────────────────────
  // As on a made-to-order sofa: optional, the photographed colour otherwise.
  // A fabric from the library is what makes a bed personalised, and the
  // checkout decides the 14-day right from it per line.
  const madeToOrder = Boolean(product.custom_made) && fabrics.length > 0;
  const [fabric, setFabric] = useState<Fabric | null>(null);
  const [fabricOpen, setFabricOpen] = useState(false);
  const fabricLooked = useRef(false);

  const openFabrics = useCallback(() => {
    fabricLooked.current = false;
    setFabricOpen(true);
    trackOperationalAction('pdp_fabric_picker_opened', {
      productId: product.id, variantId: selVariant?.id, metadata: { step: 'fabric_card' },
    });
  }, [product.id, selVariant?.id]);

  const onViewFabric = useCallback((viewed: Fabric) => {
    trackJourney('fabric_viewed', { option_code: viewed.code }, { productId: product.id });
    if (fabricLooked.current) return;
    fabricLooked.current = true;
    trackOperationalAction('pdp_fabric_viewed', { productId: product.id, metadata: { value: viewed.collectionName } });
  }, [product.id]);

  const closeFabrics = useCallback(() => {
    setFabricOpen(false);
    trackOperationalAction('pdp_fabric_picker_closed', {
      productId: product.id,
      metadata: { step: 'without_choice', value: fabricLooked.current ? 'looked' : 'did_not_look' },
    });
  }, [product.id]);

  // ── Gallery ──────────────────────────────────────────────────────────────
  const swatches = useMemo<Swatch[]>(() => (selVariant?.color && productType !== 'mattress'
    ? [{ id: selVariant.id, color: selVariant.color, hex: selVariant.color_hex, image: selVariant.image_url }]
    : []), [selVariant, productType]);
  const colourLabel = `${selVariant?.color ?? ''} ${selVariant?.material ?? ''}`.trim();

  const images = useMemo<GalleryImage[]>(() => {
    const seen = new Set<string>();
    const out: GalleryImage[] = [];
    const push = (src: string | null | undefined) => {
      if (src && !seen.has(src)) { out.push({ src }); seen.add(src); }
    };
    push(selVariant?.image_url || variants.find(v => v.image_url)?.image_url);
    for (const url of product.gallery_images ?? []) push(url);
    for (const v of videos) {
      if (v.kind === 'studio' && !seen.has(v.url)) {
        out.push({ src: videoPoster(v.url), video: v.url });
        seen.add(v.url);
      }
    }
    return out;
  }, [selVariant, variants, product.gallery_images, videos]);

  const customerVideos = useMemo(() => videos.filter(v => v.kind === 'customer'), [videos]);

  const specs = useMemo<Record<string, string>>(() => {
    if (!product.specifications) return {};
    if (typeof product.specifications === 'string') {
      try { return JSON.parse(product.specifications); } catch { return {}; }
    }
    return product.specifications;
  }, [product.specifications]);
  const dimensions = (specs.dimensions ?? specs.Dimensions ?? '').trim();

  const reviewCount = approvedReviews.length;
  const averageRating = reviewCount ? approvedReviews.reduce((s, r) => s + r.rating, 0) / reviewCount : 0;

  // ── ViewContent, per variant ─────────────────────────────────────────────
  const lastViewed = useRef<string | null>(null);
  useEffect(() => {
    if (!selVariant || lastViewed.current === selVariant.id) return;
    if (lastViewed.current) trackJourney('variant_changed', { price: basePrice }, { productId: product.id, variantId: selVariant.id });
    lastViewed.current = selVariant.id;
    trackViewContent({ productId: product.id, variantId: selVariant.id, title: product.title, price: basePrice, quantity: 1 });
  }, [selVariant, basePrice, product.id, product.title]);

  // ── The configuration, in words ──────────────────────────────────────────
  const configLabel = optionsLabel(selVariant?.options ?? {});
  const configTitle = configLabel ? `${product.title} — ${configLabel}` : product.title;

  // ── Cart ─────────────────────────────────────────────────────────────────
  const [added, setAdded] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const addLine = useCallback((inFabric: Fabric | null, surface: JourneySurface = 'primary') => {
    if (!selVariant) { trackJourney('cart_update_failed', { surface, outcome: 'missing_variant' }, { productId: product.id }); return; }

    const selections: OptionsSnapshot = {
      kind: 'options',
      product_type: productType,
      options: selVariant.options ?? {},
      addons: chosen.map(c => ({ id: c.addon.id, group: c.group.name, name: c.addon.name, price: Number(c.addon.price) })),
    };
    // A mattress has no colour worth naming; a bed is the colour photographed
    // or the fabric chosen.
    const colour = inFabric
      ? `${inFabric.collectionName} ${inFabric.name}`
      : productType === 'mattress' ? '' : colourLabel;

    addToCart({
      variant_id: selVariant.id,
      quantity: 1,
      price,
      title: product.title,
      color: colour,
      image_url: images[0]?.src || '/placeholder.svg',
      fabric_id: inFabric?.id ?? null,
      fabric_label: inFabric ? `${inFabric.collectionName} ${inFabric.name}` : null,
      fabric_code: inFabric?.code ?? null,
      fabric_swatch: inFabric?.image ?? null,
      addon_ids: selections.addons.map(a => a.id),
      selections,
    }, surface);
    trackAddToCart({ productId: product.id, variantId: selVariant.id, title: product.title, price, quantity: 1 });
    setAdded(true);
    setJustAdded([configLabel, colour, ...chosen.map(c => c.addon.name)].filter(Boolean).join(' · '));
    setTimeout(() => setAdded(false), 2000);
  }, [selVariant, productType, chosen, colourLabel, price, product.id, product.title, images, addToCart, configLabel]);

  const handleAdd = useCallback((surface: JourneySurface = 'primary') => {
    trackJourney('cta_click', { surface }, { productId: product.id, variantId: selVariant?.id });
    addLine(fabric, surface);
  }, [fabric, addLine, product.id, selVariant?.id]);

  const handleBuild = useCallback((picked: Fabric) => {
    trackJourney('fabric_selected', { option_code: picked.code, surface: 'fabric_picker' }, { productId: product.id, variantId: selVariant?.id });
    setFabric(picked);
    setFabricOpen(false);
    addLine(picked, 'fabric_picker');
  }, [addLine, product.id, selVariant?.id]);

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

  // ── Enquiries ────────────────────────────────────────────────────────────
  // The configuration goes into the title, so the chat opens on the exact bed.
  // No visitor offer is quoted: beds and mattresses carry no offer tier.
  const agentCta = useWhatsAppCTA({
    message: productEnquiryMessage(configTitle, price, null),
    pageContext: 'product_agent',
    productId: product.id,
    variantId: selVariant?.id,
    productName: product.title,
  });
  const customEnquiryCta = useWhatsAppCTA({
    message: customEnquiryMessage(configTitle, price, null),
    pageContext: 'product_custom_enquiry',
    productId: product.id,
    variantId: selVariant?.id,
    productName: product.title,
  });
  const photoRequestCta = useWhatsAppCTA({
    message: photoRequestMessage(configTitle, price, null),
    pageContext: 'product_photo_request',
    productId: product.id,
    variantId: selVariant?.id,
    productName: product.title,
  });

  useEffect(() => {
    const addEl = document.querySelector('[data-pdp-add]');
    if (!addEl || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        trackOperationalAction('pdp_add_button_seen', { productId: product.id });
        observer.disconnect();
      }
    });
    observer.observe(addEl);
    return () => observer.disconnect();
  }, [product.id]);

  const accent = accentVars(productType === 'mattress' ? null : selVariant?.color_hex);

  return (
    <>
      <div className="grad-calico grain-light relative bg-calico-50" style={accent}>
        <span
          hidden
          data-whatsapp-product-context
          data-product-id={product.id}
          data-variant-id={selVariant?.id ?? ''}
          data-product-name={configTitle}
          data-product-price={String(price)}
          data-offer-amount="0"
        />

        <div className="relative mx-auto max-w-shell pt-3" style={{ ['--fade-from' as string]: 'var(--color-calico-50)' }}>
          <nav aria-label="Breadcrumb" className="no-scrollbar overflow-x-auto px-4 sm:px-6">
            <ol className="m-0 flex list-none flex-nowrap items-center gap-2 whitespace-nowrap p-0">
              {[
                { href: '/', label: 'Home' },
                { href: `/shop/${encodeURIComponent(categorySlug)}`, label: categoryName },
              ].map(({ href, label }, i) => (
                <li key={href} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 text-ink-400" />}
                  <Link href={href} className="hover-link text-caption text-ink-500 no-underline">{label}</Link>
                </li>
              ))}
              <li className="flex items-center gap-2 pr-6">
                <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-ink-400" />
                <span aria-current="page" className="text-caption font-semibold text-[var(--pdp-accent-text)]">{product.title}</span>
              </li>
            </ol>
          </nav>
          <span aria-hidden="true" className="rail-fade rail-fade-end" />
        </div>

        {/* The same two-column hero as a sofa: gallery left, the buy box
            pinned right on desktop; stacked in reading order on a phone. */}
        <div className="mx-auto grid max-w-shell grid-cols-1 items-start gap-x-10 gap-y-5 px-4 pb-10 pt-3 sm:px-6 md:grid-cols-2 md:items-stretch md:gap-y-8 md:pb-12 md:pt-4">
          <div className="order-1 md:col-start-1 md:row-start-1">
            <Gallery
              productId={product.id}
              title={product.title}
              images={images}
              swatches={swatches}
              selectedColor={fabric ? '' : (selVariant?.color ?? '')}
              onSelectColor={() => setFabric(null)}
              material={selVariant?.material ?? ''}
              photoRequest={photoRequestCta}
              showSingleSwatch={madeToOrder}
              swatchCaption={madeToOrder ? (fabric ? `${fabric.collectionName} ${fabric.name}` : colourLabel) : undefined}
              afterSwatches={madeToOrder ? (
                <FabricChoice
                  collections={fabrics}
                  selected={fabric}
                  onOpen={openFabrics}
                  onClear={() => setFabric(null)}
                />
              ) : undefined}
              noun={noun}
            />
          </div>

          <div className="order-2 md:col-start-2 md:row-start-1 md:row-span-4">
            <div className="md:sticky md:top-[76px]">
              <ConfiguredBuyBox
                product={product}
                productType={productType}
                price={price}
                reviewCount={reviewCount}
                averageRating={averageRating}
                estimate={deliveryEstimate}
                axes={axes}
                selection={selVariant?.options ?? selection}
                onChoose={choose}
                priceIf={priceIf}
                groups={liveGroups}
                picks={picks}
                onPick={togglePick}
                summary={[
                  ...axes.map(a => ({
                    label: a.lineLabel ?? a.label,
                    value: a.values.find(v => v.code === selVariant?.options?.[a.key])?.long ?? '',
                  })),
                  ...(productType === 'mattress' ? [] : [{
                    label: fabric ? 'Fabric' : 'Colour',
                    value: fabric ? `${fabric.collectionName} ${fabric.name}` : `${colourLabel} (as pictured)`,
                  }]),
                ].filter(l => l.value)}
                basePrice={basePrice}
                chosen={chosen.map(c => ({ name: c.addon.name, price: Number(c.addon.price) }))}
                fabricCount={fabrics.reduce((n, c) => n + c.fabrics.length, 0)}
                added={added}
                onAdd={() => handleAdd('primary')}
                inWishlist={inWishlist}
                wishlistBusy={wishlistBusy}
                onWishlist={handleWishlist}
              />
            </div>
          </div>

          <div className="order-3 md:col-start-1 md:row-start-2">
            <SecondaryActions
              customMade={Boolean(product.custom_made)}
              customEnquiryCta={customEnquiryCta}
              agentCta={agentCta}
              noun={noun}
            />
          </div>

          <div className="order-4 md:col-start-1 md:row-start-3">
            <ShopReviews />
          </div>

          <div className="order-5 md:col-start-1 md:row-start-4">
            <Details description={product.description || ''} specs={specs} dimensions={dimensions} />
          </div>
        </div>

        <div className="relative mx-auto max-w-shell px-4 pb-12 sm:px-6 lg:pb-16">
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

        <Similar products={similarProducts} categorySlug={categorySlug} categoryName={categoryName} />
        <RecentlyViewed
          id={product.id}
          title={product.title}
          href={`/shop/${categorySlug}/${product.slug}`}
          image={images[0]?.src ?? null}
          price={Number(product.base_price)}
          wasPrice={null}
        />
      </div>

      <AddToCartFab price={price} added={added} onAdd={() => handleAdd('sticky')} />

      {justAdded !== null && (
        <AddedToCartDialog
          title={product.title}
          choice={justAdded}
          price={price}
          image={images[0]?.src || '/placeholder.svg'}
          onBuyNow={() => { setJustAdded(null); router.push('/checkout'); }}
          onContinue={() => setJustAdded(null)}
        />
      )}

      {madeToOrder && fabricOpen && (
        <FabricDialog
          collections={fabrics}
          selectedId={fabric?.id ?? null}
          productSlug={product.slug}
          onBuild={handleBuild}
          onClose={closeFabrics}
          onViewFabric={onViewFabric}
          noun={noun}
        />
      )}
    </>
  );
}
