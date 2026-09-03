// src/app/journal/[slug]/page.tsx

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import EditorialHero from '@/components/Editorial/EditorialHero'
import EditorialSchema from '@/components/Editorial/EditorialSchema'
import EditorialLayout, { LastUpdated } from '@/components/Editorial/EditorialLayout'
import { ARTICLES, ARTICLES_BY_DATE, findArticle } from '../articles'
import { ARTICLE_BODIES } from '../articles/bodies'

type Params = Promise<{ slug: string }>

/**
 * Every article is known at build time, so all three prerender. There is no
 * database behind the Journal and nothing to revalidate.
 */
export function generateStaticParams() {
  return ARTICLES.map(a => ({ slug: a.slug }))
}

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { slug } = await props.params
  const article = findArticle(slug)

  // A slug that does not exist gets a title rather than a crash; the page
  // itself is what returns the 404.
  if (!article) return { title: 'Article Not Found' }

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/journal/${article.slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      url: `/journal/${article.slug}`,
      publishedTime: article.published,
      modifiedTime: article.updated,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
    },
  }
}

export default async function ArticlePage(props: { params: Params }) {
  const { slug } = await props.params
  const article = findArticle(slug)
  const Body = ARTICLE_BODIES[slug]

  // Both checks, not one. A registry entry with no body would otherwise render
  // an article with a hero and an empty column, which is worse than a 404
  // because it looks deliberate.
  if (!article || !Body) notFound()

  // The other two, for the row at the bottom. Newest first, minus this one.
  const others = ARTICLES_BY_DATE.filter(a => a.slug !== article.slug)

  return (
    <div className="min-h-screen bg-calico-50">
      <EditorialSchema
        type="Article"
        headline={article.title}
        current={article.heading}
        path={`/journal/${article.slug}`}
        updated={article.updated}
        published={article.published}
        description={article.description}
        crumbs={[
          { name: 'Home', path: '/' },
          { name: 'The Journal', path: '/journal' },
        ]}
      />

      <EditorialHero
        eyebrow={article.eyebrow}
        title={article.heading}
        lede={article.lede}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Journal', href: '/journal' },
        ]}
        meta={<LastUpdated date={article.updated} />}
      />

      <EditorialLayout toc={article.toc}>
        <Body />
      </EditorialLayout>

      {/* ── The other two ───────────────────────────────────────────────── */}
      <div className="mx-auto max-w-shell px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[68ch] border-t border-ink-900/10 pt-10">
          <p className="eyebrow m-0 mb-5 flex items-center gap-2.5 text-ember-700">
            <span aria-hidden="true" className="block h-px w-5 bg-ember-500" />
            Also in the Journal
          </p>

          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
            {others.map(other => (
              <li key={other.slug}>
                <Link
                  href={`/journal/${other.slug}`}
                  className="group flex h-full flex-col rounded-md border border-calico-300 bg-calico-100 p-5 no-underline transition-colors hover:border-ember-500"
                >
                  <span className="font-data text-caption uppercase tracking-[0.12em] text-ink-500">
                    {other.eyebrow}
                  </span>
                  <span className="mt-2 font-display text-h3 font-semibold leading-snug text-ink-900">
                    {other.heading}
                  </span>
                  <span className="mt-2 text-body-sm leading-relaxed text-ink-700">
                    {other.description}
                  </span>
                  <span className="mt-4 flex items-center gap-2 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ember-700">
                    Read it
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform duration-swift ease-out-expo group-hover:translate-x-1"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
