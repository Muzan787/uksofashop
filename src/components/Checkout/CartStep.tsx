'use client';
// src/components/Checkout/CartStep.tsx

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import EmptyState from '@/components/UI/EmptyState';
import toast from 'react-hot-toast';
import { PROMISES } from '@/constants/promises';
import { useCart, lineKey, type DisplayCartItem } from '@/context/CartContext';
import { blurDataURL } from '@/utils/cloudinary';
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe';


/** How long the row takes to collapse, and how long undo stays up. */
const COLLAPSE = 380;
const UNDO_MS = 5000;

export default function CartStep({ onNext }: { onNext: () => void }) {
  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();
  const [collapsing, setCollapsing] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => { pending.forEach(clearTimeout); };
  }, []);

  /**
   * Removing collapses the row, then offers it back.
   *
   * It used to disappear on a 350ms fade with nothing to say so — and a cart
   * is the one screen where an accidental tap costs the shop the sale. The row
   * closes, and for five seconds the item is one tap from returning.
   */
  function remove(item: DisplayCartItem) {
    setCollapsing(lineKey(item));

    timers.current.push(setTimeout(() => {
      removeFromCart(lineKey(item));
      setCollapsing(null);

      const id = toast.custom(() => (
        <div data-ground="dark" className="grad-ink flex items-center gap-4 rounded-md bg-ink-900 py-3 pl-4 pr-3 shadow-e3">
          <span className="text-body-sm text-calico-50">
            Removed <span className="font-semibold">{item.title}</span>
          </span>
          <button
            type="button"
            onClick={() => { addToCart(item); toast.dismiss(id); }}
            className="hover-btn hover-btn-dark shrink-0 rounded-sm px-3 py-1.5 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ember-300"
          >
            Undo
          </button>
        </div>
      ), { duration: UNDO_MS });
    }, COLLAPSE));
  }

  if (cartItems.length === 0) return <EmptyCart />;

  return (
    <div>
      <p className="eyebrow mb-4 text-ember-700">
        {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
      </p>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {cartItems.map(item => (
          <li
            key={lineKey(item)}
            // The collapse is a grid row going to zero, which is the only way
            // CSS can animate to "as tall as the content" and back. A measured
            // height animation that never gets a frame leaves the row stuck.
            className={`grid transition-[grid-template-rows,opacity,margin] duration-base ease-out-expo ${
              collapsing === lineKey(item) ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
            }`}
          >
            <div className="overflow-hidden">
              <Row
                item={item}
                onRemove={() => remove(item)}
                onQuantity={q => updateQuantity(lineKey(item), q)}
              />
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onNext}
        className="hover-btn btn-ember sheen shadow-ember mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-pill bg-ember-500 font-data text-eyebrow font-bold uppercase tracking-[0.1em] text-ink-900 shadow-ember"
      >
        Continue to delivery
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </button>

      <div className="mt-4 text-center">
        <Link href="/shop/all" className="hover-link inline-flex items-center gap-1.5 text-caption text-ink-500 no-underline">
          <ArrowLeft aria-hidden="true" className="h-3 w-3" />
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

// ─── One line ────────────────────────────────────────────────────────────────
/**
 * A compact adaptive cart line. Product identity gets the upper grid row,
 * while quantity, price and remove controls use the full width below it.
 * That preserves 44px touch targets without squeezing the chosen specification
 * into the narrow strip beside the image on a 320px phone.
 */
function Row({ item, onRemove, onQuantity }: {
  item: DisplayCartItem;
  onRemove: () => void;
  onQuantity: (q: number) => void;
}) {
  const specification = item.fabric_label?.trim() || item.color?.trim() || '';
  return (
    <article className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-md border border-calico-300 bg-calico-50 p-2 shadow-e1 sm:grid-cols-[72px_minmax(0,1fr)]">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-calico-200 sm:h-[72px] sm:w-[72px]">
        <Image src={item.image_url || '/placeholder.svg'} alt="" fill sizes="72px" placeholder={item.image_url ? 'blur' : undefined} blurDataURL={item.image_url ? blurDataURL(item.image_url) : undefined} className="object-cover" />
      </div>
      <div className="min-w-0 self-start py-0.5">
        <h3 className="m-0 break-words font-body text-body-sm font-semibold leading-snug text-ink-900">{item.title}</h3>
        {(specification || item.fabric_code) && <p className="m-0 mt-1 break-words font-data text-caption leading-snug text-ink-500">{specification}{item.fabric_code && <span className="text-ember-700">{specification ? ' · ' : ''}{item.fabric_code}</span>}</p>}
      </div>
      <div className="col-span-2 flex min-w-0 items-center gap-1 pt-1">
        <Stepper quantity={item.quantity} title={item.title} onChange={onQuantity} />
        <span className="ml-auto shrink-0 font-data text-body font-semibold tabular-nums text-ink-900">£{(item.price * item.quantity).toFixed(0)}</span>
        <button type="button" onClick={onRemove} aria-label={`Remove ${item.title} from your cart`} className="hover-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-ink-400 hover:text-rust-700"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
      </div>
    </article>
  );
}

// ─── Quantity ────────────────────────────────────────────────────────────────
/**
 * 44×44 targets, and the number travels.
 *
 * The old stepper was 28×26 — under half the area a finger needs, on the one
 * control in the cart somebody is most likely to press twice. The digit slides
 * up when it rises and down when it falls, which is what tells you the tap
 * registered without having to read the number.
 */
function Stepper({ quantity, title, onChange }: {
  quantity: number;
  title: string;
  onChange: (q: number) => void;
}) {
  const reduced = useReducedMotionSafe();
  // Which way the last change went, so the digit knows where to come from.
  const [direction, setDirection] = useState(1);

  function step(next: number) {
    setDirection(next > quantity ? 1 : -1);
    onChange(next);
  }

  const button =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-ink-700 ' +
    'transition-colors duration-swift ease-out-expo hover:bg-calico-200 disabled:text-ink-400';

  return (
    <div className="flex h-11 items-center rounded-pill bg-calico-100">
      <button
        type="button"
        onClick={() => step(quantity - 1)}
        aria-label={quantity === 1 ? `Remove ${title}` : `One fewer ${title}`}
        className={button}
      >
        <Minus aria-hidden="true" className="h-4 w-4" />
      </button>

      <span className="relative h-11 w-8 overflow-hidden" aria-live="polite">
        <span className="sr-only">{quantity} in your cart</span>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={quantity}
            aria-hidden="true"
            initial={reduced ? false : { y: direction * 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: direction * -18, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center font-data text-body-sm font-semibold tabular-nums text-ink-900"
          >
            {quantity}
          </motion.span>
        </AnimatePresence>
      </span>

      <button
        type="button"
        onClick={() => step(quantity + 1)}
        aria-label={`One more ${title}`}
        className={button}
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Nothing in it ───────────────────────────────────────────────────────────
/**
 * An empty cart is not an error, and it used to read like one: an icon in a
 * grey circle and a button labelled "Browse Collection". This says what the
 * shop offers and points at something specific.
 */
function EmptyCart() {
  return (
    <EmptyState
      icon={ShoppingBag}
      illustration={<EmptyBag />}
      heading="Nothing in your cart yet"
      line="When there is, you will not pay for any of it until it is in the room."
      action={{ label: 'See what is new', href: '/shop/all?sort=newest' }}
      secondary={{ label: 'Or browse everything', href: '/shop/all' }}
      className="border-0 bg-transparent px-4 py-10"
    >
      <p className="m-0 mx-auto mt-4 inline-flex items-center gap-2 rounded-pill border border-sage-300 bg-sage-50 px-4 py-2 text-caption font-semibold text-sage-700">
        <Truck aria-hidden="true" className="h-3.5 w-3.5" />
        {PROMISES.delivery.short}
      </p>
    </EmptyState>
  );
}

/** A canvas tote, open and empty, with one ember stitch. */
function EmptyBag() {
  return (
    <svg
      viewBox="0 0 200 150"
      role="img"
      aria-label="An empty canvas shopping bag"
      className="mx-auto w-full max-w-[180px]"
    >
      {/* Handles, behind the bag */}
      <path
        d="M78 44V33a22 22 0 0 1 44 0v11"
        className="fill-none stroke-ink-400"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* The bag */}
      <path
        d="M52 44h96l10 84a10 10 0 0 1-10 11H52a10 10 0 0 1-10-11Z"
        className="fill-calico-200 stroke-ink-900"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* The open mouth, so it reads as empty rather than as a closed box */}
      <ellipse cx="100" cy="44" rx="48" ry="9" className="fill-calico-100 stroke-ink-900" strokeWidth="3" />

      {/* One stitch, in the brand colour */}
      <path
        d="M64 118h72"
        className="stroke-ember-500"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 9"
      />
    </svg>
  );
}
