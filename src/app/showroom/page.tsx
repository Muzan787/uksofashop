// src/app/showroom/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { Store, MapPin, Clock, Phone, Mail, CalendarCheck, Sofa, Ruler, Palette } from 'lucide-react';

import { PHONE_HREF, PHONE_DISPLAY } from '@/constants/contact'
export const metadata: Metadata = {
  alternates: { canonical: '/showroom' },
  title: 'Visit Our Showroom',
  description:
    'See our sofas in person at our Blackburn showroom, Unit 02 Waverledge Street, BB6 7LS. Visits are by appointment - call, WhatsApp or email to book a time.',
};

const ACCENT = '#d4871a';

const BOOKING = [
  { icon: Phone, label: 'Call', value: PHONE_DISPLAY, href: PHONE_HREF },
  { icon: Store, label: 'WhatsApp', value: 'Message us', href: 'https://wa.me/447476616022' },
  { icon: Mail, label: 'Email', value: 'uksofashop.co.uk@gmail.com', href: 'mailto:uksofashop.co.uk@gmail.com' },
];

const WHAT_TO_EXPECT = [
  {
    icon: Sofa,
    title: 'Sit on it first',
    body: 'Try the seat depth, the back height and the firmness before you commit. Photographs cannot tell you how a sofa feels.',
  },
  {
    icon: Palette,
    title: 'See the real fabric',
    body: 'Compare colours and materials in daylight. Screens shift colour, and a swatch in your hand settles it.',
  },
  {
    icon: Ruler,
    title: 'Talk through sizes',
    body: 'Bring your room measurements and we will work out what fits, including access through doors and stairs.',
  },
];

export default function ShowroomPage() {
  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      {/* The FurnitureStore schema for this address is emitted site-wide from
          the root layout - a second copy here would be a duplicate entity. */}

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#0c0c0b] border-b-2 border-[#d4871a]">
        <div className="max-w-4xl mx-auto px-5 py-14 sm:py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#d4871a]/15 border border-[#d4871a]/30 flex items-center justify-center mx-auto mb-6 text-[#d4871a]">
            <Store className="w-7 h-7" />
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4871a] mb-3">
            By appointment · Blackburn
          </p>

          <h1 className="font-playfair font-bold text-white text-[clamp(28px,7vw,52px)] leading-tight mb-5">
            Visit Our Showroom
          </h1>

          <p className="text-[15px] sm:text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
            Come and see our sofas in person before you buy. We open the showroom
            by appointment so you get the space, the time and someone to talk to
            rather than a busy shop floor.
          </p>

          <a
            href={PHONE_HREF}
            className="inline-flex items-center justify-center gap-2 bg-[#d4871a] text-white mt-8 px-8 py-4 rounded-xl font-bold text-sm hover:bg-[#b67316] active:scale-95 transition shadow-lg"
          >
            <CalendarCheck className="w-5 h-5" /> Book an appointment
          </a>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-5 py-12 sm:py-16 flex flex-col gap-10 sm:gap-14">

        {/* ── Where and when ───────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-[#f0ede8] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4" style={{ color: ACCENT }} />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a8a29e]">
                Where to find us
              </h2>
            </div>
            <address className="not-italic text-[15px] leading-relaxed text-[#1c1917] font-medium">
              Unit 02, Waverledge Street
              <br />
              Blackburn
              <br />
              BB6 7LS
            </address>
            <p className="text-[13px] text-[#57534e] mt-4 leading-relaxed">
              There is parking on site. Please book before travelling — the unit
              is not staffed for walk-ins.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#f0ede8] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4" style={{ color: ACCENT }} />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a8a29e]">
                Appointment times
              </h2>
            </div>
            <dl className="text-[15px] text-[#1c1917]">
              <div className="flex justify-between py-2 border-b border-[#f5f5f4]">
                <dt className="text-[#57534e]">Monday – Friday</dt>
                <dd className="font-medium">9am – 6pm</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-[#f5f5f4]">
                <dt className="text-[#57534e]">Saturday</dt>
                <dd className="font-medium">10am – 4pm</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-[#57534e]">Sunday</dt>
                <dd className="font-medium text-[#a8a29e]">Closed</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ── How to book ──────────────────────────────────────────────────── */}
        <section>
          <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1c1917] mb-2">
            Booking a visit
          </h2>
          <p className="text-[15px] text-[#57534e] mb-6 max-w-2xl leading-relaxed">
            Tell us roughly when you would like to come and which sofas you want
            to see, and we will confirm a time. Any of these reach the same team.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {BOOKING.map(({ icon: Icon, label, value, href }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="bg-white rounded-2xl p-5 border border-[#f0ede8] shadow-sm hover:border-[#d4871a]/40 hover:shadow-md active:scale-[0.98] transition flex items-center gap-4 sm:flex-col sm:items-start sm:gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#fef9f0] border border-[#d4871a]/20 flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px]" style={{ color: ACCENT }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a8a29e] mb-1">
                    {label}
                  </p>
                  <p className="text-[14px] font-semibold text-[#1c1917] truncate">
                    {value}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── What to expect ───────────────────────────────────────────────── */}
        <section>
          <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1c1917] mb-6">
            What a visit is for
          </h2>

          <div className="flex flex-col gap-3">
            {WHAT_TO_EXPECT.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-[#f0ede8] shadow-sm flex gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#fef9f0] border border-[#d4871a]/20 flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px]" style={{ color: ACCENT }} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#1c1917] mb-1">{title}</h3>
                  <p className="text-[14px] text-[#57534e] leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[13px] text-[#78716c] mt-5 leading-relaxed">
            Not every sofa in our range is on display at any one time. Let us know
            what you are interested in when you book and we will tell you honestly
            what you will be able to see.
          </p>
        </section>

        {/* ── Closing CTA ──────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#f0ede8] shadow-sm text-center">
          <h2 className="font-playfair text-xl sm:text-2xl font-bold text-[#1c1917] mb-2">
            Cannot make it to Blackburn?
          </h2>
          <p className="text-[14px] text-[#57534e] mb-6 max-w-lg mx-auto leading-relaxed">
            The full range is online with free delivery across UK Mainland, and
            you pay only when your sofa arrives.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/shop/all"
              className="flex items-center justify-center gap-2 bg-[#1c1917] text-white px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-black active:scale-95 transition shadow-md"
            >
              Browse all sofas
            </Link>
            <Link
              href="/contact"
              className="flex items-center justify-center gap-2 bg-white border border-[#e7e5e4] text-[#1c1917] px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-stone-50 active:scale-95 transition"
            >
              Contact us
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
