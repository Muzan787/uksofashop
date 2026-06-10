// src/app/sitemap/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { Map, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

const ACCENT = '#d4871a';

export const metadata: Metadata = {
  title: 'Sitemap | Vantage Group LTD',
  description: 'Navigate the complete directory of Vantage Group LTD, including all sofa collections, guides, and store policies.',
};

export default async function HTMLSitemapPage() {
  const supabase = await createClient();

  // 1. Fetch Categories
  const { data: categories } = await supabase
    .from('categories')
    .select('name, slug')
    .order('name', { ascending: true });

  // 2. Fetch Active Products (Using your exact relation logic)
  const { data: products } = await supabase
    .from('products')
    .select(`
      title,
      slug, 
      categories!products_category_id_fkey ( slug )
    `)
    .eq('is_active', true)
    .order('title', { ascending: true });

  // Map products into links, safely extracting the category slug just like your XML sitemap
  const productLinks = (products || []).map((product: any) => {
    let categorySlug = 'all';
    if (product.categories && !Array.isArray(product.categories) && product.categories.slug) {
      categorySlug = product.categories.slug;
    }
    return {
      name: product.title,
      href: `/shop/${categorySlug}/${product.slug}`,
    };
  });

  const sections = [
    {
      title: 'Main Store',
      links: [
        { name: 'Home', href: '/' },
        { name: 'Shop All Furniture', href: '/shop/all' },
        { name: 'Search', href: '/search' },
        { name: 'Customer Reviews', href: '/reviews' },
        { name: 'The Journal', href: '/journal' },
        { name: 'Our Showroom', href: '/showroom' },
      ],
    },
    {
      title: 'Shop by Category',
      links: (categories || []).map((cat) => ({
        name: cat.name,
        href: `/shop/${cat.slug}`,
      })),
    },
    {
      title: 'All Products',
      links: productLinks.length > 0 ? productLinks : [{ name: 'No products available', href: '#' }],
    },
    {
      title: 'Customer Support',
      links: [
        { name: 'Track Order', href: '/track-order' },
        { name: 'Delivery & Exchanges', href: '/delivery-returns' },
        { name: 'Sofa Size Guide', href: '/size-guide' },
        { name: 'Fabric & Leather Care Guide', href: '/care-guide' },
        { name: 'Frequently Asked Questions', href: '/faq' },
      ],
    },
    {
      title: 'Company & Legal',
      links: [
        { name: 'About Us', href: '/about' },
        { name: 'Contact Us', href: '/contact' },
        { name: 'Careers', href: '/careers' },
        { name: 'Terms & Conditions', href: '/terms' },
        { name: 'Privacy Policy', href: '/privacy' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      
      {/* ════ HERO SECTION ════ */}
      <div className="bg-[#0c0c0b] border-b-2" style={{ borderColor: ACCENT }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color: ACCENT }}>
            <Map className="w-4 h-4" /> Directory
          </div>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Site Map
          </h1>
          <p className="text-white/60 text-base max-w-lg mx-auto">
            A complete overview of our website. Find exactly what you are looking for.
          </p>
        </div>
      </div>

      {/* ════ DIRECTORY GRID ════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Changed from 4 columns to 5 so products get their own dedicated column */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          
          {sections.map((section, idx) => (
            <div key={idx}>
              <h2 className="font-playfair text-xl font-bold text-[#1c1917] mb-6 border-b border-[#e7e5e4] pb-3">
                {section.title}
              </h2>
              <ul className="space-y-4">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link 
                      href={link.href} 
                      className="group flex items-start text-[#57534e] hover:text-[#d4871a] transition-colors text-sm font-medium"
                    >
                      <ChevronRight className="w-3.5 h-3.5 mr-1.5 mt-0.5 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 shrink-0" style={{ color: ACCENT }} />
                      <span className="leading-snug">{link.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}