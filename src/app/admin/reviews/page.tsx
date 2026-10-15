import type { Metadata } from 'next'
// src/app/admin/reviews/page.tsx
//
// Reviews (admin upgrade J1-J3). This loads them; ReviewsView.tsx shows them.
// Publishing or hiding refreshes the shop (app/actions/reviews.ts).
//
// Uses the ordinary cookie-bound client. Reading every review - including
// unpublished ones - is granted by the "admin can view all reviews" RLS
// policy, so the service-role key is not needed here.
import { createClient } from '@/utils/supabase/server'
import ReviewsView, { type ReviewRow } from './ReviewsView'

export const metadata: Metadata = { title: 'Reviews' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ done?: string; error?: string }>

const DONE: Record<string, string> = {
  published: 'Published. It shows in the shop now.',
  hidden: "Hidden. It's off the shop, and still here if you want it back.",
  deleted: 'Deleted.',
}

export default async function AdminReviewsPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, customer_name, image_url, order_id, is_approved, created_at, products(title, slug, categories!products_category_id_fkey(slug), product_categories(categories(slug)))')
    .order('created_at', { ascending: false })
  const reviews = (data ?? []) as unknown as ReviewRow[]

  // reviews.order_id has no foreign key to embed through, so the orders are a
  // second read: just whether each was a test.
  const orderIds = [...new Set(reviews.map(r => r.order_id).filter((id): id is string => Boolean(id)))]
  const { data: orders } = orderIds.length
    ? await supabase.from('orders').select('id, is_test').in('id', orderIds)
    : { data: [] as { id: string; is_test: boolean }[] }

  return (
    <ReviewsView
      reviews={reviews}
      testOrders={(orders ?? []).filter(o => o.is_test).map(o => o.id)}
      knownOrders={(orders ?? []).map(o => o.id)}
      done={sp.done ? DONE[sp.done] ?? null : null}
      failed={Boolean(sp.error)}
      loadError={error?.message ?? null}
    />
  )
}
