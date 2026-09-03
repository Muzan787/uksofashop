// src/app/showroom/page.tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CalendarCheck, Mail, MapPin, MessageCircle, Palette, Phone, Ruler, Sofa } from 'lucide-react'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialSchema from '@/components/Editorial/EditorialSchema'
import EditorialLayout, { Note, PullQuote } from '@/components/Editorial/EditorialLayout'
import { blurDataURL } from '@/utils/cloudinary'
import { PHONE_DISPLAY, PHONE_HREF } from '@/constants/contact'

/**
 * Said once, used twice: as the meta description, and as the description on
 * the page's own schema node. Two hand-written sentences describing the same
 * page is the sort of drift nobody notices and nothing benefits from.
 */
const DESCRIPTION =
  'See our sofas in person at our Blackburn showroom, Unit 02 Waverledge Street, BB6 7LS. Visits are by appointment — call, WhatsApp or email to book a time.'

export const metadata: Metadata = {
  alternates: { canonical: '/showroom' },
  title: 'Sofa Showroom in Blackburn',
  description: DESCRIPTION,
}

const SUPPORT_EMAIL = 'uksofashop.co.uk@gmail.com'

/** The address, in one place, so the map link and the schema cannot disagree. */
const ADDRESS = {
  line1: 'Unit 02, Waverledge Street',
  town: 'Blackburn',
  postcode: 'BB6 7LS',
}
const ADDRESS_QUERY = encodeURIComponent(
  `${ADDRESS.line1}, ${ADDRESS.town}, ${ADDRESS.postcode}`,
)

/** Centred on the postcode. The bbox is roughly 700m across. */
const OSM_EMBED =
  'https://www.openstreetmap.org/export/embed.html?bbox=-2.4085%2C53.7815%2C-2.3925%2C53.7895&layer=mapnik&marker=53.7855%2C-2.4005'
const OSM_LINK = 'https://www.openstreetmap.org/?mlat=53.7855&mlon=-2.4005#map=17/53.7855/-2.4005'

const PHOTOGRAPH =
  'https://res.cloudinary.com/dmlna04yk/image/upload/v1782255171/Home-Page-Furniture-Background-Image-2_cgmd50.jpg'

const HOURS = [
  { day: 'Monday – Friday', time: '9am – 6pm' },
  { day: 'Saturday', time: '10am – 4pm' },
  { day: 'Sunday', time: 'Closed', closed: true },
]

const BOOKING = [
  { icon: Phone, label: 'Call', value: PHONE_DISPLAY, href: PHONE_HREF },
  { icon: MessageCircle, label: 'WhatsApp', value: 'Message us', href: 'https://wa.me/447476616022' },
  { icon: Mail, label: 'Email', value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
]

const WHAT_TO_EXPECT = [
  {
    icon: Sofa,
    title: 'Sit on it first',
    body: 'Seat depth, back height, how firm it is. A photograph cannot tell you any of those, and they are the three things people change their mind about.',
  },
  {
    icon: Palette,
    title: 'See the real fabric',
    body: 'Compare colours and materials in daylight. Screens shift colour more than anyone expects, and a swatch in your hand settles it in seconds.',
  },
  {
    icon: Ruler,
    title: 'Work out what fits',
    body: 'Bring your room measurements and we will go through them with you, including access through doors and up stairs.',
  },
]

export default function ShowroomPage() {
  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialSchema
        type="WebPage"
        headline="Visit Our Blackburn Showroom"
        current="Come and sit on one"
        path="/showroom"
        updated="2026-08-28"
        description={DESCRIPTION}
      />
      {/* The FurnitureStore schema for this address is emitted site-wide from
          the root layout — a second copy here would be a duplicate entity. */}

      <EditorialHero
        eyebrow="By appointment · Blackburn"
        title="Come and sit on one"
        lede="We open the showroom by appointment, so you get the space, the time and someone to talk to rather than a busy shop floor."
        breadcrumb={[{ label: 'Home', href: '/' }]}
        image={PHOTOGRAPH}
      >
        <a
          href={PHONE_HREF}
          className="hover-btn inline-flex h-14 items-center gap-2 rounded-sm bg-ember-500 px-7 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900 no-underline"
        >
          <CalendarCheck aria-hidden="true" className="h-4 w-4" />
          Book an appointment
        </a>
      </EditorialHero>

      <EditorialLayout
        aside={
          <>
            {/* ── Where and when ─────────────────────────────────────────── */}
            <section className="mt-12 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-calico-300 bg-calico-50 p-5">
                <p className="m-0 flex items-center gap-2 font-data text-eyebrow uppercase tracking-[0.16em] text-ink-500">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-ember-700" />
                  Where to find us
                </p>
                <address className="mt-4 not-italic">
                  <span className="block font-display text-h3 font-semibold leading-snug text-ink-900">
                    {ADDRESS.line1}
                  </span>
                  <span className="mt-1 block text-body text-ink-700">{ADDRESS.town}</span>
                  <span className="mt-1 block font-data text-body font-bold tracking-[0.08em] text-ink-900">
                    {ADDRESS.postcode}
                  </span>
                </address>
                <p className="m-0 mt-4 text-body-sm leading-relaxed text-ink-500">
                  There is parking on site. Please book before travelling — the unit is not
                  staffed for walk-ins.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${ADDRESS_QUERY}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover-btn inline-flex h-11 items-center rounded-sm border border-calico-300 px-4 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-700 no-underline"
                  >
                    Google Maps
                  </a>
                  <a
                    href={`https://maps.apple.com/?q=${ADDRESS_QUERY}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover-btn inline-flex h-11 items-center rounded-sm border border-calico-300 px-4 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-700 no-underline"
                  >
                    Apple Maps
                  </a>
                </div>
              </div>

              <div className="rounded-md border border-calico-300 bg-calico-50 p-5">
                <p className="m-0 flex items-center gap-2 font-data text-eyebrow uppercase tracking-[0.16em] text-ink-500">
                  <CalendarCheck aria-hidden="true" className="h-3.5 w-3.5 text-ember-700" />
                  Appointment times
                </p>
                <dl className="m-0 mt-4">
                  {HOURS.map(({ day, time, closed }) => (
                    <div
                      key={day}
                      className="flex items-baseline justify-between gap-4 border-b border-calico-100 py-3 last:border-b-0 last:pb-0"
                    >
                      <dt className="text-body-sm text-ink-500">{day}</dt>
                      <dd
                        className={`m-0 font-data text-body-sm font-bold tabular-nums ${
                          closed ? 'text-ink-500' : 'text-ink-900'
                        }`}
                      >
                        {time}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="m-0 mt-4 text-caption leading-relaxed text-ink-500">
                  Outside these hours? Ask anyway. If we can open up for you we will.
                </p>
              </div>
            </section>

            {/* ── The map ────────────────────────────────────────────────── */}
            <section aria-labelledby="map-heading" className="mt-4">
              <h2 id="map-heading" className="sr-only">
                Map of the showroom location
              </h2>
              <div className="overflow-hidden rounded-md border border-calico-300 bg-calico-200">
                {/* OpenStreetMap rather than a Google embed: it needs no API
                    key and sets no cookies, so it cannot load before a visitor
                    has answered the consent banner. */}
                <iframe
                  src={OSM_EMBED}
                  title={`Map showing ${ADDRESS.line1}, ${ADDRESS.town} ${ADDRESS.postcode}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="block h-[320px] w-full border-0 sm:h-[380px]"
                />
              </div>
              <p className="m-0 mt-2 text-caption text-ink-500">
                Map data ©{' '}
                <a
                  href={OSM_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover-link font-semibold text-ember-700 no-underline"
                >
                  OpenStreetMap contributors
                </a>. The marker is the postcode centre — call us if you cannot find the unit.
              </p>
            </section>

            {/* ── The photograph ─────────────────────────────────────────── */}
            <figure className="m-0 mt-8">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-calico-200">
                <Image
                  src={PHOTOGRAPH}
                  alt="Sofas arranged in the Blackburn showroom, lit from a window on the left."
                  fill
                  sizes="(max-width: 1024px) 100vw, 960px"
                  placeholder="blur"
                  blurDataURL={blurDataURL(PHOTOGRAPH)}
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 text-caption leading-relaxed text-ink-500">
                Not every sofa in the range is on display at once. Tell us what you want to see
                when you book and we will say honestly what will be there.
              </figcaption>
            </figure>

            {/* ── How to book ────────────────────────────────────────────── */}
            <section className="mt-12">
              <h2 className="m-0 font-display text-h2 font-semibold text-ink-900">Booking a visit</h2>
              <p className="m-0 mt-3 max-w-[52ch] text-body leading-relaxed text-ink-700">
                Tell us roughly when you would like to come and which sofas you want to see, and
                we will confirm a time. All three reach the same people.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {BOOKING.map(({ icon: Icon, label, value, href }) => (
                  <a
                    key={label}
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-4 rounded-md border border-calico-300 bg-calico-50 p-4 no-underline transition-colors duration-swift ease-out-expo hover:border-ink-400 sm:flex-col sm:items-start sm:gap-3"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-ember-500/12">
                      <Icon aria-hidden="true" className="h-5 w-5 text-ember-700" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-data text-eyebrow uppercase tracking-[0.14em] text-ink-500">
                        {label}
                      </span>
                      <span className="mt-1 block truncate text-body-sm font-semibold text-ink-900">
                        {value}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </section>

            {/* ── Closing ────────────────────────────────────────────────── */}
            <section className="mt-12 rounded-md border border-ink-700 bg-ink-900 p-6 text-center sm:p-8">
              <h2 className="m-0 font-display text-h2 font-semibold text-calico-50">
                Cannot get to Blackburn?
              </h2>
              <p className="m-0 mx-auto mt-3 max-w-[46ch] text-body-sm leading-relaxed text-calico-300">
                The full range is online with free delivery across UK Mainland, and you pay only
                when your sofa is in the room.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/shop/all"
                  className="hover-btn flex h-12 items-center justify-center rounded-sm bg-ember-500 px-6 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900 no-underline"
                >
                  Browse all sofas
                </Link>
                <Link
                  href="/contact"
                  className="hover-btn hover-btn-dark flex h-12 items-center justify-center rounded-sm border border-calico-50/25 px-6 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-calico-50 no-underline"
                >
                  Ask us something
                </Link>
              </div>
            </section>
          </>
        }
      >
        <p>
          We are a small unit in Blackburn rather than a retail park, which is deliberate. It
          means when you come we are not splitting our attention across a shop floor — you get
          the place to yourself and someone who knows the range.
        </p>

        <h2>What a visit is for</h2>
        <p>
          Three things you cannot do from a photograph, and they are the three that decide whether
          you keep a sofa or spend a year wishing you had bought the other one.
        </p>

        <div className="my-8 flex flex-col gap-3">
          {WHAT_TO_EXPECT.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4 rounded-md border border-calico-300 bg-calico-50 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-ember-500/12">
                <Icon aria-hidden="true" className="h-5 w-5 text-ember-700" />
              </span>
              <div className="min-w-0">
                <h3 className="m-0 text-body font-semibold text-ink-900">{title}</h3>
                <p className="m-0 mt-1 text-body-sm leading-relaxed text-ink-500">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <PullQuote>
          Bring your measurements. Half the conversations we have in the showroom end up being
          about a doorway, and it is much easier to answer with the numbers in front of us.
        </PullQuote>

        <Note title="Before you set off">
          <p>
            Book first. The unit is a working warehouse and it is not staffed for walk-ins, so
            turning up unannounced usually means a locked door. Ten minutes on the phone the day
            before saves the journey.
          </p>
        </Note>
      </EditorialLayout>
    </div>
  )
}
