// src/components/Layout/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Menu, X, Search, Phone } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/utils/supabase/client';

export default function Header() {
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // State to hold our dynamic database categories
  const [categories, setCategories] = useState<{ id: string, name: string, slug: string }[]>([]);

  useEffect(() => {
    // 1. Scroll effect
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // 2. Fetch categories from Supabase
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('categories').select('id, name, slug').order('name');
      if (data) {
        setCategories(data);
      }
    };
    fetchCategories();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="bg-stone-800 text-white text-center py-1.5 text-xs font-medium tracking-wide">
        <span className="hidden sm:inline">Free UK Mainland Delivery on orders over £500 &nbsp;|&nbsp; </span>
        <Phone className="inline-block w-3 h-3 mr-1 mb-0.5" />
        0800 123 4567
        <span className="hidden sm:inline"> &nbsp;|&nbsp; Cash on Delivery Available</span>
      </div>

      {/* Main Navigation */}
      <header className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md' : 'border-b border-stone-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Mobile Menu Button */}
            <button className="lg:hidden p-2 -ml-2 text-stone-600" onClick={() => setMobileOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-stone-800 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">U</span>
              </div>
              <span className="font-bold text-stone-800 text-lg tracking-tight hidden sm:block">
                UKSofa<span className="text-amber-600">Shop</span>
              </span>
            </Link>

            {/* Desktop Nav (Dynamic) */}
            <nav className="hidden lg:flex items-center gap-6">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/shop/${cat.slug}`} className="text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors">
                  {cat.name}
                </Link>
              ))}
            </nav>

            {/* Icons */}
            <div className="flex items-center gap-2">
              <Link href="/checkout" className="relative p-2 text-stone-600 hover:text-stone-900 transition-colors">
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Dynamic) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
              <span className="font-bold text-stone-800 text-lg">UKSofa<span className="text-amber-600">Shop</span></span>
              <button onClick={() => setMobileOpen(false)}><X className="w-5 h-5 text-stone-600" /></button>
            </div>
            <nav className="p-4 flex flex-col space-y-4">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/shop/${cat.slug}`} onClick={() => setMobileOpen(false)} className="text-stone-800 font-medium">
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}