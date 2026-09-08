'use client';
// src/components/Product/BuyBox.tsx

import Link from 'next/link';
import { Gem, MapPin, Ruler, ShieldCheck, Sparkles, Truck, Wallet } from 'lucide-react';
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
 * Translate only catalogue notation whose meaning is already documented on
 * /journal/sofa-jargon-explained. Everything else stays as the catalogue wrote
 * it rather than guessing at product semantics.
 */
function configurationExplanation(sizeLabel: string | undefined, title: string): string | null {
  const source = `${sizeLabel ?? ''} ${title}`;

  if (/\b3\s*\+\s*2\b/i.test(source)) {
    return '3+2 means one 3-seater and one 2-seater sold as a matching set.';
  }

  const corner = source.match(/\b([12])c([12])\b/i);
  if (!corner) return null;

  const first = Number(corner[1]);
  const second = Number(corner[2]);
  const total = first + second + 1;
  const plural = (n: number) => (n === 1 ? 'seat' : 'seats');

  return `${corner[0].toLowerCase()} means ${first} ${plural(first)}, corner, ${second} ${plural(second)} — ${total} seats total.`;
}

function readableDimensions(specifications: Product['specifications']): string {
  if (!specifications) return '';

  let specs: Record<string, string> = {};
  if (typeof specifications === 'string') {
    try { specs = JSON.parse(specifications); } catch { return ''; }
  } else {
    specs = specifications;
  }

  const raw = specs.dimensions ?? specs.Dimensions ?? '';
  return String(raw).replace(/\s+/g, ' ').replace(/\s*\|\s*/g, ' · ').trim();
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
  const currentSizeLabel = sizes.find(sv => sv.slug === product.slug)?.size_label;
  const configurationHelp = configurationExplanation(currentSizeLabel, product.title);
  const dimensionText = readableDimensions(product.specifications);

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

      {/* ── Price ───────────────────────────────────────────────────────── */}
      <div>
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
          <button
            type="button"
            onClick={onCustomSize}
            className="hover-btn inline-flex min-h-11 items-center gap-2 rounded-pill border border-dashed border-ember-700 px-5 py-2.5 text-body-sm font-semibold text-ember-700 transition-colors duration-swift ease-out-expo"
          >
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            Custom size
          </button>
        </PillGroup>

        {configurationHelp && (
          <p className="m-0 mt-3 max-w-[56ch] text-body-sm leading-relaxed text-ink-500">
            {configurationHelp}
          </p>
        )}
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

      {/* The exact catalogue measurement is brought beside the buying choice,
          but the full doorway process remains the single /size-guide source of
          truth. No second calculator or measurement system is introduced. */}
      {dimensionText && (
        <div className="border-l-2 border-ember-500 pl-3">
          <p className="m-0 text-body-sm leading-relaxed text-ink-700">
            <span className="font-semibold text-ink-900">Dimensions for this configuration:</span>{' '}
            <span className="font-data tabular-nums">{dimensionText}</span>
          </p>
          <Link
            href="/size-guide"
            className="hover-link mt-1 inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold text-ink-900 no-underline"
          >
            <Ruler aria-hidden="true" className="h-4 w-4 text-[var(--pdp-accent-text)]" />
            Will it fit? Check the doorway guide
          </Link>
        </div>
      )}

      {/* ── Add to cart ────────────────────────────────────────────────── */}
      <div ref={ctaRef}>
        <AddToCart
          price={price}
          added={added}
          onAdd={onAdd}
          inWishlist={inWishlist}
          wishlistBusy={wishlistBusy}
          onWishlist={onWishlist}
        />

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

        {/* Real-business proof, intentionally one restrained line rather than
            another trust card or badge. /showroom owns the address and booking
            detail; the buy box only puts that genuine proof where intent is high. */}
        <Link
          href="/showroom"
          className="hover-link mt-4 inline-flex min-h-11 items-center gap-2 text-body-sm text-ink-600 no-underline"
        >
          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--pdp-accent-text)]" />
          <span>
            See sofas in person at our <strong className="font-semibold text-ink-900">Blackburn showroom</strong> · visits by appointment
          </span>
        </Link>
      </div>
    </div>
  );
}
