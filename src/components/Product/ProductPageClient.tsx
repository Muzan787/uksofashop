'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingBag, Check, Truck, Wallet, ShieldCheck,
  Ruler, X, ChevronDown, ChevronUp, Star, ZoomIn,
  Loader2, CheckCircle, ChevronRight, RotateCcw, Gem, Heart, ImagePlus
} from 'lucide-react';
import { toggleWishlist } from '@/app/actions/wishlist';
import { useCart } from '@/context/CartContext';
import { submitGlobalReview } from '@/app/actions/reviews';
import { uploadToCloudinary } from '@/app/actions/upload';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Variant {
  id: string;
  color: string | null;
  color_hex: string | null;
  material: string | null;
  image_url: string | null;
  price_adjustment: number;
  stock_quantity: number;
}
interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  status: string;
}
interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  base_price: number;
  specifications: Record<string, string> | string | null;
  product_variants?: Variant[];
  reviews?: Review[];
}
interface Props {
  product: Product;
  variants: Variant[];
  approvedReviews: Review[];
  categorySlug: string;
  initialWishlistState: boolean;
  isLoggedIn: boolean; // Added this prop!
}

// ─── Color utilities ──────────────────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 3 && clean.length !== 6) return null;
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getTextColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#1c1917';
  return getLuminance(rgb.r, rgb.g, rgb.b) > 0.4 ? '#1c1917' : '#ffffff';
}

function getPageTint(hex: string, lightness = 0.97): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `hsl(0,0%,${lightness * 100}%)`;
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h * 360)},${Math.round(15)}%,${Math.round(lightness * 100)}%)`;
}

function getAccentTint(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'rgba(212,135,26,0.08)';
  return `rgba(${rgb.r},${rgb.g},${rgb.b},0.1)`;
}

function getMidTint(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'rgba(212,135,26,0.18)';
  return `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`;
}

// ─── Reveal hook ─────────────────────────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ─── Star rating display ──────────────────────────────────────────────────────
function StarRow({ rating, size = 14, accent }: { rating: number; size?: number; accent: string }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          style={{
            width: size, height: size,
            fill: i <= rating ? accent : 'transparent',
            color: i <= rating ? accent : '#d6d3d1',
          }}
        />
      ))}
    </div>
  );
}

// ─── Image Zoom modal ─────────────────────────────────────────────────────────
function ZoomModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.25s ease',
      }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
      <div
        style={{ position: 'relative', width: '90vw', height: '90vh', maxWidth: 900 }}
        onClick={e => e.stopPropagation()}
      >
        <Image src={src} alt={alt} fill style={{ objectFit: 'contain' }} />
      </div>
    </div>
  );
}

// ─── Review form ──────────────────────────────────────────────────────────────
function ReviewForm({ productId, accent, accentTint, isLoggedIn }: {
  productId: string; accent: string; accentTint: string; isLoggedIn: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [rating, setRating]   = useState(5);
  const [hovered, setHovered] = useState(0);
  const [file, setFile]       = useState<File | null>(null);

  if (!isLoggedIn) {
    return (
      <div style={{ background: accentTint, border: `1px solid ${accent}33`, borderRadius: 10, padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1c1917', marginBottom: 8 }}>Share your thoughts</div>
        <p style={{ fontSize: 12, color: '#78716c', marginBottom: 20 }}>You must be logged in to leave a review for this product.</p>
        <Link href="/login" style={{
          display: 'inline-block', background: '#1c1917', color: '#fff', padding: '10px 20px',
          borderRadius: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'none'
        }}>
          Log In to Review
        </Link>
      </div>
    );
  }

  if (success) return (
    <div style={{ background: accentTint, border: `1px solid ${accent}33`, borderRadius: 10, padding: '24px', textAlign: 'center' }}>
      <CheckCircle style={{ width: 28, height: 28, color: accent, margin: '0 auto 8px' }} />
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1c1917', marginBottom: 4 }}>Thank you!</div>
      <p style={{ fontSize: 12, color: '#78716c' }}>Your review has been submitted and is pending approval.</p>
    </div>
  );

  async function submit(fd: FormData) {
    setPending(true); setError('');
    fd.append('rating', rating.toString());
    fd.append('productId', productId);

    try {
      let imageUrl = null;
      if (file) {
        imageUrl = await uploadToCloudinary(file);
      }

      const res = await submitGlobalReview(fd, imageUrl);
      if (res?.error) { setError(res.error); setPending(false); }
      else if (res?.success) { setSuccess(true); setPending(false); }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setPending(false);
    }
  }

  return (
    <form action={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1917', letterSpacing: '-0.01em' }}>
        Write a Review
      </div>
      {error && <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, color: '#dc2626' }}>{error}</div>}

      {/* Star picker */}
      <div>
        <div style={{ fontSize: 10, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, fontWeight: 600 }}>Rating</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1,2,3,4,5].map(s => (
            <button key={s} type="button" onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Star style={{
                width: 22, height: 22,
                fill: s <= (hovered || rating) ? accent : 'transparent',
                color: s <= (hovered || rating) ? accent : '#d6d3d1',
                transition: 'all 0.15s ease',
                transform: s <= (hovered || rating) ? 'scale(1.15)' : 'scale(1)',
              }} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 10, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 6 }}>
          Your Review
        </label>
        <textarea name="comment" required rows={3} placeholder="What did you think of this sofa?"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 7, border: '1px solid #e7e5e4',
            fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
            transition: 'border-color 0.2s ease', boxSizing: 'border-box',
          }}
          onFocus={e => e.currentTarget.style.borderColor = accent}
          onBlur={e => e.currentTarget.style.borderColor = '#e7e5e4'}
        />
      </div>

      {/* Image Upload */}
      <div>
        <label style={{ display: 'block', fontSize: 10, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 6 }}>
          Add a Photo (Optional)
        </label>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px',
          borderRadius: 7, border: '1px dashed #d6d3d1', cursor: 'pointer',
          background: '#fafaf9', transition: 'background 0.2s'
        }}>
          <ImagePlus style={{ width: 16, height: 16, color: '#a8a29e' }} />
          <span style={{ fontSize: 11, color: '#57534e' }}>{file ? file.name : 'Click to upload an image'}</span>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <button type="submit" disabled={pending}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px 0', borderRadius: 7, border: 'none',
          background: accent, color: getTextColor(accent),
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: pending ? 'wait' : 'pointer', transition: 'opacity 0.2s ease',
          opacity: pending ? 0.7 : 1, marginTop: 4
        }}
      >
        {pending && <Loader2 style={{ width: 13, height: 13, animation: 'spin 0.8s linear infinite' }} />}
        Submit Review
      </button>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProductPageClient({ product, initialWishlistState, variants, approvedReviews, categorySlug, isLoggedIn }: Props) {
  const { addToCart } = useCart();

  // ── Variant selection ──
  const uniqueMaterials = useMemo(() => [...new Set(variants.map(v => v.material || 'Standard'))], [variants]);
  const [selMat, setSelMat]   = useState(uniqueMaterials[0] || 'Standard');
  const filtered              = useMemo(() => variants.filter(v => (v.material || 'Standard') === selMat), [variants, selMat]);
  const [selColor, setSelColor] = useState(filtered[0]?.color ?? '');
  const selVariant              = variants.find(v => (v.material || 'Standard') === selMat && v.color === selColor) ?? filtered[0];

  // ── Theming ──
  const accent    = selVariant?.color_hex || '#d4871a';
  const pageBg    = getPageTint(accent, 0.975);
  const accentTint = getAccentTint(accent);
  const midTint   = getMidTint(accent);
  const textOnAccent = getTextColor(accent);

  // ── UI state ──
  const [zoomed, setZoomed]             = useState(false);
  const [showDims, setShowDims]         = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [added, setAdded]               = useState(false);
  const [imgLoaded, setImgLoaded]       = useState(false);
  const [activeTab, setActiveTab]       = useState<'description'|'specs'|'delivery'>('description');

  // ── Wishlist State ──
  const [inWishlist, setInWishlist] = useState(initialWishlistState);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const handleWishlistToggle = async () => {
    setWishlistLoading(true);
    const result = await toggleWishlist(product.id);
    if (result.success) {
      setInWishlist(result.isWishlisted ?? false);
      toast.success(result.isWishlisted ? 'Added to Wishlist' : 'Removed from Wishlist');
    } else {
      toast.error(result.error || 'You must be logged in to modify your wishlist.');
    }
    setWishlistLoading(false);
  };

  // Gallery — all variant images as thumbnails
  const gallery = useMemo(() => {
    const seen = new Set<string>();
    return filtered
      .filter(v => v.image_url && !seen.has(v.image_url) && seen.add(v.image_url))
      .map(v => ({ src: v.image_url!, variantId: v.id, color: v.color_hex || accent }));
  }, [filtered, accent]);
  const [activeGallery, setActiveGallery] = useState(0);
  const displayImage = selVariant?.image_url ?? gallery[0]?.src ?? '/placeholder.svg';

  // Switch gallery when variant changes
  useEffect(() => {
    const idx = gallery.findIndex(g => g.src === selVariant?.image_url);
    if (idx >= 0) setActiveGallery(idx);
    setImgLoaded(false);
  }, [selVariant, gallery]);

  // Specs
  const specs = useMemo(() => {
    if (!product.specifications) return {};
    if (typeof product.specifications === 'string') {
      try { return JSON.parse(product.specifications); } catch { return {}; }
    }
    return product.specifications as Record<string, string>;
  }, [product.specifications]);
  const dimensions = specs?.dimensions?.trim() || '';
  const description = product.description || '';

  // Price
  const price = product.base_price + (selVariant?.price_adjustment || 0);

  // Add to cart
  const handleAdd = useCallback(() => {
    if (!selVariant || selVariant.stock_quantity === 0) return;
    addToCart({
      variant_id: selVariant.id,
      quantity: 1,
      price,
      title: product.title,
      color: `${selVariant.color ?? ''} ${selVariant.material ?? ''}`.trim(),
      image_url: displayImage,
    });
    setAdded(true);
    toast.success(`${product.title} added to cart!`, { icon: '🛋️' });
    setTimeout(() => setAdded(false), 2000);
  }, [selVariant, price, product.title, displayImage, addToCart]);

  const handleMatChange = (mat: string) => {
    setSelMat(mat);
    const cols = variants.filter(v => (v.material || 'Standard') === mat);
    if (!cols.find(v => v.color === selColor)) setSelColor(cols[0]?.color ?? '');
  };

  const { ref: reviewsRef, visible: reviewsVisible } = useReveal();
  const outOfStock = selVariant?.stock_quantity === 0;

  // ── Helper to render the title block responsibly ──
  const renderTitleBlock = (className?: string) => (
    <div className={className} style={{ marginBottom: 16 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: accentTint, border: `1px solid ${accent}33`,
        borderRadius: 4, padding: '3px 10px', marginBottom: 10,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent }} />
        <span style={{ fontSize: 9, color: accent, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          British Handcrafted
        </span>
      </div>

      <h1 className="font-playfair" style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 700, color: '#1c1917', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 10 }}>
        {product.title}
      </h1>

      {/* Rating row */}
      {approvedReviews.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <StarRow rating={Math.round(approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length)} accent={accent} />
          <span style={{ fontSize: 11, color: '#78716c' }}>
            {(approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length).toFixed(1)} · {approvedReviews.length} {approvedReviews.length === 1 ? 'review' : 'reviews'}
          </span>
        </div>
      )}

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
        <span className="font-playfair" style={{ fontSize: 30, fontWeight: 700, color: '#1c1917', lineHeight: 1 }}>
          £{price.toFixed(0)}
        </span>
        {selVariant?.price_adjustment !== 0 && (
          <span style={{ fontSize: 12, color: '#a8a29e' }}>
            (base £{product.base_price.toFixed(0)} + variant adjustment)
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes fadeIn    { from{opacity:0}  to{opacity:1}  }
        @keyframes slideUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes imgFade   { from{opacity:0;transform:scale(1.02)} to{opacity:1;transform:scale(1)} }
        @keyframes pulseDot  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
      `}</style>

      <main style={{ minHeight: '100vh', background: pageBg, transition: 'background 0.7s cubic-bezier(.16,1,.3,1)' }}>
        
        {/* ── Breadcrumb ── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 16px 0', animation: 'slideUp 0.5s ease' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { href: '/',                    label: 'Home'         },
              { href: '/shop/all',            label: 'Shop'         },
              { href: `/shop/${categorySlug}`, label: categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1) },
            ].map(({ href, label }, i) => (
              <span key={href} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <ChevronRight style={{ width: 10, height: 10, color: '#a8a29e' }} />}
                <Link href={href} style={{ fontSize: 11, color: '#a8a29e', textDecoration: 'none', transition: 'color 0.2s' }}
                  className="hover:text-stone-700">{label}</Link>
              </span>
            ))}
            <ChevronRight style={{ width: 10, height: 10, color: '#a8a29e' }} />
            <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{product.title}</span>
          </nav>
        </div>

        {/* ── Main product grid ── */}
        <div className="px-4 pt-1 pb-10 md:pt-4" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, alignItems: 'start' }}>
          
          {/* ════ LEFT: IMAGE GALLERY ════ */}
          <div className="relative md:sticky md:top-[70px]" style={{ animation: 'slideUp 0.55s ease 0.05s both' }}>
            {renderTitleBlock('md:hidden')}
            
            <div className="aspect-square md:aspect-[4/5]" style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: accentTint, boxShadow: `0 24px 60px ${accent}22, 0 4px 16px rgba(0,0,0,0.06)`, transition: 'box-shadow 0.7s ease', cursor: 'zoom-in' }} onClick={() => setZoomed(true)}>
              <Image key={displayImage} src={displayImage} alt={product.title} fill priority sizes="(max-width:768px) 100vw, 50vw" style={{ objectFit: 'cover', animation: imgLoaded ? 'imgFade 0.5s ease' : 'none' }} onLoad={() => setImgLoaded(true)} />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, transition: 'background 0.7s ease' }} />
              <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', borderRadius: 6, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontSize: 10, letterSpacing: '0.06em' }}>
                <ZoomIn style={{ width: 11, height: 11 }} /> Zoom
              </div>
              {outOfStock && (
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(239,68,68,0.9)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 4 }}>
                  Out of Stock
                </div>
              )}
              {!outOfStock && selVariant?.stock_quantity && selVariant.stock_quantity <= 3 && (
                <div style={{ position: 'absolute', top: 12, left: 12, background: accent, color: textOnAccent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: textOnAccent, animation: 'pulseDot 1.5s infinite' }} />
                  Only {selVariant.stock_quantity} left
                </div>
              )}
            </div>

            {gallery.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {gallery.map((g, i) => (
                  <button key={g.src} onClick={() => { setActiveGallery(i); setSelColor(filtered.find(v => v.image_url === g.src)?.color ?? selColor); }} style={{ position: 'relative', width: 60, aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${activeGallery === i ? accent : 'transparent'}`, outline: 'none', padding: 0, transition: 'border-color 0.3s ease, transform 0.2s ease', transform: activeGallery === i ? 'scale(1.05)' : 'scale(1)', flexShrink: 0 }}>
                    <Image src={g.src} alt="" fill style={{ objectFit: 'cover' }} sizes="60px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ════ RIGHT: PRODUCT INFO ════ */}
          <div style={{ animation: 'slideUp 0.55s ease 0.1s both' }}>
            {renderTitleBlock('hidden md:block')}

            {/* ── Material selector ── */}
            {uniqueMaterials.length > 1 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 600, marginBottom: 8 }}>
                  Material — <span style={{ color: '#1c1917', fontWeight: 700 }}>{selMat}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {uniqueMaterials.map(m => (
                    <button key={m} onClick={() => handleMatChange(m)} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', background: selMat === m ? accent : 'white', color: selMat === m ? textOnAccent : '#57534e', border: `1.5px solid ${selMat === m ? accent : '#e7e5e4'}`, transform: selMat === m ? 'scale(1.03)' : 'scale(1)' }}>{m}</button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Color selector ── */}
            {filtered.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 600, marginBottom: 10 }}>
                  Colour — <span style={{ color: '#1c1917', fontWeight: 700 }}>{selColor || '—'}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {filtered.map(v => {
                    const hex = v.color_hex || '#e7e5e4';
                    const active = selColor === v.color;
                    return (
                      <button key={v.id} onClick={() => setSelColor(v.color ?? '')} title={v.color ?? ''} style={{ position: 'relative', width: active ? 42 : 36, height: active ? 42 : 36, borderRadius: '50%', background: hex, border: `3px solid ${active ? accent : 'transparent'}`, outline: active ? `3px solid ${accentTint}` : 'none', outlineOffset: 2, cursor: 'pointer', padding: 0, transition: 'all 0.25s cubic-bezier(.16,1,.3,1)', boxShadow: active ? `0 0 0 4px ${accent}30, 0 4px 12px ${hex}55` : `0 2px 6px ${hex}44`, transform: active ? 'scale(1.08)' : 'scale(1)' }}>
                        {active && <Check style={{ position: 'absolute', inset: 0, margin: 'auto', width: 13, height: 13, color: getTextColor(hex), filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />}
                        {v.stock_quantity === 0 && (
                          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '60%', height: 1.5, background: '#ef4444', transform: 'rotate(-45deg)' }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 8 }}>
                  {filtered.map(v => (
                    <span key={v.id} style={{ fontSize: 10, color: selColor === v.color ? accent : '#a8a29e', fontWeight: selColor === v.color ? 700 : 400, transition: 'color 0.3s' }}>
                      {v.color}{v.stock_quantity === 0 ? ' (OOS)' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tabs: Description / Specs / Delivery ── */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e7e5e4', marginBottom: 14 }}>
                {(['description','specs','delivery'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize', letterSpacing: '0.04em', background: 'none', border: 'none', cursor: 'pointer', color: activeTab === tab ? accent : '#78716c', borderBottom: `2px solid ${activeTab === tab ? accent : 'transparent'}`, marginBottom: -1, transition: 'color 0.2s ease, border-color 0.2s ease' }}>{tab}</button>
                ))}
              </div>

              {activeTab === 'description' && (
                <div>
                  <p style={{ fontSize: 12, color: '#57534e', lineHeight: 1.75, overflow: 'hidden', maxHeight: descExpanded ? 'none' : 80, transition: 'max-height 0.4s ease' }}>
                    {description || 'No description available.'}
                  </p>
                  {description.length > 200 && (
                    <button onClick={() => setDescExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: accent, fontWeight: 600, padding: 0 }}>
                      {descExpanded ? <><ChevronUp style={{ width: 13, height: 13 }} />Show less</> : <><ChevronDown style={{ width: 13, height: 13 }} />Read more</>}
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'specs' && (
                <div>
                  {Object.keys(specs).length > 0 ? (
                    Object.entries(specs).map(([k, v], i) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', fontSize: 12, borderBottom: i < Object.keys(specs).length - 1 ? '1px solid #f5f5f4' : 'none', gap: 16 }}>
                        <span style={{ color: '#a8a29e', fontWeight: 600, textTransform: 'capitalize', flexShrink: 0 }}>{k}</span>
                        <span style={{ color: '#1c1917', textAlign: 'right' }}>{String(v)}</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: 12, color: '#a8a29e' }}>No specifications available.</p>
                  )}
                </div>
              )}

              {activeTab === 'delivery' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { icon: Truck,     title: 'Free White-Glove Delivery', sub: 'On orders over £500. We set up everything and remove all packaging.' },
                    { icon: Wallet,    title: 'Cash on Delivery',          sub: 'Pay only when your sofa arrives — no upfront payment required.'       },
                    { icon: RotateCcw, title: '30-Day Home Trial',         sub: 'Not happy? Return it within 30 days, no questions asked.'             },
                    { icon: ShieldCheck, title: '10-Year Frame Guarantee', sub: 'Every sofa comes with a full structural guarantee.'                   },
                  ].map(({ icon: Icon, title, sub }) => (
                    <div key={title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0, background: accentTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon style={{ width: 14, height: 14, color: accent }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1c1917' }}>{title}</div>
                        <div style={{ fontSize: 11, color: '#78716c', lineHeight: 1.5, marginTop: 2 }}>{sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {dimensions && (
              <button onClick={() => setShowDims(true)} className="group" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 7, marginBottom: 16, background: midTint, border: `1px solid ${accent}30`, fontSize: 11, fontWeight: 600, color: accent, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <Ruler style={{ width: 13, height: 13 }} /> View Dimensions
              </button>
            )}

            {/* ── Add to cart & Wishlist ── (sticky on mobile) */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderTop: `2px solid ${accent}22`, padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center' }} className="md:hidden">
              <div>
                <div className="font-playfair" style={{ fontSize: 17, fontWeight: 700, color: '#1c1917' }}>£{price.toFixed(0)}</div>
                <div style={{ fontSize: 10, color: '#78716c' }}>{selColor} {selMat}</div>
              </div>
              
              <button onClick={handleWishlistToggle} disabled={wishlistLoading} style={{ width: 44, height: 44, borderRadius: 8, background: '#fff', border: '1px solid #e7e5e4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}>
                <Heart style={{ width: 18, height: 18, fill: inWishlist ? accent : 'transparent', color: inWishlist ? accent : '#78716c' }} />
              </button>

              <button onClick={handleAdd} disabled={outOfStock || added} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 8, border: 'none', background: added ? '#16a34a' : (outOfStock ? '#d6d3d1' : accent), color: added ? '#fff' : (outOfStock ? '#a8a29e' : textOnAccent), fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: outOfStock ? 'not-allowed' : 'pointer', transition: 'background 0.3s ease' }}>
                {added ? <><Check style={{ width: 14, height: 14 }} /> Added!</> : outOfStock ? 'Out of Stock' : <><ShoppingBag style={{ width: 14, height: 14 }} /> Add to Cart</>}
              </button>
            </div>

            {/* Desktop add-to-cart & Wishlist */}
            <div className="hidden md:block">
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleAdd} disabled={outOfStock || added} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 0', borderRadius: 10, border: 'none', background: added ? '#16a34a' : (outOfStock ? '#e7e5e4' : accent), color: added ? '#fff' : (outOfStock ? '#a8a29e' : textOnAccent), fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: outOfStock ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease', transform: added ? 'scale(0.99)' : 'scale(1)', boxShadow: outOfStock || added ? 'none' : `0 6px 24px ${accent}44` }}>
                  {added ? <><Check style={{ width: 15, height: 15 }} /> Added to Cart!</> : outOfStock ? 'Out of Stock' : <><ShoppingBag style={{ width: 15, height: 15 }} /> Add to Cart — £{price.toFixed(0)}</>}
                </button>
                
                <button onClick={handleWishlistToggle} disabled={wishlistLoading} style={{ width: 50, height: 50, borderRadius: 10, background: '#fff', border: '2px solid #e7e5e4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }} className="hover:border-stone-300">
                  <Heart style={{ width: 22, height: 22, fill: inWishlist ? accent : 'transparent', color: inWishlist ? accent : '#a8a29e', transition: 'all 0.2s' }} />
                </button>
              </div>

              {/* Trust row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, marginTop: 12, border: `1px solid ${accent}20`, borderRadius: 10, overflow: 'hidden' }}>
                {[{ icon: Truck, label: 'Free Delivery' }, { icon: Gem, label: 'COD Available' }, { icon: ShieldCheck, label: '10-Yr Guarantee' }].map(({ icon: Icon, label }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 8px', background: accentTint, transition: 'background 0.7s ease' }}>
                    <Icon style={{ width: 14, height: 14, color: accent }} />
                    <span style={{ fontSize: 9, color: '#78716c', fontWeight: 600, textAlign: 'center', letterSpacing: '0.06em' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ════ REVIEWS SECTION ════ */}
        <div ref={reviewsRef} style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 80px', opacity: reviewsVisible ? 1 : 0, transform: reviewsVisible ? 'translateY(0)' : 'translateY(30px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 32, paddingBottom: 24, borderTop: `1px solid ${accent}22` }}>
            <div>
              <div style={{ fontSize: 9, color: accent, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}>Customer Reviews</div>
              <h2 className="font-playfair" style={{ fontSize: 24, fontWeight: 700, color: '#1c1917', marginTop: 2 }}>What Our Customers Say</h2>
            </div>
            {approvedReviews.length > 0 && (
              <div style={{ marginLeft: 'auto', textAlign: 'center', background: accentTint, border: `1px solid ${accent}30`, borderRadius: 10, padding: '10px 16px' }}>
                <div className="font-playfair" style={{ fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1 }}>{(approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length).toFixed(1)}</div>
                <StarRow rating={Math.round(approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length)} size={10} accent={accent} />
                <div style={{ fontSize: 10, color: '#a8a29e', marginTop: 3 }}>{approvedReviews.length} reviews</div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {approvedReviews.length > 0 ? approvedReviews.map((r, i) => (
                <div key={r.id} style={{ background: '#fff', borderRadius: 10, padding: 16, borderLeft: `3px solid ${accent}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', animation: `slideUp 0.4s ease ${i * 60}ms both` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: accent, color: textOnAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'background 0.7s ease' }}>
                      {r.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1917' }}>{r.customer_name}</div>
                      <StarRow rating={r.rating} size={11} accent={accent} />
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#a8a29e', flexShrink: 0 }}>
                      {new Date(r.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#57534e', lineHeight: 1.7, margin: 0 }}>{r.comment}</p>
                </div>
              )) : (
                <div style={{ background: accentTint, border: `1px dashed ${accent}44`, borderRadius: 10, padding: '28px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#78716c' }}>No reviews yet. Be the first!</p>
                </div>
              )}
            </div>

            <div className="relative md:sticky" style={{ top: 80 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: 20, borderTop: `3px solid ${accent}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'border-color 0.7s ease' }}>
                <ReviewForm productId={product.id} accent={accent} accentTint={accentTint} isLoggedIn={isLoggedIn} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {zoomed && <ZoomModal src={displayImage} alt={product.title} onClose={() => setZoomed(false)} />}

      {showDims && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }} onClick={() => setShowDims(false)}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `3px solid ${accent}`, background: accentTint }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ruler style={{ width: 15, height: 15, color: accent }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1917' }}>Product Dimensions</span>
              </div>
              <button onClick={() => setShowDims(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716c' }}>
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>
            <div style={{ padding: '18px', fontSize: 13, color: '#57534e', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontWeight: 500 }}>{dimensions}</div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #f5f5f4' }}>
              <button onClick={() => setShowDims(false)} style={{ width: '100%', padding: '10px 0', borderRadius: 7, border: 'none', background: accent, color: textOnAccent, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'opacity 0.2s' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden" style={{ height: 72 }} />
    </>
  );
}