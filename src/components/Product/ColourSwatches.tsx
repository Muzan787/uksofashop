'use client';
// src/components/Product/ColourSwatches.tsx

import Image from 'next/image';
import { Check } from 'lucide-react';
import { usePointerFine } from '@/components/Motion/usePointerFine';
import { blurDataURL } from '@/utils/cloudinary';
import { getTextColor } from './accent';
import type { Swatch } from './types';

interface Props {
  swatches: Swatch[];
  selected: string;
  onSelect: (color: string) => void;
  /** Called with a colour while it is hovered, and null on leave. */
  onPreview?: (color: string | null) => void;
}

/**
 * The colour choice.
 *
 * These were 60px photographs of the whole sofa, shrunk to the size of a
 * postage stamp. At that size the sofa is unreadable and the colour — the one
 * thing the control exists to communicate — is diluted by the room around it.
 * They are the colour itself now, at 44px, straight from `color_hex`.
 *
 * The selected swatch was signalled by border colour ALONE, which fails for
 * anyone who cannot distinguish the border from the neighbours', and says
 * nothing at all to a screen reader. Selection is now carried three ways: a
 * check mark drawn in whichever system colour is legible on that fabric, a
 * ring that changes weight as well as colour, and `aria-pressed`.
 *
 * Hovering a swatch dissolves the gallery stage to that colour without
 * committing to it — pointer devices only, because on a touchscreen the
 * pointer enters and the tap lands in the same gesture, so a preview would
 * only ever be a slower version of the selection.
 */
export default function ColourSwatches({ swatches, selected, onSelect, onPreview }: Props) {
  const fine = usePointerFine();

  if (swatches.length < 2) return null;

  const preview = (color: string | null) => {
    if (!fine || !onPreview) return;
    onPreview(color);
  };

  return (
    <div className="mt-5">
      <div role="group" aria-label="Colour" className="flex flex-wrap gap-2.5">
        {swatches.map(sw => {
          const active = sw.color === selected;
          const name = sw.color || 'This colour';

          return (
            <button
              key={sw.id}
              type="button"
              aria-label={name}
              aria-pressed={active}
              title={name}
              onClick={() => onSelect(sw.color)}
              onPointerEnter={() => preview(sw.color)}
              onPointerLeave={() => preview(null)}
              onFocus={() => preview(sw.color)}
              onBlur={() => preview(null)}
              className={`hover-swatch relative h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-calico-200 transition-shadow duration-swift ease-out-expo ${
                active
                  ? 'shadow-[0_0_0_2px_var(--color-calico-50),0_0_0_4px_var(--color-ink-900)]'
                  : 'shadow-[inset_0_0_0_1px_rgba(25,28,27,0.18)]'
              }`}
              style={sw.hex ? { background: sw.hex } : undefined}
            >
              {/* A fabric with no hex on the record still needs to be pickable,
                  so it falls back to its own photograph rather than to a blank
                  square that looks like a rendering fault. */}
              {!sw.hex && sw.image && (
                <Image
                  src={sw.image}
                  alt=""
                  fill
                  sizes="44px"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={blurDataURL(sw.image)}
                  className="object-cover"
                />
              )}

              {active && (
                <Check
                  aria-hidden="true"
                  strokeWidth={3}
                  className="absolute inset-0 m-auto h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                  style={{ color: sw.hex ? getTextColor(sw.hex) : 'var(--color-calico-50)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="m-0 mt-3 text-body-sm text-ink-500">
        Colour — <span className="font-semibold text-ink-900">{selected || '—'}</span>
      </p>
    </div>
  );
}
