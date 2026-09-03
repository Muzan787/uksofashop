'use client';
// src/components/Product/FabricDialog.tsx

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Package, Palette, Plus } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import PillGroup from './PillGroup';
import SwatchRequestForm from './SwatchRequestForm';
import { DUR, EASE } from '@/components/Motion';
import { useReducedMotionSafe } from '@/components/Motion/useReducedMotionSafe';
import { blurDataURL } from '@/utils/cloudinary';
import { MAX_SAMPLES } from '@/constants/swatches';
import type { Fabric, FabricCollection } from './types';

interface Props {
  collections: FabricCollection[];
  /** The fabric this sofa is currently being built in, if one has been chosen. */
  selectedId: string | null;
  onChoose: (fabric: Fabric) => void;
  onClose: () => void;
}

/**
 * The whole fabric range, and the two different things a customer does with it.
 *
 * A made-to-order sofa can be built in any of 69 fabrics, and we have
 * photographs of it in three or four. So this dialog cannot pretend to be a
 * gallery: it is the fabric itself, shown as large as the panel allows, with
 * the frame photographs left alone to do the job they are good at.
 *
 * TWO JOBS, KEPT APART. Choosing what the sofa is made in, and choosing what to
 * post through someone's letterbox, are different decisions that happen to use
 * the same 69 tiles. If both were "tap the tile" nobody would know which one
 * they had just done - people would add a sample and believe they had changed
 * their sofa's colour. So a tap opens the fabric, and the two actions are named
 * buttons inside it.
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
export default function FabricDialog({ collections, selectedId, onChoose, onClose }: Props) {
  const reduced = useReducedMotionSafe();

  const [activeSlug, setActiveSlug] = useState(collections[0]?.slug ?? '');
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const [samples, setSamples] = useState<Fabric[]>([]);
  const [view, setView] = useState<'browse' | 'form' | 'sent'>('browse');

  const active = collections.find(c => c.slug === activeSlug) ?? collections[0];
  const all = collections.flatMap(c => c.fabrics);
  const zoomed = all.find(f => f.id === zoomedId) ?? null;

  const inSamples = (id: string) => samples.some(s => s.id === id);
  const full = samples.length >= MAX_SAMPLES;

  const toggleSample = (fabric: Fabric) => {
    setSamples(current =>
      current.some(s => s.id === fabric.id)
        ? current.filter(s => s.id !== fabric.id)
        : current.length >= MAX_SAMPLES
          ? current
          : [...current, fabric],
    );
  };

  const choose = (fabric: Fabric) => {
    onChoose(fabric);
    onClose();
  };

  // ── Sent ────────────────────────────────────────────────────────────────
  if (view === 'sent') {
    return (
      <Modal title="Samples on their way" onClose={onClose} size="md">
        <div className="py-4 text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-pill bg-sage-50"
          >
            <Check className="h-6 w-6 text-sage-700" strokeWidth={2.5} />
          </span>
          <h3 className="m-0 font-display text-h3 font-semibold text-ink-900">
            That&apos;s gone through
          </h3>
          <p className="m-0 mx-auto mt-2.5 max-w-[42ch] text-body-sm leading-relaxed text-ink-500">
            We&apos;ll post your samples free of charge, and give you a ring first to check
            we&apos;ve understood what you&apos;re after. Nothing to pay, nothing to send back.
          </p>
          <ul className="m-0 mt-6 flex list-none flex-wrap justify-center gap-2 p-0">
            {samples.map(s => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-pill border border-calico-300 bg-calico-100 py-1 pl-1 pr-3"
              >
                <span
                  aria-hidden="true"
                  className="h-7 w-7 shrink-0 overflow-hidden rounded-pill bg-calico-200"
                  style={s.hex ? { background: s.hex } : undefined}
                />
                <span className="text-caption font-semibold text-ink-700">
                  {s.collectionName} {s.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    );
  }

  // ── The sample request form ─────────────────────────────────────────────
  if (view === 'form') {
    return (
      <Modal
        title={`Order ${samples.length} free ${samples.length === 1 ? 'sample' : 'samples'}`}
        onClose={onClose}
        size="md"
        icon={<Package aria-hidden="true" className="h-4 w-4 text-ember-700" />}
      >
        <button
          type="button"
          onClick={() => setView('browse')}
          className="mb-5 inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-caption font-semibold text-ink-500"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Back to the fabrics
        </button>

        <SwatchRequestForm
          samples={samples}
          onRemove={id => setSamples(s => s.filter(x => x.id !== id))}
          onSent={() => setView('sent')}
        />
      </Modal>
    );
  }

  // ── Browsing ────────────────────────────────────────────────────────────
  return (
    <Modal
      title={zoomed ? `${zoomed.collectionName} ${zoomed.name}` : 'Choose your fabric'}
      onClose={onClose}
      size="full"
      icon={<Palette aria-hidden="true" className="h-4 w-4 text-ember-700" />}
      footer={
        <Footer
          samples={samples}
          onRemove={id => setSamples(s => s.filter(x => x.id !== id))}
          onOrder={() => setView('form')}
        />
      }
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
                onClick={() => choose(zoomed)}
                className="hover-btn btn-ember sheen shadow-ember flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill border-0 bg-ember-500 text-body-sm font-semibold text-ink-900"
              >
                {selectedId === zoomed.id ? 'Keep this fabric' : 'Build mine in this'}
              </button>

              {zoomed.swatchable && (
                <button
                  type="button"
                  onClick={() => toggleSample(zoomed)}
                  disabled={full && !inSamples(zoomed.id)}
                  className="hover-btn flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill border border-calico-300 bg-calico-50 text-body-sm font-semibold text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {inSamples(zoomed.id) ? (
                    <><Check aria-hidden="true" className="h-4 w-4 text-sage-700" /> In your samples</>
                  ) : (
                    <><Plus aria-hidden="true" className="h-4 w-4" /> Add a free sample</>
                  )}
                </button>
              )}
            </div>
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

                    {inSamples(fabric.id) && (
                      <span
                        aria-hidden="true"
                        className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-pill bg-sage-700"
                      >
                        <Check className="h-3.5 w-3.5 text-calico-50" strokeWidth={3} />
                      </span>
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

/**
 * The sample basket, always in view.
 *
 * It lives in the footer rather than as a floating count because it has to be
 * legible from the moment the first swatch goes in - somebody choosing three
 * out of sixty-nine needs to see which three they are holding without leaving
 * the grid.
 */
function Footer({
  samples, onRemove, onOrder,
}: {
  samples: Fabric[];
  onRemove: (id: string) => void;
  onOrder: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 text-caption font-semibold text-ink-500">
          {samples.length} of {MAX_SAMPLES} free samples
        </span>

        {samples.length > 0 && (
          <ul className="m-0 flex list-none gap-1.5 p-0">
            {samples.map(s => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onRemove(s.id)}
                  aria-label={`Remove ${s.collectionName} ${s.name} from your samples`}
                  title={`${s.collectionName} ${s.name}`}
                  className="hover-swatch block h-8 w-8 cursor-pointer overflow-hidden rounded-sm border-0 bg-calico-200 shadow-[inset_0_0_0_1px_rgba(25,28,27,0.18)]"
                  style={s.hex ? { background: s.hex } : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onOrder}
        disabled={samples.length === 0}
        className="hover-btn hover-btn-dark flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill border-0 bg-ink-900 px-6 text-body-sm font-semibold text-calico-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Package aria-hidden="true" className="h-4 w-4" />
        {samples.length === 0
          ? 'Pick samples to order'
          : `Post me ${samples.length === 1 ? 'this sample' : `these ${samples.length}`}, free`}
      </button>
    </div>
  );
}
