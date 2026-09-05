// src/app/sitemap/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { Map, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { canonicalProductPath } from '@/utils/productUrl';

const ACCENT = 'var(--color-ember-500)';      // fills: buttons, rules, icons, badges
const ACCENT_TEXT = 'var(--color-ember-700)'; // letterforms on a light ground

export const metadata: Metadata = {
  title: 'Sitemap',
  description: 'Navigate the complete directory of UK Sofa Shop, including all sofa collections, guides, and store policies.',
};

export default async function HTMLSitemapPage() {
  const supabase = await createClient();

  // 1. Fetch Categories
  const { data: categories } = await supabase
    .from('categories')
    .select('name, slug')
    .order('name', { ascending: true });

  // 2. Fetch Active Products
  const { data: products } = await supabase
    .from('products')
    .select(`
      title,
      slug,
      categories!products_category_id_fkey ( slug ),
      product_categories ( categories ( slug ) )
    `)
    .eq('is_active', true)
    .order('title', { ascending: true });

  // The same canonical URL the XML sitemap emits.
  //
  // The comment this replaces said "just like your XML sitemap", and it had
  // stopped being true: sitemap.ts moved to canonicalProductPath and this was
  // left behind, reading the primary category by hand and falling back to
  // 'all' — a segment no product belongs to, so the human sitemap would have
  // pointed at a 308 for any product whose category_id was not set. Two
  // sitemaps for the same site disagreeing about where a product lives is
  // exactly what one shared helper is for.
  const productLinks = (products || []).map(product => ({
    name: product.title,
    href: canonicalProductPath(product),
  }));

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
        { name: 'Choosing Your Fabric', href: '/fabrics' },
        { name: 'Free Fabric Samples', href: '/swatches' },
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
    <div className="min-h-screen bg-calico-50">
      
      {/* ════ HERO SECTION ════ */}
      <div className="bg-ink-900 border-b-2" style={{ borderColor: ACCENT }}>
        <div className="max-w-shell mx-auto px-4 sm:px-6 lg:px-8 section-y text-center">
          <div className="flex items-center justify-center gap-2 eyebrow tracking-[0.2em] font-bold mb-4 text-ember-300">
            <Map className="w-4 h-4" /> Directory
          </div>
          <h1 className="font-display text-h1 md:text-display-l font-bold text-white leading-tight mb-4">
            Site Map
          </h1>
          <p className="text-white/60 text-body max-w-lg mx-auto">
            A complete overview of our website. Find exactly what you are looking for.
          </p>
        </div>
      </div>

      {/* ════ DIRECTORY GRID ════ */}
      <div className="max-w-shell mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Changed from 4 columns to 5 so products get their own dedicated column */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          
          {sections.map((section, idx) => (
            <div key={idx}>
              <h2 className="font-display text-h3 font-bold text-ink-900 mb-6 border-b border-calico-300 pb-3">
                {section.title}
              </h2>
              <ul className="space-y-4">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link 
                      href={link.href} 
                      className="group flex items-start text-ink-500 hover:text-ember-700 transition-colors text-body-sm font-medium"
                    >
                      <ChevronRight className="w-3.5 h-3.5 mr-2 mt-1 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-base shrink-0" style={{ color: ACCENT_TEXT }} />
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