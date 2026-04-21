// src/components/Layout/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShoppingBag, 
  Menu, 
  X, 
  Search, 
  ChevronDown,
  User,
  Heart,
  Package,
  Phone,
  Sofa,
  Sparkles,
  Clock,
  Shield,
  Truck
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/utils/supabase/client';

export default function Header() {
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');
      if (data) setCategories(data);
    };
    fetchCategories();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Top Bar - Luxury Announcement */}
      <div className="relative bg-zinc-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-transparent to-amber-600/20 animate-shimmer" 
             style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.1), transparent)', backgroundSize: '200% 100%' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-10 text-sm">
            <div className="flex items-center gap-6">
              <span className="hidden md:flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-zinc-300">Luxury British Craftsmanship</span>
              </span>
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                <span className="text-zinc-300">Free Delivery Over £500</span>
              </span>
              <span className="hidden md:flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-zinc-300">10-Year Guarantee</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg py-3' 
          : 'bg-white/0 backdrop-blur-none py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all-300 group"
            >
              <Menu className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl overflow-hidden group-hover:scale-110 group-hover:rotate-3 transition-all-500">
                <div className="absolute inset-0 bg-white/20 animate-shimmer" 
                     style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', backgroundSize: '200% 100%' }} />
                <div className="relative h-full flex items-center justify-center">
                  <Sofa className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="hidden sm:block">
                <span className="font-playfair text-2xl font-bold text-zinc-900">
                  UK Sofa<span className="text-amber-600">Shop</span>
                </span>
                <span className="block text-xs text-zinc-500 tracking-wider">BRITISH CRAFTSMANSHIP</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <Link href="/" className="px-5 py-2 text-sm font-medium text-zinc-700 hover:text-amber-600 rounded-xl hover:bg-amber-50 transition-all-300">
                Home
              </Link>
              
              {/* Mega Menu Trigger */}
              <div className="relative"
                   onMouseEnter={() => setActiveDropdown('shop')}
                   onMouseLeave={() => setActiveDropdown(null)}>
                <button className={`px-5 py-2 text-sm font-medium rounded-xl flex items-center gap-1 transition-all-300 ${
                  activeDropdown === 'shop' 
                    ? 'text-amber-600 bg-amber-50' 
                    : 'text-zinc-700 hover:text-amber-600 hover:bg-amber-50'
                }`}>
                  Shop
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${
                    activeDropdown === 'shop' ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Mega Menu Dropdown */}
                {activeDropdown === 'shop' && (
                  <div className="absolute top-full left-0 w-[600px] mt-2 bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden animate-fade-down">
                    <div className="grid grid-cols-3 gap-6 p-6">
                      <div>
                        <h3 className="font-semibold text-zinc-900 mb-3">Categories</h3>
                        <ul className="space-y-2">
                          {categories.slice(0, 5).map((cat) => (
                            <li key={cat.id}>
                              <Link href={`/shop/${cat.slug}`} 
                                    className="text-sm text-zinc-600 hover:text-amber-600 transition-colors">
                                {cat.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 mb-3">Collections</h3>
                        <ul className="space-y-2">
                          <li><Link href="/new-arrivals" className="text-sm text-zinc-600 hover:text-amber-600">New Arrivals</Link></li>
                          <li><Link href="/best-sellers" className="text-sm text-zinc-600 hover:text-amber-600">Best Sellers</Link></li>
                          <li><Link href="/luxury" className="text-sm text-zinc-600 hover:text-amber-600">Luxury Collection</Link></li>
                          <li><Link href="/sale" className="text-sm text-amber-600 font-medium">Sale - Up to 30% Off</Link></li>
                        </ul>
                      </div>
                      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
                        <h3 className="font-semibold mb-2">New Arrivals</h3>
                        <p className="text-sm text-white/80 mb-3">Discover our latest luxury sofas</p>
                        <Link href="/new-arrivals" className="text-sm font-medium flex items-center gap-1 group">
                          Shop Now
                          <ChevronDown className="w-4 h-4 rotate-[-90deg] group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link href="/showroom" className="px-5 py-2 text-sm font-medium text-zinc-700 hover:text-amber-600 rounded-xl hover:bg-amber-50 transition-all-300">
                Showroom
              </Link>
              <Link href="/offers" className="px-5 py-2 text-sm font-medium text-amber-600 rounded-xl hover:bg-amber-50 transition-all-300 relative">
                Offers
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-600 rounded-full animate-pulse" />
              </Link>
            </nav>

            {/* Right Icons */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="hidden lg:flex w-10 h-10 rounded-xl bg-zinc-100 items-center justify-center hover:bg-amber-600 hover:text-white transition-all-300 group"
              >
                <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>

              {/* Wishlist */}
              <Link href="/wishlist" 
                    className="hidden md:flex w-10 h-10 rounded-xl bg-zinc-100 items-center justify-center hover:bg-amber-600 hover:text-white transition-all-300 group">
                <Heart className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </Link>

              {/* Account */}
              <Link href="/account" 
                    className="hidden md:flex w-10 h-10 rounded-xl bg-zinc-100 items-center justify-center hover:bg-amber-600 hover:text-white transition-all-300 group">
                <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </Link>

              {/* Cart */}
              <Link href="/checkout" 
                    className="relative w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 transition-all-300 group">
                <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-zinc-900 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce-subtle">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          {searchOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 px-4 lg:px-8 animate-fade-down">
              <div className="max-w-2xl mx-auto">
                <form className="relative">
                  <input
                    type="text"
                    placeholder="Search for sofas, corner sofas, accessories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-6 pr-14 py-4 bg-white rounded-2xl shadow-2xl border border-zinc-100 text-zinc-900 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-amber-600/20"
                    autoFocus
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-amber-600 text-white rounded-xl flex items-center justify-center hover:bg-amber-700 transition-colors">
                    <Search className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ${
        isOpen ? 'visible' : 'invisible'
      }`}>
        {/* Backdrop */}
        <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`} onClick={() => setIsOpen(false)} />

        {/* Drawer */}
        <div className={`absolute left-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl transform transition-transform duration-500 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <Sofa className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-playfair text-xl font-bold">UK Sofa Shop</span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-6">
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="flex items-center gap-3 px-4 py-3 text-zinc-700 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-all-300">
                    <Sofa className="w-5 h-5" />
                    <span className="font-medium">Home</span>
                  </Link>
                </li>
                <li>
                  <div className="space-y-1">
                    <div className="px-4 py-3 text-zinc-700 font-medium">Categories</div>
                    {categories.map((cat) => (
                      <Link key={cat.id} href={`/shop/${cat.slug}`} 
                            className="block px-4 py-2 text-sm text-zinc-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all-300">
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </li>
                <li>
                  <Link href="/showroom" className="flex items-center gap-3 px-4 py-3 text-zinc-700 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-all-300">
                    <Package className="w-5 h-5" />
                    <span className="font-medium">Showroom</span>
                  </Link>
                </li>
                <li>
                  <Link href="/offers" className="flex items-center gap-3 px-4 py-3 text-amber-600 rounded-xl hover:bg-amber-50 transition-all-300">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-medium">Special Offers</span>
                  </Link>
                </li>
              </ul>

              <div className="mt-6 pt-6 border-t border-zinc-100">
                <div className="space-y-3">
                  <Link href="/account" className="flex items-center gap-3 px-4 py-3 text-zinc-700 rounded-xl hover:bg-amber-50 transition-all-300">
                    <User className="w-5 h-5" />
                    <span>My Account</span>
                  </Link>
                  <Link href="/wishlist" className="flex items-center gap-3 px-4 py-3 text-zinc-700 rounded-xl hover:bg-amber-50 transition-all-300">
                    <Heart className="w-5 h-5" />
                    <span>Wishlist</span>
                  </Link>
                  <Link href="/track-order" className="flex items-center gap-3 px-4 py-3 text-zinc-700 rounded-xl hover:bg-amber-50 transition-all-300">
                    <Package className="w-5 h-5" />
                    <span>Track Order</span>
                  </Link>
                </div>
              </div>
            </nav>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-100 bg-zinc-50">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-zinc-600">
                  <Phone className="w-4 h-4" />
                  <span>0800 123 4567</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-600">
                  <Clock className="w-4 h-4" />
                  <span>Mon-Fri: 9am - 6pm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}