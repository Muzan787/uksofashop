'use client';
// src/components/UI/Modal.tsx

import { X } from 'lucide-react';
import { useDialog } from './useDialog';

interface Props {
  /** Names the dialog for assistive technology. Required — a dialog with no
   *  accessible name is announced as "dialog" and nothing else. */
  title: string;
  /** Hide the visible heading where the panel supplies its own. */
  hideTitle?: boolean;
  onClose: () => void;
  /** Tailwind max-width. Lightboxes want more than a confirmation does. */
  size?: 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
  /** Sits along the bottom, separated by a rule. */
  footer?: React.ReactNode;
  /** Small mark beside the heading. */
  icon?: React.ReactNode;
  /** For passing a CSS custom property down, e.g. the product accent. */
  style?: React.CSSProperties;
}

const WIDTH = {
  sm: 'max-w-[420px]',
  md: 'max-w-[520px]',
  lg: 'max-w-[720px]',
  full: 'max-w-[1100px]',
} as const;

/**
 * Every dialog on the site.
 *
 * The behaviour — role, aria-modal, the focus trap, Escape, the scroll lock and
 * putting focus back where it came from — is `useDialog`, which the product
 * page's three panels already share. What this adds is the part they were each
 * writing out again: the scrim, the panel, the header and the close button.
 *
 * The panel comes up from 0.96 rather than from nothing. Scaling from zero
 * reads as a thing being created; scaling from just under full size reads as a
 * thing arriving, which is what a dialog is doing.
 */
export default function Modal({
  title, hideTitle, onClose, size = 'md', children, footer, icon, style,
}: Props) {
  const panel = useDialog<HTMLDivElement>(onClose);
  const titleId = `modal-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      style={style}
      className="fixed inset-0 z-modal flex items-center justify-center p-4 motion-safe:animate-[fadeIn_var(--dur-base)_var(--ease-out-expo)]"
    >
      <span aria-hidden="true" className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" />

      <div
        ref={panel}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className={`relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-lg bg-calico-50 shadow-e3 outline-none motion-safe:animate-[modal-in_var(--dur-base)_var(--ease-out-expo)] ${WIDTH[size]}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-calico-300 px-5 py-4">
          <span className={hideTitle ? 'sr-only' : 'flex min-w-0 items-center gap-2'}>
            {!hideTitle && icon}
            <h2 id={titleId} className="m-0 truncate text-body font-semibold text-ink-900">
              {title}
            </h2>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()}`}
            className="hover-icon -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-ink-500"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-calico-300 px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
