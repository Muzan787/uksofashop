// src/utils/jobs/reviewRequests.ts
//
// Sends the post-delivery review request.
//
// Runs on a schedule rather than firing the moment an order is marked
// delivered, because a review written in the same hour the sofa arrives is
// about the delivery, not the sofa. Three days gives the customer time to
// actually sit on it.
//
// Started daily at 10:00 UTC by pg_cron through /api/jobs/review-requests
// (admin upgrade Phase 4). The old /api/cron/review-requests route, guarded
// by CRON_SECRET, runs exactly this too.

import 'server-only'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendReviewRequest } from '@/utils/email'
import { createReviewToken } from '@/utils/reviewToken'
import { SITE_URL } from '@/constants/site'
import type { JobOutcome } from '@/utils/jobRuns'

/** How long after delivery to ask. */
const DAYS_AFTER_DELIVERY = 3
/** Cap per run, so one invocation cannot empty the day's send allowance. */
const BATCH_SIZE = 20

export async function runReviewRequests(): Promise<JobOutcome> {
  // Service role: this runs with no user session, and needs to read orders and
  // their line items across every customer.
  const supabase = createAdminClient()

  const cutoff = new Date(Date.now() - DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000).toISOString()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, delivered_at, order_items(variant_id, product_variants(image_url, products(id, title)))')
    .eq('status', 'delivered')
    .is('review_request_sent_at', null)
    .not('customer_email', 'is', null)
    .lte('delivered_at', cutoff)
    .limit(BATCH_SIZE)

  if (error) {
    console.error('Review request cron query failed:', error.message)
    return { status: 'failed', httpStatus: 500, body: { error: 'Query failed' } }
  }

  let sent = 0
  let skipped = 0

  for (const order of orders ?? []) {
    // Claim it before sending. If the send throws afterwards the customer
    // simply does not get asked - far better than a loop that retries every
    // day and mails them repeatedly.
    const { data: claimed } = await supabase
      .from('orders')
      .update({ review_request_sent_at: new Date().toISOString() })
      .eq('id', order.id)
      .is('review_request_sent_at', null)
      .select('id')

    if (!claimed || claimed.length === 0) continue

    // One entry per distinct product, not per line - two variants of the same
    // sofa should not produce two review links.
    const byProduct = new Map<string, { productTitle: string; imageUrl: string | null; reviewLink: string }>()

    for (const line of order.order_items ?? []) {
      const variant = line.product_variants as { image_url?: string | null; products?: { id: string; title: string } | null } | null
      const product = variant?.products
      if (!product?.id || byProduct.has(product.id)) continue

      byProduct.set(product.id, {
        productTitle: product.title,
        imageUrl: variant?.image_url ?? null,
        reviewLink: `${SITE_URL}/review?token=${encodeURIComponent(createReviewToken(order.id, product.id))}`,
      })
    }

    if (byProduct.size === 0) { skipped++; continue }

    try {
      await sendReviewRequest(
        order.customer_email as string,
        order.customer_name ?? '',
        order.id.substring(0, 8).toUpperCase(),
        [...byProduct.values()],
      )
      sent++
    } catch (err) {
      console.error(`Review request failed for order ${order.id}`, err)
      skipped++
    }
  }

  return { status: 'ok', httpStatus: 200, body: { considered: orders?.length ?? 0, sent, skipped } }
}
