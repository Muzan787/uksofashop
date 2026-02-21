// src/app/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Truck, Shield, RotateCcw, Star, Zap } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

const categoryHighlights = [
  { name: 'Corner Sofas', slug: 'sofas?style=corner', img: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg' },
  { name: '3 Seater Sofas', slug: 'sofas?dimensions=3-seater', img: 'https://images.pexels.com/photos/276528/pexels-photo-276528.jpeg' },
  { name: 'Beds', slug: 'beds', img: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg' },
  { name: 'Dining', slug: 'dining', img: 'https://images.pexels.com/photos/1395967/pexels-photo-1395967.jpeg' },
  { name: 'Chairs', slug: 'chairs', img: 'https://images.pexels.com/photos/116910/pexels-photo-116910.jpeg' },
  { name: 'Storage', slug: 'storage', img: 'https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg' },
];

const perks = [
  { icon: Truck, title: 'Free Delivery', desc: 'On all orders over £500' },
  { icon: Shield, title: '10 Year Guarantee', desc: 'On all frames & springs' },
  { icon: RotateCcw, title: 'Easy Returns', desc: '30-day no-quibble policy' },
  { icon: Zap, title: 'Cash on Delivery', desc: 'Pay when it arrives' },
];

export default async function HomePage() {
  const supabase = await createClient(); // Our secure backend fetch!
  
  const { data: featuredProducts } = await supabase
    .from('products')
    .select('*, product_variants(image_url), categories(slug)')
    .limit(8);

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-stone-900 text-white">
        <div className="absolute inset-0">
          <Image
            src="https://images.pexels.com/photos/1571452/pexels-photo-1571452.jpeg"
            alt="Luxury living room"
            fill
            priority
            className="object-cover opacity-40"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 bg-amber-600/20 border border-amber-500/40 text-amber-400 text-xs font-semibold uppercase tracking-wider rounded-full mb-4">
              New Season Collection
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Furniture That<br />
              <span className="text-amber-400">Feels Like Home</span>
            </h1>
            <p className="mt-5 text-lg text-stone-300 leading-relaxed max-w-xl">
              Discover our curated range of premium British furniture. From luxurious corner sofas to elegant dining sets — crafted for comfort, built to last.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/shop/sofas" className="inline-flex items-center gap-2 px-7 py-3.5 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 transition-colors">
                Shop Sofas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Perks Section */}
      <section className="bg-stone-50 border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {perks.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800">{title}</p>
                  <p className="text-xs text-stone-500 hidden sm:block">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">Shop by Category</h2>
            <p className="text-stone-500 mt-1 text-sm">Find exactly what you are looking for</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categoryHighlights.map((cat) => (
            <Link key={cat.slug} href={`/shop/${cat.slug}`} className="group relative overflow-hidden rounded-2xl aspect-square bg-stone-100">
              <Image src={cat.img} alt={cat.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <span className="absolute bottom-3 left-3 right-3 text-white text-sm font-semibold leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products (Dynamic from Supabase!) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">Featured Products</h2>
            <p className="text-stone-500 mt-1 text-sm">Our most popular picks this season</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {featuredProducts?.map((product) => {
            const displayImage = Array.isArray(product.product_variants) && product.product_variants.length > 0 
              ? product.product_variants[0].image_url 
              : '/placeholder-sofa.jpg';
              
            // Safely extract category slug
            const categorySlug = product.categories && !Array.isArray(product.categories) 
              ? product.categories.slug 
              : 'all';

            return (
              <Link key={product.id} href={`/shop/${categorySlug}/${product.slug}`} className="group block">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-100 mb-3">
                  <img src={displayImage || ''} alt={product.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h3 className="font-semibold text-stone-900 line-clamp-1">{product.title}</h3>
                <p className="text-amber-700 font-medium mt-1">£{product.base_price.toFixed(2)}</p>
              </Link>
            )
          })}
        </div>
      </section>
    </>
  );
}