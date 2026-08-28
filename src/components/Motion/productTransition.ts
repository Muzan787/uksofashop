// src/components/Motion/productTransition.ts
//
// Deliberately NOT a 'use client' module.
//
// This is a pure function with no hooks and no browser access, and the places
// that need it — the homepage product card, the listing grid — are server
// components. Exporting it from ViewTransitions.tsx, which is a client module,
// made every call a cross-boundary call and threw at render time: "Attempted
// to call productTransitionName() from the server". The build was clean; the
// homepage returned a 500.

import type { CSSProperties } from 'react'

/**
 * The name that makes a product image fly from a card into the product page.
 *
 * Derived from the product id so the card and the hero agree without having to
 * coordinate. A view-transition-name has to be unique in the document at the
 * moment a transition starts — two elements sharing one name makes the browser
 * drop the whole transition — so anywhere a product can appear twice on one
 * page (a "similar products" row on that product's own page, the second slide
 * of its gallery) passes `false` and opts out.
 */
export function productTransitionName(id: string | number, enabled = true): CSSProperties {
  if (!enabled) return {}

  return {
    viewTransitionName: `product-${String(id).replace(/[^a-zA-Z0-9_-]/g, '')}`,
    // Lets the CSS give every product morph one timing without naming each of
    // them. Ignored by browsers that do not support it yet.
    viewTransitionClass: 'product-image',
  } as CSSProperties
}
