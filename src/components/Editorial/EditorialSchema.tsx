// src/components/Editorial/EditorialSchema.tsx

import {
  breadcrumbSchema,
  editorialSchema,
  jsonLd,
  type Crumb,
  type EditorialSchemaInput,
} from '@/utils/schema'

/**
 * The structured data for a content page: what it is, and where it sits.
 *
 * One component rather than two script tags copied into eight pages, because
 * that is how the pair drifted apart on the shop pages - and because the
 * breadcrumb is the half most likely to be forgotten. Every editorial page
 * renders a visible breadcrumb through EditorialHero and, until this existed,
 * not one of them had any markup behind it.
 *
 * WHY `current` IS SEPARATE FROM `headline`. The two want different words, and
 * pretending otherwise breaks one of them:
 *
 *   - The trailing crumb has to be the words on screen. EditorialHero prints
 *     its `title` there - "Will it fit?" - and a BreadcrumbList that says
 *     something else is a mismatch Google reads as an attempt to game the
 *     trail, which is worse than having no markup at all.
 *   - An Article headline has to describe the article. "Will it fit?" describes
 *     nothing to anything that has not already read the page, whereas "Sofa
 *     Size & Measurement Guide" is the line that belongs in a citation.
 *
 * So `current` mirrors the hero and `headline` mirrors the page's own metadata
 * title. Where a page's H1 is already descriptive, leave `current` out and both
 * fall back to `headline`.
 */
export default function EditorialSchema({
  crumbs = [{ name: 'Home', path: '/' }],
  current,
  ...editorial
}: EditorialSchemaInput & {
  /** The trail WITHOUT the current page. Defaults to Home alone. */
  crumbs?: Crumb[]
  /** The trailing crumb. Must be the hero title as rendered. */
  current?: string
}) {
  const breadcrumb = breadcrumbSchema([
    ...crumbs,
    { name: current ?? editorial.headline, path: editorial.path },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(editorialSchema(editorial)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb) }}
      />
    </>
  )
}
