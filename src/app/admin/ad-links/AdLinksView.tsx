// src/app/admin/ad-links/AdLinksView.tsx
//
// Admin -> Ad links, shown (admin upgrade O1-O5). Plain data in, so the page
// can be checked with made-up links.
import { dualTimeText } from '@/utils/adminTime'
import CopyTextButton from '@/components/Admin/CopyTextButton'
import { AD_URL_PARAMETERS, META_FEED_URL, PROFILE_LINKS, type LeftOut } from '@/utils/adLinks'

export interface AdLink {
  label: string
  detail?: string
  url: string
}

export interface ProductLinks {
  title: string
  url: string
  colourways: { label: string; url: string }[]
}

export interface AdLinksViewProps {
  feed: {
    items: number
    leftOut: LeftOut[]
    lastFetch: { fetched_at: string; item_count: number | null } | null
  }
  ads: AdLink[]
  home: AdLink
  departments: AdLink[]
  ranges: AdLink[]
  products: ProductLinks[]
  testLink: string
}

const section = 'rounded-md border border-stone-200 bg-white p-4 shadow-sm lg:p-5'
const sectionTitle = 'm-0 text-lg font-bold text-stone-900'
const sectionIntro = 'm-0 mt-1 text-sm leading-relaxed text-stone-500'
const copyButton = 'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-sm border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-stone-500'

function LinkRow({ link }: { link: AdLink }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-stone-900">{link.label}</span>
        <span className="block truncate font-mono text-[11px] text-stone-500">{link.detail ?? link.url}</span>
      </span>
      <CopyTextButton text={link.url} label="Copy" className={copyButton} />
    </li>
  )
}

function LinkGroup({ title, count, links, open = false }: { title: string; count?: number; links: AdLink[]; open?: boolean }) {
  return (
    <details open={open} className="border-t border-stone-100">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2">
        <span className="font-semibold text-stone-900">{title}</span>
        <span className="text-sm text-stone-500">{count ?? links.length}</span>
      </summary>
      <ul className="m-0 list-none divide-y divide-stone-100 p-0 pb-2">
        {links.map((l, i) => <LinkRow key={`${l.label}-${i}`} link={l} />)}
      </ul>
    </details>
  )
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export default function AdLinksView({ feed, ads, home, departments, ranges, products, testLink }: AdLinksViewProps) {
  const colourways = products.reduce((n, p) => n + p.colourways.length, 0)
  const fetched = feed.lastFetch ? dualTimeText(feed.lastFetch.fetched_at) : null

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-in fade-in duration-500">
      <header>
        <h1 className="m-0 text-2xl font-bold tracking-tight text-stone-900 lg:text-3xl">Ad links</h1>
        <p className="m-0 mt-1 text-sm text-stone-500">The catalogue Meta reads, and a ready link for every page an ad can open.</p>
      </header>

      {/* ── O1: the catalogue feed ─────────────────────────────────────── */}
      <section className={section} aria-labelledby="feed-heading">
        <h2 id="feed-heading" className={sectionTitle}>Meta catalogue feed</h2>
        <p className={sectionIntro}>Meta reads this address for the catalogue ads: one item per shown colourway, each opening as a catalogue ad visit.</p>
        <div className="mt-3 flex items-center gap-3 rounded-sm border border-stone-200 bg-stone-50 p-3">
          <span className="min-w-0 flex-1 break-all font-mono text-xs text-stone-800">{META_FEED_URL}</span>
          <CopyTextButton text={META_FEED_URL} label="Copy" className={copyButton} />
        </div>
        <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-stone-500">Items</dt>
          <dd className="m-0 font-semibold text-stone-900">{feed.items}</dd>
          <dt className="text-stone-500">Meta last read it</dt>
          <dd className="m-0 font-semibold text-stone-900">
            {fetched ?? 'Not recorded yet'}
            {feed.lastFetch?.item_count != null && <span className="font-normal text-stone-500"> · {feed.lastFetch.item_count} items then</span>}
          </dd>
          <dt className="text-stone-500">Custom labels</dt>
          <dd className="m-0 text-stone-700">None. The feed sends no custom labels; adding them would change what Meta receives, so it waits for your yes.</dd>
        </dl>
        <details className="mt-3 border-t border-stone-100">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2">
            <span className="font-semibold text-stone-900">Left out</span>
            <span className="text-sm text-stone-500">{feed.leftOut.length}</span>
          </summary>
          {feed.leftOut.length === 0 ? (
            <p className="m-0 pb-2 text-sm text-stone-500">Nothing: every shown colourway is in the feed.</p>
          ) : (
            <ul className="m-0 list-none divide-y divide-stone-100 p-0 pb-2">
              {feed.leftOut.map((l, i) => (
                <li key={`${l.title}-${i}`} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 text-stone-900">{l.title}</span>
                  <span className="shrink-0 text-right text-stone-500">{l.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>

      {/* ── O2: URL parameters ─────────────────────────────────────────── */}
      <section className={section} aria-labelledby="params-heading">
        <h2 id="params-heading" className={sectionTitle}>URL parameters</h2>
        <p className={sectionIntro}>
          Paste into every ad: Ads Manager → the ad → Destination → URL parameters. Meta fills in the source (fb, ig, Messenger or the Audience Network) and the campaign, ad set and ad names, which the weekly summary sorts sales by.
        </p>
        <div className="mt-3 rounded-sm border border-stone-200 bg-stone-50 p-3">
          <p className="m-0 break-all font-mono text-xs leading-relaxed text-stone-800">{AD_URL_PARAMETERS}</p>
          <div className="mt-2">
            <CopyTextButton text={AD_URL_PARAMETERS} label="Copy the parameters" />
          </div>
        </div>
      </section>

      {/* ── O3: ready links ────────────────────────────────────────────── */}
      <section className={section} aria-labelledby="links-heading">
        <h2 id="links-heading" className={sectionTitle}>Ready links</h2>
        <p className={sectionIntro}>
          Each opens its page as a Meta ad visitor arrives: with the ad offer, counted as Meta. Use one as the ad’s Website URL; Meta adds the parameters above.
        </p>
        <ul className="m-0 mt-2 list-none p-0">
          <LinkRow link={home} />
        </ul>
        <LinkGroup title="Your current ads (A01-A12)" links={ads} />
        <LinkGroup title="Departments" links={departments} />
        <LinkGroup title="Ranges" links={ranges} />
        <details className="border-t border-stone-100">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2">
            <span className="font-semibold text-stone-900">Products and colourways</span>
            <span className="text-sm text-stone-500">{plural(products.length, 'product', 'products')} · {plural(colourways, 'colourway', 'colourways')}</span>
          </summary>
          <ul className="m-0 list-none divide-y divide-stone-100 p-0 pb-2">
            {products.map(p => (
              <li key={p.url}>
                <details>
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-stone-900">{p.title}</span>
                    <span className="shrink-0 text-xs text-stone-500">{plural(p.colourways.length, 'colourway', 'colourways')}</span>
                  </summary>
                  <ul className="m-0 list-none divide-y divide-stone-100 border-l-2 border-stone-100 p-0 pl-3">
                    <LinkRow link={{ label: 'The product', url: p.url }} />
                    {p.colourways.map(c => <LinkRow key={c.url} link={{ label: c.label, url: c.url }} />)}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* ── O4: profile links ──────────────────────────────────────────── */}
      <section className={section} aria-labelledby="profile-heading">
        <h2 id="profile-heading" className={sectionTitle}>Profile links</h2>
        <p className={sectionIntro}>
          For the website field on each profile. These aren’t ads, so they never carry the ad offer; visitors from them get the same 48-hour offer every visitor has had since 12 Oct.
        </p>
        <ul className="m-0 mt-2 list-none divide-y divide-stone-100 p-0">
          {PROFILE_LINKS.map(p => <LinkRow key={p.key} link={{ label: p.label, detail: p.where, url: p.url }} />)}
        </ul>
      </section>

      {/* ── O5: the test ad link ───────────────────────────────────────── */}
      <section className={section} aria-labelledby="test-heading">
        <h2 id="test-heading" className={sectionTitle}>Test ad link</h2>
        <p className={sectionIntro}>
          Opens the home page exactly like a Meta ad, offer included, but nothing in the visit counts: no Meta or Google tag loads, nothing is recorded, and an order placed in it is marked as a test. It stays that way until the browser is closed.
        </p>
        <div className="mt-3 flex items-center gap-3 rounded-sm border border-violet-200 bg-violet-50 p-3">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-violet-900">{testLink}</span>
          <CopyTextButton text={testLink} label="Copy" className={copyButton} />
        </div>
      </section>
    </div>
  )
}
