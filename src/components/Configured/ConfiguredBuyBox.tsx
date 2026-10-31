'use client';
// src/components/Configured/ConfiguredBuyBox.tsx
//
// Title, price, how ordering works, then the choices in the order a customer
// makes them - size, frame or set, the mattress, the extras - then what they
// have built and the add-to-cart button.
//
// Every choice is a real radio or checkbox inside its label, so the whole row
// is the tap target (never under 44px) and a screen reader hears a radio
// group with a name rather than a row of buttons. Every option shows what it
// costs: a size tile its price as things stand, the frame and set cards their
// own totals, an upgrade or an extra what it adds.

import Link from 'next/link';
import { Check, Gem, MapPin, Palette, Ruler, Truck, Wallet } from 'lucide-react';
import { PROMISES } from '@/constants/promises';
import type { DeliveryWindow } from '@/utils/delivery';
import { STANDARD_MATTRESS, type Axis, type ProductType } from '@/utils/productOptions';
import AddToCart from '@/components/Product/AddToCart';
import HowItWorks from '@/components/Product/HowItWorks';
import Stars from '@/components/Product/Stars';
import type { Addon, AddonGroup, Product } from '@/components/Product/types';

interface Props {
  product: Product;
  productType: ProductType;
  /** Variant plus add-ons. */
  price: number;
  /** The variant alone, for the breakdown. */
  basePrice: number;
  reviewCount: number;
  averageRating: number;
  estimate: DeliveryWindow;

  axes: Axis[];
  selection: Record<string, string>;
  onChoose: (axisKey: string, code: string) => void;
  priceIf: (axisKey: string, code: string) => number | null;

  /** The groups offered on the chosen variant. */
  groups: AddonGroup[];
  picks: Record<string, string[]>;
  onPick: (group: AddonGroup, addon: Addon | null) => void;

  /** How many fabric colours it can be made in, for the trust row. */
  fabricCount: number;
  /** "Size: Double (4ft 6in)" and so on, for the summary above the button. */
  summary: { label: string; value: string }[];
  chosen: { name: string; price: number }[];

  added: boolean;
  onAdd: () => void;
  inWishlist: boolean;
  wishlistBusy: boolean;
  onWishlist: () => void;
}

/**
 * What a pick-one group is when nothing in it is picked. The mattress upgrade
 * is the only one so far, and its "nothing" is the Standard mattress the set
 * already includes.
 */
const NONE_CHOICE: Record<string, { name: string; detail: string }> = {
  'bed-mattress-upgrade': { name: 'Standard mattress', detail: STANDARD_MATTRESS.replace(/^Our Standard mattress: /, '') },
};

const money = (n: number) => `£${Number.isInteger(n) ? n : n.toFixed(2)}`;

export default function ConfiguredBuyBox({
  product, productType, price, basePrice, reviewCount, averageRating, estimate,
  axes, selection, onChoose, priceIf, groups, picks, onPick, summary, chosen, fabricCount,
  added, onAdd, inWishlist, wishlistBusy, onWishlist,
}: Props) {
  // A pick-one group says what is chosen even when it is the included one -
  // "Mattress: Standard mattress" - so a set never reads as mattress unknown.
  const oneLines = groups.filter(g => g.selection === 'one').map(g => {
    const pick = g.addons.find(a => (picks[g.id] ?? []).includes(a.id));
    return { label: g.slug === 'bed-mattress-upgrade' ? 'Mattress' : g.name, value: pick?.name ?? NONE_CHOICE[g.slug]?.name ?? 'None' };
  });
  const lines = [...summary, ...oneLines];

  return (
    <div data-journey-section="configuration" className="flex flex-col gap-6">
      {/* ── Title ────────────────────────────────────────────────────────── */}
      <div>
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

      {/* ── Price ─────────────────────────────────────────────────────────
          The total for what is chosen, so it moves as the choices do. */}
      <div data-pdp-price="" data-journey-section="price">
        <span aria-hidden="true" className="mb-4 hidden w-full md:flex">
          <span className="block h-px w-8 bg-ember-500" />
          <span className="block h-px flex-1 bg-calico-300" />
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="flex flex-col">
            <span className="font-display text-[34px] font-semibold leading-none tabular-nums text-ink-900" aria-live="polite">
              £{price.toFixed(0)}
            </span>
            <span className="mt-1.5 text-caption text-ink-500">for the {productType} as chosen below</span>
          </span>
          <span className="btn-ember shadow-ember inline-flex items-center gap-1.5 rounded-pill bg-ember-500 px-3.5 py-2 text-caption font-semibold text-ink-900">
            <Wallet aria-hidden="true" className="h-3.5 w-3.5" />
            {PROMISES.payment.label}
          </span>
        </div>
        {product.origin === 'uk' && (
          <span className="mt-3 inline-flex items-center gap-2 rounded-sm border border-[var(--pdp-accent-line)] bg-[var(--pdp-accent-tint)] px-3 py-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-pill bg-[var(--pdp-accent)]" />
            <span className="eyebrow text-[var(--pdp-accent-text)]">Made in the UK</span>
          </span>
        )}
      </div>

      <HowItWorks estimate={estimate} madeToOrder={Boolean(product.custom_made)} />

      {/* ── The axes: size, then frame or set ───────────────────────────── */}
      {axes.map((axis, i) => {
        const step = i + 1;
        const current = axis.values.find(v => v.code === selection[axis.key]);
        const cards = axis.values.length <= 2;
        return (
          <fieldset key={axis.key} className="m-0 min-w-0 border-0 p-0">
            <legend className="eyebrow mb-3 p-0 text-ink-500">
              <StepNumber n={step} />
              {axis.label}
              {current && !cards && (
                <> — <span className="font-semibold normal-case tracking-normal text-ink-900">{current.label}</span></>
              )}
            </legend>
            <div className={cards ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-3 lg:grid-cols-5'}>
              {axis.values.map(val => {
                const active = val.code === selection[axis.key];
                const cost = priceIf(axis.key, val.code);
                return (
                  <label
                    key={val.code}
                    className={`hover-btn relative flex cursor-pointer flex-col rounded-md border bg-calico-50 transition-colors duration-swift ease-out-expo has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus-ring)] ${
                      cards ? 'min-h-[104px] p-3' : 'min-h-[76px] items-center justify-center px-1.5 py-2.5 text-center'
                    } ${active ? 'border-ember-500 ring-1 ring-ember-500' : 'border-calico-300 hover:border-ink-400'}`}
                  >
                    <input
                      type="radio"
                      name={`opt-${axis.key}`}
                      value={val.code}
                      checked={active}
                      onChange={() => onChoose(axis.key, val.code)}
                      className="sr-only"
                    />
                    {active && (
                      <span aria-hidden="true" className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-pill bg-ember-500">
                        <Check className="h-2.5 w-2.5 text-ink-900" strokeWidth={3} />
                      </span>
                    )}
                    <span className="text-body-sm font-semibold leading-tight text-ink-900">{val.label}</span>
                    {cards ? (
                      <>
                        {val.blurb && <span className="mt-1 text-caption leading-snug text-ink-500">{val.blurb}</span>}
                        {cost !== null && <span className="mt-auto pt-2 font-data text-body-sm font-semibold tabular-nums text-ink-900">{money(cost)}</span>}
                      </>
                    ) : (
                      <>
                        {val.detail && <span className="mt-0.5 font-data text-[11px] leading-tight text-ink-500">{val.detail.split(' · ')[0]}</span>}
                        {cost !== null && <span className="mt-1 font-data text-caption font-semibold tabular-nums text-ink-700">{money(cost)}</span>}
                      </>
                    )}
                  </label>
                );
              })}
            </div>
            {axis.key === 'size' && current?.detail && (
              <p className="m-0 mt-2 text-caption text-ink-500">
                {current.label} ({current.detail.split(' · ')[0]}) takes a {current.detail.split(' · ')[1] ?? current.detail} mattress.
              </p>
            )}
          </fieldset>
        );
      })}

      {/* ── Add-on groups: the mattress upgrade, the extras ──────────────── */}
      {groups.map((group, j) => {
        const step = axes.length + j + 1;
        const picked = picks[group.id] ?? [];
        const none = NONE_CHOICE[group.slug];
        return (
          <fieldset key={group.id} className="m-0 min-w-0 border-0 p-0">
            <legend className="eyebrow mb-1 p-0 text-ink-500">
              <StepNumber n={step} />
              {group.name}
              {group.selection === 'many' && <span className="font-normal normal-case tracking-normal text-ink-500"> — optional, choose any</span>}
            </legend>
            {group.description && group.selection === 'many' && (
              <p className="m-0 mb-3 text-caption text-ink-500">{group.description}</p>
            )}
            <div className="mt-2 flex flex-col gap-2">
              {group.selection === 'one' && (
                <ChoiceRow
                  type="radio"
                  name={`addon-${group.slug}`}
                  checked={picked.length === 0}
                  onChange={() => onPick(group, null)}
                  title={none?.name ?? 'None'}
                  detail={none?.detail ?? null}
                  price="Included"
                />
              )}
              {group.addons.map(addon => (
                <ChoiceRow
                  key={addon.id}
                  type={group.selection === 'one' ? 'radio' : 'checkbox'}
                  name={`addon-${group.slug}`}
                  checked={picked.includes(addon.id)}
                  onChange={() => onPick(group, addon)}
                  title={addon.name}
                  detail={addon.description}
                  price={`+${money(addon.price)}`}
                  // Every extra says what it is; of eight mattresses, only the
                  // one chosen does, or the list runs to two screens.
                  alwaysDetail={group.selection === 'many'}
                />
              ))}
            </div>
          </fieldset>
        );
      })}

      {/* ── What they have built, and the button ───────────────────────────
          data-pdp-add: watched for the first time it comes into view. */}
      <div>
        <div className="mb-4 rounded-md border border-calico-300 bg-calico-50 p-4">
          <p className="eyebrow m-0 text-ink-500">Your {productType}</p>
          <dl className="m-0 mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-body-sm">
            {lines.map(line => (
              <div key={line.label} className="contents">
                <dt className="text-ink-500">{line.label}</dt>
                <dd className="m-0 break-words font-semibold text-ink-900">{line.value}</dd>
              </div>
            ))}
          </dl>
          {chosen.length > 0 && (
            <ul className="m-0 mt-3 flex list-none flex-col gap-1 border-t border-calico-300 p-0 pt-3 font-data text-caption tabular-nums text-ink-700">
              <li className="flex justify-between gap-3"><span>{productType === 'bed' ? 'Bed' : 'Mattress'}</span><span>{money(basePrice)}</span></li>
              {chosen.map(c => (
                <li key={c.name} className="flex justify-between gap-3"><span className="min-w-0 break-words">{c.name}</span><span>+{money(c.price)}</span></li>
              ))}
              <li className="flex justify-between gap-3 font-semibold text-ink-900"><span>Total</span><span>{money(price)}</span></li>
            </ul>
          )}
        </div>

        <div data-pdp-add="" data-journey-section="primary">
          <AddToCart
            price={price}
            added={added}
            onAdd={onAdd}
            inWishlist={inWishlist}
            wishlistBusy={wishlistBusy}
            onWishlist={onWishlist}
          />
        </div>

        <ul className="m-0 mt-5 grid list-none grid-cols-3 gap-x-3 p-0">
          {[
            { Icon: Truck, label: PROMISES.delivery.label },
            { Icon: Gem, label: PROMISES.payment.label },
            // Not the sofas' 1-year frame guarantee: nobody has said it covers
            // beds or mattresses, so it is not claimed here.
            productType === 'bed' && fabricCount > 0
              ? { Icon: Palette, label: `${fabricCount} fabric colours` }
              : { Icon: Ruler, label: '5 UK sizes' },
          ].map(({ Icon, label }) => (
            <li key={label}>
              <span aria-hidden="true" className="mb-2.5 flex w-full">
                <span className="block h-px w-5 bg-[var(--pdp-accent)]" />
                <span className="block h-px flex-1 bg-calico-300" />
              </span>
              <Icon aria-hidden="true" className="mb-1.5 h-4 w-4 text-[var(--pdp-accent-text)]" />
              <span className="block text-caption font-semibold leading-snug text-ink-700">{label}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/showroom"
          className="hover-link mt-4 inline-flex min-h-11 items-center gap-2 text-body-sm text-ink-600 no-underline"
        >
          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--pdp-accent-text)]" />
          <span>
            Visit our <strong className="font-semibold text-ink-900">Blackburn showroom</strong> · visits by appointment
          </span>
        </Link>
      </div>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="mr-2 inline-grid h-5 w-5 place-items-center rounded-pill bg-ink-900 align-[1px] font-data text-[11px] font-bold leading-none tracking-normal text-calico-50"
    >
      {n}
    </span>
  );
}

/** One upgrade or extra: the whole row is the label, the control is real. */
function ChoiceRow({ type, name, checked, onChange, title, detail, price, alwaysDetail = false }: {
  type: 'radio' | 'checkbox';
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  detail: string | null;
  price: string;
  alwaysDetail?: boolean;
}) {
  return (
    <label
      className={`hover-btn flex min-h-[52px] cursor-pointer items-start gap-3 rounded-md border bg-calico-50 px-3 py-2.5 transition-colors duration-swift ease-out-expo has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus-ring)] ${
        checked ? 'border-ember-500 ring-1 ring-ember-500' : 'border-calico-300 hover:border-ink-400'
      }`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span
        aria-hidden="true"
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-2 ${type === 'radio' ? 'rounded-pill' : 'rounded-sm'} ${
          checked ? 'border-ember-500 bg-ember-500' : 'border-ink-400 bg-calico-50'
        }`}
      >
        {checked && (type === 'radio'
          ? <span className="h-2 w-2 rounded-pill bg-ink-900" />
          : <Check className="h-3 w-3 text-ink-900" strokeWidth={3} />)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold leading-snug text-ink-900">{title}</span>
        {detail && (checked || alwaysDetail) && <span className="mt-0.5 block text-caption leading-snug text-ink-500">{detail}</span>}
      </span>
      <span className="shrink-0 pt-0.5 font-data text-body-sm font-semibold tabular-nums text-ink-900">{price}</span>
    </label>
  );
}
