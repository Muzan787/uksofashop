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

/** The review link for each distinct product on an order (one per sofa, not per line). */
export async function orderReviewLinks(orderId: string): Promise<{ productTitle: string; imageUrl: string | null; reviewLink: string }[]> {
  const { data } = await createAdminClient()
    .from('order_items')
    .select('product_variants(image_url, products(id, title))')
    .eq('order_id', orderId)

  const byProduct = new Map<string, { productTitle: string; imageUrl: string | null; reviewLink: string }>()
  for (const line of data ?? []) {
    const variant = line.product_variants as { image_url?: string | null; products?: { id: string; title: string } | null } | null
    const product = variant?.products
    if (!product?.id || byProduct.has(product.id)) continue
    byProduct.set(product.id, {
      productTitle: product.title,
      imageUrl: variant?.image_url ?? null,
      reviewLink: `${SITE_URL}/review?token=${encodeURIComponent(createReviewToken(orderId, product.id))}`,
    })
  }
  return [...byProduct.values()]
}

/**
 * The review ask, sent now, from the order page (admin upgrade E8): the same
 * email the daily job sends three days after delivery, for one order, now.
 * Stamps review_request_sent_at so the daily job does not ask again. The daily
 * job never invites Trustpilot; only this, from the button, does.
 *
 * `invite` additionally blind-copies Trustpilot's Automatic Feedback Service,
 * which is what turns this into a Trustpilot invitation. That is a separate
 * button because it is a separate decision: the plain ask collects reviews on
 * our own pages, the invited one also asks Trustpilot to chase them.
 *
 * 'sent-no-invite' means the email went but TRUSTPILOT_INVITE_BCC is not
 * configured, so no invitation was attached - worth telling the admin rather
 * than reporting plain success, because they pressed the Trustpilot button and
 * would otherwise be waiting for an invitation that is never coming.
 */
export async function sendReviewEmailNow(
  orderId: string,
  opts: { invite?: boolean } = {},
): Promise<'sent' | 'sent-no-invite' | 'no-email' | 'no-products' | 'not-delivered' | 'failed'> {
  const db = createAdminClient()
  const { data: order } = await db
    .from('orders')
    .select('id, status, customer_name, customer_email')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return 'failed'
  if (order.status !== 'delivered') return 'not-delivered'
  if (!order.customer_email) return 'no-email'

  const items = await orderReviewLinks(orderId)
  if (items.length === 0) return 'no-products'

  let invited = false
  try {
    const result = await sendReviewRequest(
      order.customer_email,
      order.customer_name ?? '',
      orderId.substring(0, 8).toUpperCase(),
      items,
      { invite: opts.invite, orderId },
    )
    invited = result.invited
  } catch (err) {
    console.error(`Review email failed for order ${orderId}`, err)
    return 'failed'
  }
  await db.from('orders').update({ review_request_sent_at: new Date().toISOString() }).eq('id', orderId)
  // Asked for an invitation and did not get one: the address is not set.
  if (opts.invite && !invited) return 'sent-no-invite'
  return 'sent'
}
