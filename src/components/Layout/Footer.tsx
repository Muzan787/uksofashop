import Link from 'next/link';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export default async function Footer() {
  const supabase = await createClient();
  
  // Fetch up to 4 categories dynamically for the footer
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')
    .limit(4);

  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-8 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <span className="font-bold text-white text-2xl tracking-tight">
                UKSofa<span className="text-amber-500">Shop</span>
              </span>
            </Link>
            <p className="text-sm text-stone-400 leading-relaxed max-w-xs">
              Premium British furniture crafted for comfort and built to last. We bring luxury directly to your living room with our exclusive cash-on-delivery service.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="text-stone-400 hover:text-white transition"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="text-stone-400 hover:text-white transition"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="text-stone-400 hover:text-white transition"><Twitter className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Quick Links (Now Dynamic) */}
          <div>
            <h3 className="text-white font-semibold mb-4 uppercase tracking-wider text-sm">Shop</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/shop/all" className="hover:text-amber-500 transition">All Sofas</Link></li>
              {categories?.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/shop/${cat.slug}`} className="hover:text-amber-500 transition">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-white font-semibold mb-4 uppercase tracking-wider text-sm">Customer Service</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/contact" className="hover:text-amber-500 transition">Contact Us</Link></li>
              <li><Link href="/delivery-returns" className="hover:text-amber-500 transition">Delivery & Returns</Link></li>
              <li><Link href="/faq" className="hover:text-amber-500 transition">FAQs</Link></li>
              <li><Link href="/track-order" className="hover:text-amber-500 transition">Track Your Order</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-semibold mb-4 uppercase tracking-wider text-sm">Contact</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-500 shrink-0" />
                <span>123 Furniture Way,<br />London, SW1A 1AA<br />United Kingdom</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-amber-500 shrink-0" />
                <span>0800 123 4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-amber-500 shrink-0" />
                <span>support@uksofashop.co.uk</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} UK Sofa Shop (Vantage Group LTD). All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white transition">Terms & Conditions</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}