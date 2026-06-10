// src/app/careers/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, ArrowLeft, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Careers | Vantage Group LTD',
  description: 'Explore career opportunities and join the team at Vantage Group LTD.',
};

export default function CareersPage() {
  return (
    <div className="min-h-[75vh] bg-[#f8f6f2] flex flex-col items-center justify-center px-4 py-20 text-center animate-in fade-in duration-700">
      
      {/* Icon Badge */}
      <div className="w-20 h-20 bg-white rounded-full shadow-sm border border-[#e7e5e4] flex items-center justify-center mb-6 text-[#d4871a]">
        <Briefcase className="w-10 h-10" />
      </div>
      
      <h1 className="text-4xl md:text-6xl font-playfair font-bold text-[#1c1917] mb-4">
        Join Our Team
      </h1>
      
      <div className="flex items-center justify-center gap-2 text-[#d4871a] font-bold text-sm tracking-widest uppercase mb-6">
        <Users className="w-4 h-4" /> Careers Portal Coming Soon
      </div>

      <p className="text-lg text-[#57534e] max-w-2xl mx-auto mb-10 leading-relaxed">
        Whether your expertise lies in traditional British upholstery, premium customer service, or digital innovation, we are always looking for passionate talent to join us.
        <br /><br />
        We are currently building our dedicated careers portal to showcase open roles. Please check back in the near future for updates on how you can help us shape the future of premium furniture.
      </p>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
        <Link 
          href="/contact" 
          className="flex items-center justify-center gap-2 bg-[#1c1917] text-white px-8 py-4 rounded-xl font-bold hover:bg-black transition active:scale-95 shadow-md"
        >
          Contact Us Directly
        </Link>

        <Link 
          href="/" 
          className="flex items-center justify-center gap-2 bg-white border border-[#e7e5e4] text-[#1c1917] px-8 py-4 rounded-xl font-bold hover:bg-stone-50 transition active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" /> Return Home
        </Link>
      </div>

    </div>
  );
}