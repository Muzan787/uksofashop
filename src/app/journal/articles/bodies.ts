// src/app/journal/articles/bodies.ts
//
// Slug -> body component.
//
// Named bodies.ts rather than index.ts on purpose: with articles.ts sitting
// beside this directory, a bare "../articles" would resolve to one or the
// other depending on resolver order, and nobody should have to know which.
//
// Kept apart from ../articles.ts so that the metadata
// registry stays importable from anywhere - the sitemap and the index page want
// titles and dates without dragging three articles' worth of JSX in with them.

import type { ComponentType } from 'react'
import SofaJargonExplained from './sofa-jargon-explained'
import MadeToOrderExplained from './made-to-order-explained'
import CashOnDeliveryExplained from './cash-on-delivery-explained'
import WhatsInsideASofa from './whats-inside-a-sofa'

export const ARTICLE_BODIES: Record<string, ComponentType> = {
  'sofa-jargon-explained': SofaJargonExplained,
  'made-to-order-explained': MadeToOrderExplained,
  'cash-on-delivery-explained': CashOnDeliveryExplained,
  'whats-inside-a-sofa': WhatsInsideASofa,
}
