// src/app/size-guide/page.tsx
import { Metadata } from 'next';
import { Ruler, DoorOpen, Home, ArrowRight, ArrowDownToLine, Maximize } from 'lucide-react';

const ACCENT = '#d4871a';

export const metadata: Metadata = {
  title: 'Sofa Size & Measurement Guide | Vantage Group LTD',
  description: 'Ensure your perfect sofa fits perfectly. Use our measurement guide or submit your home dimensions for a complimentary fit check.',
};

export default function SizeGuidePage() {
  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      
      {/* ════ HERO SECTION ════ */}
      <div className="bg-[#0c0c0b] border-b-2" style={{ borderColor: ACCENT }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color: ACCENT }}>
            Complimentary Service
          </div>
          <h1 className="font-playfair text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Will It Fit?
          </h1>
          <p className="text-white/60 max-w-xl text-lg leading-relaxed">
            There is nothing worse than your dream sofa getting stuck in the hallway. Follow our measurement guide below, or send us your dimensions and our experts will verify the fit for you.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          
          {/* ════ LEFT COLUMN: HOW TO MEASURE ════ */}
          <div>
            <h2 className="font-playfair text-3xl font-bold text-[#1c1917] mb-8">
              How to Measure
            </h2>
            
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex gap-5">
                <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-white border border-[#e7e5e4] shadow-sm">
                  <DoorOpen className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1c1917] mb-2">1. Front Doors & Entrances</h3>
                  <p className="text-[#57534e] text-sm leading-relaxed">
                    Open your door as wide as possible. Measure the narrowest point of the doorway (from the inside of the frame to the edge of the door). Don't forget to check the height of the door frame too.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-5">
                <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-white border border-[#e7e5e4] shadow-sm">
                  <ArrowDownToLine className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1c1917] mb-2">2. Hallways & Tight Corners</h3>
                  <p className="text-[#57534e] text-sm leading-relaxed">
                    Measure the width of your hallway, taking note of any radiators, skirting boards, or light fixtures that stick out. If there is a corner, measure the clearance space needed to pivot a large box.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-5">
                <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-white border border-[#e7e5e4] shadow-sm">
                  <Maximize className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1c1917] mb-2">3. The Final Room</h3>
                  <p className="text-[#57534e] text-sm leading-relaxed">
                    Map out the footprint of the sofa on your floor using masking tape or newspaper. Ensure there is enough room to walk around it and that it doesn't block doors, windows, or plug sockets.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 bg-white p-6 rounded-2xl border border-[#e7e5e4] shadow-sm flex items-start gap-4">
              <Ruler className="w-8 h-8 shrink-0 mt-1" style={{ color: ACCENT }} />
              <div>
                <h4 className="font-bold text-[#1c1917] mb-1">Pro Tip</h4>
                <p className="text-[#57534e] text-sm">
                  Our sofas usually come in pieces, and the legs are removable! This makes them surprisingly easy to fit through standard UK doorways.
                </p>
              </div>
            </div>
          </div>


          {/* ════ RIGHT COLUMN: DIMENSION SUBMISSION FORM ════ */}
          <div>
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-[#e7e5e4]">
              <div className="mb-8">
                <h2 className="font-playfair text-2xl font-bold text-[#1c1917] mb-2">
                  Request a Fit Check
                </h2>
                <p className="text-[#57534e] text-sm">
                  Fill out the details below. Our delivery experts will review your dimensions and confirm if your chosen sofa will fit safely.
                </p>
              </div>

              {/* NOTE: You can wire this form up to your existing contact action later */}
              <form className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#a8a29e] uppercase tracking-wider">Your Name</label>
                    <input type="text" required className="w-full bg-[#f8f6f2] border border-[#e7e5e4] rounded-xl p-3.5 text-sm outline-none focus:border-[#d4871a] transition" placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#a8a29e] uppercase tracking-wider">Email Address</label>
                    <input type="email" required className="w-full bg-[#f8f6f2] border border-[#e7e5e4] rounded-xl p-3.5 text-sm outline-none focus:border-[#d4871a] transition" placeholder="john@example.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#a8a29e] uppercase tracking-wider">Which Sofa are you looking at?</label>
                  <input type="text" className="w-full bg-[#f8f6f2] border border-[#e7e5e4] rounded-xl p-3.5 text-sm outline-none focus:border-[#d4871a] transition" placeholder="e.g. The Cloud Corner Sofa" />
                </div>

                <div className="pt-4 pb-2 border-b border-[#f5f5f4]">
                  <h3 className="font-bold text-[#1c1917] text-sm">Your Dimensions (in cm)</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-wider">Door Width</label>
                    <input type="number" className="w-full bg-[#f8f6f2] border border-[#e7e5e4] rounded-xl p-3 text-sm outline-none focus:border-[#d4871a] transition" placeholder="e.g. 80" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-wider">Hallway Width</label>
                    <input type="number" className="w-full bg-[#f8f6f2] border border-[#e7e5e4] rounded-xl p-3 text-sm outline-none focus:border-[#d4871a] transition" placeholder="e.g. 100" />
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-wider">Ceiling Height</label>
                    <input type="number" className="w-full bg-[#f8f6f2] border border-[#e7e5e4] rounded-xl p-3 text-sm outline-none focus:border-[#d4871a] transition" placeholder="e.g. 240" />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-[#a8a29e] uppercase tracking-wider">Any obstacles? (Stairs, tight corners?)</label>
                  <textarea rows={3} className="w-full bg-[#f8f6f2] border border-[#e7e5e4] rounded-xl p-3.5 text-sm outline-none focus:border-[#d4871a] transition resize-none" placeholder="Let us know if you live in a flat or have a winding staircase..."></textarea>
                </div>

                <button 
                  type="button" 
                  className="w-full flex items-center justify-center gap-2 bg-[#1c1917] text-white py-4 rounded-xl font-bold shadow-md hover:bg-black active:scale-[0.98] transition mt-4"
                >
                  Submit Dimensions <ArrowRight className="w-4 h-4" />
                </button>

              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}