import Link from 'next/link';
import Image from 'next/image';
import CollectionCard from '../Product/CollectionCard';
import {
  ArrowRight, ArrowUpRight, Star, Shield, Truck,
  Gem, Phone, Package, Ruler,
} from 'lucide-react';
import { MARQUEE_ITEMS, TRUST_POINTS, PROMISES } from '@/constants/promises';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category {
  id: string; name: string; slug: string; image_url?: string;
}
interface Product {
  id: string; title: string; slug: string; base_price: number;
  average_rating?: number | null;
  review_count?: number | null;
  product_variants?: { image_url?: string }[];
  product_categories?: { categories?: { slug: string; name: string } }[];
}
interface Collection {
  id: string; name: string; slug: string; minPrice: number; maxPrice: number; images: string[];
}
interface Props { 
  categories: Category[]; 
  products: Product[]; 
  collections: Collection[]; 
}

// ─── Static data ──────────────────────────────────────────────────────────────
// Copy lives in src/constants/promises.ts; only the icons are chosen here.
// The "British Craftsmanship Since 1995" and "Handmade in Yorkshire" lines that
// were in the marquee are origin claims and belong per-range, not sitewide.
const marqueeItems = MARQUEE_ITEMS;
const GUARANTEE_ICONS = [Truck, Gem, Ruler, Shield];
const guarantees = TRUST_POINTS.map((p, i) => ({
  icon: GUARANTEE_ICONS[i] ?? Shield,
  label: p.label,
  sub: p.sub,
}));
// The hero stats ("15,000+ Happy Families", "28yr Heritage", "4.9 Star Rating")
// and three named testimonials that used to live here were invented. Removed
// rather than re-numbered: this is a new shop and real reviews come from the
// reviews table via /reviews and the product pages.

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Scroll reveal with no JavaScript. See .reveal in globals.css: the animation
 * only applies where the browser supports scroll-driven animations, and the
 * content is plainly visible everywhere else.
 *
 * Replaces a hook that created one IntersectionObserver per instance - a dozen
 * of them on this page - and rendered its children at opacity:0 until React
 * had hydrated.
 */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <div
      className={`reveal ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * The pointer-tracking tilt this card used to do has become a CSS hover lift
 * (.lift-card in globals.css, behind `@media (hover: hover)`).
 *
 * It was a useState plus an onMouseMove handler on every card, which meant six
 * pieces of React state and six listeners shipped to and hydrated on every
 * phone - where a pointer-tilt effect can never fire at all. Moving it to CSS
 * is what lets this whole page be a server component.
 */
function ProductCard({ product }: { product: Product }) {
  const image = product.product_variants?.[0]?.image_url ?? null;
  const firstCat = product.product_categories?.[0]?.categories ?? null;
  const catSlug = firstCat?.slug ?? 'all';

  return (
    <Link href={`/shop/${catSlug}/${product.slug}`} className="group block lift-card">
      <div className="relative overflow-hidden bg-stone-100 aspect-[4/3]" style={{ borderRadius: 10 }}>
        {image ? (
          <Image src={image} alt={product.title} fill sizes="(max-width:640px) 80vw, 50vw" className="object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="absolute inset-0 bg-stone-200 flex items-center justify-center"><span className="text-stone-400 text-xs">No image</span></div>
        )}
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-400" />
        <div className="absolute bottom-2 left-2 right-2 bg-white text-stone-900 text-center font-semibold opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300" style={{ padding: '7px 0', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', borderRadius: 6 }}>
          Quick View
        </div>
        {firstCat && (
          <span className="absolute top-2 left-2 bg-[#d4871a] text-white font-medium uppercase" style={{ fontSize: 8, letterSpacing: '0.15em', padding: '3px 7px', borderRadius: 4 }}>
            {firstCat.name}
          </span>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <h3 className="font-semibold text-stone-900 group-hover:text-[#d4871a] transition-colors leading-snug line-clamp-1" style={{ fontSize: 13 }}>
          {product.title}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className="font-bold text-stone-900" style={{ fontSize: 14 }}>
            £{product.base_price.toFixed(0)}
          </span>
          {/* Only shown once the product has genuine approved reviews. */}
          {(product.review_count ?? 0) > 0 && (
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-[#d4871a] text-[#d4871a]" />
              <span className="text-stone-400" style={{ fontSize: 11 }}>
                {(product.average_rating ?? 0).toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function HomeClient({ categories, products, collections }: Props) {

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
      
      {/* ══════════════════════════════════════════ HERO ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden pb-2 lg:pb-0 lg:min-h-[10vh]" style={{ background: '#0c0c0b' }}>
        <div className="absolute inset-0" style={{ opacity: 0.55 }}>
          <Image src="https://res.cloudinary.com/dmlna04yk/image/upload/v1782255182/Main-Hero-Background-Image_bzpvmg.jpg" alt="Luxury living room" fill sizes="100vw" priority className="object-cover" style={{ objectPosition: 'center 30%' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(12,12,11,0.6) 0%, rgba(12,12,11,0.35) 50%, rgba(12,12,11,0.85) 100%)' }} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none select-none">
          <span className="block font-playfair font-bold text-white leading-none tracking-tighter whitespace-nowrap" style={{ fontSize: 'clamp(70px,22vw,200px)', opacity: 0.04 }}>COMFORT</span>
        </div>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: '#d4871a' }} />

        <div className="relative top-4 max-w-6xl mx-auto px-4 sm:px-2 flex flex-col justify-end pt-2 lg:pt-0" style={{ minHeight: '8vh', paddingBottom: '32px' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-6 bg-[#d4871a]" />
            <span className="text-[#d4871a] font-medium uppercase" style={{ fontSize: 10, letterSpacing: '0.22em' }}>Cash on Delivery Available</span>
          </div>
          <h1 className="font-playfair font-bold text-white leading-none" style={{ fontSize: 'clamp(40px,10vw,80px)', letterSpacing: '-0.02em' }}>
            Where <em className="not-italic" style={{ color: '#d4871a' }}>Comfort</em><br />Meets Art.
          </h1>
          <p className="text-zinc-400 mt-3 max-w-sm leading-relaxed" style={{ fontSize: 13 }}>
            Luxury sofas for the modern home. {PROMISES.payment.short}. {PROMISES.delivery.short}.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href="/shop/all" className="group inline-flex items-center gap-2 text-white font-semibold hover:bg-[#b8721a] active:scale-95 transition-all duration-200" style={{ background: '#d4871a', padding: '11px 22px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', borderRadius: 6 }}>
              Shop Now <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/track-order" className="inline-flex items-center gap-2 text-zinc-300 font-medium hover:text-white transition-colors border border-white/15 hover:border-white/30" style={{ padding: '10px 20px', fontSize: 11, borderRadius: 6 }}>
              <Package className="w-3.5 h-3.5" /> Track Order
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ MARQUEE ══════════════════════════════════════════ */}
      <div className="overflow-hidden" style={{ background: '#d4871a', padding: '8px 0' }}>
        <div className="flex animate-marquee whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-4 text-white font-semibold uppercase" style={{ fontSize: 9, letterSpacing: '0.22em', padding: '0 20px' }}>
              {item} <span className="text-white/40">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════ GUARANTEES ══════════════════════════════════════════ */}
      <section className="bg-white" style={{ borderBottom: '1px solid #e7e5e4' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4" style={{ borderLeft: '1px solid #e7e5e4' }}>
            {guarantees.map(({ icon: Icon, label, sub }) => (
              <Reveal key={label}>
                <div className="flex items-center gap-2.5 group cursor-default tint-hover" style={{ padding: '14px 16px', borderRight: '1px solid #e7e5e4', borderBottom: '1px solid #e7e5e4' }}>
                  <Icon className="w-4 h-4 text-[#d4871a] shrink-0 group-hover:scale-110 transition-transform duration-200" />
                  <div>
                    <div className="text-stone-900 font-semibold leading-tight" style={{ fontSize: 11 }}>{label}</div>
                    <div className="text-stone-400 mt-0.5 leading-tight" style={{ fontSize: 10 }}>{sub}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ CATEGORIES ══════════════════════════════════════════ */}
      <section className="pt-2 pb-10 sm:py-10" style={{ background: '#f5f0e8' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="text-[#d4871a] font-semibold uppercase" style={{ fontSize: 9, letterSpacing: '0.22em' }}>Categories</span>
                <h2 className="font-playfair font-bold text-stone-900 mt-1" style={{ fontSize: 'clamp(22px,5vw,34px)', lineHeight: 1.1 }}>
                  Find Your Style
                </h2>
              </div>
              <Link href="/shop/all" className="inline-flex items-center gap-1 text-stone-400 hover:text-[#d4871a] transition-colors" style={{ fontSize: 11 }}>
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Reveal>

          {categories.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories[0] && (
                <Reveal>
                  <Link href={`/shop/${categories[0].slug}`} className="relative overflow-hidden group block sm:row-span-2" style={{ aspectRatio: '3/4', borderRadius: 10 }}>
                    {categories[0].image_url ? <Image src={categories[0].image_url} alt={categories[0].name} fill sizes="(max-width:640px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-600" /> : <div className="absolute inset-0 bg-stone-300" />}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 60%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-playfair font-bold text-white" style={{ fontSize: 15 }}>{categories[0].name}</h3>
                      <span className="inline-flex items-center gap-1 text-white/60 group-hover:text-[#d4871a] transition-colors mt-0.5" style={{ fontSize: 10 }}>Shop now <ArrowUpRight className="w-3 h-3" /></span>
                    </div>
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#d4871a]/50 transition-all duration-300 rounded-[10px]" />
                  </Link>
                </Reveal>
              )}
              {categories.slice(1, 6).map((cat, i) => (
                <Reveal key={cat.id} delay={i * 60}>
                  <Link href={`/shop/${cat.slug}`} className="relative overflow-hidden group block" style={{ aspectRatio: '4/3', borderRadius: 10 }}>
                    {cat.image_url ? <Image src={cat.image_url} alt={cat.name} fill sizes="(max-width:640px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-600" /> : <div className="absolute inset-0 bg-stone-300" />}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 55%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <h3 className="font-playfair font-bold text-white leading-tight" style={{ fontSize: 13 }}>{cat.name}</h3>
                      <span className="inline-flex items-center gap-0.5 text-white/50 group-hover:text-[#d4871a] transition-colors" style={{ fontSize: 9 }}>Explore <ArrowUpRight className="w-2.5 h-2.5" /></span>
                    </div>
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#d4871a]/50 transition-all duration-300 rounded-[10px]" />
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════ NEW: SHOP BY COLLECTION ══════════════════════════════════════════ */}
      {collections && collections.length > 0 && (
        <section className="py-10 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <Reveal>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <span className="text-[#d4871a] font-semibold uppercase" style={{ fontSize: 9, letterSpacing: '0.22em' }}>Complete Sets</span>
                  <h2 className="font-playfair font-bold text-stone-900 mt-1" style={{ fontSize: 'clamp(22px,5vw,34px)', lineHeight: 1.1 }}>
                    Shop by Collection
                  </h2>
                </div>
                {/* NEW: Added the link to the collections page */}
                <Link href="/collection" className="inline-flex items-center gap-1 text-stone-400 hover:text-[#d4871a] transition-colors" style={{ fontSize: 11 }}>
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </Reveal>

            {/* Horizontal scroll for mobile, Grid for Desktop */}
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {collections.map((col, i) => (
                <Reveal 
                  key={col.id} 
                  delay={i * 50} 
                  className="shrink-0 snap-start w-[80vw] sm:w-auto"
                >
                  <CollectionCard {...col} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════ CRAFT STORY ══════════════════════════════════════════ */}
      <section className="overflow-hidden" style={{ background: '#0c0c0b' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="relative" style={{ minHeight: 220 }}>
            <Image src="https://res.cloudinary.com/dmlna04yk/image/upload/v1782255171/Home-Page-Furniture-Background-Image-2_cgmd50.jpg" alt="Sofa upholstery detail" fill sizes="100vw" className="object-cover" />
            <div className="absolute top-0 bottom-0 right-0 w-0.5" style={{ background: '#d4871a' }} />
          </div>
          <Reveal className="flex flex-col justify-center" delay={100}>
            <div style={{ padding: 'clamp(24px,5vw,48px)' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="h-px w-6 bg-[#d4871a]" />
                <span className="text-[#d4871a] font-medium uppercase" style={{ fontSize: 9, letterSpacing: '0.22em' }}>Our Story</span>
              </div>
              <h2 className="font-playfair font-bold text-white leading-tight" style={{ fontSize: 'clamp(24px,5vw,42px)' }}>
                Built for Life,<br /><em className="not-italic" style={{ color: '#d4871a' }}>Not a Season.</em>
              </h2>
              <p className="text-zinc-400 mt-4 leading-relaxed" style={{ fontSize: 12 }}>
                We pick every range ourselves and stand behind it. Our fabric sofas are made to order in the UK, in your choice of colour, material and size — and whatever you buy, you pay for it only once it is standing in your living room.
              </p>
              {/* A "100% British Made / 28yr Heritage / 10yr Guarantee" strip
                  sat here. All three were invented, and the 10-year figure also
                  contradicted the 1-year guarantee claimed everywhere else. */}
              <Link href="/about" className="inline-flex items-center gap-2 text-white font-medium mt-6 group hover:text-[#d4871a] transition-colors" style={{ fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 2 }}>
                Our Story <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════ PRODUCTS ══════════════════════════════════════════ */}
      <section className="py-10 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="text-[#d4871a] font-semibold uppercase" style={{ fontSize: 9, letterSpacing: '0.22em' }}>New In</span>
                <h2 className="font-playfair font-bold text-stone-900 mt-1" style={{ fontSize: 'clamp(22px,5vw,34px)', lineHeight: 1.1 }}>
                  Latest Arrivals
                </h2>
              </div>
              <Link href="/shop/all" className="inline-flex items-center gap-1 text-stone-400 hover:text-[#d4871a] transition-colors" style={{ fontSize: 11 }}>
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Reveal>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={i * 50} className="shrink-0 snap-start w-[80vw] sm:w-[calc(50%-8px)]">
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ MOOD STRIP ══════════════════════════════════════════ */}
      <Reveal>
        <div className="relative overflow-hidden" style={{ height: 'clamp(140px,25vw,280px)' }}>
          <Image src="https://res.cloudinary.com/dmlna04yk/image/upload/v1782255172/Home-Page-Furniture-Background-Image-3_dxl0qo.avif" alt="UK Sofa Shop interior" fill sizes="100vw" className="object-cover" style={{ objectPosition: 'center 40%' }} />
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(12,12,11,0.5)' }}>
            <div className="text-center px-6">
              <p className="font-playfair italic text-white" style={{ fontSize: 'clamp(13px,3vw,26px)', letterSpacing: '-0.01em' }}>
                &quot;A home is defined by the spaces that make you feel most yourself.&quot;
              </p>
              <div className="flex items-center justify-center gap-2 mt-2" style={{ color: '#d4871a' }}>
                <div className="h-px w-6 bg-[#d4871a]" />
                <span className="font-medium uppercase" style={{ fontSize: 8, letterSpacing: '0.2em' }}>UK Sofa Shop</span>
                <div className="h-px w-6 bg-[#d4871a]" />
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* The testimonials section was removed: all three reviews in it were
          invented. Genuine reviews live at /reviews, linked from the header
          and the mobile nav. */}

      {/* ══════════════════════════════════════════ COD TRUST STRIP ══════════════════════════════════════════ */}
      <Reveal>
        <section className="py-5 bg-white" style={{ borderTop: '1px solid #e7e5e4', borderBottom: '1px solid #e7e5e4' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center shrink-0 bg-[#d4871a] text-white font-bold font-playfair" style={{ width: 40, height: 40, fontSize: 10, textAlign: 'center', lineHeight: 1.2, borderRadius: 6 }}>COD</div>
                <div>
                  <div className="font-bold text-stone-900" style={{ fontSize: 13 }}>Cash on Delivery Available</div>
                  <div className="text-stone-400 mt-0.5" style={{ fontSize: 11 }}>Pay when your sofa arrives — no upfront payment needed.</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {[[Shield, PROMISES.guarantee.label], [Truck, PROMISES.delivery.label], [Gem, PROMISES.payment.label]].map(([Icon, lbl]) => (
                  <div key={lbl as string} className="flex items-center gap-1.5 text-stone-400" style={{ fontSize: 11 }}>
                    {/* @ts-expect-error */}
                    <Icon className="w-3.5 h-3.5 text-[#d4871a]" />{lbl as string}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ══════════════════════════════════════════ FINAL CTA ══════════════════════════════════════════ */}
      <section className="relative py-20 overflow-hidden" style={{ background: '#0c0c0b' }}>
        <div className="absolute inset-0">
          <Image src="https://res.cloudinary.com/dmlna04yk/image/upload/v1782255178/Home-Page-Furniture-Background-Image-4_j5camh.jpg" alt="Luxury living room" fill sizes="100vw" className="object-cover" style={{ opacity: 0.12 }} />
        </div>
        <div className="absolute bottom-0 right-0 overflow-hidden pointer-events-none select-none">
          <span className="block font-playfair font-bold text-white leading-none tracking-tighter whitespace-nowrap" style={{ fontSize: 'clamp(70px,18vw,200px)', opacity: 0.03, paddingRight: 24 }}>LUXE</span>
        </div>

        <Reveal>
          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-10 bg-[#d4871a]" />
              <span className="text-[#d4871a] font-medium uppercase" style={{ fontSize: 9, letterSpacing: '0.25em' }}>Ready to Begin?</span>
              <div className="h-px w-10 bg-[#d4871a]" />
            </div>
            <h2 className="font-playfair font-bold text-white" style={{ fontSize: 'clamp(34px,7vw,68px)', lineHeight: 0.95, letterSpacing: '-0.02em' }}>
              Your Perfect<br /><em className="not-italic" style={{ color: '#d4871a' }}>Sofa</em> Awaits.
            </h2>
            <p className="text-zinc-500 mt-4" style={{ fontSize: 12 }}>
              {PROMISES.payment.short} · {PROMISES.delivery.short} · {PROMISES.guarantee.short}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link href="/shop/all" className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white font-semibold hover:bg-[#b8721a] active:scale-95 transition-all duration-200" style={{ background: '#d4871a', padding: '12px 28px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', borderRadius: 6 }}>
                Shop the Collection <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/contact" className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white font-medium hover:text-[#d4871a] hover:border-[#d4871a]/50 transition-all duration-200" style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '11px 24px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 6 }}>
                <Phone className="w-3.5 h-3.5" /> Speak to an Expert
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════ WHATSAPP FAB ══════════════════════════════════════════ */}
      <a href="https://wa.me/447476616022?text=I%20have%20a%20question%20about%20your%20sofas" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-[80px] lg:bottom-5 right-4 z-50 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform duration-200" style={{ width: 46, height: 46, borderRadius: '50%', background: '#25D366' }}>
        <span className="absolute inset-0 rounded-full animate-ping" style={{ background: '#25D366', opacity: 0.3 }} />
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white relative">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

    </div>
  );
}