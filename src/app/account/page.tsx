// src/app/account/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AccountTabs, { type AccountOrder, type AccountReview, type AccountWishlistItem } from './AccountTabs'
import { logout } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'

export const metadata: Metadata = {
  title: 'My Account',
  description:
    'Your orders, wishlist and reviews.',
  robots: { index: false, follow: false },
}

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  // Orders, with their lines. The lines are what the card expands to show —
  // before this the page fetched orders alone and the table had nothing to
  // open, so "what did I actually buy" meant going to the tracking page.
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, status, created_at, total_amount, items_subtotal, delivery_total,
      fee_upstairs, fee_assembly, fee_sofa_removal,
      order_items (
        quantity,
        price_at_time_of_purchase,
        product_variants (
          color,
          image_url,
          products ( title, slug )
        )
      )
    `)
    .eq('customer_email', user.email)
    .order('created_at', { ascending: false })

  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      product:products(title, slug)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: wishlist } = await supabase
    .from('wishlist')
    .select(`
      id,
      product_id,
      product:products(
        title,
        slug,
        base_price,
        categories!products_category_id_fkey ( slug ),
        product_variants ( id, color, image_url, price_adjustment, priority )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Supabase types a to-one join through a nullable FK as an array, so the
  // shapes are flattened here rather than in four places in the client.
  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

  const formattedOrders: AccountOrder[] = (orders ?? []).map((o) => ({
    id: o.id,
    status: o.status ?? 'pending_cod',
    createdAt: o.created_at ?? new Date().toISOString(),
    total: Number(o.total_amount ?? 0),
    itemsSubtotal: o.items_subtotal === null ? null : Number(o.items_subtotal),
    deliveryTotal: o.delivery_total === null ? null : Number(o.delivery_total),
    feeUpstairs: Number(o.fee_upstairs ?? 0),
    feeAssembly: Number(o.fee_assembly ?? 0),
    feeSofaRemoval: Number(o.fee_sofa_removal ?? 0),
    items: (o.order_items ?? []).map((i) => {
      const variant = one(i.product_variants)
      const product = one(variant?.products)
      return {
        title: product?.title ?? 'Product',
        slug: product?.slug ?? null,
        color: variant?.color ?? null,
        image: variant?.image_url ?? null,
        quantity: i.quantity,
        price: Number(i.price_at_time_of_purchase ?? 0),
      }
    }),
  }))

  const formattedReviews: AccountReview[] = (reviews ?? []).map((r) => {
    const product = one(r.product as { title: string; slug: string } | { title: string; slug: string }[] | null)
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      imageUrl: r.image_url ?? null,
      isApproved: Boolean(r.is_approved),
      createdAt: r.created_at,
      productTitle: product?.title ?? null,
      productSlug: product?.slug ?? null,
    }
  })

  const formattedWishlist: AccountWishlistItem[] = (wishlist ?? []).map((w) => {
    const product = one(w.product)
    const category = one(product?.categories)
    const variant = [...(product?.product_variants ?? [])]
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))[0] ?? null
    return {
      id: w.id,
      productId: w.product_id,
      title: product?.title ?? 'Unavailable product',
      slug: product?.slug ?? '',
      categorySlug: category?.slug ?? 'sofas',
      price: Number(product?.base_price ?? 0) + Number(variant?.price_adjustment ?? 0),
      image: variant?.image_url ?? null,
      variantId: variant?.id ?? null,
      color: variant?.color ?? null,
    }
  })

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0]

  return (
    <div className="min-h-screen bg-calico-50 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell">

        <div className="mb-8 flex flex-col gap-4 border-b border-calico-300 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="m-0 font-data text-eyebrow uppercase tracking-[0.16em] text-ember-700">
              Your account
            </p>
            <h1 className="m-0 mt-2 font-display text-h1 font-semibold text-ink-900">
              {firstName ? `Hello, ${firstName}` : 'Hello'}
            </h1>
            <p className="m-0 mt-2 text-body-sm text-ink-500">
              Signed in as <span className="font-data text-ink-900">{user.email}</span>
            </p>
          </div>

          <form action={logout} className="shrink-0">
            <button
              type="submit"
              className="hover-btn flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-calico-300 px-5 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-700 md:w-auto"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>

        <AccountTabs
          orders={formattedOrders}
          reviews={formattedReviews}
          wishlist={formattedWishlist}
        />
      </div>
    </div>
  )
}
