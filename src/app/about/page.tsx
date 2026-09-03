// src/app/about/page.tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Banknote, MapPin, Shield, Truck } from 'lucide-react'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialSchema from '@/components/Editorial/EditorialSchema'
import EditorialLayout, { PullQuote } from '@/components/Editorial/EditorialLayout'
import { blurDataURL } from '@/utils/cloudinary'

/**
 * Said once, used twice: as the meta description, and as the description on
 * the page's own schema node. Two hand-written sentences describing the same
 * page is the sort of drift nobody notices and nothing benefits from.
 */
const DESCRIPTION =
  'A Blackburn furniture shop selling sofas with free UK Mainland delivery and cash on delivery. Who we are and how we work.'

export const metadata: Metadata = {
  title: 'About Us',
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
}

const WORKSHOP =
  'https://res.cloudinary.com/dmlna04yk/image/upload/v1782255171/Home-Page-Furniture-Background-Image-2_cgmd50.jpg'

const PROMISES = [
  {
    icon: Banknote,
    title: 'You pay when it arrives',
    body: 'Nothing upfront, no deposit, no card details. Cash or bank transfer at your door, once you have seen it.',
  },
  {
    icon: Truck,
    title: 'Delivery is free',
    body: 'Everywhere on UK Mainland, with no minimum order. It is not a threshold you have to reach.',
  },
  {
    icon: Shield,
    title: 'One-year guarantee',
    body: 'On the frame and the springs — the parts you cannot inspect and have to take on trust.',
  },
  {
    icon: MapPin,
    title: 'A real address',
    body: 'Unit 02, Waverledge Street, Blackburn. You can come and sit on one before you decide.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialSchema
        type="AboutPage"
        headline="About UK Sofa Shop"
        current="A sofa shop in Blackburn"
        path="/about"
        updated="2026-08-28"
        description={DESCRIPTION}
      />
      <EditorialHero
        eyebrow="Who we are"
        title="A sofa shop in Blackburn"
        lede="No showroom rent, no finance plans, no salesperson on commission. You pay when the sofa is in your room and not a moment before."
        breadcrumb={[{ label: 'Home', href: '/' }]}
        image={WORKSHOP}
      />

      <EditorialLayout>
        <p>
          We sell sofas. That is the whole business — not a lifestyle brand, not a marketplace, not
          a dropshipper with a warehouse somewhere abroad. A unit in Blackburn, a van, and a range
          we know well enough to tell you which one to avoid.
        </p>

        <h2>Why you pay on delivery</h2>
        <p>
          This is the part people ask about most, and it is the thing that most defines how we
          work. You do not pay us anything when you order. No deposit, no card on file, no finance
          agreement. The driver takes payment at your door, in cash or by bank transfer, after you
          have looked at the sofa.
        </p>
        <p>
          It exists because buying a sofa online is an act of faith. You are spending several
          hundred pounds on something you have only seen photographed, from a company you have
          probably not heard of, and the usual arrangement asks you to hand the money over first
          and find out afterwards. Paying on delivery turns that around: the risk sits with us
          until the thing is in your room and you are happy with it.
        </p>

        <PullQuote>
          If the sofa turns up and it is not right, you have not paid for it. That is the whole
          idea, and everything else we do follows from it.
        </PullQuote>

        <p>
          It also keeps us honest in a way a deposit does not. We cannot take the money and argue
          about the condition later, so it is in our interest that what arrives matches what you
          were shown — which is why the photographs are of the actual sofas and the dimensions are
          the ones from the maker.
        </p>

        <h2>What we are not</h2>
        <p>
          We do not have a retail park showroom, and we are not going to pretend the difference is
          purely philosophical. A showroom is rent, staff and stock sitting still, and all three
          end up in the price of a sofa. Ours is a working unit you can visit by appointment
          instead — quieter, less polished, and considerably cheaper to run.
        </p>
        <p>
          We also do not offer finance. Nobody here earns anything from arranging credit, so nobody
          here has a reason to steer you towards a more expensive sofa than the one you came for.
        </p>

        <h2>How we choose what to sell</h2>
        <p>
          The range is deliberately small. We would rather stock a dozen sofas we can answer
          questions about than three hundred we cannot — how firm the seat is, whether the arms
          come off, what the fabric does after two years with a dog on it.
        </p>
        <p>
          On our fabric ranges we also build to order: your colour, your material, your dimensions.
          That is the one thing a small operation can do that a large one struggles with, and it is
          usually cheaper than people expect.
        </p>

        <figure className="my-10">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-calico-200">
            <Image
              src={WORKSHOP}
              alt="Sofas in the Blackburn unit, photographed in daylight."
              fill
              sizes="(max-width: 1024px) 100vw, 720px"
              placeholder="blur"
              blurDataURL={blurDataURL(WORKSHOP)}
              className="object-cover"
            />
          </div>
          <figcaption className="mt-3 text-caption leading-relaxed text-ink-500">
            The unit in Blackburn. Visits are by appointment — it is not staffed for walk-ins.
          </figcaption>
        </figure>

        <h2>What we promise</h2>

        <div className="my-8 grid gap-3 sm:grid-cols-2">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-md border border-calico-300 bg-calico-50 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-ember-500/12">
                <Icon aria-hidden="true" className="h-5 w-5 text-ember-700" />
              </span>
              <h3 className="m-0 mt-4 text-body font-semibold text-ink-900">{title}</h3>
              <p className="m-0 mt-1 text-body-sm leading-relaxed text-ink-500">{body}</p>
            </div>
          ))}
        </div>

        <hr />

        <p>
          Come and see them at the{' '}
          <Link href="/showroom">Blackburn unit</Link>, have a look at{' '}
          <Link href="/shop/all">the range</Link>, or{' '}
          <Link href="/contact">ask us something</Link>. If you are weighing up whether a
          particular sofa will fit, the <Link href="/size-guide">size guide</Link> will answer it
          faster than we can.
        </p>
      </EditorialLayout>
    </div>
  )
}
