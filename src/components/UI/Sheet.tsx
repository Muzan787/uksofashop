'use client';
// src/components/UI/Sheet.tsx

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useDialog } from './useDialog';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Clears the bottom navigation where the sheet sits above it. */
  clearsBottomNav?: boolean;
  /** On the wrapper, so a caller can scope the sheet to a breakpoint. */
  className?: string;
}

/** How far down you have to drag before letting go dismisses it. */
const DISMISS_AFTER = 96;

/**
 * The phone's dialog.
 *
 * A sheet rather than a centred box, because a modal that arrives in the middle
 * of a phone screen has its controls under the thumb's reach and its scrim
 * where the content should be. This comes up from the bottom edge, which is
 * where every sheet a person has used on a phone comes from — and it goes back
 * the same way when they drag it.
 *
 * The grab handle is a real target, not a decoration: the whole header responds
 * to a drag, so the gesture works wherever a thumb naturally lands.
 */
export default function Sheet({
  title, onClose, children, footer, clearsBottomNav, className,
}: Props) {
  const panel = useDialog<HTMLDivElement>(onClose);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    startY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startY.current === null) return;
    // Downward only. Dragging up should not stretch the sheet off the top.
    setDrag(Math.max(0, e.clientY - startY.current));
  }
  function onPointerUp() {
    if (startY.current === null) return;
    startY.current = null;
    if (drag > DISMISS_AFTER) onClose();
    setDrag(0);
  }

  return (
    <div className={`fixed inset-0 z-drawer ${className ?? ''}`}>
      <button
        type="button"
        aria-label={`Close ${title.toLowerCase()}`}
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-ink-900/50 motion-safe:animate-[fadeIn_var(--dur-base)_var(--ease-out-expo)]"
      />

      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-lg bg-calico-50 shadow-e3 outline-none"
        style={{
          animation: 'bottomSheet var(--dur-base) var(--ease-out-expo)',
          marginBottom: clearsBottomNav ? 'calc(var(--bottom-nav) + env(safe-area-inset-bottom))' : undefined,
          // While a finger is on it the sheet follows, so the transform is set
          // directly rather than transitioned.
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: drag ? 'none' : 'transform var(--dur-base) var(--ease-out-expo)',
        }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="shrink-0 cursor-grab touch-none px-4 pb-2 pt-3 active:cursor-grabbing"
        >
          <span aria-hidden="true" className="mx-auto block h-1 w-10 rounded-pill bg-calico-300" />
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-body font-semibold text-ink-900">{title}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title.toLowerCase()}`}
              className="hover-icon -mr-2 flex h-11 w-11 items-center justify-center rounded-sm text-ink-500"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto border-t border-calico-300 px-4 py-5">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-calico-300 p-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
