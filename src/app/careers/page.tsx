// src/app/careers/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialLayout, { Note } from '@/components/Editorial/EditorialLayout'
import EmptyState from '@/components/UI/EmptyState'

export const metadata: Metadata = {
  alternates: { canonical: '/careers' },
  title: 'Careers',
  description:
    'No open roles at UK Sofa Shop right now. If you upholster, drive, or know furniture, write to us anyway.',
  // No roles listed, so there is nothing here for a jobs crawler to index.
  robots: { index: false, follow: true },
}

const SUPPORT_EMAIL = 'uksofashop.co.uk@gmail.com'

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialHero
        eyebrow="Working here"
        title="Careers"
        lede="We are a small team in Blackburn. There is nothing advertised at the moment, but that is not the same as nothing available."
        breadcrumb={[{ label: 'Home', href: '/' }]}
      />

      <EditorialLayout>
        <EmptyState
          icon={Briefcase}
          heading="No open roles right now"
          line="When there are, they will be listed here rather than only on a job board."
          action={{ label: 'Write to us anyway', href: '/contact' }}
          className="not-prose"
        />

        <h2>Write to us anyway</h2>
        <p>
          We are small enough that we do not really recruit on a schedule — we take people on when
          the right one turns up, which means a speculative email is genuinely worth sending. It
          gets read by someone who can act on it, not filtered by a system.
        </p>
        <p>The kinds of work that come up here:</p>
        <ul>
          <li>
            <strong>Upholstery and making.</strong> We build to order on the fabric ranges, so
            hands-on experience counts for more than a CV does.
          </li>
            <li>
            <strong>Delivery and installation.</strong> Two-person crews, mostly the North and
            Midlands. This is the job that decides what customers think of us, so we care about it
            more than the title suggests.
          </li>
          <li>
            <strong>Customer help.</strong> Answering the phone and the messages, and being
            straight with people about whether a sofa will fit. Knowing furniture matters; a
            script does not.
          </li>
        </ul>

        <Note title="What to send">
          <p>
            A paragraph about what you have done and what you are after. Attach a CV if you have
            one to hand, but do not build one on our account — we would rather read the paragraph.
            Email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-ember-700">{SUPPORT_EMAIL}</a>{' '}
            or use the <Link href="/contact" className="font-semibold text-ember-700">contact form</Link>.
          </p>
        </Note>

        <h2>What it is like</h2>
        <p>
          Honest version: it is a working unit, not an office. The team is small, so everybody
          does a bit of everything and there is nowhere to hide a bad day. The upside of that is
          that decisions happen in a conversation rather than a quarter, and the person you would
          be working for is the person who owns the place.
        </p>

        <hr />

        <p className="fine">
          We reply to everyone, including to say no. If you have not heard back within a week,
          chase us — it will be an oversight rather than an answer.
        </p>
      </EditorialLayout>
    </div>
  )
}
