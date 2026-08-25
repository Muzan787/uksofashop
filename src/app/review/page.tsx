// src/app/review/page.tsx
//
// Where the signed link in the post-delivery email lands. No account needed:
// the token in the query string identifies the order and the product.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyReviewToken } from '@/utils/reviewToken'
import { canonicalProductPath } from '@/utils/productUrl'
import GuestReviewForm from './GuestReviewForm'

export const metadata: Metadata = {
  title: 'Leave a Review',
  // A one-off tokenised URL. Nothing here belongs in an index.
  robots: { index: false, follow: false },
}

type SearchParams = Promise<{ token?: string }>

export default async function ReviewPage(props: { searchParams: SearchParams }) {
  const { token } = await props.searchParams
  const verified = verifyReviewToken(token)

  if (!verified) notFound()

  const supabase = createAdminClient()

  const [{ data: product }, { data: existing }] = await Promise.all([
    supabase
      .from('products')
      .select('id, title, slug, categories!products_category_id_fkey(slug), product_categories(categories(slug)), product_variants(image_url, priority)')
      .eq('id', verified.productId)
      .maybeSingle(),
    supabase
      .from('reviews')
      .select('id')
      .eq('order_id', verified.orderId)
      .eq('product_id', verified.productId)
      .maybeSingle(),
  ])

  if (!product) notFound()

  const image = [...(product.product_variants ?? [])]
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .find(v => v.image_url)?.image_url

  return (
    <div className="min-h-screen bg-[#f8f6f2] px-5 py-12 sm:py-16">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-[#f0ede8] shadow-sm p-6 sm:p-8">

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#f0ede8]">
            {image && (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#ede8df] shrink-0">
                <Image src={image} alt="" fill sizes="64px" className="object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a8a29e] mb-1">
                Your purchase
              </p>
              <h1 className="text-[17px] font-bold text-[#1c1917] leading-snug">
                {product.title}
              </h1>
            </div>
          </div>

          {existing ? (
            <div className="text-center py-6">
              <p className="text-[15px] font-semibold text-[#1c1917] mb-2">
                You have already reviewed this — thank you.
              </p>
              <p className="text-[14px] text-[#57534e] leading-relaxed mb-6">
                Reviews are checked before they appear, so yours may not be on the
                site just yet.
              </p>
              <Link
                href={canonicalProductPath(product)}
                className="inline-flex items-center justify-center bg-[#1c1917] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black transition"
              >
                View the product
              </Link>
            </div>
          ) : (
            <GuestReviewForm token={token as string} productTitle={product.title} />
          )}
        </div>

        <p className="text-center text-[12px] text-[#a8a29e] mt-6 leading-relaxed">
          Something not right with your order? Please call us on 07476 616022
          rather than leaving it here — we would much rather fix it.
        </p>
      </div>
    </div>
  )
}
