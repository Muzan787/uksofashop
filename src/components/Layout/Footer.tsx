'use client';
// src/components/Layout/Footer.tsx

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ArrowUp, Phone, Mail, MapPin, Clock,
  Facebook, Instagram, Shield, Truck, Gem, Ruler, Loader2, Check,
} from 'lucide-react';
import { TRUST_POINTS } from '@/constants/promises';
import { subscribeToNewsletter } from '@/app/actions/newsletter';
import { openCookiePreferences } from '@/utils/consent';
import {
  SOCIAL_PROFILES, PHONE_DISPLAY, PHONE_HREF, SUPPORT_EMAIL, ADDRESS, OPENING_HOURS,
} from '@/constants/contact';
import TikTokIcon from '@/components/UI/TikTokIcon';
import type { NavCategory } from '@/utils/navigation';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE FOOTER
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Same surface as the hero and the closing panel: the ink gradient, three
 * drifting washes of light, and grain over the top. That matters more here than
 * anywhere else on the page, because the footer follows the closing call to
 * action and both are dark — on a flat ink-900 fill the two ran together into
 * one long black stretch with no edge between them. The gradient gives the
 * footer its own tonal shape, and an ember hairline across the top says where
 * one ends and the other starts.
 *
 * Everything else is borrowed from the homepage so the two read as one
 * document: column headings are the eyebrow-and-rule used by every section
 * heading, the trust cells carry the ember-led rule from the figures band, the
 * newsletter sits in the same glass panel as the hero badge, and the sign-up
 * button is the same ember gradient as every other primary action.
 */

const supportLinks = [
  { href: '/contact',          label: 'Contact Us' },
  { href: '/delivery-returns', label: 'Delivery & Returns' },
  { href: '/faq',              label: 'FAQs' },
  { href: '/track-order',      label: 'Track Your Order' },
  { href: '/size-guide',       label: 'Size Guide' },
  { href: '/care-guide',       label: 'Care Guide' },
  { href: '/fabrics',          label: 'Fabric Guide' },
];

const companyLinks = [
  { href: '/about',    label: 'Our Story' },
  { href: '/showroom', label: 'Showroom' },
  { href: '/journal',  label: 'Journal' },
  { href: '/careers',  label: 'Careers' },
  { href: '/sitemap',  label: 'Sitemap' },
];

const legalLinks = [
  { href: '/terms',   label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/cookies', label: 'Cookies' },
];

const SOCIAL_ICONS = { facebook: Facebook, instagram: Instagram, tiktok: TikTokIcon } as const;
const SOCIAL_LABELS = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' } as const;

const socials = SOCIAL_PROFILES.map(({ platform, url }) => ({
  Icon: SOCIAL_ICONS[platform],
  href: url,
  label: SOCIAL_LABELS[platform],
}));

const TRUST_ICONS = [Truck, Gem, Ruler, Shield];
const trust = TRUST_POINTS.map((p, i) => ({ Icon: TRUST_ICONS[i] ?? Shield, ...p }));

/**
 * Column heading — one style, so the four columns cannot drift apart.
 *
 * The ember rule in front of the label is the same mark the homepage section
 * headings carry. It is what makes a footer column read as belonging to the
 * page above it rather than to a different template.
 */
function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="eyebrow m-0 mb-4 flex items-center gap-2.5 text-ember-300">
      <span aria-hidden="true" className="block h-px w-5 bg-ember-500" />
      {children}
    </h2>
  );
}

function FooterLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {links.map(({ href, label }) => (
        <li key={href}>
          <Link href={href} className="hover-link inline-flex min-h-11 items-center py-1 text-body-sm text-calico-300 no-underline">
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The oversized wordmark.
 *
 * It fills the container width with `clamp` sized against the viewport, sits in
 * an overflow-hidden band so the descenders clip at the baseline, and rises out
 * of that band when it scrolls into view. The band is masked so the letterforms
 * fade out toward the foot rather than being sliced off by a hard edge — the
 * same fade the product rails use where they run off the side of the screen.
 *
 * The rise is a CSS transition driven by an IntersectionObserver rather than a
 * Framer primitive, because the wordmark must be readable if the JavaScript
 * never arrives — so it renders in its final position and the observer only
 * adds the attribute that drops it below the baseline to rise from.
 *
 * THE OBSERVER WATCHES THE BAND, NOT THE WORDMARK. Watching the wordmark
 * deadlocked exactly the way SplitText did: the effect pushes it a full height
 * below the baseline, the band clips it completely, and a fully clipped element
 * reports an intersection ratio of zero — so the callback that was supposed to
 * bring it back never fired and the wordmark stayed permanently hidden. The
 * band is clipped by nothing, so it is a trigger that can actually be true.
 */
function BigWordmark() {
  const band = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const bandNode = band.current;
    const markNode = mark.current;
    if (!bandNode || !markNode) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Written straight to the DOM rather than held in state. The markup ships
    // in its FINAL position, so a visitor whose JavaScript never runs sees the
    // wordmark rather than a blank band; only once JS is live does it drop
    // below the baseline, and the observer then lets it rise.
    markNode.dataset.down = 'true';

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        delete markNode.dataset.down;
        io.disconnect();
      },
      { threshold: 0.2 },
    );
    io.observe(bandNode);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={band}
      aria-hidden="true"
      className="relative overflow-hidden px-4 pt-8 lg:pt-12"
      style={{
        maskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
      }}
    >
      <span
        ref={mark}
        className="mx-auto block max-w-shell translate-y-0 whitespace-nowrap text-center font-display font-semibold leading-[0.78] tracking-tight text-calico-50/12 transition-transform duration-cinematic ease-out-expo data-[down=true]:translate-y-full"
        style={{ fontSize: 'clamp(56px, 15.5vw, 232px)' }}
      >
        UK Sofa<span className="text-ember-500/30">Shop</span>
      </span>
    </div>
  );
}

function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    const res = await subscribeToNewsletter(email);
    if (res?.error) {
      setStatus('error');
      setMessage(res.error);
      return;
    }
    setStatus('success');
    setMessage(res?.message ?? '');
    setEmail('');
  };

  return (
    /* The one panel in the footer, and the only thing in it with a background
       of its own. A sign-up form that is just more text in a column of text
       gets ignored; the glass lifts it off the ground without making it loud,
       and the ember ring ties it to the badge in the hero. */
    <div className="ring-gradient glass-dark-panel rounded-md p-5">
      <ColumnHeading>Join the family</ColumnHeading>

      {status === 'success' ? (
        <p className="m-0 flex items-start gap-2 text-body-sm text-ember-300">
          <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {message}
        </p>
      ) : (
        <>
          <p className="m-0 mb-5 max-w-[38ch] text-body-sm text-calico-300">
            Early access to new ranges, and the occasional note on looking after
            what you already own.
          </p>

          <form onSubmit={submit}>
            <label htmlFor="footer-email" className="sr-only">Email address</label>
            {/* One line, ember underline, no box — the same field as the search
                overlay, so the two places you type into this site match. */}
            <div className="relative flex items-center gap-3">
              <input
                id="footer-email"
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
                placeholder="your@email.com"
                className="focus-ring-inset min-w-0 flex-1 appearance-none rounded-sm border-0 bg-transparent pb-2 text-body text-calico-50 placeholder:text-calico-50/30"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                aria-label="Subscribe"
                className="hover-btn btn-ember group grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-ember-500 text-ink-900 disabled:cursor-wait"
              >
                {status === 'loading'
                  ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
                  : <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform duration-swift ease-out-expo group-hover:translate-x-1" />}
              </button>
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-ember-500" />
            </div>

            {status === 'error' && (
              <p role="alert" className="mt-2 text-caption text-rust-300">
                {message || 'Please enter a valid email address.'}
              </p>
            )}
            <p className="m-0 mt-3 text-caption text-calico-300/70">
              We&apos;ll email you to confirm first. No spam, and one-click
              unsubscribe on every message.
            </p>
          </form>
        </>
      )}
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`hover-icon-dark glass-dark-panel grid h-11 w-11 place-items-center rounded-pill text-calico-300 transition-opacity duration-base ease-out-expo ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <ArrowUp aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

export default function Footer({ categories }: { categories: NavCategory[] }) {
  // Was `categories={[]}`, hardcoded in the layout wrapper — so the Shop
  // column has never once listed a category since it was written. It then
  // became a client fetch, and is now handed down from the root layout, which
  // is what finally puts these links in the server HTML.
  const year = new Date().getFullYear();

  const shopLinks = [
    { href: '/shop/all', label: 'All Sofas' },
    { href: '/collection', label: 'Collections' },
    ...categories.map((c) => ({ href: `/shop/${c.slug}`, label: c.name })),
    // '/new-arrivals' used to sit here and returns a 404. The newest products
    // are the top of /shop/all, which is where this now goes.
  ];

  return (
    <footer
      data-ground="dark"
      className="grad-ink grain relative isolate overflow-hidden bg-ink-900 text-calico-300"
    >
      {/* The seam. The closing panel above is also ink, so without a marked
          edge the two blocks merge into one unbroken dark field and the page
          appears to have no footer at all — just more of the same. This is the
          same fading ember hairline the section headings use. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{ backgroundImage: 'var(--grad-rule)' }}
      />

      {/* Warm and low only. The indigo wash belongs to the one cool section on
          the homepage; running it here would give the footer a second
          temperature it has no reason to have. */}
      <div aria-hidden="true" className="aurora">
        <span className="aurora__warm" />
        <span className="aurora__deep" />
      </div>

      {/* ── Trust bar ────────────────────────────────────────────────────────
          Each cell carries its own ember-led rule rather than the row carrying
          dividers between cells — the same construction as the figures band on
          the homepage, and for the same reason: the captions run to one line or
          two, so a vertical divider between them would never line up. */}
      <div className="relative border-b border-calico-50/10">
        <div className="mx-auto grid max-w-shell grid-cols-2 gap-x-5 gap-y-6 px-4 py-8 sm:grid-cols-4 sm:gap-x-8 sm:px-6 lg:py-10">
          {trust.map(({ Icon, label, sub }) => (
            <div key={label}>
              <span aria-hidden="true" className="mb-3 flex w-full">
                <span className="block h-px w-6 bg-ember-500" />
                <span className="block h-px flex-1 bg-calico-50/12" />
              </span>
              <Icon aria-hidden="true" className="mb-2 h-5 w-5 shrink-0 stroke-[1.5] text-ember-300" />
              <p className="m-0 text-body-sm font-semibold leading-tight text-calico-50">{label}</p>
              <p className="m-0 mt-1 text-caption leading-snug text-calico-300">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <BigWordmark />
      </div>

      {/* ── Columns ──────────────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-shell px-4 pb-9 pt-8 sm:px-6 lg:pb-12 lg:pt-10">
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-5 lg:gap-y-10">
          <nav aria-label="Shop">
            <ColumnHeading>Shop</ColumnHeading>
            <FooterLinks links={shopLinks} />
          </nav>

          <nav aria-label="Support">
            <ColumnHeading>Support</ColumnHeading>
            <FooterLinks links={supportLinks} />
          </nav>

          <nav aria-label="Company">
            <ColumnHeading>Company</ColumnHeading>
            <FooterLinks links={companyLinks} />
          </nav>

          {/* ── The showroom. A real address is the strongest local-trust
                signal this business has, and it was buried on /showroom. ── */}
          <div className="col-span-2 lg:col-span-1">
            <ColumnHeading>Blackburn showroom</ColumnHeading>
            <address className="not-italic">
              <p className="m-0 flex items-start gap-2 text-body-sm text-calico-300">
                <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ember-300" />
                <span>
                  {ADDRESS.street}
                  <br />
                  {ADDRESS.locality}
                  <br />
                  <span className="font-data tabular-nums">{ADDRESS.postcode}</span>
                </span>
              </p>

              <p className="m-0 mt-3 flex items-start gap-2 text-body-sm">
                <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ember-300" />
                <span className="text-calico-300">
                  {OPENING_HOURS.map((h) => (
                    <span key={h.label} className="block">
                      {h.label}{' '}
                      <span className="font-data tabular-nums text-calico-50">{h.display}</span>
                    </span>
                  ))}
                  <span className="mt-1 block text-caption text-calico-300/70">By appointment</span>
                </span>
              </p>

              <p className="m-0 mt-3 flex items-center gap-2 text-body-sm">
                <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-ember-300" />
                <a href={PHONE_HREF} className="hover-link font-data tabular-nums text-calico-50 no-underline">
                  {PHONE_DISPLAY}
                </a>
              </p>
              <p className="m-0 mt-2 flex items-center gap-2 text-body-sm">
                <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-ember-300" />
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover-link break-all text-calico-300 no-underline">
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </address>
          </div>

          <div className="col-span-2 lg:col-span-1">
            <Newsletter />
          </div>
        </div>
      </div>

      {/* ── Base ─────────────────────────────────────────────────────────────
          THE BOTTOM PADDING IS LOAD-BEARING ON A PHONE.

          The fixed bottom navigation covers the last 68px of the viewport, and
          this row — copyright, the three legal links, the social icons and back
          to top — sat underneath it: rendered, tabbable, and impossible to see
          or tap. The clearance used to live on <main>, which is the wrong
          element for it twice over. It did not protect this row, because the
          footer is <main>'s sibling and comes after it. And because <main> has
          no background of its own, those 68px painted in the page ground —
          a bright calico strip driven between the ink closing panel and this
          ink footer, which was the most visible seam on the whole page.

          It belongs on the last element in the document, which is this one. */}
      <div className="pb-bottom-nav relative border-t border-calico-50/10">
        <div className="mx-auto flex max-w-shell flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6 lg:py-5">
          <p className="m-0 text-caption text-calico-300">
            © <span className="font-data tabular-nums">{year}</span> UK Sofa Shop. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:ml-auto">
            {legalLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="hover-link inline-flex min-h-11 items-center text-caption text-calico-300 no-underline">
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={openCookiePreferences}
              className="hover-link min-h-11 text-caption text-calico-300"
            >
              Cookie preferences
            </button>
          </div>

          <div className="flex items-center gap-2 sm:ml-2">
            {socials.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="hover-icon-dark glass-dark-panel grid h-11 w-11 place-items-center rounded-pill text-calico-300"
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
              </a>
            ))}
            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
