'use client';
// src/components/Product/FabricChoice.tsx

import { SAMPLE_FEE } from '@/constants/swatches';
import Image from 'next/image';
import { ChevronRight, Palette, Undo2 } from 'lucide-react';
import { blurDataURL } from '@/utils/cloudinary';
import type { Fabric, FabricCollection } from './types';

interface Props {
  collections: FabricCollection[];
  selected: Fabric | null;
  /** Opens the picker. The dialog itself is rendered by the page, because
   *  choosing a fabric there puts the sofa in the cart - see FabricDialog. */
  onOpen: () => void;
  /** Drops the chosen fabric and goes back to the colour photographed. */
  onClear: () => void;
}

/**
 * The fabric range, on made-to-order products only.
 *
 * SECOND CHOICE, NOT THE ONLY ONE (Muaz, 2026-10-30). Until then a
 * made-to-order sofa could not reach the cart without a fabric from the
 * library: "Add to cart" opened the picker. But some frames are photographed
 * in a colour the library does not carry - the Oakland in Tan Faux Leather,
 * the Bishop in Truffle Tokyo - and the workshop makes those too. So the
 * page now treats the colour in the photograph the way it treats a recliner's:
 * it is selected, and "Add to cart" buys it. The range is the "or" underneath
 * it, and opens only when this is tapped.
 *
 * It sits directly under the colour row, below the photograph, because it is
 * the alternative to that row and reads as one with it.
 *
 * "Fabric" means what the sofa will actually be built in - picking one changes
 * the order, and cannot change the photograph, because there isn't one of this
 * frame in that fabric and inventing it would be a lie the customer only
 * discovers on delivery day.
 */
export default function FabricChoice({ collections, selected, onOpen, onClear }: Props) {
  if (collections.length === 0) return null;

  const total = collections.reduce((n, c) => n + c.fabrics.length, 0);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onOpen}
        className={`hover-btn flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md border p-2 text-left ${
          selected
            ? 'border-ink-900 bg-calico-50 shadow-e1'
            : 'border-dashed border-calico-300 bg-calico-50'
        }`}
      >
        {selected ? (
          <span
            aria-hidden="true"
            className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-calico-200 shadow-[inset_0_0_0_1px_rgba(25,28,27,0.18)]"
            style={selected.hex ? { background: selected.hex } : undefined}
          >
            {selected.image && (
              <Image
                src={selected.image}
                alt=""
                fill
                sizes="44px"
                placeholder="blur"
                blurDataURL={blurDataURL(selected.image)}
                className="object-cover"
              />
            )}
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-ember-500/25 bg-ember-50"
          >
            <Palette className="h-5 w-5 text-ember-700" strokeWidth={1.5} />
          </span>
        )}

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-sm font-semibold text-ink-900">
            {selected
              ? `Building in ${selected.collectionName} ${selected.name}`
              : `Or choose from ${total} fabric options`}
          </span>
          <span className="mt-0.5 text-caption leading-snug text-ink-500">
            {selected
              ? `${selected.code} · same price · tap to change`
              : `Same price · samples ${SAMPLE_FEE}, refunded on order`}
          </span>
        </span>

        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-500" />
      </button>

      {selected && (
        <button
          type="button"
          onClick={onClear}
          className="hover-link mt-1 inline-flex min-h-11 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-body-sm font-semibold text-ink-700"
        >
          <Undo2 aria-hidden="true" className="h-4 w-4 text-ink-500" />
          Use the colour in the photo instead
        </button>
      )}
    </div>
  );
}
