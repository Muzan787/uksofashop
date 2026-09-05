// src/app/wishlist/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Heart } from 'lucide-react'
import EmptyState from '@/components/UI/EmptyState'
import WishlistGrid, { type WishlistCardItem } from '@/components/Account/WishlistGrid'
import { canonicalProductPath } from '@/utils/productUrl'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Saved sofas',
  description: 'The sofas you have saved for later.',
}

export default async function WishlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/wishlist')
  }

  // The variant comes back too, so the card can add to the cart without
  // sending somebody to the product page to make a choice they have made.
  const { data, error } = await supabase
    .from('wishlist')
    .select(`
      product_id,
      products (
        title,
        slug,
        base_price,
        categories!products_category_id_fkey ( slug ),
        product_categories ( categories ( slug ) ),
        product_variants ( id, color, image_url, price_adjustment, priority )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch wishlist items:', error)
  }

  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

  const items: WishlistCardItem[] = (data ?? []).map(row => {
    const product = one(row.products)
    // The same variant the product page opens on, so the price on the card is
    // the price in the cart.
    const variants = [...(product?.product_variants ?? [])]
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    const variant = variants[0] ?? null

    return {
      productId: row.product_id,
      title: product?.title ?? 'Unavailable product',
      slug: product?.slug ?? '',
      // Both category relations are selected above, so this resolves the same
      // way the product page's own canonical does. It used to be the primary
      // category alone, falling back to the string 'sofas' — which is not a
      // category, so a saved sofa with no category_id set opened through a
      // 308 to wherever it should have gone in the first place.
      href: canonicalProductPath({
        slug: product?.slug ?? '',
        categories: product?.categories,
        product_categories: product?.product_categories,
      }),
      price: Number(product?.base_price ?? 0) + Number(variant?.price_adjustment ?? 0),
      image: variant?.image_url ?? null,
      variantId: variant?.id ?? null,
      color: variant?.color ?? null,
    }
  })

  return (
    <div className="min-h-[60vh] bg-calico-50 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell">
        <div className="mb-8 border-b border-calico-300 pb-8">
          <p className="m-0 font-data text-eyebrow uppercase tracking-[0.16em] text-ember-700">
            Your account
          </p>
          <h1 className="m-0 mt-2 font-display text-h1 font-semibold text-ink-900">Saved sofas</h1>
          <p className="m-0 mt-2 max-w-[52ch] text-body-sm leading-relaxed text-ink-500">
            Nothing here is reserved — prices and availability can move. When you are ready,
            you can add one straight to your cart.
          </p>
        </div>

        {items.length > 0 ? (
          <WishlistGrid items={items} />
        ) : (
          <EmptyState
            icon={Heart}
            heading="Nothing saved yet"
            line="Tap the heart on anything you like and it will wait for you here."
            action={{ label: 'See the newest arrivals', href: '/shop/all?sort=newest' }}
            secondary={{ label: 'Or browse everything', href: '/shop/all' }}
          />
        )}
      </div>
    </div>
  )
}
