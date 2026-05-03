'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, ArrowUpRight, Star, Shield, Truck,
  RotateCcw, Gem, Phone, Package, ChevronRight,
  ChevronLeft, Quote,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category {
  id: string; name: string; slug: string; image_url?: string;
}
interface Product {
  id: string; title: string; slug: string; base_price: number;
  product_variants?: { image_url?: string }[];
  product_categories?: { categories?: { slug: string; name: string } }[];
}
interface Props { categories: Category[]; products: Product[]; }

// ─── Static data ──────────────────────────────────────────────────────────────
const marqueeItems = [
  'British Craftsmanship Since 1995',
  'Free White-Glove Delivery Over £500',
  '30-Day Home Trial',
  'Cash on Delivery Available',
  '10-Year Frame Guarantee',
  'Handmade in Yorkshire',
];
const guarantees = [
  { icon: Truck,     label: 'Free Delivery',    sub: 'Orders over £500'     },
  { icon: Shield,    label: '10-Yr Guarantee',  sub: 'Lifetime frame'       },
  { icon: RotateCcw, label: '30-Day Trial',     sub: 'Love it or return it' },
  { icon: Gem,       label: 'British Made',     sub: 'Handmade Yorkshire'   },
];
const heroStats = [
  { end: 15000, suffix: '+', label: 'Happy Families' },
  { end: 28,    suffix: 'yr', label: 'Heritage'      },
  { end: 4.9,   suffix: '',  label: 'Star Rating',  decimal: true },
];
const testimonials = [
  { name: 'Sarah T.', loc: 'Manchester', rating: 5, purchase: 'Harrington Corner',
    text: 'The quality is absolutely exceptional. My new corner sofa transformed our living space entirely.' },
  { name: 'James W.', loc: 'Birmingham', rating: 5, purchase: 'Mayfair Chesterfield',
    text: 'White-glove delivery was impeccable. They set everything up and removed all the packaging.' },
  { name: 'Emma D.', loc: 'London', rating: 5, purchase: 'Belgravia Recliner',
    text: 'The 30-day home trial gave us complete peace of mind. Even more comfortable than we imagined.' },
];

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCounter(end: number, decimal = false, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const dur = 1400;
    const steps = 60;
    const inc = end / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + inc, end);
      setVal(decimal ? Math.round(cur * 10) / 10 : Math.floor(cur));
      if (cur >= end) clearInterval(t);
    }, dur / steps);
    return () => clearInterval(t);
  }, [active, end, decimal]);
  return val;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Wraps children; fades + slides up when scrolled into view */
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Animated counter cell */
function StatCell({ end, suffix, label, decimal, active }: {
  end: number; suffix: string; label: string; decimal?: boolean; active: boolean;
}) {
  const val = useCounter(end, decimal, active);
  return (
    <div className="text-center">
      <div className="font-playfair font-bold text-white" style={{ fontSize: 22 }}>
        {decimal ? val.toFixed(1) : val.toLocaleString()}{suffix}
      </div>
      <div className="text-zinc-500 mt-0.5 uppercase" style={{ fontSize: 9, letterSpacing: '0.18em' }}>
        {label}
      </div>
    </div>
  );
}

/** Single product card with 3-D tilt on hover */
function ProductCard({ product }: { product: Product }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });

  const image = product.product_variants?.[0]?.image_url ?? null;
  const firstCat = product.product_categories?.[0]?.categories ?? null;
  const catSlug = firstCat?.slug ?? 'all';

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 14;
    const y = ((e.clientY - r.top)  / r.height - 0.5) * -14;
    setTilt({ x, y, active: true });
  }, []);

  return (
    <Link
      ref={cardRef}
      href={`/shop/${catSlug}/${product.slug}`}
      className="group block"
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0, active: false })}
      style={{
        transform: tilt.active
          ? `perspective(600px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(1.02)`
          : 'perspective(600px) rotateY(0) rotateX(0) scale(1)',
        transition: tilt.active ? 'transform 0.1s ease' : 'transform 0.5s cubic-bezier(.16,1,.3,1)',
        willChange: 'transform',
      }}
    >
      {/* Image */}
      <div
        className="relative overflow-hidden bg-stone-100"
        style={{ aspectRatio: '3/4', borderRadius: 10 }}
      >
        {image ? (
          <Image
            src={image} alt={product.title} fill sizes="(max-width:640px) 50vw, 25vw"
            className="object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-stone-200 flex items-center justify-center">
            <span className="text-stone-400 text-xs">No image</span>
          </div>
        )}
        {/* Dark overlay on hover */}
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-400" />

        {/* Quick view pill */}
        <div
          className="absolute bottom-2 left-2 right-2 bg-white text-stone-900 text-center font-semibold
                     opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0
                     transition-all duration-300"
          style={{ padding: '7px 0', fontSize: 10, letterSpacing: '0.12em',
                   textTransform: 'uppercase', borderRadius: 6 }}
        >
          Quick View
        </div>

        {/* Category tag */}
        {firstCat && (
          <span
            className="absolute top-2 left-2 bg-[#d4871a] text-white font-medium uppercase"
            style={{ fontSize: 8, letterSpacing: '0.15em', padding: '3px 7px', borderRadius: 4 }}
          >
            {firstCat.name}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 px-0.5">
        <h3
          className="font-semibold text-stone-900 group-hover:text-[#d4871a] transition-colors leading-snug line-clamp-1"
          style={{ fontSize: 13 }}
        >
          {product.title}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className="font-bold text-stone-900" style={{ fontSize: 14 }}>
            £{product.base_price.toFixed(0)}
          </span>
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-[#d4871a] text-[#d4871a]" />
            <span className="text-stone-400" style={{ fontSize: 11 }}>4.9</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Testimonial carousel (mobile swipeable, desktop static) */
function TestimonialsCarousel() {
  const [active, setActive] = useState(0);
  const total = testimonials.length;
  const prev = () => setActive(i => (i - 1 + total) % total);
  const next = () => setActive(i => (i + 1) % total);

  return (
    <div>
      {/* Cards */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="w-full shrink-0"
              style={{ padding: '0 0' }}
            >
              <div
                className="bg-white mx-1"
                style={{
                  borderTop: '2px solid #d4871a',
                  borderRadius: '0 0 10px 10px',
                  padding: '18px 16px',
                }}
              >
                <Quote className="w-5 h-5 text-[#d4871a] mb-2" />
                <p className="font-playfair italic text-stone-600 leading-relaxed" style={{ fontSize: 13 }}>
                  "{t.text}"
                </p>
                <div className="flex gap-0.5 mt-3 mb-2">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-[#d4871a] text-[#d4871a]" />
                  ))}
                </div>
                <div className="font-semibold text-stone-900" style={{ fontSize: 12 }}>{t.name}</div>
                <div className="text-stone-400" style={{ fontSize: 11 }}>{t.loc} · {t.purchase}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={prev}
          className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center
                     hover:border-[#d4871a] hover:text-[#d4871a] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {testimonials.map((_, i) => (
          <button
            key={i} onClick={() => setActive(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === active ? 20 : 6,
              height: 6,
              background: i === active ? '#d4871a' : '#d6d3d1',
            }}
          />
        ))}
        <button
          onClick={next}
          className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center
                     hover:border-[#d4871a] hover:text-[#d4871a] transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function HomeClient({ categories, products }: Props) {
  // Hero stats counter trigger
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsActive, setStatsActive] = useState(false);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStatsActive(true); obs.disconnect(); } },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Hero entrance animation state
  const [heroIn, setHeroIn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setHeroIn(true), 80); return () => clearTimeout(t); }, []);

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: '88vh', background: '#0c0c0b' }}>

        {/* Background photo */}
        <div className="absolute inset-0" style={{ opacity: 0.55 }}>
          <Image
            src="https://images.pexels.com/photos/1571452/pexels-photo-1571452.jpeg"
            alt="Luxury living room"
            fill priority
            className="object-cover"
            style={{ objectPosition: 'center 30%' }}
          />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(12,12,11,0.6) 0%, rgba(12,12,11,0.35) 50%, rgba(12,12,11,0.85) 100%)' }} />
        </div>

        {/* Ghost word */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none select-none">
          <span className="block font-playfair font-bold text-white leading-none tracking-tighter whitespace-nowrap"
            style={{ fontSize: 'clamp(70px,22vw,200px)', opacity: 0.04 }}>
            COMFORT
          </span>
        </div>

        {/* Amber accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: '#d4871a' }} />

        {/* Content */}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 flex flex-col justify-end"
          style={{ minHeight: '88vh', paddingBottom: '10vw' }}>

          {/* Eyebrow */}
          <div
            className="flex items-center gap-2 mb-4"
            style={{
              opacity: heroIn ? 1 : 0,
              transform: heroIn ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.7s ease 0.1s',
            }}
          >
            <div className="h-px w-6 bg-[#d4871a]" />
            <span className="text-[#d4871a] font-medium uppercase"
              style={{ fontSize: 10, letterSpacing: '0.22em' }}>
              British Luxury Since 1995
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-playfair font-bold text-white leading-none"
            style={{
              fontSize: 'clamp(40px,10vw,80px)',
              letterSpacing: '-0.02em',
              opacity: heroIn ? 1 : 0,
              transform: heroIn ? 'translateY(0)' : 'translateY(24px)',
              transition: 'all 0.7s ease 0.2s',
            }}
          >
            Where <em className="not-italic" style={{ color: '#d4871a' }}>Comfort</em><br />
            Meets Art.
          </h1>

          {/* Sub */}
          <p
            className="text-zinc-400 mt-3 max-w-sm leading-relaxed"
            style={{
              fontSize: 13,
              opacity: heroIn ? 1 : 0,
              transform: heroIn ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.7s ease 0.35s',
            }}
          >
            Handcrafted luxury sofas for the modern British home.
            Cash on delivery. Free white-glove setup.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-wrap gap-3 mt-5"
            style={{
              opacity: heroIn ? 1 : 0,
              transform: heroIn ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.7s ease 0.45s',
            }}
          >
            <Link href="/shop/all"
              className="group inline-flex items-center gap-2 text-white font-semibold
                         hover:bg-[#b8721a] active:scale-95 transition-all duration-200"
              style={{ background: '#d4871a', padding: '11px 22px', fontSize: 11,
                       letterSpacing: '0.12em', textTransform: 'uppercase', borderRadius: 6 }}
            >
              Shop Now
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/track-order"
              className="inline-flex items-center gap-2 text-zinc-300 font-medium
                         hover:text-white transition-colors border border-white/15 hover:border-white/30"
              style={{ padding: '10px 20px', fontSize: 11, borderRadius: 6 }}
            >
              <Package className="w-3.5 h-3.5" />
              Track Order
            </Link>
          </div>

          {/* Stats */}
          <div
            ref={statsRef}
            className="grid grid-cols-3 gap-4 mt-8 pt-6"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              maxWidth: 320,
              opacity: heroIn ? 1 : 0,
              transition: 'opacity 0.7s ease 0.6s',
            }}
          >
            {heroStats.map((s) => (
              <StatCell key={s.label} {...s} active={statsActive} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          MARQUEE
      ══════════════════════════════════════════ */}
      <div className="overflow-hidden" style={{ background: '#d4871a', padding: '8px 0' }}>
        <div className="flex animate-marquee whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-4 text-white font-semibold uppercase"
              style={{ fontSize: 9, letterSpacing: '0.22em', padding: '0 20px' }}>
              {item}
              <span className="text-white/40">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          GUARANTEES
      ══════════════════════════════════════════ */}
      <section className="bg-white" style={{ borderBottom: '1px solid #e7e5e4' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4" style={{ borderLeft: '1px solid #e7e5e4' }}>
            {guarantees.map(({ icon: Icon, label, sub }) => (
              <Reveal key={label}>
                <div className="flex items-center gap-2.5 group cursor-default"
                  style={{ padding: '14px 16px', borderRight: '1px solid #e7e5e4',
                           borderBottom: '1px solid #e7e5e4', transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef9f0'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                >
                  <Icon className="w-4 h-4 text-[#d4871a] shrink-0
                                   group-hover:scale-110 transition-transform duration-200" />
                  <div>
                    <div className="text-stone-900 font-semibold leading-tight" style={{ fontSize: 11 }}>
                      {label}
                    </div>
                    <div className="text-stone-400 mt-0.5 leading-tight" style={{ fontSize: 10 }}>
                      {sub}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CATEGORIES
      ══════════════════════════════════════════ */}
      <section className="py-10" style={{ background: '#f5f0e8' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          <Reveal>
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="text-[#d4871a] font-semibold uppercase"
                  style={{ fontSize: 9, letterSpacing: '0.22em' }}>Collections</span>
                <h2 className="font-playfair font-bold text-stone-900 mt-1"
                  style={{ fontSize: 'clamp(22px,5vw,34px)', lineHeight: 1.1 }}>
                  Find Your Style
                </h2>
              </div>
              <Link href="/shop/all"
                className="inline-flex items-center gap-1 text-stone-400 hover:text-[#d4871a] transition-colors"
                style={{ fontSize: 11 }}>
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Reveal>

          {/* Mosaic */}
          {categories.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* First category — tall */}
              {categories[0] && (
                <Reveal>
                  <Link href={`/shop/${categories[0].slug}`}
                    className="relative overflow-hidden group block sm:row-span-2"
                    style={{ aspectRatio: '3/4', borderRadius: 10 }}
                  >
                    {categories[0].image_url ? (
                      <Image src={categories[0].image_url} alt={categories[0].name}
                        fill className="object-cover group-hover:scale-105 transition-transform duration-600" />
                    ) : <div className="absolute inset-0 bg-stone-300" />}
                    <div className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 60%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-playfair font-bold text-white" style={{ fontSize: 15 }}>
                        {categories[0].name}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-white/60
                                       group-hover:text-[#d4871a] transition-colors mt-0.5"
                        style={{ fontSize: 10 }}>
                        Shop now <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                    {/* Hover border */}
                    <div className="absolute inset-0 border-2 border-transparent
                                   group-hover:border-[#d4871a]/50 transition-all duration-300 rounded-[10px]" />
                  </Link>
                </Reveal>
              )}

              {/* Rest */}
              {categories.slice(1, 6).map((cat, i) => (
                <Reveal key={cat.id} delay={i * 60}>
                  <Link href={`/shop/${cat.slug}`}
                    className="relative overflow-hidden group block"
                    style={{ aspectRatio: '4/3', borderRadius: 10 }}
                  >
                    {cat.image_url ? (
                      <Image src={cat.image_url} alt={cat.name} fill
                        className="object-cover group-hover:scale-105 transition-transform duration-600" />
                    ) : <div className="absolute inset-0 bg-stone-300" />}
                    <div className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 55%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <h3 className="font-playfair font-bold text-white leading-tight" style={{ fontSize: 13 }}>
                        {cat.name}
                      </h3>
                      <span className="inline-flex items-center gap-0.5 text-white/50
                                       group-hover:text-[#d4871a] transition-colors"
                        style={{ fontSize: 9 }}>
                        Explore <ArrowUpRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <div className="absolute inset-0 border-2 border-transparent
                                   group-hover:border-[#d4871a]/50 transition-all duration-300 rounded-[10px]" />
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CRAFT STORY
      ══════════════════════════════════════════ */}
      <section className="overflow-hidden" style={{ background: '#0c0c0b' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Photo */}
          <div className="relative" style={{ minHeight: 220 }}>
            <Image
              src="https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg"
              alt="Yorkshire workshop craftsmanship" fill
              className="object-cover"
            />
            <div className="absolute top-0 bottom-0 right-0 w-0.5" style={{ background: '#d4871a' }} />
          </div>

          {/* Text */}
          <Reveal className="flex flex-col justify-center" delay={100}>
            <div style={{ padding: 'clamp(24px,5vw,48px)' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="h-px w-6 bg-[#d4871a]" />
                <span className="text-[#d4871a] font-medium uppercase"
                  style={{ fontSize: 9, letterSpacing: '0.22em' }}>Our Story</span>
              </div>
              <h2 className="font-playfair font-bold text-white leading-tight"
                style={{ fontSize: 'clamp(24px,5vw,42px)' }}>
                Handcrafted for Life,<br />
                <em className="not-italic" style={{ color: '#d4871a' }}>Not a Season.</em>
              </h2>
              <p className="text-zinc-400 mt-4 leading-relaxed" style={{ fontSize: 12 }}>
                Every sofa begins with seasoned British hardwood. Our Yorkshire craftsmen use
                joinery techniques refined over three generations — no shortcuts, no compromises.
              </p>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                {[['100%','British Made'],['28yr','Heritage'],['10yr','Guarantee']].map(([n, l]) => (
                  <div key={l}>
                    <div className="font-playfair font-bold" style={{ fontSize: 20, color: '#d4871a' }}>{n}</div>
                    <div className="text-zinc-500 uppercase mt-0.5" style={{ fontSize: 9, letterSpacing: '0.14em' }}>{l}</div>
                  </div>
                ))}
              </div>
              <Link href="/about"
                className="inline-flex items-center gap-2 text-white font-medium mt-6 group
                           hover:text-[#d4871a] transition-colors"
                style={{ fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 2 }}>
                Our Story <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PRODUCTS
      ══════════════════════════════════════════ */}
      <section className="py-10 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          <Reveal>
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="text-[#d4871a] font-semibold uppercase"
                  style={{ fontSize: 9, letterSpacing: '0.22em' }}>New In</span>
                <h2 className="font-playfair font-bold text-stone-900 mt-1"
                  style={{ fontSize: 'clamp(22px,5vw,34px)', lineHeight: 1.1 }}>
                  Latest Arrivals
                </h2>
              </div>
              <Link href="/shop/all"
                className="inline-flex items-center gap-1 text-stone-400 hover:text-[#d4871a] transition-colors"
                style={{ fontSize: 11 }}>
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={i * 50}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          MOOD STRIP
      ══════════════════════════════════════════ */}
      <Reveal>
        <div className="relative overflow-hidden" style={{ height: 'clamp(140px,25vw,280px)' }}>
          <Image
            src="https://images.pexels.com/photos/1571459/pexels-photo-1571459.jpeg"
            alt="UK Sofa Shop interior" fill
            className="object-cover" style={{ objectPosition: 'center 40%' }}
          />
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(12,12,11,0.5)' }}>
            <div className="text-center px-6">
              <p className="font-playfair italic text-white"
                style={{ fontSize: 'clamp(13px,3vw,26px)', letterSpacing: '-0.01em' }}>
                "A home is defined by the spaces that make you feel most yourself."
              </p>
              <div className="flex items-center justify-center gap-2 mt-2" style={{ color: '#d4871a' }}>
                <div className="h-px w-6 bg-[#d4871a]" />
                <span className="font-medium uppercase" style={{ fontSize: 8, letterSpacing: '0.2em' }}>
                  UK Sofa Shop
                </span>
                <div className="h-px w-6 bg-[#d4871a]" />
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ══════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════ */}
      <section className="py-10" style={{ background: '#f5f0e8' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          <Reveal>
            <div className="text-center mb-7">
              <span className="text-[#d4871a] font-semibold uppercase"
                style={{ fontSize: 9, letterSpacing: '0.22em' }}>Reviews</span>
              <h2 className="font-playfair font-bold text-stone-900 mt-1"
                style={{ fontSize: 'clamp(22px,5vw,34px)', lineHeight: 1.1 }}>
                What Customers Say
              </h2>
            </div>
          </Reveal>

          {/* Mobile: carousel | Desktop: 3-col grid */}
          <div className="sm:hidden">
            <TestimonialsCarousel />
          </div>

          <div className="hidden sm:grid sm:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <div className="bg-white h-full flex flex-col"
                  style={{ borderTop: '2px solid #d4871a', borderRadius: '0 0 8px 8px', padding: '16px' }}>
                  <Quote className="w-4 h-4 text-[#d4871a] mb-2" />
                  <p className="font-playfair italic text-stone-600 leading-relaxed flex-1"
                    style={{ fontSize: 12 }}>
                    "{t.text}"
                  </p>
                  <div className="flex gap-0.5 mt-3 mb-2">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-[#d4871a] text-[#d4871a]" />
                    ))}
                  </div>
                  <div className="font-semibold text-stone-900" style={{ fontSize: 11 }}>{t.name}</div>
                  <div className="text-stone-400" style={{ fontSize: 10 }}>{t.loc} · {t.purchase}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          COD TRUST STRIP
      ══════════════════════════════════════════ */}
      <Reveal>
        <section className="py-5 bg-white" style={{ borderTop: '1px solid #e7e5e4', borderBottom: '1px solid #e7e5e4' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center shrink-0 bg-[#d4871a] text-white font-bold font-playfair"
                  style={{ width: 40, height: 40, fontSize: 10, textAlign: 'center', lineHeight: 1.2, borderRadius: 6 }}>
                  COD
                </div>
                <div>
                  <div className="font-bold text-stone-900" style={{ fontSize: 13 }}>Cash on Delivery Available</div>
                  <div className="text-stone-400 mt-0.5" style={{ fontSize: 11 }}>
                    Pay when your sofa arrives — no upfront payment needed.
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {[[Shield,'10-Yr Guarantee'],[Truck,'Free Delivery'],[RotateCcw,'30-Day Returns']].map(([Icon, lbl]) => (
                  <div key={lbl as string} className="flex items-center gap-1.5 text-stone-400" style={{ fontSize: 11 }}>
                    {/* @ts-ignore */}
                    <Icon className="w-3.5 h-3.5 text-[#d4871a]" />
                    {lbl as string}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ══════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════ */}
      <section className="relative py-20 overflow-hidden" style={{ background: '#0c0c0b' }}>
        <div className="absolute inset-0">
          <Image
            src="https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg"
            alt="Luxury living room" fill className="object-cover" style={{ opacity: 0.12 }}
          />
        </div>
        {/* Ghost word */}
        <div className="absolute bottom-0 right-0 overflow-hidden pointer-events-none select-none">
          <span className="block font-playfair font-bold text-white leading-none tracking-tighter whitespace-nowrap"
            style={{ fontSize: 'clamp(70px,18vw,200px)', opacity: 0.03, paddingRight: 24 }}>
            LUXE
          </span>
        </div>

        <Reveal>
          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-10 bg-[#d4871a]" />
              <span className="text-[#d4871a] font-medium uppercase"
                style={{ fontSize: 9, letterSpacing: '0.25em' }}>Ready to Begin?</span>
              <div className="h-px w-10 bg-[#d4871a]" />
            </div>

            <h2 className="font-playfair font-bold text-white"
              style={{ fontSize: 'clamp(34px,7vw,68px)', lineHeight: 0.95, letterSpacing: '-0.02em' }}>
              Your Perfect<br />
              <em className="not-italic" style={{ color: '#d4871a' }}>Sofa</em> Awaits.
            </h2>

            <p className="text-zinc-500 mt-4" style={{ fontSize: 12 }}>
              Cash on Delivery · Free White-Glove Setup · 30-Day Home Trial
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link href="/shop/all"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2
                           text-white font-semibold hover:bg-[#b8721a] active:scale-95 transition-all duration-200"
                style={{ background: '#d4871a', padding: '12px 28px', fontSize: 11,
                         letterSpacing: '0.12em', textTransform: 'uppercase', borderRadius: 6 }}>
                Shop the Collection
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/contact"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2
                           text-white font-medium hover:text-[#d4871a] hover:border-[#d4871a]/50
                           transition-all duration-200"
                style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '11px 24px',
                         fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 6 }}>
                <Phone className="w-3.5 h-3.5" />
                Speak to an Expert
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════
          WHATSAPP FAB
      ══════════════════════════════════════════ */}
      <a
        href="https://wa.me/447476616022"
        target="_blank" rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-4 z-50 flex items-center justify-center shadow-xl
                   hover:scale-110 active:scale-95 transition-transform duration-200"
        style={{ width: 46, height: 46, borderRadius: '50%', background: '#25D366' }}
      >
        {/* Ping ring */}
        <span className="absolute inset-0 rounded-full animate-ping"
          style={{ background: '#25D366', opacity: 0.3 }} />
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white relative">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

    </div>
  );
}