'use client';
// src/components/Product/FabricChoice.tsx

import Image from 'next/image';
import { ChevronRight, Palette } from 'lucide-react';
import FabricDialog from './FabricDialog';
import { blurDataURL } from '@/utils/cloudinary';
import type { Fabric, FabricCollection } from './types';

interface Props {
  collections: FabricCollection[];
  selected: Fabric | null;
  onSelect: (fabric: Fabric | null) => void;
  /** Controlled from the page, so 'Add to basket' can open it when no fabric
   *  has been chosen yet - nagging is worse than just showing the choice. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The fabric control, on made-to-order products only.
 *
 * It sits beside <ColourSwatches> rather than inside it, and the two are
 * labelled differently on purpose. The swatch row is "Colour" and means the
 * colourways we have photographed - picking one changes the photograph above.
 * This is "Fabric" and means what the sofa will actually be built in - picking
 * one changes the order, and cannot change the photograph, because there isn't
 * one of this frame in that fabric and inventing it would be a lie the customer
 * only discovers on delivery day.
 *
 * On the Verona range the distinction currently costs nothing, because each
 * frame has exactly one photographed colourway, so ColourSwatches renders
 * nothing at all and this is the only colour control on the page.
 *
 * Closed by default. Sixty-nine swatches is a decision, not a glance, and it
 * belongs behind a deliberate tap - the same reasoning as "See Dimensions"
 * three lines below it.
 */
export default function FabricChoice({ collections, selected, onSelect, open, onOpenChange }: Props) {
  if (collections.length === 0) return null;

  const total = collections.reduce((n, c) => n + c.fabrics.length, 0);

  return (
    <div className="mt-5">
      <p className="eyebrow m-0 mb-2.5 text-ink-500">
        Fabric
        {selected && (
          <>
            {' — '}
            <span className="text-ink-900">
              {selected.collectionName} {selected.name}
            </span>
          </>
        )}
      </p>

      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="hover-btn flex w-full cursor-pointer items-center gap-3 rounded-md border border-calico-300 bg-calico-50 p-2.5 text-left shadow-e1"
      >
        {selected ? (
          <span
            aria-hidden="true"
            className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-calico-200 shadow-[inset_0_0_0_1px_rgba(25,28,27,0.18)]"
            style={selected.hex ? { background: selected.hex } : undefined}
          >
            {selected.image && (
              <Image
                src={selected.image}
                alt=""
                fill
                sizes="48px"
                placeholder="blur"
                blurDataURL={blurDataURL(selected.image)}
                className="object-cover"
              />
            )}
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-sm border border-ember-500/25 bg-ember-50"
          >
            <Palette className="h-5 w-5 text-ember-700" strokeWidth={1.5} />
          </span>
        )}

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-sm font-semibold text-ink-900">
            {selected ? 'Change fabric' : 'Choose from ' + total + ' fabrics'}
          </span>
          <span className="mt-0.5 text-caption leading-snug text-ink-500">
            {selected
              ? `${selected.code} · every fabric is the same price`
              : 'Any colour, same price — plus 3 free samples by post'}
          </span>
        </span>

        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-500" />
      </button>

      {open && (
        <FabricDialog
          collections={collections}
          selectedId={selected?.id ?? null}
          onChoose={onSelect}
          onClose={() => onOpenChange(false)}
        />
      )}
    </div>
  );
}
