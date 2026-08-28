// src/app/privacy/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialLayout, { LastUpdated } from '@/components/Editorial/EditorialLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What personal data UK Sofa Shop collects, why we hold it, how long we keep it, and how to ask us to delete it.',
  alternates: { canonical: '/privacy' },
}

/** Set by hand. See the note in src/app/terms/page.tsx. */
const LAST_UPDATED = '2026-08-27'

const SUPPORT_EMAIL = 'uksofashop.co.uk@gmail.com'

const TOC = [
  { id: 'collect', label: 'What we collect' },
  { id: 'use', label: 'What we use it for' },
  { id: 'sharing', label: 'Who else sees it' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'retention', label: 'How long we keep it' },
  { id: 'rights', label: 'Your rights' },
  { id: 'complaints', label: 'Complaints' },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialHero
        eyebrow="Legal"
        title="Privacy policy"
        lede="What we collect, why we hold it, how long for, and how to make us delete it."
        breadcrumb={[{ label: 'Home', href: '/' }]}
        meta={<LastUpdated date={LAST_UPDATED} />}
      />

      <EditorialLayout toc={TOC}>
        <p>
          UK Sofa Shop is the data controller for the information described here. We collect as
          little as we can get away with, we do not sell any of it, and everything below is what
          actually happens rather than what a template says.
        </p>

        <h2 id="collect">1. What we collect</h2>
        <p>
          We collect information when you place an order, make an enquiry, leave a review or
          simply browse the site. That can include:
        </p>
        <ul>
          <li>Your name, delivery address, email address and phone number</li>
          <li>What you ordered, and the delivery options you chose</li>
          <li>Your IP address, and which pages you visited and when</li>
          <li>Anything you type into a form — a message, a review, your room measurements</li>
        </ul>
        <p>
          We never see or store card details, because we do not take card payments. Payment happens
          at your door, in cash or by bank transfer, and nothing about it passes through this site.
        </p>

        <h2 id="use">2. What we use it for</h2>
        <ul>
          <li>Processing and delivering the order you placed</li>
          <li>Telling you where that order has got to</li>
          <li>Answering the question you asked us</li>
          <li>Sending you things you have specifically asked to receive</li>
          <li>Understanding how the site is used, so we can make it work better</li>
          <li>Meeting our legal and tax obligations</li>
        </ul>
        <p>
          The lawful bases are contract for anything to do with fulfilling your order, consent for
          analytics and marketing, and legitimate interests for keeping the site secure and working.
        </p>

        <h2 id="sharing">3. Who else sees it</h2>
        <p>
          We do not sell or rent your personal data to anybody, ever. We share the minimum needed
          to get your sofa to you — usually your name, address and phone number — with the delivery
          team who are bringing it.
        </p>
        <p>
          Beyond that, the site runs on services that necessarily process some data on our behalf:
          hosting and databases, email delivery for order confirmations, image hosting, and — only
          if you agree to them — analytics and advertising measurement. Our{' '}
          <Link href="/cookies">cookies page</Link> names each one and what it does.
        </p>

        <h2 id="cookies">4. Cookies</h2>
        <p>
          Some storage is essential and cannot be turned off: your basket, your session, and the
          record of the cookie choice you made. Everything else — analytics, advertising
          measurement — is set only after you have agreed, and you can change your mind at any time
          from the <Link href="/cookies">cookies page</Link>.
        </p>

        <h2 id="retention">5. How long we keep it</h2>
        <p>
          Order records are kept for seven years, because UK tax law requires it. Enquiries and
          messages are kept for as long as they are useful to the conversation and then deleted.
          Analytics data expires on the schedule set by the provider. You can ask us to delete
          anything that is not covered by a legal obligation to keep it.
        </p>

        <h2 id="rights">6. Your rights</h2>
        <p>Under UK GDPR you have the right to:</p>
        <ul>
          <li>See the personal data we hold about you</li>
          <li>Have inaccurate data corrected</li>
          <li>Have your data deleted, where nothing obliges us to keep it</li>
          <li>Object to, or restrict, how we process it</li>
          <li>Receive a copy in a machine-readable format</li>
          <li>Withdraw consent for anything you agreed to, at any time</li>
        </ul>
        <p>
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will act on it. There
          is no charge, and we will respond within one month.
        </p>

        <h2 id="complaints">7. Complaints</h2>
        <p>
          If you think we have handled your data badly, tell us first — we would rather fix it. You
          also have the right to complain to the Information Commissioner’s Office, the UK’s data
          protection regulator, at{' '}
          <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer">
            ico.org.uk
          </a>{' '}
          or on 0303 123 1113.
        </p>

        <hr />

        <p className="fine">
          Questions about any of this? <Link href="/contact">Contact us</Link>.
        </p>
      </EditorialLayout>
    </div>
  )
}
