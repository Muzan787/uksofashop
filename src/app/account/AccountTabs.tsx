'use client'
// src/app/account/AccountTabs.tsx

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronDown, Heart, Package, Star } from 'lucide-react'
import EmptyState from '@/components/UI/EmptyState'
import Timeline from '@/components/UI/Timeline'
import { blurDataURL } from '@/utils/cloudinary'
import { STATUS, stageIndex } from '@/utils/orderStatus'
import WishlistGrid, { type WishlistCardItem } from '@/components/Account/WishlistGrid'
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe'


export interface AccountOrderItem {
  title: string
  slug: string | null
  color: string | null
  image: string | null
  quantity: number
  price: number
}

export interface AccountOrder {
  id: string
  status: string
  createdAt: string
  total: number
  itemsSubtotal: number | null
  deliveryTotal: number | null
  feeUpstairs: number
  feeAssembly: number
  feeSofaRemoval: number
  items: AccountOrderItem[]
}

export interface AccountReview {
  id: string
  rating: number
  comment: string | null
  imageUrl: string | null
  isApproved: boolean
  createdAt: string
  productTitle: string | null
  productSlug: string | null
}

export interface AccountWishlistItem extends WishlistCardItem {
  id: string
}

const TABS = [
  { key: 'orders', label: 'Orders' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'wishlist', label: 'Saved' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function AccountTabs({ orders, reviews, wishlist }: {
  orders: AccountOrder[]
  reviews: AccountReview[]
  wishlist: AccountWishlistItem[]
}) {
  const [tab, setTab] = useState<TabKey>('orders')
  const reduced = useReducedMotionSafe()

  const counts: Record<TabKey, number> = {
    orders: orders.length,
    reviews: reviews.length,
    wishlist: wishlist.length,
  }

  return (
    <div>
      {/* ── Tabs ──────────────────────────────────────────────────────────
          The underline is one element that moves between tabs rather than a
          border-bottom appearing and disappearing on three. It also scrolls
          horizontally: three uppercase words at 24px of padding each overran
          a 375px screen and the third was unreachable. */}
      <div
        role="tablist"
        aria-label="Account sections"
        className="-mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-calico-300 px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${t.key}`}
              id={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`relative shrink-0 px-5 py-4 font-data text-eyebrow font-bold uppercase tracking-[0.12em] transition-colors duration-swift ease-out-expo ${
                active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span className={`ml-2 tabular-nums ${active ? 'text-ember-700' : 'text-ink-500'}`}>
                  {counts[t.key]}
                </span>
              )}

              {active && (
                <motion.span
                  layoutId="account-tab-underline"
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-pill bg-ember-500"
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Orders ────────────────────────────────────────────────────── */}
      {tab === 'orders' && (
        <div role="tabpanel" id="panel-orders" aria-labelledby="tab-orders">
          {orders.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {orders.map(order => (
                <li key={order.id}>
                  <OrderCard order={order} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Package}
              heading="No orders yet"
              line="When you place one it will appear here, with where it has got to."
              action={{ label: 'Start shopping', href: '/shop/all' }}
            />
          )}
        </div>
      )}

      {/* ── Reviews ───────────────────────────────────────────────────── */}
      {tab === 'reviews' && (
        <div role="tabpanel" id="panel-reviews" aria-labelledby="tab-reviews">
          {reviews.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {reviews.map(review => (
                <li
                  key={review.id}
                  className="rounded-md border border-calico-300 bg-calico-50 p-5 shadow-e1"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex gap-0.5" aria-label={`${review.rating} out of 5`}>
                      {[0, 1, 2, 3, 4].map(i => (
                        <Star
                          key={i}
                          aria-hidden="true"
                          className={`h-4 w-4 ${i < review.rating ? 'fill-ember-500 text-ember-700' : 'fill-none text-calico-300'}`}
                        />
                      ))}
                    </span>
                    <span
                      className={`shrink-0 rounded-pill px-3 py-1 font-data text-caption font-semibold uppercase tracking-wider ${
                        review.isApproved
                          ? 'bg-sage-50 text-sage-700'
                          : 'bg-ember-500/12 text-ember-700'
                      }`}
                    >
                      {review.isApproved ? 'Published' : 'With us'}
                    </span>
                  </div>

                  {review.comment && (
                    <p className="m-0 mt-3 text-body-sm leading-relaxed text-ink-700">{review.comment}</p>
                  )}

                  {review.imageUrl && (
                    <div className="relative mt-4 h-24 w-24 overflow-hidden rounded-sm bg-calico-200">
                      <Image
                        src={review.imageUrl}
                        alt="The photograph you attached to this review"
                        fill
                        sizes="96px"
                        placeholder="blur"
                        blurDataURL={blurDataURL(review.imageUrl)}
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
                    {review.productTitle && review.productSlug ? (
                      <Link
                        href={`/shop/all/${review.productSlug}`}
                        className="hover-link text-caption font-semibold text-ember-700 no-underline"
                      >
                        {review.productTitle}
                      </Link>
                    ) : <span />}
                    <span className="font-data text-caption text-ink-500">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Star}
              heading="No reviews yet"
              line="Once something of ours is in your room, we would like to know how it is."
              action={{ label: 'See what is new', href: '/shop/all?sort=newest' }}
            />
          )}
        </div>
      )}

      {/* ── Saved ─────────────────────────────────────────────────────── */}
      {tab === 'wishlist' && (
        <div role="tabpanel" id="panel-wishlist" aria-labelledby="tab-wishlist">
          {wishlist.length > 0 ? (
            <WishlistGrid items={wishlist} />
          ) : (
            <EmptyState
              icon={Heart}
              heading="Nothing saved yet"
              line="Tap the heart on anything you like and it will wait for you here."
              action={{ label: 'See the newest arrivals', href: '/shop/all?sort=newest' }}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── One order ───────────────────────────────────────────────────────────────
/**
 * A card that opens where it stands.
 *
 * This was a four-column table — id, date, status, total — with nothing behind
 * any row, so seeing what was in an order meant leaving the page for the
 * tracking form and typing the reference back in by hand.
 *
 * The expansion is `grid-template-rows: 0fr → 1fr`, which the browser can
 * interpolate without anyone measuring anything. The alternative — reading
 * scrollHeight and animating max-height — needs a layout pass before it can
 * start, and gets the wrong number for any card whose photographs have not
 * loaded yet.
 */
function OrderCard({ order }: { order: AccountOrder }) {
  const [open, setOpen] = useState(false)

  const cfg = STATUS[order.status] ?? STATUS.pending_cod
  const stage = stageIndex(order.status)
  const reference = order.id.split('-')[0].toUpperCase()
  const thumb = order.items.find(i => i.image)?.image ?? null
  const count = order.items.reduce((n, i) => n + i.quantity, 0)

  return (
    <article className="overflow-hidden rounded-md border border-calico-300 bg-calico-50 shadow-e1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={`order-${order.id}`}
        className="flex w-full items-center gap-4 p-3 text-left transition-colors duration-swift ease-out-expo hover:bg-calico-100"
      >
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-calico-200">
          {thumb ? (
            <Image
              src={thumb}
              alt=""
              fill
              sizes="64px"
              placeholder="blur"
              blurDataURL={blurDataURL(thumb)}
              className="object-cover"
            />
          ) : (
            <Package aria-hidden="true" className="absolute inset-0 m-auto h-5 w-5 text-ink-400" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-data text-body-sm font-bold tracking-[0.08em] tabular-nums text-ink-900">
              #{reference}
            </span>
            <span className={`rounded-pill px-2.5 py-0.5 font-data text-caption font-semibold uppercase tracking-wider ${cfg.pill}`}>
              {cfg.label}
            </span>
          </span>
          <span className="mt-1 block truncate text-caption text-ink-500">
            {formatDate(order.createdAt)} · {count} item{count === 1 ? '' : 's'}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <span className="font-data text-body font-bold tabular-nums text-ink-900">
            £{order.total.toFixed(2)}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 text-ink-500 transition-transform duration-base ease-out-expo ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* 0fr → 1fr. The inner div must be min-h-0 or the grid row refuses to
          go below its content's height and nothing collapses. */}
      <div
        id={`order-${order.id}`}
        role="region"
        className="grid transition-[grid-template-rows] duration-base ease-out-expo"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-calico-300 px-4 py-5">
            {order.status !== 'cancelled' && (
              <div className="pb-5">
                <Timeline current={stage} pulse={stage >= 0 && stage < 3} />
              </div>
            )}

            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {order.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-sm bg-calico-100 px-3 py-2.5 text-body-sm"
                >
                  <span className="min-w-0 text-ink-700">
                    <span className="mr-2 font-data font-bold tabular-nums text-ink-900">{item.quantity}×</span>
                    {item.slug ? (
                      <Link href={`/shop/all/${item.slug}`} className="hover-link text-ink-900 no-underline">
                        {item.title}
                      </Link>
                    ) : item.title}
                    {item.color && <span className="text-ink-500"> · {item.color}</span>}
                  </span>
                  <span className="shrink-0 font-data font-semibold tabular-nums text-ink-900">
                    £{item.price.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            {(order.deliveryTotal ?? 0) > 0 && (
              <dl className="m-0 mt-4 flex flex-col gap-1.5 border-t border-calico-300 pt-4 text-caption">
                <Line label="Your order" value={order.itemsSubtotal ?? order.total} />
                {order.feeUpstairs > 0 && <Line label="Upstairs delivery" value={order.feeUpstairs} />}
                {order.feeAssembly > 0 && <Line label="Assembly" value={order.feeAssembly} />}
                {order.feeSofaRemoval > 0 && <Line label="Old sofa removal" value={order.feeSofaRemoval} />}
              </dl>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-calico-300 pt-4">
              <span className="text-body-sm text-ink-500">
                {order.status === 'delivered' ? 'Paid on delivery' : 'Due on delivery'}
                <span className="ml-2 font-data text-body font-bold tabular-nums text-ink-900">
                  £{order.total.toFixed(2)}
                </span>
              </span>
              <Link
                href={`/track-order?ref=${reference}`}
                className="hover-btn inline-flex h-11 items-center rounded-sm border border-calico-300 px-4 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-700 no-underline"
              >
                Track this order
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className="m-0 font-data tabular-nums text-ink-700">£{value.toFixed(2)}</dd>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
