'use client'
// src/components/Account/WishlistGrid.tsx

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { DUR, EASE } from '@/components/Motion/tokens'
import { Loader2, ShoppingBag, X } from 'lucide-react'
import toast from 'react-hot-toast'
import ProductCard from '@/components/Product/ProductCard'
import { toggleWishlist } from '@/app/actions/wishlist'
import { useCart } from '@/context/CartContext'
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe'


export interface WishlistCardItem {
  productId: string
  title: string
  slug: string
  /**
   * The finished product URL, canonical, built by whoever ran the query.
   *
   * This used to be a bare `categorySlug` that the grid pasted into a template
   * — and both of the two places that build these items defaulted it to
   * 'sofas', which is not a category. /shop/sofas is a 404 and
   * /shop/sofas/<slug> is a 308, so every saved sofa whose category_id had not
   * been set opened through a redirect. Assembling the URL is the query's job:
   * it is the only side that has the category rows to do it correctly.
   */
  href: string
  price: number
  image: string | null
  /** The default variant, so the card can add to the cart on its own.
   *  Null for a product with no variants — the card links out instead. */
  variantId: string | null
  color: string | null
}

/**
 * Saved sofas.
 *
 * Two versions of this existed — one on /wishlist and one inside the account
 * tabs — and neither used the shared card: /wishlist cropped to 4:3 and the
 * account tab drew a grey box where the photograph should have been, so a
 * saved sofa had no picture at all. Both are this now, on ProductCard.
 *
 * The add-to-cart button is new. A wishlist whose only action is "View
 * Details" asks somebody who has already decided to go and decide again.
 */
export default function WishlistGrid({ items: initial }: { items: WishlistCardItem[] }) {
  const [items, setItems] = useState(initial)
  const [removing, setRemoving] = useState<string | null>(null)
  const { addToCart } = useCart()
  const reduced = useReducedMotionSafe()

  async function remove(productId: string, title: string) {
    setRemoving(productId)
    try {
      const result = await toggleWishlist(productId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (!result.isWishlisted) {
        setItems(prev => prev.filter(i => i.productId !== productId))
        toast.success(`${title} removed`)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setRemoving(null)
    }
  }

  function add(item: WishlistCardItem) {
    if (!item.variantId) return
    addToCart({
      variant_id: item.variantId,
      quantity: 1,
      price: item.price,
      title: item.title,
      color: item.color ?? '',
      image_url: item.image ?? '',
    })
    toast.success(`${item.title} added to your cart`)
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      <AnimatePresence mode="popLayout">
        {items.map((item, i) => (
          <motion.div
            key={item.productId}
            layout
            // The card collapses and the ones after it slide up to close the
            // gap. `popLayout` takes the leaving card out of flow first, so
            // the others move during its exit rather than after it.
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            transition={
              reduced
                ? { duration: 0 }
                : { layout: { duration: DUR.base, ease: EASE.out }, duration: DUR.swift }
            }
            className="relative flex flex-col"
          >
            <button
              type="button"
              onClick={() => remove(item.productId, item.title)}
              disabled={removing === item.productId}
              aria-label={`Remove ${item.title} from your saved list`}
              // Above the card's stretched title link, which covers the card.
              className="absolute right-2 top-2 z-raised flex h-9 w-9 items-center justify-center rounded-pill border border-ink-900/10 bg-calico-50/90 text-ink-500 backdrop-blur-sm transition-colors duration-swift ease-out-expo hover:bg-calico-50 hover:text-rust-700 disabled:opacity-60"
            >
              {removing === item.productId
                ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                : <X aria-hidden="true" className="h-4 w-4" />}
            </button>

            <ProductCard
              id={item.productId}
              title={item.title}
              slug={item.slug}
              price={item.price}
              href={item.href}
              image={item.image}
              delayMs={Math.min(i, 5) * 70}
            />

            {item.variantId ? (
              <button
                type="button"
                onClick={() => add(item)}
                // Sits outside the card's <article>, so the stretched link
                // that covers the card does not swallow it.
                className="hover-btn relative z-raised mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-ember-500 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900"
              >
                <ShoppingBag aria-hidden="true" className="h-4 w-4" />
                Add to cart
              </button>
            ) : (
              <Link
                href={item.href}
                className="hover-btn relative z-raised mt-3 flex h-11 w-full items-center justify-center rounded-sm border border-calico-300 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-700 no-underline"
              >
                Choose options
              </Link>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
