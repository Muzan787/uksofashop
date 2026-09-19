'use client';
// src/components/Product/FabricChoice.tsx

import Image from 'next/image';
import { ChevronRight, Palette } from 'lucide-react';
import { blurDataURL } from '@/utils/cloudinary';
import type { Fabric, FabricCollection } from './types';

interface Props {
  collections: FabricCollection[];
  selected: Fabric | null;
  /** Opens the picker. The dialog itself is rendered by the page, because
   *  choosing a fabric there puts the sofa in the cart - see FabricDialog. */
  onOpen: () => void;
}

/**
 * The fabric control, on made-to-order products only.
 *
 * It lives in the buy box, between the size and the price's call to action,
 * where the material pills stand on a stocked product - because on a
 * made-to-order frame this IS the material choice. It used to sit under the
 * photographs, ahead of the title and the price, which on a phone put "Choose
 * from 70 fabrics" on screen before the customer knew what the sofa was
 * called or what it cost (moved 2026-09-19).
 *
 * "Fabric" means what the sofa will actually be built in - picking one changes
 * the order, and cannot change the photograph, because there isn't one of this
 * frame in that fabric and inventing it would be a lie the customer only
 * discovers on delivery day. The photographs above are the colourways we
 * happen to have shot.
 *
 * Closed by default. Sixty-nine swatches is a decision, not a glance, and it
 * belongs behind a deliberate tap - the same reasoning as "See Dimensions"
 * three lines below it.
 */
export default function FabricChoice({ collections, selected, onOpen }: Props) {
  if (collections.length === 0) return null;

  const total = collections.reduce((n, c) => n + c.fabrics.length, 0);

  return (
    <div>
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
        onClick={onOpen}
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
    </div>
  );
}
