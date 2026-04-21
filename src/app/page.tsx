// src/app/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, 
  Truck, 
  Shield, 
  RotateCcw, 
  Zap, 
  Star, 
  Sparkles,
  Award,
  Clock,
  Users,
  ChevronRight,
  Heart,
  Sofa,
  Palette,
  Ruler,
  ThumbsUp,
  Play,
  CheckCircle,
  Calendar,
  Gem,
  Feather,
  Wind,
  Leaf,
  Instagram
} from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

const perks = [
  { 
    icon: Truck, 
    title: 'Free White-Glove Delivery', 
    desc: 'On orders over £500',
    gradient: 'from-blue-500 to-cyan-500',
    detail: 'Professional setup included'
  },
  { 
    icon: Shield, 
    title: 'Lifetime Frame Guarantee', 
    desc: 'Built to last generations',
    gradient: 'from-green-500 to-emerald-500',
    detail: 'Hardwood construction'
  },
  { 
    icon: RotateCcw, 
    title: '30-Day Home Trial', 
    desc: 'Love it or return it',
    gradient: 'from-purple-500 to-pink-500',
    detail: 'No questions asked'
  },
  { 
    icon: Gem, 
    title: 'British Craftsmanship', 
    desc: 'Handmade in Yorkshire',
    gradient: 'from-amber-500 to-orange-500',
    detail: 'Since 1995'
  },
];

const testimonials = [
  {
    name: "Sarah Thompson",
    location: "Manchester",
    rating: 5,
    comment: "The quality is absolutely exceptional. My new corner sofa has transformed our living space. Worth every penny.",
    image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
    purchase: "Harrington Corner Sofa"
  },
  {
    name: "James Wilson",
    location: "Birmingham",
    rating: 5,
    comment: "The white-glove delivery service was impeccable. They set everything up and even removed the packaging.",
    image: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg",
    purchase: "Mayfair Chesterfield"
  },
  {
    name: "Emma Davies",
    location: "London",
    rating: 5,
    comment: "Having a 30-day home trial gave us complete peace of mind. The sofa is even more comfortable than we imagined.",
    image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg",
    purchase: "Belgravia Recliner"
  }
];

const features = [
  {
    icon: Feather,
    title: "Premium Materials",
    desc: "Top-grain leather and performance fabrics"
  },
  {
    icon: Wind,
    title: "Eco-Friendly",
    desc: "Sustainable sourcing and production"
  },
  {
    icon: Ruler,
    title: "Bespoke Options",
    desc: "Custom sizes and configurations"
  },
  {
    icon: Palette,
    title: "100+ Fabrics",
    desc: "Endless customization possibilities"
  }
];

export default async function HomePage() {
  const supabase = await createClient();
  
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')
    .limit(6);

  const { data: featuredProducts } = await supabase
    .from('products')
    .select('*, product_variants(image_url), categories(slug, name)')
    .order('created_at', { ascending: false })
    .eq('is_active', true)
    .limit(8);

  return (
    <>
      {/* Hero Section - Cinematic Experience */}
      <section className="relative h-[600px] md:h-[700px] lg:h-[750px] overflow-hidden">
        {/* Background Video/Image with Parallax */}
        <div className="absolute inset-0">
          <Image
            src="https://images.pexels.com/photos/1571452/pexels-photo-1571452.jpeg"
            alt="Luxury living room with sofa"
            fill
            priority
            className="object-cover scale-110 animate-slow-zoom"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-transparent" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
        </div>

        {/* Animated Orbs - Background only */}
        <div className="absolute top-10 right-10 lg:top-20 lg:right-20 w-48 h-48 lg:w-96 lg:h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
        <div className="absolute bottom-10 left-10 lg:bottom-20 lg:left-20 w-64 h-64 lg:w-[500px] lg:h-[500px] bg-amber-500/5 rounded-full blur-3xl animate-pulse-slower pointer-events-none" />

        {/* Floating Elements - Properly positioned on the right side */}
        <div className="absolute right-4 md:right-8 lg:right-12 top-1/2 -translate-y-1/2 z-10 hidden lg:block">
          <div className="flex flex-col gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 transform hover:scale-105 transition-all duration-300 animate-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">10-Year Guarantee</p>
                  <p className="text-white/60 text-xs">On all frames</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 transform hover:scale-105 transition-all duration-300 animate-float" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Free Delivery</p>
                  <p className="text-white/60 text-xs">Over £500</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 transform hover:scale-105 transition-all duration-300 animate-float" style={{ animationDelay: '2s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Secure Payments</p>
                  <p className="text-white/60 text-xs">256-bit SSL</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Floating Badge - Simplified for mobile */}
        <div className="absolute top-4 right-4 md:hidden z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-white text-xs font-medium">10-Year Guarantee</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center z-20">
          <div className="max-w-3xl pt-12 md:pt-0">
            {/* Animated Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6 md:mb-8 animate-fade-down">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-white">British Luxury Since 1995</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight tracking-tight animate-fade-up">
              Where
              <span className="block text-amber-400 font-playfair italic">Comfort</span>
              <span>Meets Artistry</span>
            </h1>

            {/* Description */}
            <p className="mt-4 md:mt-6 text-base md:text-lg lg:text-xl text-zinc-300 leading-relaxed max-w-xl animate-fade-up" style={{ animationDelay: '200ms' }}>
              Handcrafted luxury sofas designed for modern British homes. Each piece tells a story of exceptional quality and timeless elegance.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3 md:gap-4 mt-6 md:mt-8 animate-fade-up" style={{ animationDelay: '300ms' }}>
              <Link 
                href="/shop/all" 
                className="group relative inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-amber-600 text-white font-semibold rounded-xl md:rounded-2xl overflow-hidden transition-all hover:bg-amber-700 hover:scale-105 active:scale-95 text-sm md:text-base"
              >
                <span className="relative z-10">Explore Collection</span>
                <ArrowRight className="relative z-10 w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              
              <Link 
                href="/showroom" 
                className="group inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-white/10 backdrop-blur-md text-white font-semibold rounded-xl md:rounded-2xl border border-white/20 hover:bg-white/20 transition-all text-sm md:text-base"
              >
                <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                <span>Virtual Showroom</span>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-4 md:gap-8 mt-6 md:mt-8 animate-fade-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-white/20" />
                  ))}
                </div>
                <span className="text-xs md:text-sm text-zinc-300">Trusted by 10,000+ families</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="w-3 h-3 md:w-4 md:h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs md:text-sm text-zinc-300">4.9/5 from 2,500+ reviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:block z-30">
          <div className="flex flex-col items-center gap-2 text-white/60">
            <span className="text-xs uppercase tracking-wider">Scroll</span>
            <div className="w-5 h-8 rounded-full border-2 border-white/30 flex justify-center">
              <div className="w-1 h-2 bg-white/60 rounded-full mt-2 animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges - Floating Cards */}
      <section className="relative -mt-20 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {perks.map(({ icon: Icon, title, desc, gradient, detail }, index) => (
              <div 
                key={title}
                className="group relative bg-white rounded-2xl p-6 shadow-2xl hover:shadow-3xl transition-all-500 hover:-translate-y-2 animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-500`} />
                <div className="relative">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} p-3 mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-all-500`}>
                    <Icon className="w-full h-full text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-800 mb-1">{title}</h3>
                  <p className="text-sm text-zinc-500 mb-2">{desc}</p>
                  <p className="text-xs text-amber-600 font-medium">{detail}</p>
                </div>

                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden">
                  <div className={`absolute top-0 right-0 w-12 h-12 bg-gradient-to-br ${gradient} opacity-20 transform translate-x-6 -translate-y-6 group-hover:translate-x-0 group-hover:-translate-y-0 transition-transform duration-500`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section - Luxury Grid */}
      <section className="py-32 bg-gradient-to-b from-white to-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-600 uppercase tracking-wider">Curated Collections</span>
            </div>
            <h2 className="text-5xl font-playfair font-bold text-zinc-900 mb-4">
              Find Your Perfect Style
            </h2>
            <p className="text-lg text-zinc-600">
              From contemporary minimalism to timeless classics, discover the sofa that reflects your unique taste.
            </p>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories?.map((cat, index) => (
              <Link 
                key={cat.id} 
                href={`/shop/${cat.slug}`}
                className="group relative overflow-hidden rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all-500 hover:-translate-y-2 animate-fade-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative aspect-square overflow-hidden">
                  {cat.image_url ? (
                    <Image 
                      src={cat.image_url} 
                      alt={cat.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                      <Sofa className="w-16 h-16 text-amber-600/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="text-white font-semibold text-center text-lg drop-shadow-lg">
                    {cat.name}
                  </h3>
                </div>
                
                {/* Hover effect ring */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-amber-500/50 rounded-3xl transition-all duration-500" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products - With Hover Gallery */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
            <div className="animate-fade-right">
              <span className="text-amber-600 font-semibold text-sm uppercase tracking-wider">New Arrivals</span>
              <h2 className="text-5xl font-playfair font-bold text-zinc-900 mt-2">
                Fresh from Our Workshop
              </h2>
            </div>
            <Link 
              href="/shop/all" 
              className="group inline-flex items-center gap-2 mt-4 md:mt-0 text-zinc-600 hover:text-amber-600 font-medium transition-colors animate-fade-left"
            >
              View All Products
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts?.map((product, index) => {
              const displayImage = Array.isArray(product.product_variants) && product.product_variants.length > 0 
                ? product.product_variants[0].image_url 
                : null;
              
              const categorySlug = product.categories && !Array.isArray(product.categories) 
                ? product.categories.slug 
                : 'all';

              return (
                <Link 
                  key={product.id} 
                  href={`/shop/${categorySlug}/${product.slug}`}
                  className="group animate-fade-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative aspect-square overflow-hidden rounded-3xl bg-zinc-100 mb-4">
                    {displayImage ? (
                      <Image 
                        src={displayImage} 
                        alt={product.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-200">
                        <Sofa className="w-16 h-16 text-zinc-400" />
                      </div>
                    )}
                    
                    {/* Quick View Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                      <span className="bg-white text-zinc-900 px-6 py-3 rounded-full font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 shadow-xl">
                        Quick View
                      </span>
                    </div>

                    {/* Wishlist Button */}
                    <button className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 hover:bg-amber-500 hover:text-white transform hover:scale-110">
                      <Heart className="w-5 h-5" />
                    </button>

                    {/* Category Tag */}
                    {product.categories && !Array.isArray(product.categories) && (
                      <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-zinc-700">
                        {product.categories.name}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-zinc-900 group-hover:text-amber-600 transition-colors line-clamp-1 text-lg">
                      {product.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm text-zinc-600 ml-1">4.8</span>
                      </div>
                      <span className="text-zinc-300">•</span>
                      <span className="text-sm text-zinc-500">124 reviews</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-2xl font-bold text-zinc-900">
                        £{product.base_price.toFixed(2)}
                      </span>
                      <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        In Stock
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us - Feature Showcase */}
      <section className="py-32 bg-zinc-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="animate-fade-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full mb-6">
                <Gem className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500 uppercase tracking-wider">Why Choose Us</span>
              </div>
              <h2 className="text-5xl font-playfair font-bold mb-6">
                Craftsmanship That <span className="text-amber-500">Endures</span>
              </h2>
              <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
                Every UK Sofa Shop piece is handcrafted in our Yorkshire workshop using traditional techniques passed down through generations.
              </p>

              {/* Feature List */}
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-4 group">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                      <p className="text-zinc-400">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 mt-12">
                <div>
                  <div className="text-3xl font-bold text-amber-500">28+</div>
                  <div className="text-sm text-zinc-400">Years of Excellence</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-500">15k</div>
                  <div className="text-sm text-zinc-400">Happy Families</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-500">100%</div>
                  <div className="text-sm text-zinc-400">British Made</div>
                </div>
              </div>
            </div>

            {/* Right Content - Image Collage */}
            <div className="relative h-[600px] animate-fade-left">
              <div className="absolute top-0 right-0 w-80 h-80 rounded-3xl overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <Image
                  src="https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg"
                  alt="Craftsmanship detail"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute bottom-0 left-0 w-80 h-80 rounded-3xl overflow-hidden shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                <Image
                  src="https://images.pexels.com/photos/1571459/pexels-photo-1571459.jpeg"
                  alt="Sofa detail"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-amber-500 flex items-center justify-center shadow-2xl animate-float">
                <span className="text-white font-bold text-center">
                  <span className="block text-2xl">30</span>
                  <span className="text-xs">Day Trial</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - Luxury Cards */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full mb-6">
              <Users className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-600 uppercase tracking-wider">Testimonials</span>
            </div>
            <h2 className="text-5xl font-playfair font-bold text-zinc-900 mb-4">
              Loved by Our Customers
            </h2>
            <p className="text-lg text-zinc-600">
              Don't just take our word for it - hear from the families who've made UK Sofa Shop their choice
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all-500 hover:-translate-y-2 animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Quote Mark */}
                <div className="absolute -top-4 left-8">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg rotate-45" />
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-serif text-2xl">"</span>
                </div>
                
                {/* Customer Info */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 text-lg">{testimonial.name}</h4>
                    <p className="text-zinc-500 text-sm">{testimonial.location}</p>
                    <p className="text-xs text-amber-600 mt-1">{testimonial.purchase}</p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Comment */}
                <p className="text-zinc-600 leading-relaxed">"{testimonial.comment}"</p>

                {/* Hover effect line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400 rounded-b-3xl scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Parallax Banner */}
      <section className="relative py-40 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg"
            alt="Luxury living room"
            fill
            className="object-cover scale-110 hover:scale-100 transition-transform duration-10000"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900/90" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-full mb-8 backdrop-blur-sm">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-500">Limited Time Offer</span>
          </div>

          <h2 className="text-5xl md:text-6xl font-playfair font-bold text-white mb-6">
            Ready to Transform Your Space?
          </h2>
          <p className="text-xl text-zinc-300 mb-12 leading-relaxed max-w-2xl mx-auto">
            Experience the UK Sofa Shop difference. Book a virtual consultation or visit our London showroom.
          </p>

          <div className="flex flex-wrap gap-6 justify-center">
            <Link 
              href="/shop/all" 
              className="group relative inline-flex items-center gap-3 px-10 py-5 bg-amber-600 text-white font-semibold rounded-2xl overflow-hidden hover:bg-amber-700 transition-all hover:scale-105 active:scale-95 text-lg"
            >
              <span className="relative z-10">Start Your Journey</span>
              <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <Link 
              href="/showroom" 
              className="group inline-flex items-center gap-3 px-10 py-5 bg-white/10 backdrop-blur-md text-white font-semibold rounded-2xl border border-white/20 hover:bg-white/20 transition-all text-lg"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Virtual Tour</span>
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-16">
            <div className="flex items-center gap-2 text-zinc-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Lifetime Guarantee</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Truck className="w-5 h-5" />
              <span className="text-sm">Free Delivery</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <RotateCcw className="w-5 h-5" />
              <span className="text-sm">30-Day Returns</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Award className="w-5 h-5" />
              <span className="text-sm">British Made</span>
            </div>
          </div>
        </div>
      </section>

      {/* Instagram Feed - Social Proof */}
      {/* <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full mb-6">
              <Instagram className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-600 uppercase tracking-wider">#UK Sofa ShopLife</span>
            </div>
            <h2 className="text-4xl font-playfair font-bold text-zinc-900 mb-4">
              As Seen on Instagram
            </h2>
            <p className="text-lg text-zinc-600">
              Tag us @uksofashop for a chance to be featured
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="relative aspect-square group overflow-hidden rounded-2xl">
                <Image
                  src={`https://images.pexels.com/photos/157145${i}/pexels-photo-157145${i}.jpeg`}
                  alt="Instagram feed"
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center p-4">
                  <span className="text-white text-sm">@uksofashop</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Brand Strip - Luxury Partners */}
      {/* <div className="bg-white border-y border-zinc-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-12 flex-wrap opacity-50">
            <span className="text-zinc-400 font-semibold text-lg">THE TIMES</span>
            <span className="text-zinc-400 font-semibold text-lg">HOUSE & GARDEN</span>
            <span className="text-zinc-400 font-semibold text-lg">THE SUNDAY TIMES</span>
            <span className="text-zinc-400 font-semibold text-lg">IDEAL HOME</span>
            <span className="text-zinc-400 font-semibold text-lg">ELLE DECOR</span>
          </div>
        </div>
      </div> */}

      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="group relative w-14 h-14 bg-amber-600 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center">
          <div className="absolute inset-0 bg-amber-600 rounded-full animate-ping opacity-20" />
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        </button>
      </div>
    </>
  );
}