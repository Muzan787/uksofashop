import Link from 'next/link';
import Image from 'next/image';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  CreditCard,
  Shield,
  Truck,
  Heart,
  ArrowRight,
  Sparkles,
  Award,
  ChevronRight
} from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export default async function Footer() {
  const supabase = await createClient();
  
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')
    .limit(6);

  return (
    <footer className="relative bg-zinc-900 text-zinc-300 overflow-hidden">
      {/* Luxury Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-amber-500/20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-amber-500/20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-amber-500/20 rounded-full" />
      </div>

      {/* Newsletter Section */}
      <div className="relative border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-500 uppercase tracking-wider">Exclusive Offers</span>
              </div>
              <h3 className="text-4xl font-playfair font-bold text-white mb-4">
                Join the <span className="text-amber-500">UK Sofa Shop</span> Family
              </h3>
              <p className="text-zinc-400 text-lg leading-relaxed">
                Subscribe to receive exclusive offers, interior design inspiration, and early access to new collections.
              </p>
              <div className="flex items-center gap-4 mt-6">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-zinc-900" />
                  ))}
                </div>
                <span className="text-sm text-zinc-500">Join 10,000+ subscribers</span>
              </div>
            </div>
            <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
              <div className="bg-zinc-800/50 rounded-3xl p-1 border border-zinc-700">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-6 py-4 bg-zinc-800 rounded-2xl text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                  />
                  <button className="px-8 py-4 bg-amber-600 text-white font-semibold rounded-2xl hover:bg-amber-700 transition-all-300 group flex items-center justify-center gap-2">
                    Subscribe
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-3 px-2">
                  By subscribing, you agree to our Privacy Policy and consent to receive updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Info */}
          <div className="space-y-6 animate-fade-up">
            <Link href="/" className="inline-block group">
              <span className="font-playfair text-3xl font-bold text-white">
                Sofa<span className="text-amber-500">Luxe</span>
              </span>
              <span className="block text-xs text-zinc-500 tracking-wider mt-1">BRITISH CRAFTSMANSHIP</span>
            </Link>
            
            <p className="text-zinc-400 leading-relaxed">
              Handcrafted luxury sofas designed for modern British homes. Each piece is a testament to exceptional quality and timeless elegance.
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm bg-zinc-800/50 px-3 py-2 rounded-xl">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>Secure payments</span>
              </div>
              <div className="flex items-center gap-2 text-sm bg-zinc-800/50 px-3 py-2 rounded-xl">
                <Truck className="w-4 h-4 text-amber-500" />
                <span>Free delivery</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3">
              <a href="#" className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center hover:bg-amber-600 hover:scale-110 transition-all-300 group">
                <Facebook className="w-5 h-5 text-zinc-400 group-hover:text-white" />
              </a>
              <a href="#" className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center hover:bg-amber-600 hover:scale-110 transition-all-300 group">
                <Instagram className="w-5 h-5 text-zinc-400 group-hover:text-white" />
              </a>
              <a href="#" className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center hover:bg-amber-600 hover:scale-110 transition-all-300 group">
                <Twitter className="w-5 h-5 text-zinc-400 group-hover:text-white" />
              </a>
            </div>
          </div>

          {/* Shop Links */}
          <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Shop</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/shop/all" className="group inline-flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors">
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 transition-all" />
                  All Collections
                </Link>
              </li>
              {categories?.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/shop/${cat.slug}`} className="group inline-flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors">
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 transition-all" />
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/new-arrivals" className="group inline-flex items-center gap-2 text-amber-500 font-medium">
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 transition-all" />
                  New Arrivals
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Hot</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="group inline-flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors">
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 transition-all" />
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/delivery-returns" className="group inline-flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors">
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 transition-all" />
                  Delivery & Returns
                </Link>
              </li>
              <li>
                <Link href="/faq" className="group inline-flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors">
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 transition-all" />
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/size-guide" className="group inline-flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors">
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 transition-all" />
                  Size Guide
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="group inline-flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors">
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 transition-all" />
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="animate-fade-up" style={{ animationDelay: '300ms' }}>
            <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Visit Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 group hover:text-amber-500 transition-colors">
                <MapPin className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-zinc-400 text-sm group-hover:text-amber-500 transition-colors">
                  123 Furniture Way,<br />
                  London, SW1A 1AA<br />
                  United Kingdom
                </span>
              </li>
              <li className="flex items-center gap-3 group hover:text-amber-500 transition-colors">
                <Phone className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="text-zinc-400 text-sm group-hover:text-amber-500 transition-colors">0800 123 4567</span>
              </li>
              <li className="flex items-center gap-3 group hover:text-amber-500 transition-colors">
                <Mail className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="text-zinc-400 text-sm group-hover:text-amber-500 transition-colors">uksofashop.co.uk@gmail.com</span>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="text-zinc-400 text-sm">
                  Mon-Fri: 9am - 6pm<br />
                  Sat: 10am - 4pm
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Methods & Awards */}
        <div className="py-8 border-t border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <span className="text-sm text-zinc-500">We accept:</span>
              <div className="flex gap-3">
                <div className="w-14 h-9 bg-zinc-800 rounded-lg flex items-center justify-center text-xs text-zinc-400 font-medium hover:bg-amber-600/20 hover:text-amber-500 transition-all-300 cursor-default">
                  Visa
                </div>
                <div className="w-14 h-9 bg-zinc-800 rounded-lg flex items-center justify-center text-xs text-zinc-400 font-medium hover:bg-amber-600/20 hover:text-amber-500 transition-all-300 cursor-default">
                  MC
                </div>
                <div className="w-14 h-9 bg-zinc-800 rounded-lg flex items-center justify-center text-xs text-zinc-400 font-medium hover:bg-amber-600/20 hover:text-amber-500 transition-all-300 cursor-default">
                  Amex
                </div>
                <div className="w-14 h-9 bg-zinc-800 rounded-lg flex items-center justify-center text-xs text-zinc-400 font-medium hover:bg-amber-600/20 hover:text-amber-500 transition-all-300 cursor-default">
                  PayPal
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-zinc-500">British Made</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-zinc-500">256-bit SSL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} UK Sofa Shop (Vantage Group LTD). All rights reserved.</p>
          <div className="flex gap-8">
            <Link href="/terms" className="hover:text-amber-500 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-amber-500 transition-colors">Privacy</Link>
            <Link href="/cookies" className="hover:text-amber-500 transition-colors">Cookies</Link>
            <Link href="/sitemap" className="hover:text-amber-500 transition-colors">Sitemap</Link>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-amber-500" />
            <span>Made with love in Britain</span>
          </div>
        </div>
      </div>
    </footer>
  );
}