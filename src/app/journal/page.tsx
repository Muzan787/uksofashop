    // src/app/journal/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, PenTool, ArrowRight, Calendar, Clock, Newspaper } from 'lucide-react';

const ACCENT = '#d4871a';

export const metadata: Metadata = {
  title: 'The Journal | Vantage Group LTD',
  description: 'Interior design inspiration, sofa styling tips, and the latest news from Vantage Group LTD.',
};

// Placeholder data for your initial blog posts
const articles = [
  {
    id: 1,
    title: 'How to Style a Corner Sofa in a Compact Living Room',
    excerpt: 'Maximize your seating without overwhelming your space. Discover our expert tips for positioning and accessorizing large corner units.',
    category: 'Styling Guide',
    date: 'October 12, 2026',
    readTime: '5 min read',
  },
  {
    id: 2,
    title: 'Leather vs. Fabric: Choosing the Perfect Finish',
    excerpt: 'Struggling to decide between rich top-grain leather and soft woven fabric? We break down the pros, cons, and lifestyle factors for both.',
    category: 'Material Focus',
    date: 'September 28, 2026',
    readTime: '4 min read',
  },
  {
    id: 3,
    title: 'The Anatomy of a Handcrafted British Sofa',
    excerpt: 'Take a look inside the Vantage Group LTD workshop to see how hardwood frames and premium fillings create a sofa that lasts a lifetime.',
    category: 'Craftsmanship',
    date: 'September 15, 2026',
    readTime: '6 min read',
  },
];

export default function JournalPage() {
  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      
      {/* ════ HERO SECTION ════ */}
      <div className="bg-[#0c0c0b] border-b-2" style={{ borderColor: ACCENT }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-[10px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color: ACCENT }}>
            <BookOpen className="w-4 h-4" /> Inspiration & News
          </div>
          <h1 className="font-playfair text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            The Journal
          </h1>
          <p className="text-white/60 max-w-xl text-lg leading-relaxed mx-auto md:mx-0">
            Explore our latest thoughts on interior design trends, deep dives into our craftsmanship, and expert tips for looking after your furniture.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        
        {/* ════ ARTICLE GRID ════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {articles.map((article) => (
            <Link 
              key={article.id} 
              href={`/journal/${article.id}`} 
              className="group flex flex-col bg-white rounded-2xl border border-[#e7e5e4] overflow-hidden shadow-sm hover:shadow-md transition duration-300"
            >
              {/* Image Placeholder */}
              <div className="h-48 bg-[#f4f0ea] relative overflow-hidden flex items-center justify-center">
                <Newspaper className="w-10 h-10 text-[#d4871a] opacity-20 group-hover:scale-110 transition duration-500" />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#1c1917]">
                  {article.category}
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 flex flex-col flex-grow">
                <h2 className="font-playfair text-xl font-bold text-[#1c1917] mb-3 group-hover:text-[#d4871a] transition">
                  {article.title}
                </h2>
                <p className="text-[#57534e] text-sm leading-relaxed mb-6 flex-grow">
                  {article.excerpt}
                </p>
                
                <div className="flex items-center justify-between text-[#a8a29e] text-xs font-semibold pt-4 border-t border-[#f5f5f4]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {article.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {article.readTime}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ════ COLLABORATION / PRESS CTA ════ */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-[#e7e5e4] shadow-sm flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden">
          {/* Decorative Background Element */}
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#f8f6f2] rounded-full opacity-50 pointer-events-none"></div>
          
          <div className="max-w-2xl relative z-10 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
                <PenTool className="w-5 h-5" style={{ color: ACCENT }} />
              </div>
              <h2 className="font-playfair text-2xl md:text-3xl font-bold text-[#1c1917]">
                Write for Us / Press Inquiries
              </h2>
            </div>
            <p className="text-[#57534e] text-base leading-relaxed mb-0">
              Are you an interior designer, home lifestyle blogger, or journalist? We love collaborating with passionate voices in the design community. Whether you want to feature our products or contribute an article to The Journal, our team would love to hear from you.
            </p>
          </div>

          <Link 
            href="/contact" 
            className="shrink-0 flex items-center justify-center gap-2 bg-[#1c1917] text-white px-8 py-4 rounded-xl font-bold hover:bg-black transition active:scale-95 w-full md:w-auto relative z-10 shadow-md"
          >
            Get in Touch <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}