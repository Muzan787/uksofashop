'use client';
// src/components/Product/BuyBox.tsx

import { Gem, ShieldCheck, Sparkles, Truck, Wallet } from 'lucide-react';
import { PROMISES } from '@/constants/promises';
import type { DeliveryWindow } from '@/utils/delivery';
import AddToCart from './AddToCart';
import DeliveryEstimate from './DeliveryEstimate';
import PillGroup, { type Pill } from './PillGroup';
import Stars from './Stars';
import type { Product, SizeVariant } from './types';

interface Props {
  product: Product;
  price: number;
  reviewCount: number;
  averageRating: number;
  estimate: DeliveryWindow;

  categorySlug: string;

  subgroups: string[];
  subgroupTitle: string;
  currentSubgroup?: string | null;
  hrefForSubgroup: (sub: string) => string | undefined;

  sizes: SizeVariant[];
  onCustomSize: () => void;

  materials: string[];
  selectedMaterial: string;
  onSelectMaterial: (m: string) => void;

  added: boolean;
  onAdd: () => void;
  inWishlist: boolean;
  wishlistBusy: boolean;
  onWishlist: () => void;

  /** The sticky bar watches this block to know when it has scrolled away. */
  ctaRef?: React.Ref<HTMLDivElement>;
}

/**
 * Everything between the photograph and the accordion.
 *
 * The order of the blocks below IS the mobile reading order, and it is
 * deliberate: title, rating, price with the cash-on-delivery mark, then the
 * delivery dates, and only then the choices. A customer buying a sofa on the
 * doorstep decides in that sequence — what is it, do people rate it, what does
 * it cost, when does it turn up.
 *
 * One DOM order serves both widths, including the add-to-cart block, which now
 * renders at every size. The phone's sticky bar is a reminder of that button
 * rather than a replacement for it.
 */
export default function BuyBox({
  product, price, reviewCount, averageRating, estimate, categorySlug,
  subgroups, subgroupTitle, currentSubgroup, hrefForSubgroup,
  sizes, onCustomSize,
  materials, selectedMaterial, onSelectMaterial,
  added, onAdd, inWishlist, wishlistBusy, onWishlist,
  ctaRef,
}: Props) {
  // A style with no product behind it is dropped rather than rendered as a
  // pill that goes nowhere.
  const stylePills: Pill[] = subgroups.flatMap(sub => {
    const href = hrefForSubgroup(sub);
    return href ? [{ key: sub, label: sub, href }] : [];
  });

  const sizePills: Pill[] = sizes.map(sv => ({
    key: sv.slug,
    label: sv.size_label,
    href: `/shop/${categorySlug}/${sv.slug}`,
  }));

  const materialPills: Pill[] = materials.map(m => ({ key: m, label: m }));

  return (
    <div className="flex flex-col gap-6">
      {/* ── Title ────────────────────────────────────────────────────────── */}
      <div>
        {/* Only where the product's own origin is 'uk'. Anything else renders
            nothing rather than making a claim we cannot evidence. */}
        {product.origin === 'uk' && (
          <span className="mb-3 inline-flex items-center gap-2 rounded-sm border border-[var(--pdp-accent-line)] bg-[var(--pdp-accent-tint)] px-3 py-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-pill bg-[var(--pdp-accent)]" />
            <span className="eyebrow text-[var(--pdp-accent-text)]">Made in the UK</span>
          </span>
        )}

        {/* text-h1, not text-h2. The section headings further down the page
            are text-h2, and the product's own name was rendering at the same
            size as "Similar sofas" — the title of the page tying with a row
            label at the foot of it. */}
        <h1 className="m-0 font-display text-h1 font-semibold text-ink-900">{product.title}</h1>

        {reviewCount > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Stars rating={Math.round(averageRating)} count={reviewCount} />
            <a href="#reviews" className="hover-link font-data text-caption tabular-nums text-ink-500 no-underline">
              {averageRating.toFixed(1)} · {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </a>
          </div>
        )}
      </div>

      {/* ── Price ────────────────────────────────────────────────────────────
          34px, set in the display face, and deliberately off the type ramp:
          h1 is fluid and would put the price at 30px on a phone and 52px on a
          desktop. A price is a fixed piece of information, not a headline that
          should breathe with the viewport. tabular-nums so it does not change
          width when the variant does.

          What used to sit beside it read "(base £480 + variant adjustment)".
          That is the shape of the row in the products table, written for
          whoever maintains the catalogue, and it was being shown to shoppers.
          The price is the price. */}
      <div>
        {/* The rule above the price. An ember lead into a hairline that fades
            out — the mark the figures band and every section heading on the
            site carry. It costs 5px and it turns the price from a number in a
            column into the thing the block is about. */}
        <span aria-hidden="true" className="mb-4 flex w-full">
          <span className="block h-px w-8 bg-ember-500" />
          <span className="block h-px flex-1 bg-calico-300" />
        </span>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="font-display text-[34px] font-semibold leading-none tabular-nums text-ink-900">
            £{price.toFixed(0)}
          </span>
          <span className="btn-ember shadow-ember inline-flex items-center gap-1.5 rounded-pill bg-ember-500 px-3.5 py-2 text-caption font-semibold text-ink-900">
            <Wallet aria-hidden="true" className="h-3.5 w-3.5" />
            {PROMISES.payment.label}
          </span>
        </div>
      </div>

      {/* ── When it arrives ─────────────────────────────────────────────── */}
      <DeliveryEstimate estimate={estimate} />

      {/* ── Style, where the group uses one ─────────────────────────────── */}
      {stylePills.length > 1 && (
        <div>
          <p className="eyebrow mb-3 text-ink-500">
            {subgroupTitle || 'Style'} — <span className="font-semibold text-ink-900">{currentSubgroup || '—'}</span>
          </p>
          <PillGroup
            layoutId="pdp-style"
            label={subgroupTitle || 'Style'}
            items={stylePills}
            selectedKey={currentSubgroup}
          />
        </div>
      )}

      {/* ── Size ────────────────────────────────────────────────────────── */}
      <div>
        <p className="eyebrow mb-3 text-ink-500">Size / configuration</p>
        <PillGroup
          layoutId="pdp-size"
          label="Size and configuration"
          items={sizePills}
          selectedKey={product.slug}
        >
          {/* Dashed, because it is not one of the options — it is the way out
              of them. It opens a dialog rather than firing a bare WhatsApp
              link, so the customer sees what they are about to send. */}
          <button
            type="button"
            onClick={onCustomSize}
            className="hover-btn inline-flex min-h-11 items-center gap-2 rounded-pill border border-dashed border-ember-700 px-5 py-2.5 text-body-sm font-semibold text-ember-700 transition-colors duration-swift ease-out-expo"
          >
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            Custom size
          </button>
        </PillGroup>
      </div>

      {/* ── Material ────────────────────────────────────────────────────── */}
      {materialPills.length > 1 && (
        <div>
          <p className="eyebrow mb-3 text-ink-500">
            Material — <span className="font-semibold text-ink-900">{selectedMaterial}</span>
          </p>
          <PillGroup
            layoutId="pdp-material"
            label="Material"
            items={materialPills}
            selectedKey={selectedMaterial}
            onSelect={onSelectMaterial}
          />
        </div>
      )}

      {/* ── Add to cart ──────────────────────────────────────────────────────
          At every width now. It used to be desktop-only, with the phone's
          sticky bar standing in for it — which meant the bar had to be on
          screen permanently, because hiding it would have left a phone with no
          way to buy at all. With a real button in the flow, the bar is free to
          stay out of the way until this one scrolls past. */}
      <div ref={ctaRef}>
        <AddToCart
          price={price}
          added={added}
          onAdd={onAdd}
          inWishlist={inWishlist}
          wishlistBusy={wishlistBusy}
          onWishlist={onWishlist}
        />

        {/* Trust row — one of the three places the variant accent is allowed.

            Three columns, each under its own ember-led rule, rather than three
            tinted cells inside one border. It is the construction the figures
            band on the homepage uses, and it works here for the same reason:
            the labels wrap to one line or two depending on the promise, and a
            boxed grid makes that unevenness look like a mistake where a row of
            rules reads as a spec sheet. */}
        <ul className="m-0 mt-5 grid list-none grid-cols-3 gap-x-3 p-0">
          {[
            { Icon: Truck, label: PROMISES.delivery.label },
            { Icon: Gem, label: PROMISES.payment.label },
            { Icon: ShieldCheck, label: PROMISES.guarantee.label },
          ].map(({ Icon, label }) => (
            <li key={label}>
              <span aria-hidden="true" className="mb-2.5 flex w-full">
                <span className="block h-px w-5 bg-[var(--pdp-accent)] transition-colors duration-settle ease-out-expo" />
                <span className="block h-px flex-1 bg-calico-300" />
              </span>
              <Icon
                aria-hidden="true"
                className="mb-1.5 h-4 w-4 text-[var(--pdp-accent-text)] transition-colors duration-settle ease-out-expo"
              />
              <span className="block text-caption font-semibold leading-snug text-ink-700">
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
