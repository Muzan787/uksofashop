import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ArrowRight, Truck, ShieldCheck, Clock } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()

  // 1. Fetch Categories for the grid
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .limit(4)

  // 2. Fetch Featured Products
  const { data: featuredProducts } = await supabase
    .from('products')
    .select(`
      id, title, slug, base_price,
      product_variants ( image_url )
    `)
    .limit(4)

  return (
    <main className="min-h-screen bg-white">
      {/* Crucial UI Rule: Small, compact promotional banner.
        This ensures it doesn't push main content below the fold on mobile.
      */}
      <div className="bg-slate-900 text-white text-center py-2 text-sm font-medium">
        Free Delivery on all UK orders over £500. <Link href="/shop/all" className="underline hover:text-gray-300">Shop Now</Link>
      </div>

      {/* Hero Section */}
      <section className="relative w-full h-[60vh] min-h-[400px] bg-gray-100 flex items-center justify-center overflow-hidden">
        {/* Replace with your actual hero image later */}
        <img 
          src="/placeholder-hero.jpg" 
          alt="Modern living room" 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto mt-10">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6">
            Design Your Perfect Living Space.
          </h1>
          <p className="text-lg md:text-xl text-slate-800 mb-8 font-medium">
            Premium, handcrafted UK sofas delivered straight to your door. Cash on delivery available.
          </p>
          <Link href="/shop/sofas" className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-slate-800 transition-transform hover:scale-105 shadow-lg">
            Shop Sofas <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-y border-gray-200 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <Truck className="w-8 h-8 text-slate-700 mb-3" />
            <h3 className="font-semibold text-slate-900">Fast UK Delivery</h3>
            <p className="text-sm text-slate-600">Delivered carefully by our team.</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-slate-700 mb-3" />
            <h3 className="font-semibold text-slate-900">5-Year Warranty</h3>
            <p className="text-sm text-slate-600">Built to last a lifetime.</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <Clock className="w-8 h-8 text-slate-700 mb-3" />
            <h3 className="font-semibold text-slate-900">Cash on Delivery</h3>
            <p className="text-sm text-slate-600">Pay only when you are satisfied.</p>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {categories?.map((category) => (
            <Link key={category.id} href={`/shop/${category.slug}`} className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
              <img 
                src={category.image_url || '/placeholder.jpg'} 
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                <h3 className="text-white font-bold text-xl capitalize">{category.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Customer Favorites</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredProducts?.map((product) => (
            <Link href={`/shop/featured/${product.slug}`} key={product.id} className="group">
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
                <img 
                  src={Array.isArray(product.product_variants) && product.product_variants.length > 0 ? product.product_variants[0].image_url : '/placeholder.jpg'} 
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 className="text-lg font-medium text-slate-900">{product.title}</h3>
              <p className="text-slate-600">£{product.base_price.toFixed(2)}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}