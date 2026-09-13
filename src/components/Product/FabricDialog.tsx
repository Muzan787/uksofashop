'use client';
// src/components/Product/FabricDialog.tsx

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Palette, ShoppingBag } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import PillGroup from './PillGroup';
import { DUR, EASE } from '@/components/Motion';
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe';
import { blurDataURL } from '@/utils/cloudinary';
import { MAX_SAMPLES } from '@/constants/swatches';
import type { Fabric, FabricCollection } from './types';

interface Props {
  collections: FabricCollection[];
  /** The fabric this sofa is currently being built in, if one has been chosen. */
  selectedId: string | null;
  /** The product's own slug, so the samples page can pin this sofa. */
  productSlug: string;
  /** Puts the sofa in the cart in this fabric and goes there. */
  onBuild: (fabric: Fabric) => void;
  onClose: () => void;
}

/**
 * The whole fabric range, and the one thing a customer does with it here.
 *
 * A made-to-order sofa can be built in any of 70 fabrics, and we have
 * photographs of it in three or four. So this dialog cannot pretend to be a
 * gallery: it is the fabric itself, shown as large as the panel allows, with
 * the frame photographs left alone to do the job they are good at.
 *
 * ONE JOB. This used to do two - choose what the sofa is made in, and choose
 * what to post through someone's letterbox - and worked hard to keep them
 * apart, with a sample basket in its footer and the request form behind that.
 * The samples have gone to /swatches, which exists for exactly that and
 * nothing else. What is left is the decision that puts a sofa in the cart:
 * tap a tile to see the weave, and "Build mine in this" does the rest.
 *
 * "BUILD MINE IN THIS" IS THE ORDER. It does not merely record a choice for a
 * separate add-to-cart button to act on later - it puts the sofa in the cart
 * in this fabric and takes the customer to the cart, because a person who has
 * just said "this one" has nothing left to decide on the product page. The
 * page's own add-to-cart button still opens this dialog when no fabric has
 * been chosen, so the two paths meet here either way.
 *
 * "ORDER SAMPLES" leaves for /swatches with this sofa named in the URL, so the
 * samples page can keep it pinned at the bottom of the screen and bring the
 * customer straight back to it - and with this fabric already in their basket
 * there, so the one they were looking at is the first of their three.
 *
 * THE ZOOM. Tapping a tile does not open a second dialog on top of this one; it
 * is the same element, grown. `layoutId` hands framer the tile's rectangle and
 * the panel's rectangle and it animates the difference, so the swatch you
 * touched is visibly the swatch that fills the panel, and it travels back into
 * the grid when you leave. That continuity is the whole point: at 96px you can
 * see a colour, and only at 500px can you see a weave.
 *
 * Under prefers-reduced-motion the layoutId is dropped entirely rather than
 * shortened. A 400px-per-second flight across the dialog is exactly the kind of
 * movement that setting exists to refuse.
 */
export default function FabricDialog({ collections, selectedId, productSlug, onBuild, onClose }: Props) {
  const reduced = useReducedMotionSafe();

  const [activeSlug, setActiveSlug] = useState(collections[0]?.slug ?? '');
  const [zoomedId, setZoomedId] = useState<string | null>(null);

  const active = collections.find(c => c.slug === activeSlug) ?? collections[0];
  const all = collections.flatMap(c => c.fabrics);
  const zoomed = all.find(f => f.id === zoomedId) ?? null;

  // The samples page, told which sofa to keep on screen and - where the
  // fabric can be posted - which swatch to start the basket with.
  const samplesHref = (fabric: Fabric) => {
    const params = new URLSearchParams({ sofa: productSlug });
    if (fabric.swatchable) params.set('pick', fabric.code);
    return `/swatches?${params.toString()}`;
  };

  return (
    <Modal
      title={zoomed ? `${zoomed.collectionName} ${zoomed.name}` : 'Choose your fabric'}
      onClose={onClose}
      size="full"
      icon={<Palette aria-hidden="true" className="h-4 w-4 text-ember-700" />}
    >
      {zoomed ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* The same element as the tile, grown. */}
          <motion.div
            {...(reduced ? {} : { layoutId: `swatch-${zoomed.id}` })}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="relative aspect-square w-full shrink-0 overflow-hidden rounded-md bg-calico-200 lg:w-[440px]"
            style={zoomed.hex ? { background: zoomed.hex } : undefined}
          >
            {zoomed.image && (
              <Image
                src={zoomed.image}
                alt={`${zoomed.collectionName} ${zoomed.name} fabric, close up`}
                fill
                sizes="(max-width: 1024px) 90vw, 440px"
                placeholder="blur"
                blurDataURL={blurDataURL(zoomed.image)}
                className="object-cover"
              />
            )}
          </motion.div>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setZoomedId(null)}
              className="mb-5 inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-caption font-semibold text-ink-500"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              All {zoomed.collectionName.toLowerCase()} colours
            </button>

            <p className="eyebrow m-0 text-ember-700">{zoomed.collectionName}</p>
            <h3 className="m-0 mt-1.5 font-display text-h2 font-semibold leading-tight text-ink-900">
              {zoomed.name}
            </h3>
            <p className="m-0 mt-2 font-data text-caption uppercase tracking-widest text-ink-500">
              {zoomed.code}
            </p>

            <p className="m-0 mt-5 max-w-[46ch] text-body-sm leading-relaxed text-ink-500">
              Every sofa in this range is built to order, so this fabric costs exactly the same
              as any other. What a screen shows you is never quite the colour — order it as a
              free sample and hold it against your own room before you decide.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => onBuild(zoomed)}
                className="hover-btn btn-ember sheen shadow-ember flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill border-0 bg-ember-500 text-body-sm font-semibold text-ink-900"
              >
                <ShoppingBag aria-hidden="true" className="h-4 w-4" />
                Build mine in this
              </button>

              <Link
                href={samplesHref(zoomed)}
                className="hover-btn flex h-12 flex-1 items-center justify-center gap-2 rounded-pill border border-calico-300 bg-calico-50 text-body-sm font-semibold text-ink-900 no-underline"
              >
                <Package aria-hidden="true" className="h-4 w-4" />
                Order samples
              </Link>
            </div>

            <p className="m-0 mt-3 text-caption leading-relaxed text-ink-500">
              Build mine puts the sofa in your cart in this fabric and takes you there. Samples
              are free — up to {MAX_SAMPLES}, posted anywhere on the UK mainland.
            </p>
          </div>
        </div>
      ) : (
        <>
          <PillGroup
            layoutId="fabric-collection"
            label="Fabric collection"
            items={collections.map(c => ({ key: c.slug, label: c.name }))}
            selectedKey={active?.slug ?? null}
            onSelect={setActiveSlug}
          />

          {/* The one line about what the cloth actually does. It is the same
              sentence the fabric guide opens each collection with, kept in the
              database so the two cannot drift apart. */}
          {active?.description && (
            <p className="m-0 mt-4 text-body-sm leading-relaxed text-ink-700">
              {active.description}
            </p>
          )}

          <p className="m-0 mt-2 text-caption leading-relaxed text-ink-500">
            {active?.fabrics.length} colours in {active?.name}. Tap any one to see the weave up
            close — they all cost the same.
          </p>

          <ul className="m-0 mt-5 grid list-none grid-cols-3 gap-3 p-0 sm:grid-cols-4 lg:grid-cols-6">
            {(active?.fabrics ?? []).map(fabric => (
              <li key={fabric.id}>
                <button
                  type="button"
                  onClick={() => setZoomedId(fabric.id)}
                  aria-label={`${fabric.collectionName} ${fabric.name}, ${fabric.code}`}
                  className="group w-full cursor-pointer border-0 bg-transparent p-0 text-left"
                >
                  <motion.span
                    {...(reduced ? {} : { layoutId: `swatch-${fabric.id}` })}
                    transition={{ duration: DUR.base, ease: EASE.out }}
                    className={`relative block aspect-square w-full overflow-hidden rounded-sm bg-calico-200 transition-shadow duration-swift ease-out-expo ${
                      selectedId === fabric.id
                        ? 'shadow-[0_0_0_2px_var(--color-calico-50),0_0_0_4px_var(--color-ink-900)]'
                        : 'shadow-[inset_0_0_0_1px_rgba(25,28,27,0.18)] group-hover:shadow-[0_0_0_2px_var(--color-calico-50),0_0_0_3px_var(--color-calico-300)]'
                    }`}
                    style={fabric.hex ? { background: fabric.hex } : undefined}
                  >
                    {fabric.image && (
                      <Image
                        src={fabric.image}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 30vw, (max-width: 1024px) 22vw, 160px"
                        placeholder="blur"
                        blurDataURL={blurDataURL(fabric.image)}
                        className="object-cover"
                      />
                    )}
                  </motion.span>

                  <span className="mt-2 block truncate text-caption font-semibold text-ink-900">
                    {fabric.name}
                  </span>
                  <span className="block truncate font-data text-caption text-ink-500">
                    {fabric.code}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
