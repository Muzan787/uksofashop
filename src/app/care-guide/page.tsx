// src/app/care-guide/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Droplets, Sun, Wind, Brush, Phone, ArrowRight, ShieldCheck } from 'lucide-react';

const ACCENT = '#d4871a';

export const metadata: Metadata = {
  title: 'Sofa Care & Cleaning Guide | Vantage Group LTD',
  description: 'Expert tips on how to maintain, clean, and protect your British handcrafted fabric or leather sofa for years to come.',
};

export default function CareGuidePage() {
  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      
      {/* ════ HERO SECTION ════ */}
      <div className="bg-[#0c0c0b] border-b-2" style={{ borderColor: ACCENT }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color: ACCENT }}>
            Maintenance & Protection
          </div>
          <h1 className="font-playfair text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Sofa Care Guide
          </h1>
          <p className="text-white/60 max-w-xl text-lg leading-relaxed">
            Our sofas are handcrafted to last a lifetime. With a little love and regular maintenance, you can keep your fabric or leather upholstery looking as immaculate as the day it arrived.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        
        {/* ════ GENERAL MAINTENANCE ════ */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
              <ShieldCheck className="w-6 h-6" style={{ color: ACCENT }} />
            </div>
            <h2 className="font-playfair text-3xl font-bold text-[#1c1917]">General Care Rules</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-[#e7e5e4] shadow-sm">
              <Wind className="w-8 h-8 mb-4 text-[#a8a29e]" />
              <h3 className="text-lg font-bold text-[#1c1917] mb-2">Plump Regularly</h3>
              <p className="text-[#57534e] text-sm leading-relaxed">
                Feather and fibre-filled cushions need daily plumping to maintain their shape and comfort. Give them a good shake and pat down after an evening of lounging.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-[#e7e5e4] shadow-sm">
              <Sun className="w-8 h-8 mb-4 text-[#a8a29e]" />
              <h3 className="text-lg font-bold text-[#1c1917] mb-2">Avoid Direct Sunlight</h3>
              <p className="text-[#57534e] text-sm leading-relaxed">
                Prolonged exposure to direct UV sunlight can cause both fabrics and leathers to fade over time. Try to position your sofa away from direct, harsh window light.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-[#e7e5e4] shadow-sm">
              <Droplets className="w-8 h-8 mb-4 text-[#a8a29e]" />
              <h3 className="text-lg font-bold text-[#1c1917] mb-2">Mind the Radiator</h3>
              <p className="text-[#57534e] text-sm leading-relaxed">
                Keep your sofa at least 30cm away from radiators or heat sources. Extreme localized heat can dry out leather, causing it to crack, and can warp wooden internal frames.
              </p>
            </div>
          </div>
        </div>

        {/* ════ MATERIAL SPECIFIC CARE ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          
          {/* Fabric Care */}
          <div className="bg-white rounded-3xl p-8 md:p-10 border border-[#e7e5e4] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#f4f0ea] rounded-bl-full -z-0 opacity-50"></div>
            <div className="relative z-10">
              <Brush className="w-10 h-10 mb-6" style={{ color: ACCENT }} />
              <h2 className="font-playfair text-2xl font-bold text-[#1c1917] mb-6">Fabric Sofa Care</h2>
              <ul className="space-y-6">
                <li>
                  <strong className="block text-[#1c1917] text-sm mb-1">Weekly Vacuuming</strong>
                  <span className="text-[#57534e] text-sm leading-relaxed block">Use the soft brush attachment on your vacuum to gently remove dust and crumbs. This prevents dirt from grinding into the woven fibres.</span>
                </li>
                <li>
                  <strong className="block text-[#1c1917] text-sm mb-1">Spill Management</strong>
                  <span className="text-[#57534e] text-sm leading-relaxed block">If you spill a liquid, act fast! <strong>Blot</strong> the area immediately with a clean, dry, uncoloured cloth. Never rub or scrub, as this pushes the liquid deeper and ruins the fabric pile.</span>
                </li>
                <li>
                  <strong className="block text-[#1c1917] text-sm mb-1">Professional Cleaning</strong>
                  <span className="text-[#57534e] text-sm leading-relaxed block">For heavily soiled areas or an annual refresh, we always recommend hiring a professional upholstery cleaner. Do not machine wash cushion covers unless explicitly stated on the label.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Leather Care */}
          <div className="bg-white rounded-3xl p-8 md:p-10 border border-[#e7e5e4] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#f4f0ea] rounded-bl-full -z-0 opacity-50"></div>
            <div className="relative z-10">
              <Sparkles className="w-10 h-10 mb-6" style={{ color: ACCENT }} />
              <h2 className="font-playfair text-2xl font-bold text-[#1c1917] mb-6">Leather Sofa Care</h2>
              <ul className="space-y-6">
                <li>
                  <strong className="block text-[#1c1917] text-sm mb-1">Routine Dusting</strong>
                  <span className="text-[#57534e] text-sm leading-relaxed block">Wipe your leather down weekly with a clean, soft, lightly dampened microfibre cloth to remove surface dust and prevent build-up.</span>
                </li>
                <li>
                  <strong className="block text-[#1c1917] text-sm mb-1">Leather Conditioning</strong>
                  <span className="text-[#57534e] text-sm leading-relaxed block">Leather is a natural skin that needs moisturizing. Apply a high-quality, specialized leather conditioner every 6 to 12 months to keep it soft, supple, and crack-free.</span>
                </li>
                <li>
                  <strong className="block text-[#1c1917] text-sm mb-1">Avoid Harsh Chemicals</strong>
                  <span className="text-[#57534e] text-sm leading-relaxed block">Never use baby wipes, multi-purpose cleaners, bleach, or solvents on your leather sofa. These will strip the protective topcoat and permanently damage the dye.</span>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* ════ CTA: CONTACT FOR HELP ════ */}
        <div className="bg-[#1c1917] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="max-w-xl">
            <h2 className="font-playfair text-2xl md:text-3xl font-bold text-white mb-3">
              Dealing with a stubborn stain?
            </h2>
            <p className="text-[#a8a29e] text-sm md:text-base leading-relaxed">
              Don't risk making it worse with the wrong cleaning product. Our care team is always happy to advise you on the safest way to treat specific spills and blemishes.
            </p>
          </div>
          <Link 
            href="/contact" 
            className="shrink-0 flex items-center justify-center gap-2 bg-white text-[#1c1917] px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition active:scale-95 w-full md:w-auto"
          >
            <Phone className="w-5 h-5" /> Ask Our Experts
          </Link>
        </div>

      </div>
    </div>
  );
}